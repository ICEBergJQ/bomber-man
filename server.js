const express = require('express'); // For serving static files (your client-side HTML/JS/CSS)
const http = require('http');     // Node.js built-in HTTP module
const { Server } = require('socket.io'); // Socket.IO server library

// --- Server Configuration ---
const PORT = process.env.PORT || 8080; // Use environment port or default to 3000

// --- Game State (Server-Side Authoritative) ---
// This will be the single source of truth for your game data.
// For a single room, we can keep it relatively simple.
const serverGameState = {
    players: {}, // Stores player data: { socketId: { nickname, isPlayer1, lives, position, ... } }
    lobbyPlayers: [], // Array of { id: socketId, nickname: string } for players in lobby
    gameId: 'singleBombermanRoom', // Fixed ID for the single game room
    gameStarted: false,
    lobbyCountdownInterval: null, // Stores the interval for the lobby countdown
    lobbyCountdownTime: 0,        // Current time remaining in lobby countdown
    minPlayersToStart: 2,         // Minimum players required to start the countdown
    maxPlayers: 4,                // Maximum players allowed in the room
    // Initial game data (maze, etc.) will be generated here when game starts
    initialGameData: null,
    // Add other game-specific state here (e.g., maze, bombs, explosions, power-ups)
    maze: [], // Placeholder for the generated maze
};

// --- Maze Generation (Simple Placeholder) ---
// In a real game, this would be a more complex algorithm.
// For now, a very basic placeholder.
function generateMaze() {
    // Example: A 10x10 grid with some walls and breakable blocks
    const rows = 11;
    const cols = 11;
    const maze = Array(rows).fill(0).map(() => Array(cols).fill('E')); // 'E' for Empty

    // Place unbreakable walls ('W') - perimeter
    for (let i = 0; i < rows; i++) {
        maze[i][0] = 'W';
        maze[i][cols - 1] = 'W';
    }
    for (let j = 0; j < cols; j++) {
        maze[0][j] = 'W';
        maze[rows - 1][j] = 'W';
    }

    // Place some internal unbreakable walls (e.g., checkerboard pattern)
    for (let i = 2; i < rows - 1; i += 2) {
        for (let j = 2; j < cols - 1; j += 2) {
            maze[i][j] = 'W';
        }
    }

    // Place random destroyable blocks ('B')
    for (let i = 1; i < rows - 1; i++) {
        for (let j = 1; j < cols - 1; j++) {
            if (maze[i][j] === 'E' && Math.random() < 0.6) { // 60% chance for a block
                maze[i][j] = 'B';
            }
        }
    }

    // Ensure player spawn points are clear (e.g., corners and adjacent cells)
    const spawnPoints = [
        { row: 1, col: 1 },
        { row: 1, col: cols - 2 },
        { row: rows - 2, col: 1 },
        { row: rows - 2, col: cols - 2 }
    ];

    spawnPoints.forEach(point => {
        maze[point.row][point.col] = 'E'; // Player spawn
        // Clear adjacent cells for safety
        if (maze[point.row + 1] && maze[point.row + 1][point.col]) maze[point.row + 1][point.col] = 'E';
        if (maze[point.row - 1] && maze[point.row - 1][point.col]) maze[point.row - 1][point.col] = 'E';
        if (maze[point.row][point.col + 1]) maze[point.row][point.col + 1] = 'E';
        if (maze[point.row][point.col - 1]) maze[point.row][point.col - 1] = 'E';
    });

    return maze;
}


// --- Express App Setup (for serving client files) ---
const app = express();
const server = http.createServer(app); // Create HTTP server for Express

// Serve static files from the root directory (where index.html is)
// Adjust this path if your client-side files are in a different folder (e.g., 'public')
app.use(express.static(__dirname + '/')); // Serves files from the directory where server.js is located

// --- Socket.IO Server Setup ---
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for development. Restrict this in production!
        methods: ["GET", "POST"]
    }
});

// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // --- Player Registration ---
    socket.on('registerPlayer', (data) => {
        const { nickname } = data;
        if (!nickname || serverGameState.lobbyPlayers.some(p => p.nickname === nickname)) {
            console.log(`Player ${socket.id} tried to register with invalid/duplicate nickname: ${nickname}`);
            socket.emit('registrationFailed', { message: 'Nickname already taken or invalid.' });
            return;
        }

        // Add player to server's state
        const isFirstPlayer = Object.keys(serverGameState.players).length === 0;
        serverGameState.players[socket.id] = {
            id: socket.id,
            nickname: nickname,
            isPlayer1: isFirstPlayer, // Assign Player 1 status
            lives: 3,
            position: null, // Will be set when game starts
            // ... other player properties
        };
        serverGameState.lobbyPlayers.push({ id: socket.id, nickname: nickname });

        console.log(`Player registered: ${nickname} (${socket.id}). Is Player 1: ${isFirstPlayer}`);

        // Confirm registration to the client
        socket.emit('playerRegistered', {
            id: socket.id,
            nickname: nickname,
            isPlayer1: isFirstPlayer,
            lobbyPlayers: serverGameState.lobbyPlayers, // Send current lobby roster
        });

        // Broadcast to all clients in the lobby about the new player
        io.emit('playerJoinedLobby', {
            players: serverGameState.lobbyPlayers,
            playerCount: serverGameState.lobbyPlayers.length
        });

        // Check if game can start countdown
        checkLobbyStatus();
    });

    // --- Start Game Request (from Player 1) ---
    socket.on('startGameRequest', () => {
        const player = serverGameState.players[socket.id];
        if (!player || !player.isPlayer1) {
            console.log(`Player ${socket.id} (not Player 1) tried to start game.`);
            return;
        }
        if (serverGameState.gameStarted) {
            console.log(`Game already started, Player 1 (${socket.id}) tried to start again.`);
            return;
        }
        if (serverGameState.lobbyPlayers.length < serverGameState.minPlayersToStart) {
            console.log(`Not enough players to start game. Current: ${serverGameState.lobbyPlayers.length}`);
            socket.emit('gameStartError', { message: `Need at least ${serverGameState.minPlayersToStart} players to start.` });
            return;
        }

        console.log(`Player 1 (${socket.id}) requested to start game.`);
        startLobbyCountdown(10); // Start 10-second countdown
    });

    // --- Request Initial Game State (for clients joining / refreshing game screen) ---
    socket.on('requestInitialGameState', (data) => {
        const { gameId } = data;
        if (serverGameState.gameStarted && gameId === serverGameState.gameId && serverGameState.initialGameData) {
            console.log(`Client ${socket.id} requested initial game state for ${gameId}. Sending.`);
            socket.emit('gameStarted', {
                gameId: serverGameState.gameId,
                initialState: serverGameState.initialGameData
            });
        } else {
            console.log(`Client ${socket.id} requested initial game state for ${gameId}, but game not ready or ID mismatch.`);
            socket.emit('gameStartError', { message: 'Game not found or not ready.' });
        }
    });

    // --- Client joining game room (after navigating to /game) ---
    socket.on('joinGameRoom', (data) => {
        const { gameId } = data;
        if (serverGameState.gameStarted && gameId === serverGameState.gameId) {
            socket.join(gameId); // Add socket to the specific game room
            console.log(`Client ${socket.id} joined game room: ${gameId}`);
            // Optionally, send a full game state update to this specific client
            // if they just joined mid-game or refreshed.
            // io.to(socket.id).emit('gameStateUpdate', serverGameState.currentDynamicState);
        } else {
            console.log(`Client ${socket.id} tried to join invalid game room: ${gameId}`);
            socket.emit('gameStartError', { message: 'Game not active.' });
        }
    });

    // --- Basic Chat Message Handling ---
    socket.on('chatMessage', (data) => {
        const player = serverGameState.players[socket.id];
        if (player) {
            const message = {
                sender: player.nickname,
                text: data.text,
                timestamp: new Date().toLocaleTimeString()
            };
            console.log(`Chat from ${player.nickname}: ${data.text}`);
            // Broadcast to all clients in the same room (lobby or game)
            // For now, we'll just broadcast to everyone connected.
            io.emit('chatMessage', message);
        }
    });


    // --- Disconnection Handling ---
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Remove player from server state
        delete serverGameState.players[socket.id];
        serverGameState.lobbyPlayers = serverGameState.lobbyPlayers.filter(p => p.id !== socket.id);

        io.emit('playerLeftLobby', {
            players: serverGameState.lobbyPlayers,
            playerCount: serverGameState.lobbyPlayers.length
        });

        // If Player 1 disconnects and game hasn't started, reset lobby or assign new Player 1
        if (!serverGameState.gameStarted && Object.keys(serverGameState.players).length > 0) {
            const remainingPlayers = Object.values(serverGameState.players);
            if (!remainingPlayers.some(p => p.isPlayer1)) {
                remainingPlayers[0].isPlayer1 = true; // Assign new Player 1
                io.to(remainingPlayers[0].id).emit('playerRegistered', { // Re-send updated status
                    id: remainingPlayers[0].id,
                    nickname: remainingPlayers[0].nickname,
                    isPlayer1: true,
                    lobbyPlayers: serverGameState.lobbyPlayers,
                });
                console.log(`New Player 1 assigned: ${remainingPlayers[0].nickname}`);
            }
        }

        // If game was in countdown and too few players remain, cancel countdown
        if (serverGameState.lobbyCountdownInterval && serverGameState.lobbyPlayers.length < serverGameState.minPlayersToStart) {
            clearInterval(serverGameState.lobbyCountdownInterval);
            serverGameState.lobbyCountdownInterval = null;
            serverGameState.lobbyCountdownTime = 0;
            io.emit('lobbyCountdown', { timeRemaining: 0, message: 'Countdown cancelled due to insufficient players.' });
            console.log('Lobby countdown cancelled.');
        }

        // TODO: Handle player disconnection during active game
        // (e.g., mark player as dead, remove from game, check for game over)
    });
});

