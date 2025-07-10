const WebSocket = require("ws");
const os = require("os");

const wss = new WebSocket.Server({ port: 8080, host: "0.0.0.0" });

const startingPositions = [
  { row: 1, col: 1 },
  { row: 1, col: 21 },
  { row: 11, col: 1 },
  { row: 11, col: 21 },
];

let gameState = {
  players: {},
  bombs: [],
  explosions: [],
  maze: null,
  gameStarted: false,
  gameOver: false,
  winner: null,
  playerCount: 0,
};

let lobbyWaitTimer = null;
let gameStartCountdownTimer = null;
let gameStartCountdown = 10;

const clients = {}; // playerId -> { ws, nickname }

function generateMaze(rows, cols) {
  const maze = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) row.push("#");
      else if (r % 2 === 0 && c % 2 === 0) row.push("#");
      else row.push(Math.random() < 0.2 ? "*" : " ");
    }
    maze.push(row);
  }
  [
    [1, 1],
    [1, cols - 2],
    [rows - 2, 1],
    [rows - 2, cols - 2],
  ].forEach(([r, c]) => {
    maze[r][c] = " ";
    maze[r][c - 1] = " ";
    maze[r - 1][c] = " ";
  });
  return maze;
}

function initializeGame() {
  gameState = {
    ...gameState,
    maze: generateMaze(13, 23),
    bombs: [],
    explosions: [],
    gameStarted: false,
    gameOver: false,
    winner: null,
  };
}

// function broadcastGameState() {
//   const msg = JSON.stringify({ type:'gameState', data: gameState });
//   Object.values(clients).forEach(client => {
//     if (client.ws.readyState === WebSocket.OPEN) {
//       client.ws.send(msg);
//     }
//   });
// }

function broadcastGameState() {
  const msg = JSON.stringify({
    type: "gameState",
    data: {
      players: gameState.players,
      bombs: gameState.bombs,
      explosions: gameState.explosions,
      gameStarted: gameState.gameStarted,
      gameOver: gameState.gameOver,
      winner: gameState.winner,
      mazeLayout: gameState.maze,
    },
  });

  Object.values(clients).forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  });
}

function checkWinCondition() {
  const alive = Object.values(gameState.players).filter((p) => p.alive);
  if (alive.length <= 1) {
    gameState.gameOver = true;
    gameState.winner = alive[0] || null;
    setTimeout(() => {
      initializeGame();
      broadcastGameState();
    }, 3000);
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
    for (let i = 1; i <= 2; i++) {
      const nr = row + dr * i,
        nc = col + dc * i;
      if (!gameState.maze[nr]?.[nc] || gameState.maze[nr][nc] === "#") break;
      explosion.push({ row: nr, col: nc });
      if (gameState.maze[nr][nc] === "*") {
        gameState.maze[nr][nc] = " ";
        break;
      }
    }
  });
  explosion.forEach((e) =>
    gameState.explosions.push({ ...e, createdAt: Date.now() })
  );
  checkPlayerDeaths();
  setTimeout(() => {
    explosion.forEach(
      (e) =>
        (gameState.explosions = gameState.explosions.filter(
          (ex) => ex.row !== e.row || ex.col !== e.col
        ))
    );
    broadcastGameState();
  }, 500);
  broadcastGameState();
}

function checkPlayerDeaths() {
  Object.values(gameState.players).forEach((p) => {
    if (
      p.alive &&
      gameState.explosions.some((e) => e.row === p.row && e.col === p.col)
    ) {
      p.alive = false;
      checkWinCondition();
    }
  });
}

function placeBomb(playerId) {
  const p = gameState.players[playerId];
  if (!p || !p.alive || gameState.gameOver) return;
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
    broadcastGameState();
  }
}

function getServerIP() {
  for (const nets of Object.values(os.networkInterfaces()))
    for (const net of nets)
      if (net.family === "IPv4" && !net.internal) return net.address;
  return "localhost";
}

function stopTimers() {
  if (lobbyWaitTimer) clearInterval(lobbyWaitTimer);
  if (gameStartCountdownTimer) clearInterval(gameStartCountdownTimer);
  lobbyWaitTimer = null;
  gameStartCountdownTimer = null;
  gameStartCountdown = 10;
  gameState.lobbyCountdown = null;
}

function startGameCountdown() {
  stopTimers(); // Stop any other timers
  gameState.gameStarted = false; // It's not *really* started until countdown ends

  gameStartCountdownTimer = setInterval(() => {
    gameStartCountdown--;
    gameState.lobbyCountdown = gameStartCountdown;

    if (gameStartCountdown <= 0) {
      clearInterval(gameStartCountdownTimer);
      gameState.gameStarted = true; // NOW the game starts
    }
    broadcastGameState();
  }, 1000);
}

function checkLobbyStatus() {
  const playerCount = Object.keys(gameState.players).length;

  if (playerCount >= 4) {
    // 4 players are in, start the 10s countdown immediately
    startGameCountdown();
  } else if (playerCount >= 2 && !lobbyWaitTimer && !gameStartCountdownTimer) {
    // 2 or 3 players are in, start the 20s waiting timer
    const waitTime = 20;
    let time = 0;
    lobbyWaitTimer = setInterval(() => {
      time++;
      if (time >= waitTime) {
        // 20s are up, start the 10s countdown
        startGameCountdown();
      }
    }, 1000);
  }
}

initializeGame();

wss.on("connection", (ws) => {
  gameState.playerCount++;
  const playerId = gameState.playerCount;
  const idx = playerId - 1;

  if (playerId > 4) {
    ws.send(JSON.stringify({ type: "error", data: { message: "Game full" } }));
    ws.close();
    return;
  }

  // Store the ws connection but DO NOT create player yet
  clients[playerId] = { ws, nickname: null };

  console.log(`Player id ${playerId} connected`);

  ws.send(JSON.stringify({ type: "welcome", data: { playerId } }));

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === "registerPlayer" && data.nickname) {
        if (!gameState.players[playerId]) {
          gameState.players[playerId] = {
            playerId,
            row: startingPositions[idx].row,
            col: startingPositions[idx].col,
            alive: true,
            nickname: data.nickname,
          };
          clients[playerId].nickname = data.nickname;

          console.log(
            `Player ${playerId} registered with nickname "${data.nickname}" at position (${startingPositions[idx].row}, ${startingPositions[idx].col})`
          );

          // Start game if 2 or more players registered
          // if (Object.keys(gameState.players).length >= 2) {
          //   gameState.gameStarted = true;
          // }
          checkLobbyStatus();
          broadcastGameState();
        }
      } else if (data.type === "move") {
        movePlayer(playerId, data.direction);
      } else if (data.type === "bomb") {
        placeBomb(playerId);
      }
    } catch (e) {
      console.error("Error parsing message:", e);
    }
  });

  ws.on("close", () => {
    console.log(`Player ${playerId} disconnected`);
    stopTimers();

    // Remove player if registered
    if (gameState.players[playerId]) {
      delete gameState.players[playerId];
    }
    delete clients[playerId];

    gameState.playerCount--;
    checkLobbyStatus(); // Re-evaluate lobby state
    broadcastGameState();
  });
});

console.log(
  `Server running on ws://localhost:8080 and ws://${getServerIP()}:8080`
);
