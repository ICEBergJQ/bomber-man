import createElement from './vdom/CreateElement.js';
import render from './vdom/Render.js';
import Diff from './vdom/Diff.js';
import mount from './vdom/Mount.js';
import { createStore } from './core/store.js';
import { createRouter } from './core/router.js';
import { on } from './core/events.js'; // your delegated event system

// --------- Store to hold client state ---------

const store = createStore({
  view: 'lobby',       // 'lobby', 'waiting', 'game'
  ws: null,            // WebSocket instance
  playerId: null,
  roomCode: '',
  lobbyError: '',
  gameState: {
    players: {},
    bombs: [],
    explosions: [],
    maze: null,
    gameStarted: false,
    gameOver: false,
    winner: null,
  },
});

// --------- Helper to send messages ---------

function sendToServer(type, data = {}) {
  const ws = store.getState().ws;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}

// --------- Connect to server with optional room code ---------

function connectToServer(roomCode = '') {
  if (store.getState().ws) {
    store.getState().ws.close();
  }
  const ws = new WebSocket('ws://localhost:8080');

  ws.onopen = () => {
    console.log('Connected to server');
    store.setState({ ws, lobbyError: '' });
    if (roomCode) {
      sendToServer('joinRoom', { roomCode });
    }
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    } catch (err) {
      console.error('Error parsing server message:', err);
    }
  };

  ws.onclose = () => {
    console.log('Disconnected from server');
    store.setState({ ws: null, playerId: null, view: 'lobby' });
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    store.setState({ lobbyError: 'Connection error' });
  };
}

// --------- Handle messages from server ---------

function handleServerMessage(message) {
  switch (message.type) {
    case 'welcome':
      store.setState({ playerId: message.data.playerId });
      console.log(`I am player ${message.data.playerId}`);
      break;

    case 'roomCreated':
      store.setState({
        roomCode: message.data.roomCode,
        view: 'waiting',
        lobbyError: '',
      });
      break;

    case 'roomJoined':
      store.setState({
        roomCode: message.data.roomCode,
        view: 'waiting',
        lobbyError: '',
      });
      break;

    case 'roomJoinFailed':
      store.setState({ lobbyError: message.data.message });
      break;

    case 'gameState':
      store.setState({
        gameState: message.data,
        view: 'game',
      });
      break;

    case 'error':
      store.setState({ lobbyError: message.data.message });
      break;
  }
}

// --------- Lobby UI ---------

function LobbyView() {
  const state = store.getState();

  return createElement('div', {
    attrs: { class: 'lobby' },
    children: [
      createElement('h2', { children: ['Bomberman Lobby'] }),
      state.lobbyError ? createElement('p', {
        attrs: { class: 'error' },
        children: [state.lobbyError]
      }) : null,
      createElement('button', {
        attrs: { id: 'btn-create-room' },
        children: ['Create Room'],
        events: {}
      }),
      createElement('div', {
        attrs: { style: 'margin-top: 20px;' },
        children: [
          createElement('input', {
            attrs: {
              type: 'text',
              id: 'input-room-code',
              placeholder: 'Enter Room Code',
              value: state.roomCode || ''
            },
            events: {
              input: (e) => {
                store.setState({ roomCode: e.target.value.toUpperCase() });
              }
            }
          }),
          createElement('button', {
            attrs: { id: 'btn-join-room', disabled: !state.roomCode.trim() },
            children: ['Join Room'],
            events: {}
          })
        ]
      }),
      createElement('p', {
        attrs: { style: 'margin-top: 10px; font-size: 12px; color: #555;' },
        children: ['Share your room code with friends to join!']
      })
    ].filter(Boolean),
  });
}

// --------- Waiting Room UI ---------

function WaitingRoomView() {
  const state = store.getState();
  return createElement('div', {
    attrs: { class: 'waiting-room' },
    children: [
      createElement('h2', { children: [`Waiting in Room: ${state.roomCode}`] }),
      createElement('p', { children: ['Waiting for players to join...'] }),
      createElement('button', {
        attrs: { id: 'btn-leave-room' },
        children: ['Leave Room'],
        events: {}
      }),
    ],
  });
}

