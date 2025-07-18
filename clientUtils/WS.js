// import { quiteGame } from "./views/GameView.js";
import { quiteGame } from "./stateUtils.js";
// import { resetStateWscreen } from "./stateUtils.js";
import { toGamefull } from "./stateUtils.js";

let socket = null;

export function getSocket() {
  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}

export function sendToServer(message) {
  if (socket && socket.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify(message));
}

export function connectWebSocket(gameState) {
  if (socket && socket.readyState === WebSocket.OPEN) return;
  socket = new WebSocket(`ws://${window.location.hostname}:8080`);
  socket.onopen = () => console.log("WebSocket connection established.");
  socket.onclose = (e) => {
    console.log("WebSocket connection closed" + e.reason);
    if (
      e.reason === "Game is full or has already started" ||
      e.reason === "Disconnected: max players reached"
    ) {
      toGamefull(gameState);
    } else if (e.reason === "Disconnected: game reset") {
      quiteGame(gameState);
    }
  };
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
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
  };
}
