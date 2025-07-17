import { broadcastGameState } from "./WsUtils.js";
import { gameState } from "./gameUtils.js";
import { CELL_SIZE } from "./vars.js";
import { checkPlayerDeaths } from "./playerUtils.js";

export function explodeBomb(bomb) {
  const { row, col } = bomb;
  const explosion = [{ row, col }];

  [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ].forEach(([dr, dc]) => {
    for (let i = 1; i < 2; i++) {
      // Using a fixed bomb range for now
      const nr = row + dr * i;
      const nc = col + dc * i;
      if (!gameState.maze[nr]?.[nc] || gameState.maze[nr][nc] === "#") break;

      explosion.push({ row: nr, col: nc });
      //poweruppp

      if (gameState.maze[nr][nc] === "*") {
        gameState.maze[nr][nc] = " ";
        // Chance to spawn a power-up
        if (Math.random() < 0.25) {
          const powerups = ["extraLife", "speedBoost", "shield"];
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
  if (gameState.bombs.some((bomb) => bomb.playerId === playerId)) return;

  // Place bomb based on player's grid-aligned position
  const bombCol = Math.floor((p.x + CELL_SIZE / 2) / CELL_SIZE);
  const bombRow = Math.floor((p.y + CELL_SIZE / 2) / CELL_SIZE);

  if (gameState.bombs.some((b) => b.row === bombRow && b.col === bombCol))
    return;

  const bomb = { row: bombRow, col: bombCol, playerId, placedAt: Date.now() };
  gameState.bombs.push(bomb);
  setTimeout(() => {
    gameState.bombs = gameState.bombs.filter((b) => b !== bomb);
    explodeBomb(bomb);
  }, 3000);
  broadcastGameState();
}