import { broadcastGameState } from "./WsUtils.js";
import { gameState } from "./gameUtils.js";
import { CELL_SIZE } from "./vars.js";

export const MOVE_INCREMENT = 7.5;

export function isValidPosition(x, y) {
  const playerSize = CELL_SIZE * 0.9; // Use a slightly smaller bounding box for smoother movement
  const corners = [
    { x: x, y: y },
    { x: x + playerSize, y: y },
    { x: x, y: y + playerSize },
    { x: x + playerSize, y: y + playerSize },
  ];
  for (const corner of corners) {
    const col = Math.floor(corner.x / CELL_SIZE);
    const row = Math.floor(corner.y / CELL_SIZE);
    const tile = gameState.maze[row]?.[col];
    if (tile === undefined || ["#", "*"].includes(tile)) {
      return false;
    }
  }
  return true;
}

export function movePlayer(playerId, dir) {
  const p = gameState.players[playerId];
  if (!p || !p.alive || gameState.gameOver) return;

  let nextX = p.x;
  let nextY = p.y;
  const speed = p.speed || 1;
  const moveAmount = MOVE_INCREMENT * speed;

  if (dir === "up") nextY -= moveAmount;
  else if (dir === "down") nextY += moveAmount;
  else if (dir === "left") nextX -= moveAmount;
  else if (dir === "right") nextX += moveAmount;

  if (isValidPosition(nextX, nextY)) {
    p.x = nextX;
    p.y = nextY;
    // Update logical row/col for interactions, but they are no longer the primary position
    p.col = Math.floor((p.x + CELL_SIZE / 2) / CELL_SIZE);
    p.row = Math.floor((p.y + CELL_SIZE / 2) / CELL_SIZE);
    broadcastGameState();
  }
}
