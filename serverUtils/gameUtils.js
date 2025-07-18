import { removeAllCon,broadcastGameState, clients } from "./WsUtils.js";
import { generateMaze } from "./mazeUtils.js";
import { IDs, freeAllIDs } from "./playerUtils.js";
import { changeHsStr } from "./countdownUtils.js";

export let gameState = {};

export function forceStartGame() {
  gameState.gameStarted = true;
  for (const [clientId, client] of Object.entries(clients)) {
    if (client.playerId === null) {
      client.ws.close(1000, "Disconnected: Game started without registration");
      delete clients[clientId];
    }
  }
  broadcastGameState();
}

//reset timeout
export let resetTO = null;
export function resetGame() {
  resetTO = setTimeout(() => {
    removeAllCon();
    initializeGame();
  }, 5000);
}

export function cancelReset() {
  if (resetTO !== null) {
    clearTimeout(resetTO);
    resetTO = null;
  }
}

export function checkWinCondition() {
  if (!gameState.gameStarted) return;
  const alive = Object.values(gameState.players).filter((p) => p.alive);

  // Game ends if one player is left in a multiplayer match, or the only player dies.
  if (alive.length === 1) {
    gameState.gameOver = true;
    gameState.winner = alive[0] || null;
    resetGame();
    broadcastGameState();
  } else if (gameState.playerCount === 0) {
    gameState.gameOver = true;
    gameState.winner = null;
    broadcastGameState();
  }
}

export function initializeGame() {
  // Clear the properties of the EXISTING gameState object
  Object.keys(gameState).forEach(key => delete gameState[key]);

  // Re-populate the properties on the SAME object
  Object.assign(gameState, {
    players: {},
    bombs: [],
    explosions: [],
    powerups: [],
    maze: generateMaze(13, 23),
    gameStarted: false,
    gameOver: false,
    winner: null,
    playerCount: 0,
  });

  freeAllIDs();
  changeHsStr(false);
  cancelReset();
}