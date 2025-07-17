import { broadcastGameState} from "./WsUtils.js";
import { gameState, checkWinCondition } from "./gameUtils.js";
import { CELL_SIZE } from "./vars.js";

export const IDs = [
  { id: 1, taken: false },
  { id: 2, taken: false },
  { id: 3, taken: false },
  { id: 4, taken: false },
];

export const startingPositions = [
  { row: 1, col: 1 },
  { row: 1, col: 21 },
  { row: 11, col: 1 },
  { row: 11, col: 21 },
];


export function freeAllIDs() {
  IDs.forEach((id) => {
    id.taken = false;
  });
}


export function freeID(playerId) {
  const found = IDs.find((id) => id.id === playerId);
  if (found) {
    found.taken = false;
  }
}


//assigning a free id to a player
export function assignID() {
  const available = IDs.find((id) => !id.taken);
  if (!available) {
    return null; // No IDs left
  }
  available.taken = true;
  return available.id;
}


export function checkPlayerDeaths() {
  Object.values(gameState.players).forEach((p) => {
    // Update player's logical row/col based on their center point for accurate checks
    p.col = Math.floor((p.x + CELL_SIZE / 2) / CELL_SIZE);
    p.row = Math.floor((p.y + CELL_SIZE / 2) / CELL_SIZE);

    if (
      p.alive &&
      !p.invincible &&
      gameState.explosions.some((e) => e.row === p.row && e.col === p.col)
    ) {
      p.lives--;
      if (p.lives <= 0) {
        p.alive = false;
      } else {
        const startPos = startingPositions[p.playerId - 1];
        p.row = startPos.row;
        p.col = startPos.col;
        p.x = startPos.col * CELL_SIZE;
        p.y = startPos.row * CELL_SIZE;
        p.invincible = true; // Grant temporary invincibility on respawn
        setTimeout(() => {
          if (p) p.invincible = false;
          broadcastGameState();
        }, 2000);
      }
      checkWinCondition();
    }
  });
}