// --- Lobby Status and Countdown Logic ---
function checkLobbyStatus() {
    const playerCount = serverGameState.lobbyPlayers.length;
    console.log(`Lobby status check. Players: ${playerCount}`);

    // If game has started, do nothing
    if (serverGameState.gameStarted) return;

    // If enough players, start/manage countdown
    if (playerCount >= serverGameState.minPlayersToStart) {
        if (!serverGameState.lobbyCountdownInterval) {
            console.log(`Starting 20-second wait timer. Current players: ${playerCount}`);
            startLobbyCountdown(20); // Start 20-second timer
        }
        // If 4 players join before the 20s timer, immediately switch to 10s
        if (playerCount === serverGameState.maxPlayers && serverGameState.lobbyCountdownTime > 10) {
            console.log('Max players reached, accelerating countdown to 10 seconds.');
            clearInterval(serverGameState.lobbyCountdownInterval);
            startLobbyCountdown(10);
        }
    } else {
        // Not enough players, ensure no countdown is running
        if (serverGameState.lobbyCountdownInterval) {
            clearInterval(serverGameState.lobbyCountdownInterval);
            serverGameState.lobbyCountdownInterval = null;
            serverGameState.lobbyCountdownTime = 0;
            io.emit('lobbyCountdown', { timeRemaining: 0, message: 'Waiting for more players.' });
            console.log('Lobby countdown stopped due to too few players.');
        }
    }
}

function startLobbyCountdown(initialTime) {
    if (serverGameState.lobbyCountdownInterval) {
        clearInterval(serverGameState.lobbyCountdownInterval);
    }

    serverGameState.lobbyCountdownTime = initialTime;
    io.emit('lobbyCountdown', { timeRemaining: serverGameState.lobbyCountdownTime });
    console.log(`Lobby countdown started: ${serverGameState.lobbyCountdownTime}s`);

    serverGameState.lobbyCountdownInterval = setInterval(() => {
        serverGameState.lobbyCountdownTime--;
        io.emit('lobbyCountdown', { timeRemaining: serverGameState.lobbyCountdownTime });

        if (serverGameState.lobbyCountdownTime <= 0) {
            clearInterval(serverGameState.lobbyCountdownInterval);
            serverGameState.lobbyCountdownInterval = null;
            serverGameState.gameStarted = true; // Mark game as started on server
            console.log('Lobby countdown finished. Starting game...');
            initializeGame(); // Call function to set up game
        }
    }, 1000);
}

function initializeGame() {
    // 1. Generate the maze
    const maze = generateMaze();
    serverGameState.maze = maze; // Store maze on server

    // 2. Assign initial positions to players (corners)
    const spawnPoints = [
        { row: 1, col: 1 },
        { row: 1, col: maze[0].length - 2 },
        { row: maze.length - 2, col: 1 },
        { row: maze.length - 2, col: maze[0].length - 2 }
    ];
    let spawnIndex = 0;
    for (const playerId in serverGameState.players) {
        const player = serverGameState.players[playerId];
        if (spawnPoints[spawnIndex]) {
            player.position = spawnPoints[spawnIndex];
            player.lives = 3; // Reset lives for new game
            // Initialize other player-specific game state (bombs, flames, speed)
            player.bombCount = 1;
            player.flameRange = 1;
            player.speed = 1;
            spawnIndex++;
        } else {
            // More players than spawn points, or handle spectators
            console.warn(`Player ${player.nickname} has no spawn point.`);
            // For now, let's just not include them in the game or mark them out.
            player.lives = 0; // Mark as out if no spawn point
        }
    }

    // 3. Prepare initial game state to send to clients
    serverGameState.initialGameData = {
        maze: serverGameState.maze,
        players: Object.values(serverGameState.players).map(p => ({
            id: p.id,
            nickname: p.nickname,
            position: p.position,
            lives: p.lives,
            bombCount: p.bombCount,
            flameRange: p.flameRange,
            speed: p.speed,
        })),
        // Add other initial game elements here (e.g., initial power-ups if any)
    };

    // 4. Broadcast 'gameStarted' message to all connected clients
    io.emit('gameStarted', {
        gameId: serverGameState.gameId,
        initialState: serverGameState.initialGameData
    });
    console.log('Game initialized and "gameStarted" broadcasted.');

    // TODO: Start game loop for real-time updates (physics, bomb timers, etc.)
    // startGameLoop();
}

// --- Start the HTTP server ---
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access client at http://localhost:${PORT}/index.html`);
});