const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const os = require("os");
const { start } = require("repl");

const requestHandler = (req, res) => {
  let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
  };
  const contentType = mimeTypes[extname] || "application/octet-stream";
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        fs.readFile(path.join(__dirname, "index.html"), (err, content) => {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(content, "utf-8");
        });
      } else {
        res.writeHead(500);
        res.end(
          "Sorry, check with the site admin for error: " + err.code + " ..\n"
        );
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
};

const server = http.createServer(requestHandler);
const wss = new WebSocket.Server({ server });

// --- Game Logic ---
const MAX_PLAYERS = 4;
const HEARTBEAT_INTERVAL = 30000;
// let reInter;

const CELL_SIZE = 30;
const MOVE_INCREMENT = 7.5;

const IDs = [
  { id: 1, taken: false },
  { id: 2, taken: false },
  { id: 3, taken: false },
  { id: 4, taken: false },
];
const startingPositions = [
  { row: 1, col: 1 },
  { row: 1, col: 21 },
  { row: 11, col: 1 },
  { row: 11, col: 21 },
];
let gameState = {};
let connectionIdCounter = 0;
const clients = {};

function initializeGame() {
  gameState = {
    players: {},
    bombs: [],
    explosions: [],
    powerups: [],
    maze: generateMaze(13, 23),
    gameStarted: false,
    gameOver: false,
    winner: null,
    playerCount: 0,
  };
}
function broadcastGameState() {
  checkPowerupCollection();
  const msg = JSON.stringify({ type: "gameState", data: gameState });
  Object.values(clients).forEach((c) => {
    if (c.ws.readyState === WebSocket.OPEN) c.ws.send(msg);
  });
}
function generateMaze(rows, cols) {
  const maze = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      if (
        r === 0 ||
        r === rows - 1 ||
        c === 0 ||
        c === cols - 1 ||
        (r % 2 === 0 && c % 2 === 0)
      )
        row.push("#");
      else row.push(Math.random() < 0.3 ? "*" : " ");
    }
    maze.push(row);
  }
  [
    [1, 1],
    [1, 2],
    [2, 1],
  ].forEach((p) => (maze[p[0]][p[1]] = " "));
  [
    [1, 21],
    [1, 20],
    [2, 21],
  ].forEach((p) => (maze[p[0]][p[1]] = " "));
  [
    [11, 1],
    [10, 1],
    [11, 2],
  ].forEach((p) => (maze[p[0]][p[1]] = " "));
  [
    [11, 21],
    [11, 20],
    [10, 21],
  ].forEach((p) => (maze[p[0]][p[1]] = " "));
  return maze;
}

function checkPlayerDeaths() {
  Object.values(gameState.players).forEach((p) => {
    // Update player's logical row/col based on their center point for accurate checks
    p.col = Math.floor((p.x + CELL_SIZE / 2) / CELL_SIZE);
    p.row = Math.floor((p.y + CELL_SIZE / 2) / CELL_SIZE);

    if (
      p.alive &&
      !p.invincible &&
      gameState.explosions.some((e) => e.row === p.row && e.col === p.col)
    ) {
      p.lives--;
      if (p.lives <= 0) {
        p.alive = false;
      } else {
        const startPos = startingPositions[p.playerId - 1];
        p.row = startPos.row;
        p.col = startPos.col;
        p.x = startPos.col * CELL_SIZE;
        p.y = startPos.row * CELL_SIZE;
        p.invincible = true; // Grant temporary invincibility on respawn
        setTimeout(() => {
          if (p) p.invincible = false;
          broadcastGameState();
        }, 2000);
      }
      checkWinCondition();
    }
  });
}
function checkWinCondition() {
  const alive = Object.values(gameState.players).filter((p) => p.alive);
  const isMultiplayer = gameState.playerCount > 1;

  // Game ends if one player is left in a multiplayer match, or the only player dies.
  if (isMultiplayer && alive.length <= 1) {
    gameState.gameOver = true;
    gameState.winner = alive[0] || null;
    broadcastGameState();
  } else if (!isMultiplayer && alive.length === 0) {
    gameState.gameOver = true;
    gameState.winner = null;
    broadcastGameState();
  }
}

