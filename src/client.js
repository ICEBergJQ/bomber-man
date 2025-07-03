import render from "./vdom/Render.js";
import createElement from "./vdom/CreateElement.js";
import Mount from "./vdom/Mount.js";
import Diff from "./vdom/Diff.js";
import { createStore } from "./core/store.js";
import { createRouter } from "./core/router.js";
import { on } from "./core/events.js";


// Client game state (read-only, updated from server)
// let gameState = {
//   players: {},
//   bombs: [],
//   explosions: [],
//   maze: null,
//   gameStarted: false,
//   gameOver: false,
//   winner: null
// };
const INITIAL_MAZE_ROWS = 13;
const INITIAL_MAZE_COLS = 23;

const gameState = createStore({
  players: { },
  bombs: [],
  explosions: [],
  gameOver: false,
  winner: null,
  gameStarted: false,
  gameOver: false,
  mazeLayout: generateMaze(INITIAL_MAZE_ROWS, INITIAL_MAZE_COLS),
  currentScreen: 'join', // Tracks which screen should be rendered
  isPlayer1: false,     // Simulated: true if this client is player 1
});



let myPlayerId = null;
let ws = null;

// Connect to WebSocket server
function connectToServer() {
  const SERVER_IP = '10.1.19.9'; // Change this per machine
ws = new WebSocket(`ws://${SERVER_IP}:8080`);
  
  ws.onopen = () => {
    console.log('Connected to server');
    showStatus('Connected to server');
  };
  
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    } catch (error) {
      console.error('Error parsing server message:', error);
    }
  };
  
  ws.onclose = () => {
    console.log('Disconnected from server');
    showStatus('Disconnected from server');
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    showStatus('Connection error');
  };
}

// Handle messages from server
function handleServerMessage(message) {
  switch (message.type) {
    case 'welcome':
      myPlayerId = message.data.playerId;
      console.log(`I am player ${myPlayerId}`);
      showStatus(`You are Player ${myPlayerId}`);
      break;
      
    case 'gameState':
      gameState = message.data;
      renderGame();
      
      if (gameState.gameOver && gameState.winner) {
        showStatus(`${gameState.winner.id.toUpperCase()} WINS! Press R to restart.`);
      } else if (gameState.gameOver) {
        showStatus('DRAW! Everyone died! Press R to restart.');
      } else if (!gameState.gameStarted) {
        showStatus('Waiting for more players...');
      } else {
        showStatus(`You are Player ${myPlayerId} - Use arrow keys to move, spacebar for bomb`);
      }
      break;
      
    case 'error':
      showStatus(`Error: ${message.data.message}`);
      break;
  }
}

// Send message to server
function sendToServer(type, data = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}

// Show status message
function showStatus(message) {
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.textContent = message;
  }
}

// Generate maze for testing or offline mode
function generateMaze(rows, cols) {
  const maze = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      // Border walls all around
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        row.push('#');
      }
      // Place walls in a checkerboard pattern (for solid walls)
      else if (r % 2 === 0 && c % 2 === 0) {
        row.push('#');
      }
      else {
        // Randomly place boxes (*) or empty spaces ( )
        const rand = Math.random();
        if (rand < 0.2) row.push('*');    // 20% chance box
        else row.push(' ');               // empty space
      }
    }
    maze.push(row);
  }
  
  // Clear starting positions for all 4 players
  // Player 1 - Top Left
  maze[1][1] = ' ';
  maze[1][2] = ' ';
  maze[2][1] = ' ';
  
  // Player 2 - Top Right  
  maze[1][cols-2] = ' ';
  maze[1][cols-3] = ' ';
  maze[2][cols-2] = ' ';
  
  // Player 3 - Bottom Left
  maze[rows-2][1] = ' ';
  maze[rows-2][2] = ' ';
  maze[rows-3][1] = ' ';
  
  // Player 4 - Bottom Right
  maze[rows-2][cols-2] = ' ';
  maze[rows-2][cols-3] = ' ';
  maze[rows-3][cols-2] = ' ';
  
  return maze;
}

