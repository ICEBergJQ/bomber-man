import { broadcastGameState } from "./WsUtils.js";
import { gameState } from "./gameUtils.js";
import { CELL_SIZE } from "./vars.js";

export const MOVE_INCREMENT = 2;

export function isValidPosition(x, y, playerId) {
  const collisionBoxSize = 26;
  const halfBox = collisionBoxSize / 2;
  const spriteCenterX = x + CELL_SIZE / 2;
  const spriteCenterY = y + CELL_SIZE / 2;
  const player = gameState.players[playerId];

  if (!player) {
    return false;
  }

  const corners = [
    { x: spriteCenterX - halfBox, y: spriteCenterY - halfBox },
    { x: spriteCenterX + halfBox, y: spriteCenterY - halfBox },
    { x: spriteCenterX - halfBox, y: spriteCenterY + halfBox },
    { x: spriteCenterX + halfBox, y: spriteCenterY + halfBox },
  ];

  for (const corner of corners) {
    const col = Math.floor(corner.x / CELL_SIZE);
    const row = Math.floor(corner.y / CELL_SIZE);
    const tile = gameState.maze[row]?.[col];

    if (tile === undefined || ["#", "*"].includes(tile)) {
      return false;
    }

    // The old bomb check logic remains here...
    const bombAtLocation = gameState.bombs.find(
      (b) => b.row === row && b.col === col
    );
    if (bombAtLocation) {
      const isPhasing =
        player.phasingThroughBomb &&
        player.phasingThroughBomb.row === bombAtLocation.row &&
        player.phasingThroughBomb.col === bombAtLocation.col &&
        bombAtLocation.phasingPlayers.includes(playerId);

      if (isPhasing) {
        continue;
      } else {
        return false;
      }
    }
  }

  return true;
}

export function movePlayer(playerId, dir) {
  const p = gameState.players[playerId];
  if (!p || !p.alive || gameState.gameOver) return;
  p.lastDirection = dir;

  let nextX = p.x;
  let nextY = p.y;
  const moveAmount = MOVE_INCREMENT * (p.speed || 1);

  if (dir === "up") nextY -= moveAmount;
  else if (dir === "down") nextY += moveAmount;
  else if (dir === "left") nextX -= moveAmount;
  else if (dir === "right") nextX += moveAmount;

  if (isValidPosition(nextX, nextY, playerId)) {
    p.x = nextX;
    p.y = nextY;
    p.col = Math.floor((p.x + CELL_SIZE / 2) / CELL_SIZE);
    p.row = Math.floor((p.y + CELL_SIZE / 2) / CELL_SIZE);

    // the bomb solid only after you leave its tile
    if (p.phasingThroughBomb) {
      const { row, col } = p.phasingThroughBomb;
      const collisionBoxSize = 26;
      const halfBox = collisionBoxSize / 2;
      const spriteCenterX = p.x + CELL_SIZE / 2;
      const spriteCenterY = p.y + CELL_SIZE / 2;

      const corners = [
        { x: spriteCenterX - halfBox, y: spriteCenterY - halfBox },
        { x: spriteCenterX + halfBox, y: spriteCenterY - halfBox },
        { x: spriteCenterX - halfBox, y: spriteCenterY + halfBox },
        { x: spriteCenterX + halfBox, y: spriteCenterY + halfBox },
      ];

      const isStillOnBombTile = corners.some(
        (corner) =>
          Math.floor(corner.y / CELL_SIZE) === row &&
          Math.floor(corner.x / CELL_SIZE) === col
      );

      if (!isStillOnBombTile) {
        p.phasingThroughBomb = null;
      }
    }

    broadcastGameState();
  }
}
