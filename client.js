import { render, createStore, createRouter, diff } from "./src/main.js";
import renderJoinScreen from "./views/JoinView.js";
import renderLobbyScreen from "./views/LobbyView.js";
import renderGameScreen from "./views/GameView.js";
import NotfoundView from "./views/NotfoundView.js";
import getRoutes from "./router/index.js";
import renderGameErr from "./views/gameFullView.js";
import { connectWebSocket, sendToServer } from "./clientUtils/WS.js";

const gameState = createStore({
  players: {},
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
  isChatOpen: false,
  playerCount: 0,
});

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

// --- MOVEMENT LOGIC & STATE ---
// Time in milliseconds to cross one tile.
const MOVEMENT_SPEED = 50;
let clientPlayerState = {};
let lastFrameTime = performance.now();

const keyState = {
  up: false,
  down: false,
  left: false,
  right: false,
};

window.addEventListener("keydown", (e) => {
  // Ignore input if we are typing in chat
  if (document.activeElement.id === "chat-input") return;

  switch (e.key) {
    case "ArrowUp":
      keyState.up = true;
      break;
    case "ArrowDown":
      keyState.down = true;
      break;
    case "ArrowLeft":
      keyState.left = true;
      break;
    case "ArrowRight":
      keyState.right = true;
      break;
    case " ":
      e.preventDefault();
      sendToServer({ type: "bomb" });
      break;
  }
});

window.addEventListener("keyup", (e) => {
  switch (e.key) {
    case "ArrowUp":
      keyState.up = false;
      break;
    case "ArrowDown":
      keyState.down = false;
      break;
    case "ArrowLeft":
      keyState.left = false;
      break;
    case "ArrowRight":
      keyState.right = false;
      break;
  }
});

setInterval(() => {
  if (gameState.getState().currentScreen !== "game") return;

  // Send the last pressed direction (handles diagonal preference)
  let direction = null;
  if (keyState.up) direction = "up";
  if (keyState.down) direction = "down";
  if (keyState.left) direction = "left";
  if (keyState.right) direction = "right";

  if (direction) {
    sendToServer({ type: "move", direction });
  }
}, 30);

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
      // playerElement.style.display = "";

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
          direction: "down",
          animation: {
            fram: 0,
            lastTime: 0,
          },
        };
      }
      const localPlayer = clientPlayerState[serverPlayer.playerId];
      // let direction
      if (
        localPlayer.targetX !== serverPlayer.x ||
        localPlayer.targetY !== serverPlayer.y
      ) {
        localPlayer.direction = getDirection(localPlayer, serverPlayer);
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
        localPlayer.moveProgress += delta / MOVEMENT_SPEED;
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

        animatePlayer(
          playerElement,
          currentTime,
          localPlayer.direction,
          localPlayer.animation
        );
      }
      // const hasSpeedBoost = playerState?.speed > 1;
      // playerElement.classList.toggle("speed-boosted", hasSpeedBoost);
      playerElement.style.transform = `translate(${serverPlayer.x}px, ${serverPlayer.y}px)`;
      // playerElement.style.transform = `translate(${localPlayer.x}px, ${localPlayer.y}px)`;
    });
  }

  requestAnimationFrame(gameLoop);
}

let sprite = {
  down: 0,
  left: 90,
  right: 60,
  up: 30,
};

function animatePlayer(playerElem, time, dir, playerAnimation) {
  if (time - playerAnimation.lastTime > 60) {
    playerAnimation.lastTime = time;
    playerAnimation.fram = (playerAnimation.fram + 1) % 4;
    let x = playerAnimation.fram * 30;
    playerElem.style.backgroundPosition = `${x}px ${sprite[dir]}px`;
  }
}

function getDirection(localPlayer, serverPlayer) {
  const dx = serverPlayer.x - localPlayer.targetX;
  const dy = serverPlayer.y - localPlayer.targetY;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  } else if (Math.abs(dy) > 0) {
    return dy > 0 ? "down" : "up";
  }
  return localPlayer.direction;
}

// --- Start Application ---
connectWebSocket(gameState);
requestAnimationFrame(gameLoop);