function explodeBomb(bomb) {
  const { row, col } = bomb;
  const explosion = [{ row, col }];

  [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ].forEach(([dr, dc]) => {
    for (let i = 1; i < 2; i++) {
      // Using a fixed bomb range for now
      const nr = row + dr * i;
      const nc = col + dc * i;
      if (!gameState.maze[nr]?.[nc] || gameState.maze[nr][nc] === "#") break;

      explosion.push({ row: nr, col: nc });
      //poweruppp

      if (gameState.maze[nr][nc] === "*") {
        gameState.maze[nr][nc] = " ";
        // Chance to spawn a power-up
        if (Math.random() < 0.25) {
          const powerups = ["extraLife", "speedBoost", "shield"];
          const type = powerups[Math.floor(Math.random() * powerups.length)];
          gameState.powerups.push({
            row: nr,
            col: nc,
            type: type,
            x: nc * CELL_SIZE,
            y: nr * CELL_SIZE,
          });
        }
        break;
      }
    }
  });

  explosion.forEach((e) => {
    gameState.explosions.push({ ...e, createdAt: Date.now() });
  });

  checkPlayerDeaths();

  setTimeout(() => {
    gameState.explosions = [];
    broadcastGameState();
  }, 500);

  broadcastGameState();
}
function checkPowerupCollection() {
  Object.values(gameState.players).forEach((p) => {
    if (!p.alive) return;

    const p_col = Math.floor((p.x + CELL_SIZE / 2) / CELL_SIZE);
    const p_row = Math.floor((p.y + CELL_SIZE / 2) / CELL_SIZE);

    const powerupIndex = gameState.powerups.findIndex(
      (pu) => pu.row === p_row && pu.col === p_col
    );

    if (powerupIndex === -1) return;

    const powerup = gameState.powerups[powerupIndex];

    switch (powerup.type) {
      case "extraLife":
        if (p.lives < 3) {
          p.lives++;
        } else {
          return;
        }
        break;

      case "speedBoost":
        p.speed = (p.speed || 1) * 2;
        setTimeout(() => {
          if (gameState.players[p.playerId]) {
            gameState.players[p.playerId].speed /= 2;;
            broadcastGameState();
          }
        }, 20000);
        break;

      case "shield":
        p.invincible = true;
        setTimeout(() => {
          if (gameState.players[p.playerId]) {
            gameState.players[p.playerId].invincible = false;
            console.log('sheild TSALAAAAA');
            broadcastGameState();
          }
        }, 20000);
        break;
    }

    gameState.powerups.splice(powerupIndex, 1);
    broadcastGameState();
  });
}


// function checkPowerupCollection() {
//   Object.values(gameState.players).forEach((p) => {
//     if (!p.alive) {
//       return
//     }
//     const p_col = Math.floor((p.x + CELL_SIZE / 2) / CELL_SIZE);
//     const p_row = Math.floor((p.y + CELL_SIZE / 2) / CELL_SIZE);
//     const powerupIndex = gameState.powerups.findIndex(
//       (pu) => pu.row === p_row && pu.col === p_col
//     );
//     console.log(powerupIndex, 'powerupIndex');
//     let ff = true
//     if (powerupIndex !== -1) {
//       const powerup = gameState.powerups[powerupIndex];
//       if (powerup.type === "extraLife") {
//         if (p.lifes >= 3) {
//           ff = false
//           return
//         }
//         p.lives++;
//       } else if (powerup.type === "speedBoost") {
//         p.speed = (p.speed || 1) * 2;
//         setTimeout(() => {
//           // is player still exists
//           if (gameState.players[p.playerId]) {
//             gameState.players[p.playerId].speed /= 2;
//             broadcastGameState();
//           }
//         }, 20000);
//       } else if (powerup.type === "shield") {
//         p.invincible = true;
//         setTimeout(() => {
//           // 7ta hna .....
//           if (gameState.players[p.playerId]) {
//             p.invincible = false;
//             broadcastGameState();
//           }
//         }, 20000);
//       }
//       if (!ff) {
//         gameState.powerups.splice(powerupIndex, 1);
//         broadcastGameState();
//       }
//     }
//   });
// }

