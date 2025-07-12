import { render, createStore, createRouter, diff } from "./src/main.js";
import renderJoinScreen from "./views/JoinView.js";
import renderLobbyScreen from "./views/LobbyView.js";
import renderGameScreen from "./views/GameView.js";
import NotfoundView from "./views/NotfoundView.js";
import getRoutes from "./router/index.js";

// --- WebSocket & State Management ---
let socket;
function sendToServer(message) {
  if (socket && socket.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify(message));
}
const gameState = createStore({
  players: {},
  bombs: [],
  explosions: [],
  gameOver: false,
  winner: null,
  gameStarted: false,
  maze: null,
  currentScreen: "join",
  isPlayer1: false,
  nickname: "",
});
function connectWebSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return;
  socket = new WebSocket(`ws://${window.location.hostname}:8080`);
  socket.onopen = () => console.log("WebSocket connection established.");
  socket.onclose = () => setTimeout(connectWebSocket, 3000);
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "gameState")
      gameState.setState({ ...gameState.getState(), ...msg.data });
  };
}

// --- Rendering & Routing ---
const appRoot = document.getElementById("app");
let currentVDomTree = null;
export function renderApp(newVDomTree) {
  if (!appRoot || !newVDomTree) return;
  if (currentVDomTree === null || !appRoot.hasChildNodes()) {
    appRoot.innerHTML = "";
    appRoot.appendChild(render(newVDomTree));
  } else {
    diff(currentVDomTree, newVDomTree)(appRoot.firstChild);
  }
  currentVDomTree = newVDomTree;
}
const routes = getRoutes(gameState);
createRouter(routes);
const screens = {
  join: renderJoinScreen,
  lobby: renderLobbyScreen,
  game: renderGameScreen,
  404: NotfoundView,
};
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

// --- Game Loop for Smooth Movement ---
let clientPlayerState = {};

function gameLoop() {
  const state = gameState.getState();

  // Only run the expensive part of the loop if we are on the game screen
  if (state.currentScreen === "game" && state.players) {
    Object.values(state.players).forEach((serverPlayer) => {
      if (!serverPlayer.alive) return;

      const playerElement = document.getElementById(
        `player-${serverPlayer.playerId}`
      );
      if (!playerElement) return;

      // Initialize client-side state if it doesn't exist
      if (!clientPlayerState[serverPlayer.playerId]) {
        clientPlayerState[serverPlayer.playerId] = {
          x: serverPlayer.x,
          y: serverPlayer.y,
        };
      }
      const clientPlayer = clientPlayerState[serverPlayer.playerId];

      // Interpolate towards the target server position
      const targetX = serverPlayer.x;
      const targetY = serverPlayer.y;

      // Move 20% of the remaining distance each frame for a smooth ease-out effect
      clientPlayer.x += (targetX - clientPlayer.x) * 0.2;
      clientPlayer.y += (targetY - clientPlayer.y) * 0.2;

      // Update the actual DOM element's style using transform for performance
      playerElement.style.transform = `translate(${clientPlayer.x}px, ${clientPlayer.y}px)`;
    });
  }

  // Request the next animation frame
  requestAnimationFrame(gameLoop);
}

// --- Start Application ---
connectWebSocket();
gameLoop();