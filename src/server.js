const WebSocket = require('ws');

const rooms = {};  // key = roomCode, value = { gameState, clients }

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function initializeGame() {
  return {
    players: {},
    bombs: [],
    explosions: [],
    maze: generateMaze(13, 23),
    gameStarted: false,
    gameOver: false,
    winner: null,
    playerCount: 0
  };
}

const wss = new WebSocket.Server({ port: 8080, host: '0.0.0.0' });

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'createRoom') {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
          gameState: initializeGame(),
          clients: new Set()
        };
        ws.roomCode = roomCode;
        rooms[roomCode].clients.add(ws);
        ws.send(JSON.stringify({ type: 'roomCreated', roomCode }));

      } else if (data.type === 'joinRoom') {
        const roomCode = data.roomCode;
        const room = rooms[roomCode];
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
          return;
        }
        if (room.gameState.playerCount >= 4) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
          return;
        }

        room.gameState.playerCount++;
        const playerId = room.gameState.playerCount;
        const pos = startingPositions[playerId - 1];
        room.gameState.players[playerId] = {
          playerId,
          row: pos.row,
          col: pos.col,
          alive: true
        };

        ws.roomCode = roomCode;
        ws.playerId = playerId;
        room.clients.add(ws);

        ws.send(JSON.stringify({ type: 'welcome', playerId }));
        broadcastGameState(room);

        // If enough players, start
        if (Object.keys(room.gameState.players).length >= 2) {
          room.gameState.gameStarted = true;
          broadcastGameState(room);
        }

      } else if (data.type === 'move' || data.type === 'bomb') {
        const roomCode = ws.roomCode;
        if (!roomCode || !rooms[roomCode]) return;
        const room = rooms[roomCode];
        if (data.type === 'move') {
          movePlayer(room, ws.playerId, data.direction);
        } else if (data.type === 'bomb') {
          placeBomb(room, ws.playerId);
        }
      }

    } catch (err) {
      console.error('Parse error:', err);
    }
  });

  ws.on('close', () => {
    const roomCode = ws.roomCode;
    if (roomCode && rooms[roomCode]) {
      const room = rooms[roomCode];
      if (ws.playerId) {
        delete room.gameState.players[ws.playerId];
      }
      room.clients.delete(ws);
      broadcastGameState(room);
      if (room.clients.size === 0) {
        delete rooms[roomCode];
        console.log(`Room ${roomCode} deleted (empty)`);
      }
    }
  });
});

function broadcastGameState(room) {
  const message = JSON.stringify({
    type: 'gameState',
    data: room.gameState
  });
  room.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// movePlayer, placeBomb etc updated to take `room`
function movePlayer(room, playerId, direction) { /* similar to yours */ }
function placeBomb(room, playerId) { /* similar to yours */ }