// Render maze cell
const mazeCell = (type, rowIndex, colIndex) => {
  let className = 'cell';
  
  // Check if there's an explosion at this position (highest priority)
  const explosionAtPosition = gameState.explosions.find(exp => 
    exp.row === rowIndex && exp.col === colIndex
  );
  
  if (explosionAtPosition) {
    className += ' explosion';
  }
  // Check if there's a bomb at this position
  else {
    const bombAtPosition = gameState.bombs.find(bomb => 
      bomb.row === rowIndex && bomb.col === colIndex
    );
    
    if (bombAtPosition) {
      className += ' bomb';
    }
    // Check if any ALIVE player is at this position
    else {
      const playerAtPosition = Object.values(gameState.players).find(p => 
        p.alive && p.row === rowIndex && p.col === colIndex
      );
      
      if (playerAtPosition) {
        className += ` ${playerAtPosition.id}`;
        // Highlight my player
        if (playerAtPosition.playerId === myPlayerId) {
          className += ' my-player';
        }
      } else {
        switch (type) {
          case '#': className += ' wall'; break;
          case '*': className += ' box'; break;
          default:  className += ' empty'; break;
        }
      }
    }
  }
  
  return createElement('div', {
    attrs: { class: className }
  });
};

// Render the game
function renderGame() {
  if (!gameState.maze) return;
  
  const gameDiv = createElement('div', {
    attrs: { class: 'game' },
    children: gameState.maze.flatMap((row, rowIndex) =>
      row.map((cell, colIndex) => mazeCell(cell, rowIndex, colIndex))
    ),
  });
  
  const gameContainer = document.getElementById('game-container');
  if (gameContainer) {
    gameContainer.innerHTML = '';
    gameContainer.appendChild(render(gameDiv));
  }
}

// Handle input
document.addEventListener('keydown', (e) => {
  // Handle restart
  if (e.key.toLowerCase() === 'r' && gameState.gameOver) {
    sendToServer('restart');
    return;
  }
  
  // Don't process game input if no player ID or game is over
  if (!myPlayerId || gameState.gameOver) return;
  
  // Handle movement keys
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    // Only allow movement if game has started
    if (!gameState.gameStarted) return;
    
    let direction;
    switch (e.key) {
      case 'ArrowUp': direction = 'up'; break;
      case 'ArrowDown': direction = 'down'; break;
      case 'ArrowLeft': direction = 'left'; break;
      case 'ArrowRight': direction = 'right'; break;
    }
    
    sendToServer('move', { direction });
  }
  
  // Handle WASD keys for alternative controls
  else if (['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
    // Only allow movement if game has started
    if (!gameState.gameStarted) return;
    
    let direction;
    switch (e.code) {
      case 'KeyW': direction = 'up'; break;
      case 'KeyS': direction = 'down'; break;
      case 'KeyA': direction = 'left'; break;
      case 'KeyD': direction = 'right'; break;
    }
    
    sendToServer('move', { direction });
  }
  
  // Handle bomb placement
  else if (e.key === ' ' || e.code === 'KeyQ') {
    e.preventDefault(); // Prevent page scroll for spacebar
    
    // Only allow bombs if game has started
    if (!gameState.gameStarted) return;
    
    sendToServer('bomb');
  }
  
  // Testing: Generate local maze (only when not connected or game not started)
  else if (e.key.toLowerCase() === 'g' && (!gameState.gameStarted || !ws || ws.readyState !== WebSocket.OPEN)) {
    // Generate test maze locally for testing UI
    gameState.maze = generateMaze(13, 23);
    renderGame();
    showStatus('Test maze generated locally (Press G)');
  }
});

function init() {
  // Create UI elements using createElement and render, then mount them

  // 1. Status Div
  if (!document.getElementById('status')) {
    const statusVNode = createElement('div', {
      attrs: {
        id: 'status'
      }
    });
    const statusDomElement = render(statusVNode);
    document.body.insertBefore(statusDomElement, document.body.firstChild);
  }

  // 2. Game Container
  if (!document.getElementById('game-container')) {
    const gameContainerVNode = createElement('div', {
      attrs: {
        id: 'game-container'
      }
    });
    const gameContainerDomElement = render(gameContainerVNode);

    const appElement = document.getElementById('app') || document.body;
    appElement.appendChild(gameContainerDomElement);
  }

  // 3. Instructions Div
  if (!document.getElementById('instructions')) {
    const instructionsVNode = createElement('div', {
      attrs: {
        id: 'instructions'
      },
      children: [
        createElement('p', {
          children: [
            createElement('strong', { children: ['Controls:'] }),
            ' Arrow Keys or WASD to move, Spacebar or Q for bomb'
          ]
        }),
        createElement('p', {
          children: [
            createElement('strong', { children: ['Testing:'] }),
            ' Press G to generate test maze when offline'
          ]
        })
      ]
    });
    const instructionsDomElement = render(instructionsVNode);
    document.body.appendChild(instructionsDomElement);
  }
  // Call original functions
  showStatus('Connecting to server...');
  connectToServer();
}

