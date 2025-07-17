import { render, createStore, createRouter, diff } from "./src/main.js";
import renderJoinScreen from "./views/JoinView.js";
import renderLobbyScreen from "./views/LobbyView.js";
import renderGameScreen from "./views/GameView.js";
import NotfoundView from "./views/NotfoundView.js";
import getRoutes from "./router/index.js";
import renderGameErr from "./views/gameFullView.js";

// --- WebSocket & State Management ---
let socket;

export function getSocket() {
  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}

function sendToServer(message) {
  if (socket && socket.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify(message));
}
const gameState = createStore({
  players: {
    alive: true,
    lives: 3,
    //speed: 1.5,
  },
  bombs: [],
  explosions: [],
  gameOver: false,
  winner: null,
  gameStarted: false,
  maze: null,
  currentScreen: "join",
  nickname: "",
  chatMessages: [],
  winner: "",
});
export function connectWebSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return;
  socket = new WebSocket(`ws://${window.location.hostname}:8080`);
  socket.onopen = () => console.log("WebSocket connection established.");
  socket.onclose = (e) => {
    console.log("WebSocket connection closed" + e.reason);
    if (
      e.reason === "Game is full or has already started" ||
      e.reason === "Disconnected: max players reached"
    ) {
      gameState.setState({
        players: {},
        bombs: [],
        explosions: [],
        gameOver: false,
        winner: null,
        gameStarted: false,
        maze: null,
        nickname: "",
        chatMessages: [],
        currentScreen: "gameFull",
        countD: 0,
        phase: "",
      });
      window.location.hash = "#/gameFull";
    }
  };
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log(msg);
    if (msg.type === "countdown"){
      gameState.setState({ ...gameState.getState(), countD: msg.time, phase: msg.phase });
    } else if (msg.type === "gameState") {
      gameState.setState({ ...gameState.getState(), ...msg.data });
    } else if (msg.type === "chatMessage") {
      const currentState = gameState.getState();
      const newMessages = [...currentState.chatMessages, msg.data];
      if (newMessages.length > 20) newMessages.shift();
      gameState.setState({ ...currentState, chatMessages: newMessages });
    } else if (msg.type === "stopped"){
      gameState.setState({ ...gameState.getState(), countD: 0, phase: "" })
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
  gameFull: renderGameErr,
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

// --- NEW MOVEMENT LOGIC & STATE ---
const MOVEMENT_SPEED = 50; // Time in milliseconds to cross one tile.
let clientPlayerState = {};
let lastFrameTime = performance.now();

// --- NEW Input Handling ---
window.addEventListener("keydown", (e) => {
  // We only process input if we are on the game screen
  if (gameState.getState().currentScreen !== "game") return;

  // Ignore input if we are typing in chat
  if (document.activeElement.id === "chat-input") return;

  // Find our player in the local state
  const myPlayerId = Object.values(gameState.getState().players).find(
    (p) => p.nickname === gameState.getState().nickname
  )?.playerId;
  const myClientState = clientPlayerState[myPlayerId];
  if (!myClientState) return;

  // Only accept a new move command if the player is NOT already moving.
  if (myClientState.isMoving) {
    return;
  }

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
    sendToServer({ type: "move", direction });
  }
});

function gameLoop(currentTime) {
  const state = gameState.getState();
  const delta = currentTime - lastFrameTime;
  lastFrameTime = currentTime;

  // The game loop no longer sends messages. It only handles animation.
  if (state.currentScreen === "game" && state.players) {
    Object.values(state.players).forEach((serverPlayer) => {
      const playerElement = document.getElementById(
        `player-${serverPlayer.playerId}`
      );
      if (!playerElement) return;

      if (!serverPlayer.alive) {
        playerElement.style.display = "none";
        return;
      }
      playerElement.style.display = "";

      if (!clientPlayerState[serverPlayer.playerId]) {
        clientPlayerState[serverPlayer.playerId] = {
          x: serverPlayer.x,
          y: serverPlayer.y,
          startX: serverPlayer.x,
          startY: serverPlayer.y,
          targetX: serverPlayer.x,
          targetY: serverPlayer.y,
          isMoving: false,
          moveProgress: 0,
        };
      }
      const localPlayer = clientPlayerState[serverPlayer.playerId];

      if (
        localPlayer.targetX !== serverPlayer.x ||
        localPlayer.targetY !== serverPlayer.y
      ) {
        localPlayer.isMoving = true;
        localPlayer.moveProgress = 0;
        localPlayer.startX = localPlayer.x;
        localPlayer.startY = localPlayer.y;
        localPlayer.targetX = serverPlayer.x;
        localPlayer.targetY = serverPlayer.y;
      }

      const playerState = state.players[serverPlayer.playerId];
      if (localPlayer.isMoving) {
        //const speedMultiplier = playerState?.speed || 1;
        localPlayer.moveProgress += delta / MOVEMENT_SPEED
        localPlayer.x =
          localPlayer.startX +
          (localPlayer.targetX - localPlayer.startX) * localPlayer.moveProgress;
        localPlayer.y =
          localPlayer.startY +
          (localPlayer.targetY - localPlayer.startY) * localPlayer.moveProgress;

        if (localPlayer.moveProgress >= 1) {
          localPlayer.isMoving = false;
          localPlayer.moveProgress = 0;
          localPlayer.x = localPlayer.targetX;
          localPlayer.y = localPlayer.targetY;
        }
      }
      // const hasSpeedBoost = playerState?.speed > 1;
      // playerElement.classList.toggle("speed-boosted", hasSpeedBoost);
      playerElement.style.transform = `translate(${localPlayer.x}px, ${localPlayer.y}px)`;
    });
  }

  requestAnimationFrame(gameLoop);
}

// --- Start Application ---
connectWebSocket();
requestAnimationFrame(gameLoop);
