import { render, createStore, createRouter, diff } from "./src/main.js";
import renderJoinScreen from "./views/JoinView.js";
import renderLobbyScreen from "./views/LobbyView.js";
import renderGameScreen from "./views/GameView.js";
import NotfoundView from "./views/NotfoundView.js";
import getRoutes from "./router/index.js";
import renderGameErr from "./views/gameFullView.js";
import { quiteGame } from "./views/GameView.js";

// --- WebSocket & State Management ---
let socket;

const startingPositions = [
  { row: 1, col: 1 },
  { row: 11, col: 21 },
  { row: 1, col: 21 },
  { row: 11, col: 1 },
];

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
  isChatOpen: false
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
        isChatOpen: false
      });
      window.location.hash = "#/gameFull";
    } else if (e.reason === "Disconnected: game reset") {
      quiteGame(gameState);
    }
  };
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log(msg);
    if (msg.type === "countdown") {
      gameState.setState({
        ...gameState.getState(),
        countD: msg.time,
        phase: msg.phase,
      });
    } else if (msg.type === "gameState") {
      gameState.setState({ ...gameState.getState(), ...msg.data });
    } else if (msg.type === "chatMessage") {
      const currentState = gameState.getState();
      const newMessages = [...currentState.chatMessages, msg.data];
      if (newMessages.length > 20) newMessages.shift();
      gameState.setState({ ...currentState, chatMessages: newMessages });
    } else if (msg.type === "stopped") {
      gameState.setState({ ...gameState.getState(), countD: 0, phase: "" });
    }
    // else if (msg.type === "reset") {
    // quiteGame(gameState);
    // }
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
}, 50);

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
        localPlayer.direction = getDirection(localPlayer,serverPlayer)
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
        
        animatePlayer(playerElement, currentTime, localPlayer.direction, localPlayer.animation);
      }
      // const hasSpeedBoost = playerState?.speed > 1;
      // playerElement.classList.toggle("speed-boosted", hasSpeedBoost);
      playerElement.style.transform = `translate(${localPlayer.x}px, ${localPlayer.y}px)`;
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
connectWebSocket();
requestAnimationFrame(gameLoop);