////////////////////////////////ok

function renderJoinScreen() {
  return createElement('div', {
    attrs: { class: 'screen join-screen' },
    children: [
      createElement('h1', { children: ['Welcome to Bomberman!'] }),
      createElement('p', { children: ['Join the game and battle your friends!'] }),
      createElement('button', {
        attrs: { class: 'btn btn-primary' },
        children: ['Join Game'],
        events: { click: () => {
          // This will trigger the router to update the hash, which updates the store,
          // which then triggers renderApp to render the lobby screen.
          window.location.hash = '#/lobby';
        }}
      }),
      // Simple checkbox to simulate Player 1 status for testing
      createElement('div', {
        attrs: { style: 'margin-top: 20px; font-size: 0.9em; color: #555;' },
        children: [
          createElement('label', {
            children: [
              'Simulate Player 1 status: ',
              createElement('input', {
                attrs: { type: 'checkbox', checked: gameState.getState().isPlayer1 },
                events: { change: (e) => {
                  gameState.setState({ ...store.getState(), isPlayer1: e.target.checked });
                }}
              })
            ]
          })
        ]
      })
    ]
  });
}


function renderLobbyScreen() {
  const state = gameState.getState();
  let lobbyContent;

  if (state.isPlayer1) {
    lobbyContent = [
      createElement('h2', { children: ['Lobby: You are Player 1'] }),
      createElement('p', { children: ['Click "Start Game" when ready.'] }),
      createElement('button', {
        attrs: { class: 'btn btn-success' },
        children: ['Start Game (Player 1)'],
        events: { click: () => {
          // When Player 1 starts, reset game state for a fresh game
          gameState.setState({
            ...gameState.getState(),
            players: { },
            bombs: [],
            explosions: [],
            gameOver: false,
            winner: null,
            mazeLayout: generateMaze(INITIAL_MAZE_ROWS, INITIAL_MAZE_COLS),
            currentScreen: 'game' // Switch to game screen
          });
          window.location.hash = '#/game'; // Update URL hash
        }}
      })
    ];
  } else {
    lobbyContent = [
      createElement('h2', { children: ['Lobby: Waiting for Player 1...'] }),
      createElement('p', { children: ['Please wait for Player 1 to start the game.'] })
    ];
  }

  return createElement('div', {
    attrs: { class: 'screen lobby-screen' },
    children: lobbyContent
  });
}

createRouter({
  '/': () => {
    gameState.setState({ ...gameState.getState(), currentScreen: 'join' });
  },
  '/lobby': () => {
    gameState.setState({ ...gameState.getState(), currentScreen: 'lobby' });
  },
  '/game': () => {
    gameState.setState({ ...gameState.getState(), currentScreen: 'game' });
  },
});

function renderApp() {
  const state = gameState.getState();
  const appRootElement = document.getElementById('app'); // Main container defined in index.html

  if (!appRootElement) {
    console.error("Root element with ID 'app' not found. Ensure your index.html has <div id='app'></div>");
    return;
  }

  let vNodeToRender;
  switch (state.currentScreen) {
    case 'join':
      vNodeToRender = renderJoinScreen();
      break;
    case 'lobby':
      vNodeToRender = renderLobbyScreen();
      break;
    case 'game':
      vNodeToRender = renderGameScreen();
      break;
    default:
      vNodeToRender = createElement('div', { children: ['404 - Page Not Found'] });
  }

  // Render the VNode to a real DOM element and mount it into the app root.
  Mount(render(vNodeToRender), appRootElement);
}

///////////////////////////////ok

// Call init when the DOM is fully loaded
// document.addEventListener('DOMContentLoaded', init);
document.addEventListener('DOMContentLoaded', renderApp);

// Auto-reconnect functionality
// function setupAutoReconnect() {
//   if (!ws || ws.readyState === WebSocket.CLOSED) {
//     console.log('Attempting to reconnect...');
//     showStatus('Reconnecting...');
//     connectToServer();
//   }
// }

// Try to reconnect every 5 seconds if disconnected
// setInterval(() => {
//   if (!ws || ws.readyState === WebSocket.CLOSED) {
//     setupAutoReconnect();
//   }
// }, 5000);

// Start the client
// init();
renderApp()