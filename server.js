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
    maze: generateMaze(13, 23),
    gameStarted: false,
    gameOver: false,
    winner: null,
    playerCount: 0,
  };
}
function broadcastGameState() {
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
function checkWinCondition() {
  const alive = Object.values(gameState.players).filter((p) => p.alive);
  if (gameState.playerCount > 0 && alive.length <= 1) {
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
    // Update pixel coordinates along with grid coordinates
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
wss.on("connection", (ws) => {
  const connectionId = ++connectionIdCounter;
  clients[connectionId] = { ws, playerId: null };
  broadcastGameState();
  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      return;
    }
    if (data.type === "registerPlayer" && data.nickname) {
      if (clients[connectionId].playerId !== null || gameState.playerCount >= 4)
        return;
      gameState.playerCount++;
      const playerId = gameState.playerCount;
      clients[connectionId].playerId = playerId;
      const startPos = startingPositions[playerId - 1];
      gameState.players[playerId] = {
        playerId,
        nickname: data.nickname,
        row: startPos.row,
        col: startPos.col,
        x: startPos.col * CELL_SIZE,
        y: startPos.row * CELL_SIZE,
        alive: true,
      };
      broadcastGameState();
    } else if (data.type === "startGame") {
      forceStartGame();
    } else if (data.type === "move") {
      movePlayer(clients[connectionId]?.playerId, data.direction);
    } else if (data.type === "bomb") {
      placeBomb(clients[connectionId]?.playerId);
    }
  });
  ws.on("close", () => {
    const { playerId } = clients[connectionId] || {};
    if (playerId) {
      delete gameState.players[playerId];
      gameState.playerCount--;
    }
    delete clients[connectionId];
    broadcastGameState();
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
