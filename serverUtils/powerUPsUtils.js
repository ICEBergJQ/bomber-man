import { gameState } from "./gameUtils.js";
import { CELL_SIZE } from "./vars.js";
import { broadcastGameState} from "./WsUtils.js";

export function checkPowerupCollection() {
  Object.values(gameState.players).forEach((p) => {
    if (!p.alive) return;

    const p_col = Math.floor((p.x + CELL_SIZE / 2) / CELL_SIZE);
    const p_row = Math.floor((p.y + CELL_SIZE / 2) / CELL_SIZE);

    const powerupIndex = gameState.powerups.findIndex(
      (pu) => pu.row === p_row && pu.col === p_col
    );

    if (powerupIndex === -1) return;

    const powerup = gameState.powerups[powerupIndex];

    switch (powerup.type) {
      case "extraLife":
        if (p.lives < 3) {
          p.lives++;
        } else {
          return;
        }
        break;

      case "speedBoost":
        p.speed = (p.speed || 1) * 2;
        setTimeout(() => {
          if (gameState.players[p.playerId]) {
            gameState.players[p.playerId].speed /= 2;
            broadcastGameState();
          }
        }, 20000);
        break;

      case "shield":
        p.invincible = true;
        setTimeout(() => {
          if (gameState.players[p.playerId]) {
            gameState.players[p.playerId].invincible = false;
            console.log("sheild TSALAAAAA");
            broadcastGameState();
          }
        }, 20000);
        break;
    }

    gameState.powerups.splice(powerupIndex, 1);
    broadcastGameState();
  });
}