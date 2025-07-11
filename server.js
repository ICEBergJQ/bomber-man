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
  lobbyCountdown: null,
};

let lobbyWaitTimer = null;
let gameStartCountdownTimer = null;
let connectionIdCounter = 0;
const clients = {}; // connectionId -> { ws, nickname, playerId }

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
    players: {},
    playerCount: 0,
    maze: generateMaze(13, 23),
    bombs: [],
    explosions: [],
    gameStarted: false,
    gameOver: false,
    winner: null,
  };
  stopTimers();
}

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
      lobbyCountdown: gameState.lobbyCountdown,
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
  if (alive.length <= 1 && gameState.gameStarted) {
    gameState.gameOver = true;
    gameState.winner = alive[0] || null;
    broadcastGameState();
    setTimeout(() => {
      initializeGame();
      broadcastGameState();
    }, 5000);
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
    gameState.explosions = [];
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
  gameState.lobbyCountdown = null;
}

function startLobbyCountdown() {
  if (gameStartCountdownTimer) return;
  stopTimers();
  let countdown = 30;
  gameState.lobbyCountdown = countdown;
  broadcastGameState();
  gameStartCountdownTimer = setInterval(() => {
    countdown--;
    gameState.lobbyCountdown = countdown;
    if (countdown <= 0) {
      clearInterval(gameStartCountdownTimer);
      gameState.gameStarted = true;
      gameState.lobbyCountdown = null;
    }
    broadcastGameState();
  }, 1000);
}

function forceStartGame() {
  stopTimers();
  gameState.gameStarted = true;
  console.log("✅ Server: Broadcasting gameStarted = true to all clients.");
  broadcastGameState();
}

function checkLobbyStatus() {
  const playerCount = Object.keys(gameState.players).length;
  if (playerCount >= 1) {
    startLobbyCountdown();
  } else {
    stopTimers();
    broadcastGameState();
  }
}

initializeGame();

wss.on("connection", (ws) => {
  const connectionId = ++connectionIdCounter;
  clients[connectionId] = { ws, nickname: null, playerId: null };
  console.log(`Connection ${connectionId} established.`);
  ws.send(JSON.stringify({ type: "welcome", data: { connectionId } }));

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      // Check for the new 'startGame' message type
      if (data.type === "startGame") {
        forceStartGame();
      } else if (data.type === "registerPlayer" && data.nickname) {
        if (clients[connectionId].playerId === null) {
          if (gameState.playerCount >= 4) {
            ws.send(
              JSON.stringify({
                type: "error",
                data: { message: "Game is full" },
              })
            );
            return;
          }
          gameState.playerCount++;
          const playerId = gameState.playerCount;
          const idx = playerId - 1;
          clients[connectionId].playerId = playerId;
          clients[connectionId].nickname = data.nickname;
          gameState.players[playerId] = {
            playerId,
            row: startingPositions[idx].row,
            col: startingPositions[idx].col,
            alive: true,
            nickname: data.nickname,
          };
          checkLobbyStatus();
          broadcastGameState();
        }
      } else if (data.type === "move") {
        movePlayer(clients[connectionId]?.playerId, data.direction);
      } else if (data.type === "bomb") {
        placeBomb(clients[connectionId]?.playerId);
      }
    } catch (e) {
      console.error("Error parsing message:", e);
    }
  });

  ws.on("close", () => {
    console.log(`Connection ${connectionId} closed.`);
    const disconnectedPlayerId = clients[connectionId]?.playerId;
    if (disconnectedPlayerId) {
      console.log(`Player ${disconnectedPlayerId} disconnected`);
      delete gameState.players[disconnectedPlayerId];
      gameState.playerCount--;
    }
    delete clients[connectionId];
    checkLobbyStatus();
    broadcastGameState();
  });
});

console.log(
  `🚀 Server running on ws://localhost:8080 and ws://${getServerIP()}:8080`
);
