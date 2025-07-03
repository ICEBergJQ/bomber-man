// main.js

// Import all necessary framework components
import render from "./vdom/Render.js";
import createElement from "./vdom/CreateElement.js";
import mount from "./vdom/Mount.js";
import { on } from "./core/events.js";
import { createStore } from "./core/store.js";
import { createRouter } from "./core/router.js";

// --- Game Initialization Data ---
const initialPlayers = {
  1: { row: 1, col: 1, id: 'player1', alive: true },
  2: { row: 1, col: 21, id: 'player2', alive: true },
  3: { row: 11, col: 1, id: 'player3', alive: true },
  4: { row: 11, col: 21, id: 'player4', alive: true }
};

const INITIAL_MAZE_ROWS = 13;
const INITIAL_MAZE_COLS = 23;

// --- Maze Generation ---
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
  maze[1][1] = ' '; maze[1][2] = ' '; maze[2][1] = ' ';
  maze[1][cols-2] = ' '; maze[1][cols-3] = ' '; maze[2][cols-2] = ' ';
  maze[rows-2][1] = ' '; maze[rows-2][2] = ' '; maze[rows-3][1] = ' ';
  maze[rows-2][cols-2] = ' '; maze[rows-2][cols-3] = ' '; maze[rows-3][cols-2] = ' ';

  return maze;
}

// --- Create Game Store ---
const store = createStore({
  players: { ...initialPlayers },
  bombs: [],
  explosions: [],
  gameOver: false,
  winner: null,
  mazeLayout: generateMaze(INITIAL_MAZE_ROWS, INITIAL_MAZE_COLS),
  currentScreen: 'join', // Tracks which screen should be rendered
  isPlayer1: false,     // Simulated: true if this client is player 1
});

// --- VDOM Cell Component ---
const mazeCell = (type, rowIndex, colIndex) => {
  const state = store.getState();
  let className = 'cell';

  const explosionAtPosition = state.explosions.find(exp =>
    exp.row === rowIndex && exp.col === colIndex
  );

  if (explosionAtPosition) {
    className += ' explosion';
  } else {
    const bombAtPosition = state.bombs.find(bomb =>
      bomb.row === rowIndex && bomb.col === colIndex
    );
    if (bombAtPosition) {
      className += ' bomb';
    } else {
      const playerAtPosition = Object.values(state.players).find(p =>
        p.alive && p.row === rowIndex && p.col === colIndex
      );
      if (playerAtPosition) {
        className += ` ${playerAtPosition.id}`;
      } else {
        switch (type) {
          case '#': className += ' wall'; break;
          case '*': className += ' box'; break;
          default:  className += ' empty'; break;
        }
      }
    }
  }
  return createElement('div', { attrs: { class: className } });
};

// --- Bomb Logic ---
function placeBomb(playerId) {
  const state = store.getState();
  const player = state.players[playerId];
  if (!player || !player.alive) return;

  const { row, col } = player;
  const existingBomb = state.bombs.find(bomb => bomb.row === row && bomb.col === col);
  if (existingBomb) return;

  const newBomb = { row, col, playerId, timeLeft: 3000, placedAt: Date.now() };
  store.setState({ bombs: [...state.bombs, newBomb] });

  setTimeout(() => {
    const currentState = store.getState();
    const bombIndex = currentState.bombs.findIndex(b =>
      b.row === newBomb.row && b.col === newBomb.col && b.placedAt === newBomb.placedAt
    );
    if (bombIndex !== -1) {
      const updatedBombs = currentState.bombs.filter((_, idx) => idx !== bombIndex);
      store.setState({ bombs: updatedBombs });
      explodeBomb(newBomb);
    }
  }, 3000);
}

