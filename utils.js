import {
  createElement,
  render,
  createStore,
  createRouter,
  mount,
  diff,
  on,
} from "./src/main.js";

// src/main.js
// src/main.js
// import { createStore } from './store.js';
//import { initRouter } from './routes.js';
//import { connectWebSocket } from './client.js';

// // Import your VDOM functions:
// import render from './vdom/Render.js'; // This is your function to create a real DOM node from VDOM
// import diff from './vdom/diff.js';     // This is your function to calculate and apply patches

// 1. Define your initial game state and create the store instance
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
  currentScreen: "join", // This will be updated by the router's actions
  isPlayer1: false,
  nickname: '',
  lobbyPlayers: [],
  lobbyCountdown: null,
  gameId: null,
  initialGameData: null,
});

// Get the root DOM element where the app will be mounted
const appRoot = document.getElementById('app');
let currentVDomTree = null; // To keep track of the last rendered VDOM tree for patching

/**
 * Renders the application by patching the new VDOM tree into the DOM.
 * This is the central rendering function called by the route actions.
 * @param {object} newVDomTree - The VDOM tree to render.
 */
export function renderApp(newVDomTree) {
    if (!appRoot) {
        console.error("Root element #app not found!");
        return;
    }

    if (currentVDomTree === null) {
        // First render: Create the actual DOM node from the VDOM tree
        // and append it to the root element.
        const actualDomNode = render(newVDomTree);
        appRoot.appendChild(actualDomNode);
    } else {
        // Subsequent renders: Calculate the diff between the old and new VDOM trees,
        // which returns a patch function. Then, apply this patch function
        // to the *existing* actual DOM node (which is the first child of appRoot).
        const patchFunction = diff(currentVDomTree, newVDomTree);
        patchFunction(appRoot.firstChild);
    }
    currentVDomTree = newVDomTree; // Update the reference to the current VDOM tree
}

// 2. Define your routes object
// Each key is a hash path (without the #), and each value is a function
// that will be executed when that route is matched.
const routes = {
  "/": () => {
    gameState.setState({ currentScreen: "join" }); // Update state
    renderApp(renderJoinScreen(gameState)); // Render the screen
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

// 3. Subscribe to gameState changes to trigger re-renders
// This is crucial for reactive updates when state changes *within* a screen
// (e.g., lobby countdown, player list update).
gameState.subscribe(() => {
    // When state changes, we need to re-render the *current* screen.
    // The `currentScreen` property in `gameState` tells us which screen is active.
    // We then call the appropriate render function and update the DOM.
    console.log("Global state changed. Re-rendering current active screen.");
    const currentScreenName = gameState.getState().currentScreen;

    if (currentScreenName === 'join') {
        renderApp(renderJoinScreen(gameState));
    } else if (currentScreenName === 'lobby') {
        renderApp(renderLobbyScreen(gameState));
    } else if (currentScreenName === 'game') {
        renderApp(renderGameScreen(gameState));
    }
    // Add more conditions for other screens if you introduce them
});


// 4. Initialize the router with your defined routes
createRouter(routes);

// 5. Initial WebSocket connection setup, passing the gameState instance
connectWebSocket(gameState);