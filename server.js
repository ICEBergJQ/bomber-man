const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const os = require("os");

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

const CELL_SIZE = 30;
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
  checkPowerupCollection()
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
    if (
      p.alive &&
      !p.invincible && !p.hasShield &&
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
        p.invincible = true;
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
  if (gameState.playerCount > 0 && alive.length <= 1) {
    gameState.gameOver = true;
    gameState.winner = alive[0] || null;
    broadcastGameState();
    // setTimeout(() => {
    //   initializeGame();
    //   broadcastGameState();
    // }, 5000);
  }
}
function explodeBomb(bomb) {
  const { row, col } = bomb;
  const explosion = [{ row, col }];

  // Directions: up, down, left, right
  [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ].forEach(([dr, dc]) => {
    for (let i = 1; i <= 2; i++) {
      const nr = row + dr * i;
      const nc = col + dc * i;

      // Stop if we hit a wall or maze boundary
      if (!gameState.maze[nr]?.[nc] || gameState.maze[nr][nc] === "#") break;

      explosion.push({ row: nr, col: nc });

      // If we hit a destructible block
      if (gameState.maze[nr][nc] === "*") {
        gameState.maze[nr][nc] = " "; // Destroy the block

        // 25% chance to spawn a power-up
        if (Math.random() < 0.25) {
          // Randomly choose between all three power-up types
          const powerups = ['extraLife', 'speedBoost', 'shield'];
          const type = powerups[Math.floor(Math.random() * powerups.length)];

          gameState.powerups.push({
            row: nr,
            col: nc,
            type: type,
            x: nc * CELL_SIZE,
            y: nr * CELL_SIZE
          });
        }
        break;
      }
    }
  });

  // Create explosions
  explosion.forEach((e) => {
    gameState.explosions.push({ ...e, createdAt: Date.now() });
  });

  checkPlayerDeaths();

  // Clear explosions after 500ms
  setTimeout(() => {
    gameState.explosions = [];
    broadcastGameState();
  }, 500);

  broadcastGameState();
}

function checkPowerupCollection() {
  Object.values(gameState.players).forEach((p) => {
    if (!p.alive) return;

    const powerupIndex = gameState.powerups.findIndex(
      pu => pu.row === p.row && pu.col === p.col
    );

    if (powerupIndex === -1) return;

    const powerup = gameState.powerups[powerupIndex];

    if (powerup.type === 'extraLife') {
      p.lives++;
    } else if (powerup.type === 'speedBoost') {
      // Initialize speed if not set
      p.speed = p.speed || 1;


      p.speed *= 2;

      setTimeout(() => {
        if (gameState.players[p.playerId]) {
          gameState.players[p.playerId].speed /= 2;
          console.log(` boost TSALAAA`);
          broadcastGameState();
        }
      }, 20000);
    } else if (powerup.type === 'shield') {
      p.invincible = true;
      console.log(`${p.nickname} shieldEEEEEEEEEEEEEEEEEEED!`);

      setTimeout(() => {
        if (gameState.players[p.playerId]) {
          p.invincible = false;
          console.log(`${p.nickname}'s shield expired`);
          broadcastGameState();
        }
      }, 20000);
    }

    gameState.powerups.splice(powerupIndex, 1);
    broadcastGameState();
  });
}

function placeBomb(playerId) {
  const p = gameState.players[playerId];
  if (!p || !p.alive || gameState.gameOver) return;
  if (gameState.bombs.some((bomb) => bomb.playerId === playerId)) {
    return;
  }
  if (gameState.bombs.some((b) => b.row === p.row && b.col === p.col)) return;
  const bomb = { row: p.row, col: p.col, playerId, placedAt: Date.now() };
  gameState.bombs.push(bomb);
  setTimeout(() => {
    gameState.bombs = gameState.bombs.filter((b) => b !== bomb);
    explodeBomb(bomb);
  }, 3000);
  broadcastGameState();
}
function movePlayer(playerId, dir) {
  const p = gameState.players[playerId];
  if (!p || !p.alive || gameState.gameOver) return;
  let [nr, nc] = [p.row, p.col];
  if (dir === "up") nr--;
  else if (dir === "down") nr++;
  else if (dir === "left") nc--;
  else if (dir === "right") nc++;
  if (
    gameState.maze[nr]?.[nc] &&
    !["#", "*"].includes(gameState.maze[nr][nc])
  ) {
    p.row = nr;
    p.col = nc;
    p.x = nc * CELL_SIZE;
    p.y = nr * CELL_SIZE;
    broadcastGameState();
  }
}
function forceStartGame() {
  gameState.gameStarted = true;
  broadcastGameState();
}

initializeGame();

function heartbeat() {
  this.isAlive = true;
}

wss.on("connection", (ws) => {
  // Reject if game is already full or started
  const activePlayers = Object.values(clients).filter(c => c.playerId).length;
  if (activePlayers >= MAX_PLAYERS || gameState.gameStarted) {
    ws.close(1000, "Game is full or has already started");
    console.log(`Connection rejected: Game is full (${activePlayers}/${MAX_PLAYERS}) or has already started`);
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
        if (clients[id].playerId != null || gameState.playerCount >= MAX_PLAYERS) return;
        gameState.playerCount++;
        const playerId = gameState.playerCount;
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
          hasShield: false,
          speed: 1,
          invincible: false,
        };
        broadcastGameState();
        break;

      case "startGame":
        forceStartGame();
        break;

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
            data: { nickname: sender.nickname, text: data.text }
          };
          Object.values(clients).forEach(c => {
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
      delete gameState.players[playerId];
      gameState.playerCount--;
    }
    delete clients[id];
    console.log(`Connection closed: ${id}, Player ID: ${playerId}`);
    console.log(`Active players: ${Object.keys(gameState.players).length}`);
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
