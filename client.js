import { render, createStore, createRouter, diff } from "./src/main.js";
import { connectWebSocket } from './ws.js';
import renderJoinScreen from './views/JoinView.js';
import renderLobbyScreen from './views/LobbyView.js';
import renderGameScreen from './views/GameView.js';
import getRoutes from './router/index.js'; // Renamed for clarity

const gameState = createStore({
  players: {}, bombs: [], explosions: [],
  gameOver: false, winner: null, gameStarted: false,
  mazeLayout: null, currentScreen: "join", isPlayer1: false,
  nickname: "", lobbyCountdown: null,
});

const appRoot = document.getElementById('app');
let currentVDomTree = null;

export function renderApp(newVDomTree) {
  if (!appRoot) {
    console.error("Root element #app not found!");
    return;
  }
  if (!newVDomTree) {
      console.error("renderApp called with null or undefined VDOM tree.");
      return;
  }
  if (currentVDomTree === null || !appRoot.hasChildNodes()) {
    appRoot.innerHTML = '';
    const actualDomNode = render(newVDomTree);
    appRoot.appendChild(actualDomNode);
  } else {
    const patchFunction = diff(currentVDomTree, newVDomTree);
    patchFunction(appRoot.firstChild);
  }
  currentVDomTree = newVDomTree;
}

// Get the routes OBJECT from your router file.
const routes = getRoutes(gameState);

// Pass the OBJECT to the framework's router. This will now work correctly.
createRouter(routes);

// Subscribe to state changes from the server
gameState.subscribe(() => {
  const state = gameState.getState();
  const currentScreenName = state.currentScreen;

  // If the server signals the game has started, navigate
  if (state.gameStarted && currentScreenName === "lobby") {
    window.location.hash = "#/game";
    return;
  }

  // This logic is for re-rendering a view when data changes,
  // e.g., the lobby countdown or player list updates.
  // The initial render is handled by createRouter on page load.
  if (state.currentScreen === 'join') {
      renderApp(renderJoinScreen(gameState));
  } else if (state.currentScreen === 'lobby') {
      renderApp(renderLobbyScreen(gameState));
  } else if (state.currentScreen === 'game') {
      renderApp(renderGameScreen(gameState));
  }
});

connectWebSocket(gameState);