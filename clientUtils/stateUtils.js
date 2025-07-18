import { closeSocket } from "./WS.js";

export function quiteGame(gameState, f) {
  closeSocket();
  resetStateWscreen(gameState, "join");
  if (!f) {
      location.hash = "#/";
  }
}

export function toGamefull(gameState, f) {
  closeSocket();
  resetStateWscreen(gameState, "gameFull");
  if (!f) {
      window.location.hash = "#/gameFull";
  }
}

export function resetStateWscreen(gameState, screen) {
  gameState.setState({
    players: {},
    bombs: [],
    explosions: [],
    gameOver: false,
    winner: null,
    gameStarted: false,
    maze: null,
    currentScreen: screen,
    nickname: "",
    chatMessages: [],
    countD: 0,
    phase: "",
    playerCount: 0,
  });
}
