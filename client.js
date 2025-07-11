import { render, createStore, createRouter, diff } from "./src/main.js";
import renderJoinScreen from './views/JoinView.js';
import renderLobbyScreen from './views/LobbyView.js';
import renderGameScreen from './views/GameView.js';
import NotfoundView from './views/NotfoundView.js';
import getRoutes from './router/index.js';

// --- WebSocket & State Management ---
let socket;
function sendToServer(message) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}
const gameState = createStore({
  players: {}, bombs: [], explosions: [], gameOver: false, winner: null, gameStarted: false,
  mazeLayout: null, currentScreen: "join", isPlayer1: false, nickname: ""
});
function connectWebSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return;
  socket = new WebSocket(`ws://${window.location.hostname}:8080`);
  socket.onopen = () => console.log("WebSocket connection established.");
  socket.onclose = () => setTimeout(connectWebSocket, 3000);
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "gameState") {
      gameState.setState({ ...gameState.getState(), ...msg.data });
    }
  };
}

// --- Rendering & Routing ---
const appRoot = document.getElementById('app');
let currentVDomTree = null;
export function renderApp(newVDomTree) {
  if (!appRoot || !newVDomTree) return;
  if (currentVDomTree === null || !appRoot.hasChildNodes()) {
    appRoot.innerHTML = '';
    appRoot.appendChild(render(newVDomTree));
  } else {
    diff(currentVDomTree, newVDomTree)(appRoot.firstChild);
  }
  currentVDomTree = newVDomTree;
}

// The framework's router now correctly handles URL changes and calls the functions in routes
const routes = getRoutes(gameState);
createRouter(routes);

// A map of our screen names to their render functions
const screens = {
    join: renderJoinScreen,
    lobby: renderLobbyScreen,
    game: renderGameScreen,
    "404": NotfoundView,
};

// --- State Subscription ---
gameState.subscribe(() => {
  const state = gameState.getState();
  const currentScreenName = state.currentScreen;

  // This handles the automatic navigation when the game starts
  if (state.gameStarted && currentScreenName === "lobby") {
    window.location.hash = "#/game";
    return; // Exit here because the hash change will trigger the router, which updates the state again.
  }
  
  // This is the single source of truth for rendering.
  // It checks the current screen in the state and calls the correct render function.
  const renderFunction = screens[currentScreenName];
  if (renderFunction) {
      renderApp(renderFunction(gameState, sendToServer));
  }
});

// --- Start Application ---
connectWebSocket();