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
  chatMessages: [],
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
    } else if (msg.type === "chatMessage") {
      const currentState = gameState.getState();
      const newMessages = [...currentState.chatMessages, msg.data];
      if (newMessages.length > 20) newMessages.shift();
      gameState.setState({ ...currentState, chatMessages: newMessages });
    }
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

// The subscribe function is now responsible for ALL re-renders.
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

// --- "ONE PRESS, ONE MOVE" INPUT HANDLING ---
const pressedKeys = new Set();
window.addEventListener("keydown", (e) => {
  if (
    gameState.getState().currentScreen !== "game" ||
    document.activeElement.id === "chat-input"
  )
    return;
  if (pressedKeys.has(e.key)) return; // Ignore browser key repeats

  let direction = null;
  switch (e.key) {
    case "ArrowUp":
      direction = "up";
      break;
    case "ArrowDown":
      direction = "down";
      break;
    case "ArrowLeft":
      direction = "left";
      break;
    case "ArrowRight":
      direction = "right";
      break;
    case " ":
      e.preventDefault();
      sendToServer({ type: "bomb" });
      return;
  }
  if (direction) {
    e.preventDefault();
    pressedKeys.add(e.key);
    sendToServer({ type: "move", direction });
  }
});

window.addEventListener("keyup", (e) => {
  // When a key is released, remove it from the set so it can be pressed again.
  pressedKeys.delete(e.key);
});

// --- Start Application ---
connectWebSocket();