function explodeBomb(bomb) {
  const state = store.getState();
  const explosionCells = [];
  const { row, col } = bomb;
  const currentMazeLayout = [...state.mazeLayout.map(r => [...r])];

  explosionCells.push({ row, col });

  const directions = [{ row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 }];

  directions.forEach(dir => {
    for (let distance = 1; distance <= 2; distance++) {
      const newRow = row + (dir.row * distance);
      const newCol = col + (dir.col * distance);

      if (newRow < 0 || newRow >= currentMazeLayout.length || newCol < 0 || newCol >= currentMazeLayout[0].length) {
        break;
      }

      const cellType = currentMazeLayout[newRow][newCol];
      if (cellType === '#') {
        break;
      } else if (cellType === '*') {
        currentMazeLayout[newRow][newCol] = ' ';
        explosionCells.push({ row: newRow, col: newCol });
        break;
      } else {
        explosionCells.push({ row: newRow, col: newCol });
      }
    }
  });

  const newExplosions = [...state.explosions];
  explosionCells.forEach(cell => {
    newExplosions.push({ row: cell.row, col: cell.col, createdAt: Date.now() });
  });

  store.setState({ explosions: newExplosions, mazeLayout: currentMazeLayout });
  checkPlayerDeaths();

  setTimeout(() => {
    const currentExplosions = store.getState().explosions;
    const remainingExplosions = currentExplosions.filter(exp => {
      return !explosionCells.some(cell => cell.row === exp.row && cell.col === exp.col);
    });
    store.setState({ explosions: remainingExplosions });
  }, 500);
}

// --- Game Over & Restart Logic ---
function checkPlayerDeaths() {
  const state = store.getState();
  let updatedPlayers = { ...state.players };

  Object.values(updatedPlayers).forEach(player => {
    if (!player.alive) return;

    const playerInExplosion = state.explosions.find(exp =>
      exp.row === player.row && exp.col === player.col
    );

    if (playerInExplosion) {
      updatedPlayers = {
        ...updatedPlayers,
        [player.id.replace('player', '')]: { ...player, alive: false }
      };
      console.log(`Player ${player.id} died!`);
    }
  });

  if (JSON.stringify(state.players) !== JSON.stringify(updatedPlayers)) {
    store.setState({ players: updatedPlayers });
    checkWinCondition();
  }
}

function checkWinCondition() {
  const state = store.getState();
  const alivePlayers = Object.values(state.players).filter(p => p.alive);

  if (alivePlayers.length <= 1 && !state.gameOver) {
    const newGameOver = true;
    const newWinner = alivePlayers.length === 1 ? alivePlayers[0] : null;

    store.setState({ gameOver: newGameOver, winner: newWinner });

    setTimeout(() => {
      if (newWinner) {
        alert(`${newWinner.id.toUpperCase()} WINS! Press R to restart.`);
      } else {
        alert("DRAW! Everyone died! Press R to restart.");
      }
    }, 100);
  }
}

function restartGame() {
  store.setState({
    gameOver: false,
    winner: null,
    bombs: [],
    explosions: [],
    players: { ...initialPlayers },
    mazeLayout: generateMaze(INITIAL_MAZE_ROWS, INITIAL_MAZE_COLS),
    currentScreen: 'lobby' // After restart, go back to lobby
  });
  console.log("Game restarted!");
  window.location.hash = '#/lobby'; // Ensure hash reflects lobby
}


// --- NEW: Screen Rendering Functions ---

/**
 * Renders the initial "Join Game" screen.
 * @returns {object} A virtual DOM node for the join screen.
 */
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
                attrs: { type: 'checkbox', checked: store.getState().isPlayer1 },
                events: { change: (e) => {
                  store.setState({ ...store.getState(), isPlayer1: e.target.checked });
                }}
              })
            ]
          })
        ]
      })
    ]
  });
}

/**
 * Renders the lobby screen. Shows a "Start Game" button if this client is Player 1.
 * @returns {object} A virtual DOM node for the lobby screen.
 */
