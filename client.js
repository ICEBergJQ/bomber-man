import {
  createElement,
  render,
  createStore,
  createRouter,
  mount,
  diff,
  on,
} from "./src/main.js";
import { connectWebSocket } from './ws.js';

import renderJoinScreen from './views/JoinView.js';
import renderLobbyScreen from './views/LobbyView.js';
import renderGameScreen from './views/GameView.js';

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
  nickname: '',
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

const routes = {
  "/": () => {
    gameState.setState({ currentScreen: "join"}); // Update state
    renderApp(renderJoinScreen(gameState)); // Render the screen
    console.log("Rendering join screen with current game state:", gameState.getState());
    
  },
  "/lobby": () => {
    gameState.setState({ currentScreen: "lobby" }); // Update state
    renderApp(renderLobbyScreen(gameState)); // Render the screen
  },
  "/game": () => {
    gameState.setState({ currentScreen: "game" }); // Update state
    renderApp(renderGameScreen(gameState)); // Render the screen
  },
  // You can add a 404-like route if needed, or let the default "/" handle it
};

gameState.subscribe(() => {
    console.log("Global state changed. Re-rendering current active screen.");
    const currentScreenName = gameState.getState().currentScreen;

    console.log("Current screen name:", gameState.getState().currentScreen);
    
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