function placeBomb(playerId) {
  const p = gameState.players[playerId];
  if (!p || !p.alive || gameState.gameOver) return;
  if (gameState.bombs.some((bomb) => bomb.playerId === playerId)) return;

  // Place bomb based on player's grid-aligned position
  const bombCol = Math.floor((p.x + CELL_SIZE / 2) / CELL_SIZE);
  const bombRow = Math.floor((p.y + CELL_SIZE / 2) / CELL_SIZE);

  if (gameState.bombs.some((b) => b.row === bombRow && b.col === bombCol))
    return;

  const bomb = { row: bombRow, col: bombCol, playerId, placedAt: Date.now() };
  gameState.bombs.push(bomb);
  setTimeout(() => {
    gameState.bombs = gameState.bombs.filter((b) => b !== bomb);
    explodeBomb(bomb);
  }, 3000);
  broadcastGameState();
}

function isValidPosition(x, y) {
  const playerSize = CELL_SIZE * 0.9; // Use a slightly smaller bounding box for smoother movement
  const corners = [
    { x: x, y: y },
    { x: x + playerSize, y: y },
    { x: x, y: y + playerSize },
    { x: x + playerSize, y: y + playerSize },
  ];
  for (const corner of corners) {
    const col = Math.floor(corner.x / CELL_SIZE);
    const row = Math.floor(corner.y / CELL_SIZE);
    const tile = gameState.maze[row]?.[col];
    if (tile === undefined || ["#", "*"].includes(tile)) {
      return false;
    }
  }
  return true;
}

function movePlayer(playerId, dir) {
  const p = gameState.players[playerId];
  if (!p || !p.alive || gameState.gameOver) return;

  let nextX = p.x;
  let nextY = p.y;
  const speed = p.speed || 1;
  const moveAmount = MOVE_INCREMENT * speed;

  if (dir === "up") nextY -= moveAmount;
  else if (dir === "down") nextY += moveAmount;
  else if (dir === "left") nextX -= moveAmount;
  else if (dir === "right") nextX += moveAmount;

  if (isValidPosition(nextX, nextY)) {
    p.x = nextX;
    p.y = nextY;
    // Update logical row/col for interactions, but they are no longer the primary position
    p.col = Math.floor((p.x + CELL_SIZE / 2) / CELL_SIZE);
    p.row = Math.floor((p.y + CELL_SIZE / 2) / CELL_SIZE);
    broadcastGameState();
  }
}

function forceStartGame() {
  gameState.gameStarted = true;
  for (const [clientId, client] of Object.entries(clients)) {
    if (client.playerId === null) {
      client.ws.close(1000, "Disconnected: Game started without registration");
      delete clients[clientId];
      console.log(`Unregistered client ${clientId} removed on game start`);
    }
  }
  broadcastGameState();
}

let waitInterval = null;
let startInterval = null;

function broadcast(type, data = {}) {
  const msg = JSON.stringify({ type, ...data });
  Object.values(clients).forEach((c) => {
    if (c.ws.readyState === WebSocket.OPEN) c.ws.send(msg);
  });
}

function startGameInten() {
  let timeLeft = 2;

  clearInterval(startInterval); // prevent duplicates

  startInterval = setInterval(() => {
    broadcast("countdown", { phase: "start", time: timeLeft });
    console.log(`Game start countdown: ${timeLeft}`);

    timeLeft--;

    if (timeLeft < 0) {
      clearInterval(startInterval);
      startInterval = null;

      console.log("Starting game...");
      forceStartGame();
    }
  }, 1000);
}

function startWait() {
  let timeLeft = 2;

  clearInterval(waitInterval); // prevent duplicates

  waitInterval = setInterval(() => {
    broadcast("countdown", { phase: "wait", time: timeLeft });
    console.log(`Wait countdown: ${timeLeft}`);

    timeLeft--;

    if (timeLeft < 0) {
      clearInterval(waitInterval);
      waitInterval = null;

      startGameInten();
    }
  }, 1000);
}

function cancelAllCountdowns() {
  if (waitInterval) {
    clearInterval(waitInterval);
    waitInterval = null;
    console.log("cleared wait interval");
  }
  if (startInterval) {
    clearInterval(startInterval);
    startInterval = null;
    console.log("cleared start interval");
  }

  broadcast("stopped");
}

function assignID() {
  const available = IDs.find((id) => !id.taken);
  if (!available) {
    return null; // No IDs left
  }
  available.taken = true;
  return available.id;
}