function renderLobbyScreen() {
  const state = store.getState();
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
          store.setState({
            ...store.getState(),
            players: { ...initialPlayers },
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

/**
 * Renders the actual game board and players.
 * This function returns a VNode, which will be rendered by renderApp.
 * @returns {object} A virtual DOM node for the game board.
 */
function renderGameScreen() {
    const state = store.getState();
    const gameDiv = createElement('div', {
        attrs: { class: 'game-board' },
        children: state.mazeLayout.flatMap((row, rowIndex) =>
          row.map((cell, colIndex) => mazeCell(cell, rowIndex, colIndex))
        ),
    });
    return gameDiv;
}


// --- Main Application Renderer ---
/**
 * The central rendering function that determines which screen to display
 * based on the `currentScreen` state.
 * It's subscribed to the store, so it runs on every state change.
 */
function renderApp() {
  const state = store.getState();
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
  mount(render(vNodeToRender), appRootElement);
}

// --- Store Subscription (Triggers renderApp on every state change) ---
store.subscribe(renderApp);


// --- Global Event Handling for Game Play ---
// This listener runs regardless of the screen, but its logic checks currentScreen
on('keydown', 'body', (e) => {
  const state = store.getState();

  // Only process game inputs if the current screen is 'game'
  if (state.currentScreen !== 'game') {
    return;
  }

  // Handle restart (active on game screen only)
  if (e.key.toLowerCase() === 'r' && state.gameOver) {
    restartGame();
    return;
  }

  // Don't process game input if game is over
  if (state.gameOver) return;

  let updatedPlayers = { ...state.players };

  // Player 1 movement (Arrow keys)
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    const player1 = updatedPlayers[1];
    if (!player1.alive) return;
    let newRow = player1.row, newCol = player1.col;
    switch (e.key) { case 'ArrowUp': newRow--; break; case 'ArrowDown': newRow++; break; case 'ArrowLeft': newCol--; break; case 'ArrowRight': newCol++; break; }
    if (state.mazeLayout[newRow] && state.mazeLayout[newRow][newCol] !== '#' &&
        state.mazeLayout[newRow][newCol] !== '*' && state.mazeLayout[newRow][newCol] !== undefined) {
      updatedPlayers[1] = { ...player1, row: newRow, col: newCol };
      store.setState({ players: updatedPlayers });
    }
  }
  // Player 2 movement (WASD)
  else if (['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
    const player2 = updatedPlayers[2];
    if (!player2.alive) return;
    let newRow = player2.row, newCol = player2.col;
    switch (e.code) { case 'KeyW': newRow--; break; case 'KeyS': newRow++; break; case 'KeyA': newCol--; break; case 'KeyD': newCol++; break; }
    if (state.mazeLayout[newRow] && state.mazeLayout[newRow][newCol] !== '#' &&
        state.mazeLayout[newRow][newCol] !== '*' && state.mazeLayout[newRow][newCol] !== undefined) {
      updatedPlayers[2] = { ...player2, row: newRow, col: newCol };
      store.setState({ players: updatedPlayers });
    }
  }
  // Bomb placement
  else if (e.key === ' ') {
    e.preventDefault();
    if (state.players[1].alive) { placeBomb(1); }
  }
  else if (e.code === 'KeyQ') {
    if (state.players[2].alive) { placeBomb(2); }
  }
});


// --- Router Initialization ---
// The router updates the `currentScreen` state in the store, which triggers renderApp.
createRouter({
  '/': () => {
    store.setState({ ...store.getState(), currentScreen: 'join' });
  },
  '/lobby': () => {
    store.setState({ ...store.getState(), currentScreen: 'lobby' });
  },
  '/game': () => {
    store.setState({ ...store.getState(), currentScreen: 'game' });
  },
});

// --- Initial UI Elements Setup (for status, instructions, etc. that persist across screens) ---
// This runs once when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Ensure the main #app root exists in your index.html
  if (!document.getElementById('app')) {
      const appRoot = document.createElement('div');
      appRoot.id = 'app';
      document.body.appendChild(appRoot);
  }

  // 1. Status Div
  if (!document.getElementById('status')) {
    const statusVNode = createElement('div', { attrs: { id: 'status' } });
    const statusDomElement = render(statusVNode);
    document.body.insertBefore(statusDomElement, document.body.firstChild);
  }

  // 2. Instructions Div
  if (!document.getElementById('instructions')) {
    const instructionsVNode = createElement('div', {
      attrs: { id: 'instructions' },
      children: [
        createElement('p', { children: [createElement('strong', { children: ['Controls:'] }), ' Arrow Keys or WASD to move, Spacebar or Q for bomb'] }),
        createElement('p', { children: [createElement('strong', { children: ['Testing:'] }), ' Press G to generate test maze when offline'] })
      ]
    });
    const instructionsDomElement = render(instructionsVNode);
    document.body.appendChild(instructionsDomElement);
  }

  // Initial connection message (can be updated by server logic later)
  showStatus('Connecting to server...');
  connectToServer();
});

// Placeholder for external functions (connectToServer, showStatus)
function connectToServer() {
  console.log("Attempting to connect to server...");
  setTimeout(() => {
    showStatus('Connected! Game ready.');
  }, 1500);
}

function showStatus(message) {
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.textContent = message;
  }
}