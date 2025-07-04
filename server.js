const WebSocket = require('ws');

// Game state
let gameState = {
  players: {},
  bombs: [],
  explosions: [],
  mazeLayout: null,
  gameStarted: false,
  gameOver: false,
  winner: null,
  playerCount: 0
};

// Player starting positions
const startingPositions = [
  { row: 1, col: 1 },   // Player 1
  { row: 1, col: 21 },  // Player 2
  { row: 11, col: 1 },  // Player 3
  { row: 11, col: 21 }  // Player 4
];

// Generate maze (same as your client-side function)
function generateMaze(rows, cols) {
  const maze = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        row.push('#');
      } else if (r % 2 === 0 && c % 2 === 0) {
        row.push('#');
      } else {
        const rand = Math.random();
        if (rand < 0.2) row.push('*');
        else row.push(' ');
      }
    }
    maze.push(row);
  }
  
  // Clear starting positions for all 4 players
  maze[1][1] = maze[1][2] = maze[2][1] = ' ';
  maze[1][cols-2] = maze[1][cols-3] = maze[2][cols-2] = ' ';
  maze[rows-2][1] = maze[rows-2][2] = maze[rows-3][1] = ' ';
  maze[rows-2][cols-2] = maze[rows-2][cols-3] = maze[rows-3][cols-2] = ' ';
  
  return maze;
}

// Initialize game
function initializeGame() {
  gameState.mazeLayout = generateMaze(13, 23);
  gameState.bombs = [];
  gameState.explosions = [];
  gameState.gameStarted = false;
  gameState.gameOver = false;
  gameState.winner = null;
}

// Explode bomb function
function explodeBomb(bomb) {
  const explosionCells = [];
  const { row, col } = bomb;
  
  explosionCells.push({ row, col });
  
  const directions = [
    { row: -1, col: 0 }, { row: 1, col: 0 },
    { row: 0, col: -1 }, { row: 0, col: 1 }
  ];
  
  directions.forEach(dir => {
    for (let distance = 1; distance <= 2; distance++) {
      const newRow = row + (dir.row * distance);
      const newCol = col + (dir.col * distance);
      
      if (newRow < 0 || newRow >= gameState.mazeLayout.length || 
          newCol < 0 || newCol >= gameState.mazeLayout[0].length) {
        break;
      }
      
      const cellType = gameState.mazeLayout[newRow][newCol];
      
      if (cellType === '#') {
        break;
      } else if (cellType === '*') {
        gameState.mazeLayout[newRow][newCol] = ' ';
        explosionCells.push({ row: newRow, col: newCol });
        break;
      } else {
        explosionCells.push({ row: newRow, col: newCol });
      }
    }
  });
  
  // Add explosions
  explosionCells.forEach(cell => {
    gameState.explosions.push({
      row: cell.row,
      col: cell.col,
      createdAt: Date.now()
    });
  });
  
  // Check player deaths
  checkPlayerDeaths();
  
  // Remove explosions after 500ms
  setTimeout(() => {
    explosionCells.forEach(cell => {
      const explosionIndex = gameState.explosions.findIndex(exp => 
        exp.row === cell.row && exp.col === cell.col
      );
      if (explosionIndex !== -1) {
        gameState.explosions.splice(explosionIndex, 1);
      }
    });
    broadcastGameState();
  }, 500);
  
  broadcastGameState();
}

// Check player deaths
function checkPlayerDeaths() {
  Object.values(gameState.players).forEach(player => {
    if (!player.alive) return;
    
    const playerInExplosion = gameState.explosions.find(exp => 
      exp.row === player.row && exp.col === player.col
    );
    
    if (playerInExplosion) {
      player.alive = false;
      console.log(`Player ${player.playerId} died!`);
      checkWinCondition();
    }
  });
}

// Check win condition
function checkWinCondition() {
  const alivePlayers = Object.values(gameState.players).filter(p => p.alive);
  
  if (alivePlayers.length <= 1) {
    gameState.gameOver = true;
    gameState.winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
    
    setTimeout(() => {
      // Reset game after 3 seconds
      initializeGame();
      gameState.playerCount = Object.keys(gameState.players).length;
      broadcastGameState();
    }, 3000);
  }
}

// Place bomb
function placeBomb(playerId) {
  const player = gameState.players[playerId];
  if (!player || !player.alive || gameState.gameOver) return;
  
  const { row, col } = player;
  
  const existingBomb = gameState.bombs.find(bomb => bomb.row === row && bomb.col === col);
  if (existingBomb) return;
  
  const bomb = {
    row: row,
    col: col,
    playerId: playerId,
    placedAt: Date.now()
  };
  
  gameState.bombs.push(bomb);
  
  setTimeout(() => {
    const bombIndex = gameState.bombs.findIndex(b => 
      b.row === bomb.row && b.col === bomb.col && b.placedAt === bomb.placedAt
    );
    if (bombIndex !== -1) {
      gameState.bombs.splice(bombIndex, 1);
      explodeBomb(bomb);
    }
  }, 3000);
  
  broadcastGameState();
}

// Move player
function movePlayer(playerId, direction) {
  const player = gameState.players[playerId];
  if (!player || !player.alive || gameState.gameOver) return;
  
  let newRow = player.row;
  let newCol = player.col;
  
  switch (direction) {
    case 'up': newRow--; break;
    case 'down': newRow++; break;
    case 'left': newCol--; break;
    case 'right': newCol++; break;
    default: return;
  }
  
  if (
    gameState.mazeLayout[newRow] &&
    gameState.mazeLayout[newRow][newCol] !== '#' && 
    gameState.mazeLayout[newRow][newCol] !== '*' &&
    gameState.mazeLayout[newRow][newCol] !== undefined
  ) {
    player.row = newRow;
    player.col = newCol;
    broadcastGameState();
  }
}

// Broadcast game state to all clients
function broadcastGameState() {
  const message = JSON.stringify({
    type: 'gameState',
    data: gameState
  });
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Get server IP address for display
function getServerIP() {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      // Skip internal (localhost) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Create WebSocket server - FIXED: Listen on all interfaces
const wss = new WebSocket.Server({ port: 8080, host: '0.0.0.0' });

const serverIP = getServerIP();
console.log('Bomberman server running on:');
console.log(`  Local: ws://localhost:8080`);
console.log(`  Network: ws://${serverIP}:8080`);

// Initialize the game
initializeGame();

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  // Assign player ID
  gameState.playerCount++;
  const playerId = gameState.playerCount;
  const playerIndex = playerId - 1;
  
  if (playerId <= 4) {
    // Add new player
    gameState.players[playerId] = {
      playerId: playerId,
      row: startingPositions[playerIndex].row,
      col: startingPositions[playerIndex].col,
      alive: true,
      id: `player${playerId}`
    };
    
    // Start game if we have at least 2 players
    if (Object.keys(gameState.players).length >= 2) {
      gameState.gameStarted = true;
    }
    
    // Send welcome message with player ID
    ws.send(JSON.stringify({
      type: 'welcome',
      data: { playerId: playerId }
    }));
    
    broadcastGameState();
  } else {
    // Too many players
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Game is full (max 4 players)' }
    }));
    ws.close();
    return;
  }
  
  // Store player ID on websocket
  ws.playerId = playerId;
  
  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'move':
          movePlayer(ws.playerId, data.direction);
          break;
        case 'bomb':
          placeBomb(ws.playerId);
          break;
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log(`Player ${ws.playerId} disconnected`);
    if (gameState.players[ws.playerId]) {
      delete gameState.players[ws.playerId];
    }
    broadcastGameState();
  });
});