// --------- Game UI ---------

function MazeCell(type, row, col) {
  const state = store.getState();
  const gameState = state.gameState;

  let className = 'cell';

  const explosionAt = gameState.explosions.find(e => e.row === row && e.col === col);
  if (explosionAt) {
    className += ' explosion';
  } else {
    const bombAt = gameState.bombs.find(b => b.row === row && b.col === col);
    if (bombAt) {
      className += ' bomb';
    } else {
      const playerAt = Object.values(gameState.players).find(p => p.alive && p.row === row && p.col === col);
      if (playerAt) {
        className += ` ${playerAt.id}`;
        if (playerAt.playerId === state.playerId) {
          className += ' my-player';
        }
      } else {
        switch (type) {
          case '#': className += ' wall'; break;
          case '*': className += ' box'; break;
          default: className += ' empty'; break;
        }
      }
    }
  }

  return createElement('div', {
    attrs: { class: className }
  });
}

function GameView() {
  const state = store.getState();
  const maze = state.gameState.maze;
  if (!maze) return createElement('div', { children: ['Loading...'] });

  const cells = maze.flatMap((row, r) =>
    row.map((cell, c) => MazeCell(cell, r, c))
  );

  return createElement('div', {
    attrs: { class: 'game' },
    children: cells
  });
}

// --------- Render function with diff and mount ---------

let currentVNode = null;
let currentNode = document.getElementById('app') || document.body;

function renderApp() {
  const state = store.getState();

  let newVNode;
  switch (state.view) {
    case 'lobby':
      newVNode = LobbyView();
      break;
    case 'waiting':
      newVNode = WaitingRoomView();
      break;
    case 'game':
      newVNode = GameView();
      break;
    default:
      newVNode = createElement('div', { children: ['Unknown view'] });
  }

  if (!currentVNode) {
    const node = render(newVNode);
    currentNode = mount(node, currentNode);
    currentVNode = newVNode;
  } else {
    const patch = Diff(currentVNode, newVNode);
    currentNode = patch(currentNode);
    currentVNode = newVNode;
  }
}

// --------- Subscribe render to store updates ---------

store.subscribe(renderApp);
renderApp();

// --------- Event delegation for buttons ---------

// Create room button
on('click', '#btn-create-room', () => {
  connectToServer();
  sendToServer('createRoom');
});

// Join room button
on('click', '#btn-join-room', () => {
  const roomCode = store.getState().roomCode.trim();
  if (roomCode) {
    connectToServer(roomCode);
  }
});

// Leave room button
on('click', '#btn-leave-room', () => {
  const ws = store.getState().ws;
  if (ws) {
    ws.close();
  }
  store.setState({ view: 'lobby', playerId: null, roomCode: '', lobbyError: '' });
});

// --------- Keyboard input for game ---------

document.addEventListener('keydown', (e) => {
  const state = store.getState();

  if (state.view !== 'game') return;

  // Restart on R if game over
  if (e.key.toLowerCase() === 'r' && state.gameState.gameOver) {
    sendToServer('restart');
    return;
  }

  if (!state.playerId || state.gameState.gameOver) return;

  // Movement keys
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    if (!state.gameState.gameStarted) return;
    let direction;
    switch (e.key) {
      case 'ArrowUp': direction = 'up'; break;
      case 'ArrowDown': direction = 'down'; break;
      case 'ArrowLeft': direction = 'left'; break;
      case 'ArrowRight': direction = 'right'; break;
    }
    sendToServer('move', { direction });
  }
  // WASD keys alternative
  else if (['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
    if (!state.gameState.gameStarted) return;
    let direction;
    switch (e.code) {
      case 'KeyW': direction = 'up'; break;
      case 'KeyS': direction = 'down'; break;
      case 'KeyA': direction = 'left'; break;
      case 'KeyD': direction = 'right'; break;
    }
    sendToServer('move', { direction });
  }
  // Bomb placement (space or Q)
  else if (e.key === ' ' || e.code === 'KeyQ') {
    e.preventDefault();
    if (!state.gameState.gameStarted) return;
    sendToServer('bomb');
  }
});
