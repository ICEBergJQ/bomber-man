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
      // Using a fixed bomb range for now
      const nr = row + dr * i;
      const nc = col + dc * i;
      if (!gameState.maze[nr]?.[nc] || gameState.maze[nr][nc] === "#") break;

      explosion.push({ row: nr, col: nc });
      //poweruppp

      if (gameState.maze[nr][nc] === "*") {
        gameState.maze[nr][nc] = " ";
        if (Math.random() < 10) {
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

  // 1. Count ACTUAL bombs placed by this player (most reliable check)
  const actualBombsPlaced = gameState.bombs.filter(
    (b) => b.playerId === playerId
  ).length;

  // 2. Calculate allowed bombs (permanent + temporary)
  const allowedBombs = p.maxBombs + p.tempBombs;

  // 3. Strict check against ACTUAL bombs, not just counter
  if (actualBombsPlaced >= allowedBombs) {
    return;
  }

  // 4. Position check
  const bombCol = Math.floor((p.x + CELL_SIZE / 2) / CELL_SIZE);
  const bombRow = Math.floor((p.y + CELL_SIZE / 2) / CELL_SIZE);
  if (gameState.bombs.some((b) => b.row === bombRow && b.col === bombCol)) {
    return;
  }

  // 5. Place bomb
  const bomb = { row: bombRow, col: bombCol, playerId, placedAt: Date.now() };
  gameState.bombs.push(bomb);

  // 6. Update counters (only for tracking, actual check is done against gameState.bombs)
  p.activeBombs = actualBombsPlaced + 1;

  // 7. Consume temp bomb if needed
  if (actualBombsPlaced >= p.maxBombs) {
    p.tempBombs--;
  }

  // 8. Set explosion timer
  setTimeout(() => {
    gameState.bombs = gameState.bombs.filter((b) => b !== bomb);
    p.activeBombs = gameState.bombs.filter(
      (b) => b.playerId === playerId
    ).length;
    explodeBomb(bomb);
  }, 3000);

  broadcastGameState();
}
