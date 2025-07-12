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
  socket.onopen = () => console.log("✅ WebSocket connection established.");
  socket.onclose = () => setTimeout(connectWebSocket, 3000);
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "gameState") {
      console.log("✅ [Client] Received gameState from server:", msg.data);
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
const routes = getRoutes(gameState);
const handleRouteChange = () => {
    const path = window.location.hash.slice(1) || "/";
    const handler = routes[path] || routes["/404"];
    handler();
};
window.addEventListener("hashchange", handleRouteChange);
window.addEventListener("load", handleRouteChange);

const screens = {
    join: renderJoinScreen, lobby: renderLobbyScreen,
    game: renderGameScreen, "404": NotfoundView,
};

// --- State Subscription ---
gameState.subscribe(() => {
  const state = gameState.getState();
  const currentScreenName = state.currentScreen;
  if (state.gameStarted && currentScreenName === "lobby") {
    window.location.hash = "#/game";
    return;
  }
  const renderFunction = screens[currentScreenName];
  if (renderFunction) {
      renderApp(renderFunction(gameState, sendToServer));
  }
});

// --- Start Application ---
connectWebSocket();