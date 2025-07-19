import { broadcastGameState } from "./WsUtils.js";
import { gameState } from "./gameUtils.js";
import { CELL_SIZE } from "./vars.js";
import { checkPlayerDeaths } from "./playerUtils.js";

export function explodeBomb(bomb) {
  const { row, col, playerId } = bomb;
  const explosion = [{ row, col }];
  const player = gameState.players[playerId];
  const range = player?.bombRange || 2;
  [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ].forEach(([dr, dc]) => {
    for (let i = 1; i < range; i++) {
      const nr = row + dr * i;
      const nc = col + dc * i;
      if (!gameState.maze[nr]?.[nc] || gameState.maze[nr][nc] === "#") break;
      explosion.push({ row: nr, col: nc });
      if (gameState.maze[nr][nc] === "*") {
        gameState.maze[nr][nc] = " ";
        if (Math.random() < 0.4) {
          const powerups = [
            "extraLife",
            "bombRange",
            "shield",
            "extraBomb",
            "speed",
          ];
          const type = powerups[Math.floor(Math.random() * powerups.length)];
          gameState.powerups.push({
            row: nr,
            col: nc,
            type: type,
            x: nc * CELL_SIZE,
            y: nr * CELL_SIZE,
          });
        }
        break;
      }
    }
  });
  explosion.forEach((e) => {
    gameState.explosions.push({ ...e, createdAt: Date.now() });
  });
  checkPlayerDeaths();
  setTimeout(() => {
    gameState.explosions = [];
    broadcastGameState();
  }, 500);
  broadcastGameState();
}

export function placeBomb(playerId) {
  const p = gameState.players[playerId];
  if (!p || !p.alive || gameState.gameOver) return;

  const actualBombsPlaced = gameState.bombs.filter(
    (b) => b.playerId === playerId
  ).length;
  const allowedBombs = (p.maxBombs || 1) + (p.tempBombs || 0);
  if (actualBombsPlaced >= allowedBombs) {
    return;
  }

  const bombCol = Math.floor((p.x + CELL_SIZE / 2) / CELL_SIZE);
  const bombRow = Math.floor((p.y + CELL_SIZE / 2) / CELL_SIZE);
  if (gameState.bombs.some((b) => b.row === bombRow && b.col === bombCol)) {
    return;
  }

  const bomb = {
    row: bombRow,
    col: bombCol,
    playerId,
    placedAt: Date.now(),
    phasingPlayers: [],
  };
  for (const pid in gameState.players) {
    const player = gameState.players[pid];
    const collisionBoxSize = 26; // or whatever you're using
    const halfBox = collisionBoxSize / 2;

    const spriteCenterX = player.x + CELL_SIZE / 2;
    const spriteCenterY = player.y + CELL_SIZE / 2;

    const corners = [
      { x: spriteCenterX - halfBox, y: spriteCenterY - halfBox },
      { x: spriteCenterX + halfBox, y: spriteCenterY - halfBox },
      { x: spriteCenterX - halfBox, y: spriteCenterY + halfBox },
      { x: spriteCenterX + halfBox, y: spriteCenterY + halfBox },
    ];

    const isOverlappingBomb = corners.some(
      (corner) =>
        Math.floor(corner.y / CELL_SIZE) === bombRow &&
        Math.floor(corner.x / CELL_SIZE) === bombCol
    );

    if (isOverlappingBomb) {
      bomb.phasingPlayers.push(parseInt(pid));
      player.phasingThroughBomb = { row: bomb.row, col: bomb.col };
    }
  }

  // Then push the bomb to the game state
  gameState.bombs.push(bomb);

  if (actualBombsPlaced >= p.maxBombs) {
    p.tempBombs--;
  }

  setTimeout(() => {
    // 3-second explosion timer
    gameState.bombs = gameState.bombs.filter((b) => b !== bomb);
    explodeBomb(bomb);
  }, 3000);

  broadcastGameState();
}