function freeID(playerId) {
  const found = IDs.find((id) => id.id === playerId);
  if (found) {
    found.taken = false;
  }
}

initializeGame();

function heartbeat() {
  this.isAlive = true;
}

wss.on("connection", (ws) => {
  // Reject if game is already full or started
  const activePlayers = Object.values(clients).filter((c) => c.playerId).length;
  if (activePlayers >= MAX_PLAYERS || gameState.gameStarted) {
    ws.close(1000, "Game is full or has already started");
    console.log(
      `Connection rejected: Game is full (${activePlayers}/${MAX_PLAYERS}) or has already started`
    );
    return;
  }
  ws.isAlive = true;
  ws.on("pong", heartbeat);
  const id = ++connectionIdCounter;
  clients[id] = { ws, playerId: null };
  broadcastGameState();
  const hbInterval = setInterval(() => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  }, HEARTBEAT_INTERVAL);

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }
    switch (data.type) {
      case "registerPlayer":
        if (!data.nickname) return;

        if (
          clients[id].playerId != null ||
          gameState.playerCount >= MAX_PLAYERS
        ) {
          for (const [clientId, client] of Object.entries(clients)) {
            if (client.playerId === null) {
              client.ws.close(1000, "Disconnected: max players reached");
              delete clients[clientId];
              console.log(
                `Unregistered client ${clientId} removed on game start`
              );
            }
          }
          return;
        }

        gameState.playerCount++;
        const playerId = assignID();
        if (!playerId) {
          ws.close(1000, "No starting positions available");
          console.log(`Connection rejected: No IDS available`);
          return;
        }
        clients[id].playerId = playerId;
        const pos = startingPositions[playerId - 1];
        gameState.players[playerId] = {
          playerId,
          nickname: data.nickname,
          row: pos.row,
          col: pos.col,
          x: pos.col * CELL_SIZE,
          y: pos.row * CELL_SIZE,
          alive: true,
          lives: 3,
          speed: 1, // Default speed
          invincible: false,
        };
        broadcastGameState();
        if (gameState.playerCount > 1 && !gameState.gameStarted) {
          startWait();
        }
        break;
      // case "startGame":
      //   forceStartGame();
      //   break;
      case "move":
        movePlayer(clients[id]?.playerId, data.direction);
        break;
      case "bomb":
        placeBomb(clients[id]?.playerId);
        break;
      case "chat":
        const sender = gameState.players[clients[id]?.playerId];
        if (sender) {
          const chatMsg = {
            type: "chatMessage",
            data: { nickname: sender.nickname, text: data.text },
          };
          Object.values(clients).forEach((c) => {
            if (c.ws.readyState === WebSocket.OPEN) {
              c.ws.send(JSON.stringify(chatMsg));
            }
          });
        }
        break;

      default:
        break;
    }
  });

  ws.on("close", () => {
    clearInterval(hbInterval);
    const { playerId } = clients[id] || {};
    if (playerId) {
      freeID(playerId);
      delete gameState.players[playerId];
      gameState.playerCount--;
    }
    delete clients[id];
    console.log(`Connection closed: ${id}, Player ID: ${playerId}`);
    console.log(`Active players: ${Object.keys(gameState.players).length}`);
    // if (gameState.playerCount <= 1) {
    //   let wasCleared = false;

    //   if (waitTimeout) {
    //     clearTimeout(waitTimeout);
    //     waitTimeout = null;
    //     wasCleared = true;
    //     console.log("cleared wait timeout");
    //   }

    //   if (startTimeout) {
    //     clearTimeout(startTimeout);
    //     startTimeout = null;
    //     wasCleared = true;
    //     console.log("cleared start timeout");
    //   }

    //   if (wasCleared) {
    //     broadcast("stopped");
    //   }
    // }
    if (gameState.playerCount <= 1) {
      cancelAllCountdowns();
    }

    if (gameState.playerCount === 0) {
      initializeGame();
      console.log("All players left: game fully reset");
    }
    broadcastGameState();
  });
  ws.on("error", (err) => {
    clearInterval(hbInterval);
    console.error(`WS error on conn ${id}:`, err);
    ws.close(1011, "Internal error");
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
