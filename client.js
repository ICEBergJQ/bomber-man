import { render, createStore, createRouter, diff } from "./src/main.js";
import renderJoinScreen from "./views/JoinView.js";
import renderLobbyScreen from "./views/LobbyView.js";
import renderGameScreen from "./views/GameView.js";
import NotfoundView from "./views/NotfoundView.js";
import getRoutes from "./router/index.js";

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

const MOVEMENT_SPEED = 150;
let clientPlayerState = {};
let lastFrameTime = performance.now();

window.addEventListener("keydown", (e) => {
  if (
    gameState.getState().currentScreen !== "game" ||
    document.activeElement.id === "chat-input"
  )
    return;
  const myPlayerId = Object.values(gameState.getState().players).find(
    (p) => p.nickname === gameState.getState().nickname
  )?.playerId;
  const myClientState = clientPlayerState[myPlayerId];
  if (!myClientState || myClientState.isMoving) return;
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

  if (state.currentScreen === "game" && state.players) {
    const myPlayerId = Object.values(state.players).find(
      (p) => p.nickname === state.nickname
    )?.playerId;

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
          moveProgress: 1,
        };
      }
      const localPlayer = clientPlayerState[serverPlayer.playerId];

      if (
        localPlayer.targetX !== serverPlayer.x ||
        localPlayer.targetY !== serverPlayer.y
      ) {
        if (localPlayer.isMoving) {
          localPlayer.x = localPlayer.targetX;
          localPlayer.y = localPlayer.targetY;
        }
        localPlayer.isMoving = true;
        localPlayer.moveProgress = 0;
        localPlayer.startX = localPlayer.x;
        localPlayer.startY = localPlayer.y;
        localPlayer.targetX = serverPlayer.x;
        localPlayer.targetY = serverPlayer.y;
      }

      if (localPlayer.isMoving) {
        localPlayer.moveProgress += delta / MOVEMENT_SPEED;
        localPlayer.x =
          localPlayer.startX +
          (localPlayer.targetX - localPlayer.startX) * localPlayer.moveProgress;
        localPlayer.y =
          localPlayer.startY +
          (localPlayer.targetY - localPlayer.startY) * localPlayer.moveProgress;
        if (localPlayer.moveProgress >= 1) {
          localPlayer.isMoving = false;
          localPlayer.x = localPlayer.targetX;
          localPlayer.y = localPlayer.targetY;
        }
      }
      playerElement.style.transform = `translate(${localPlayer.x}px, ${localPlayer.y}px)`;

      // --- THIS IS THE NEW DEBUG LOGIC ---
      if (serverPlayer.playerId === myPlayerId) {
        const debugOutput = document.getElementById("live-debug-output");
        if (debugOutput) {
          debugOutput.textContent = `
isMoving: ${localPlayer.isMoving}
Progress: ${localPlayer.moveProgress.toFixed(2)}
Position: ${localPlayer.x.toFixed(1)}, ${localPlayer.y.toFixed(1)}
Target:   ${localPlayer.targetX}, ${localPlayer.targetY}`;
        }
      }
    });
  }

  requestAnimationFrame(gameLoop);
}

connectWebSocket();
requestAnimationFrame(gameLoop);
