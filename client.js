import {
  render,
  createStore,
  createRouter,
  diff,
} from "./src/main.js";
import { connectWebSocket } from './ws.js';

import renderJoinScreen from './views/JoinView.js';
import renderLobbyScreen from './views/LobbyView.js';
import renderGameScreen from './views/GameView.js';
import router from './router/index.js';

// 1. Define your initial game state and create the store instance
const gameState = createStore({
  players: {},
  bombs: [],
  explosions: [],
  gameOver: false,
  winner: null,
  gameStarted: false,
  mazeLayout: null,
  currentScreen: "join",
  isPlayer1: false,
  nickname: '111',
  lobbyPlayers: [],
  lobbyCountdown: null,
  gameId: null,
  initialGameData: null,
});


const appRoot = document.getElementById('app');
let currentVDomTree = null;

export function renderApp(newVDomTree) {
  if (!appRoot) {
    console.error("Root element #app not found!");
    return;
  }

  if (currentVDomTree === null) {
    const actualDomNode = render(newVDomTree);
    appRoot.appendChild(actualDomNode);
  } else {
    const patchFunction = diff(currentVDomTree, newVDomTree);
    patchFunction(appRoot.firstChild);
  }
  currentVDomTree = newVDomTree; // Update the reference to the current VDOM tree
}

const routes = router(gameState)
gameState.subscribe(() => {
  // console.log("Global state changed. Re-rendering current active screen.");
  const currentScreenName = gameState.getState().currentScreen;

  // console.log("Current screen name:", gameState.getState().currentScreen);

  if (currentScreenName === 'join') {
    renderApp(renderJoinScreen(gameState));
  } else if (currentScreenName === 'lobby') {
    renderApp(renderLobbyScreen(gameState));
  } else if (currentScreenName === 'game') {
    renderApp(renderGameScreen(gameState));
  }
});


createRouter(routes);
connectWebSocket(gameState);