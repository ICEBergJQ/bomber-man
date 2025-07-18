import { broadcastGameState } from "./WsUtils.js";
import { gameState } from "./gameUtils.js";
import { CELL_SIZE } from "./vars.js";

export const MOVE_INCREMENT = 5;

export function isValidPosition(x, y) {
  const collisionBoxSize = 22;
  const halfBox = collisionBoxSize / 2;

  // Calculate the absolute center of the player's sprite at its potential new location.
  const spriteCenterX = x + CELL_SIZE / 2;
  const spriteCenterY = y + CELL_SIZE / 2;

  // Define the corners of the new, smaller, centered collision box.
  const corners = [
    { x: spriteCenterX - halfBox, y: spriteCenterY - halfBox }, // Top-left
    { x: spriteCenterX + halfBox, y: spriteCenterY - halfBox }, // Top-right
    { x: spriteCenterX - halfBox, y: spriteCenterY + halfBox }, // Bottom-left
    { x: spriteCenterX + halfBox, y: spriteCenterY + halfBox }, // Bottom-right
  ];

  for (const corner of corners) {
    const col = Math.floor(corner.x / CELL_SIZE);
    const row = Math.floor(corner.y / CELL_SIZE);
    const tile = gameState.maze[row]?.[col];

    // Check if the corner is outside the map or inside a wall/box.
    if (tile === undefined || ["#", "*"].includes(tile)) {
      return false; // Collision detected
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
  const moveAmount = MOVE_INCREMENT * (p.speed || 1);
  // const moveAmount = MOVE_INCREMENT * speed;

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
