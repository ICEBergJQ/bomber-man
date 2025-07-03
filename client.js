import createElement from './vdom/CreateElement.js';
import render from './vdom/Render.js';
import Diff from './vdom/Diff.js';
import mount from './vdom/Mount.js';
import { createStore } from './core/store.js';
import { createRouter } from './core/router.js';
import { on } from './core/events.js'; // your delegated event system





const store = createStore({
  roomCode: null,
  playerId: null,
  gameState: null,
  error: null
});

let currentVNode = null;
let rootNode = null;
let socket = null;

function App(state) {
  if (state.error) {
    return createElement('div', { attrs: {}, children: [
      createElement('h2', { children: ['Error: ' + state.error] }),
      createElement('a', { attrs: { href: '#/' }, children: ['Go back'] })
    ]});
  }

  if (!state.roomCode) {
    return createElement('div', { attrs: {}, children: [
      createElement('h1', { children: ['Bomberman'] }),
      createElement('button', { attrs: { id: 'createRoom' }, children: ['Create Room'] }),
      createElement('form', { attrs: { id: 'joinForm' }, children: [
        createElement('input', { attrs: { type: 'text', placeholder: 'Room Code', id: 'roomInput' } }),
        createElement('button', { attrs: { type: 'submit' }, children: ['Join Room'] })
      ]})
    ]});
  }

  return createElement('div', { attrs: {}, children: [
    createElement('h2', { children: ['Room: ' + state.roomCode] }),
    createElement('div', { attrs: { id: 'game' }, children: renderGame(state.gameState, state.playerId) }),
    createElement('button', { attrs: { id: 'restart' }, children: ['Restart'] })
  ]});
}

function renderGame(gameState, playerId) {
  if (!gameState) return [];

  const rows = gameState.maze.map((row, rIdx) =>
    createElement('div', { attrs: { class: 'row' }, children: 
      row.map((cell, cIdx) => {
        let content = cell;
        // Check for bombs
        if (gameState.bombs.find(b => b.row === rIdx && b.col === cIdx)) content = 'B';
        // Check for explosions
        if (gameState.explosions.find(e => e.row === rIdx && e.col === cIdx)) content = 'X';
        // Check for players
        const player = Object.values(gameState.players).find(p => p.row === rIdx && p.col === cIdx && p.alive);
        if (player) content = player.playerId === playerId ? 'Y' : 'P';

        return createElement('span', { attrs: { class: 'cell' }, children: [content] });
      })
    })
  );
  return rows;
}

// Handle WebSocket messages
function setupSocket() {
  socket = new WebSocket('ws://localhost:8080');

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'roomCreated') {
      store.setState({ ...store.getState(), roomCode: message.data.roomCode });
    } else if (message.type === 'welcome') {
      store.setState({ ...store.getState(), playerId: message.data.playerId });
    } else if (message.type === 'gameState') {
      store.setState({ ...store.getState(), gameState: message.data });
    } else if (message.type === 'error') {
      store.setState({ roomCode: null, playerId: null, gameState: null, error: message.data.message });
    }
  };

  socket.onerror = () => {
    store.setState({ ...store.getState(), error: 'Connection error' });
  };
}

// Send helpers
const send = (type, data) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, data }));
  }
};

// Events
on('click', '#createRoom', () => {
  send('createRoom', {});
});

on('submit', '#joinForm', (e) => {
  e.preventDefault();
  const roomCode = document.querySelector('#roomInput').value.trim().toUpperCase();
  if (roomCode) {
    send('joinRoom', { roomCode });
  }
});

on('click', '#restart', () => {
  send('restart', {});
});

document.addEventListener('keydown', (e) => {
  if (!store.getState().gameState?.gameStarted) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    if (e.key === ' ') {
      send('bomb', {});
    } else {
      const dirMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      send('move', { direction: dirMap[e.key] });
    }
  }
});

// Router
createRouter({
  '/': () => {
    store.setState({ roomCode: null, playerId: null, gameState: null, error: null });
  }
});

// Watch state changes and re-render
store.subscribe(() => {
  const newVNode = App(store.getState());
  if (!currentVNode) {
    currentVNode = newVNode;
    rootNode = render(currentVNode);
    document.querySelector('#app').replaceWith(rootNode);
  } else {
    const patch = Diff(currentVNode, newVNode);
    patch(rootNode);
    currentVNode = newVNode;
  }
});

// Init
setupSocket();
