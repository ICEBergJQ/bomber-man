import { gameState, initializeGame, checkWinCondition } from "./gameUtils.js";
import { IDs, startingPositions, freeID, assignID } from "./playerUtils.js";
import { placeBomb } from "./bombUtils.js";
import { checkPowerup } from "./powerUPsUtils.js";
import {
  startWait,
  startGameC,
  cancelAllCountdowns,
} from "./countdownUtils.js";
import { movePlayer } from "./movementUtils.js";
import { MAX_PLAYERS, HEARTBEAT_INTERVAL, CELL_SIZE } from "./vars.js";
import { WebSocketServer } from "ws";
import WebSocket from "ws";

let connectionIdCounter = 0;
export const clients = {};

function heartbeat() {
  this.isAlive = true;
}

//init ws
export function initWS(server) {
  const wss = new WebSocketServer({ server });
  wss.on("connection", (ws) => {
    // Reject if game is already full or started
    const activePlayers = Object.values(clients).filter(
      (c) => c.playerId
    ).length;
    if (activePlayers >= MAX_PLAYERS || gameState.gameStarted) {
      ws.close(1000, "Game is full or has already started");
      console.log(
        `Connection rejected: Game is full (${activePlayers}/${MAX_PLAYERS}) or has already started`
      );
      return;
    }
    ws.isAlive = true;
    ws.on("pong", heartbeat);
    const id = ++connectionIdCounter;
    clients[id] = { ws, playerId: null };
    broadcastGameState();
    const hbInterval = setInterval(() => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    }, HEARTBEAT_INTERVAL);

    ws.on("message", (msg) => {
      let data;
      try {
        data = JSON.parse(msg);
      } catch {
        return;
      }
      switch (data.type) {
        case "registerPlayer":
          if (!data.nickname) return;

          if (
            clients[id].playerId != null ||
            gameState.playerCount >= MAX_PLAYERS
          ) {
            for (const [clientId, client] of Object.entries(clients)) {
              if (client.playerId === null) {
                client.ws.close(1000, "Disconnected: max players reached");
                delete clients[clientId];
                console.log(
                  `Unregistered client ${clientId} removed on game start`
                );
              }
            }
            return;
          }

          gameState.playerCount++;
          const playerId = assignID();
          if (!playerId) {
            ws.close(1000, "No starting positions available");
            console.log(`Connection rejected: No IDS available`);
            return;
          }
          clients[id].playerId = playerId;
          const pos = startingPositions[playerId - 1];
          gameState.players[playerId] = {
            playerId,
            nickname: data.nickname,
            row: pos.row,
            col: pos.col,
            x: pos.col * CELL_SIZE,
            y: pos.row * CELL_SIZE,
            alive: true,
            lives: 3,
            speed: 1,
            maxBombs: 1,
            tempBombs: 0,
            bombRange: 2,
            phasingThroughBomb: null, 
            invincible: false,
          };
          broadcastGameState();
          if (gameState.playerCount > 1 && !gameState.gameStarted) {
            startWait();
          }
          if (gameState.playerCount === 4) {
            startGameC();
          }
          break;
        case "move":
          movePlayer(clients[id]?.playerId, data.direction);
          break;
        case "bomb":
          placeBomb(clients[id]?.playerId);
          break;
        case "chat":
          const sender = gameState.players[clients[id]?.playerId];
          if (sender) {
            const chatMsg = {
              type: "chatMessage",
              data: { nickname: sender.nickname, text: data.text },
            };
            Object.values(clients).forEach((c) => {
              if (c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(JSON.stringify(chatMsg));
              }
            });
          }
          break;

        default:
          break;
      }
    });

    ws.on("close", () => {
      clearInterval(hbInterval);
      const { playerId } = clients[id] || {};
      if (playerId) {
        freeID(playerId);
        console.log(IDs);

        delete gameState.players[playerId];
        gameState.playerCount--;
      }
      delete clients[id];
      console.log(`Connection closed: ${id}, Player ID: ${playerId}`);
      console.log(`Active players: ${Object.keys(gameState.players).length}`);
      if (gameState.playerCount <= 1) {
        cancelAllCountdowns();
      }

      checkWinCondition();

      if (gameState.playerCount === 0) {
        initializeGame();
        console.log("All players left: game fully reset");
      }
      broadcastGameState();
    });
    ws.on("error", (err) => {
      clearInterval(hbInterval);
      console.error(`WS error on conn ${id}:`, err);
      ws.close(1011, "Internal error");
    });
  });
}

export function broadcast(type, data = {}) {
  const msg = JSON.stringify({ type, ...data });
  Object.values(clients).forEach((c) => {
    if (c.ws.readyState === WebSocket.OPEN) c.ws.send(msg);
  });
}

export function removeAllCon() {
  for (const [clientId, client] of Object.entries(clients)) {
    client.ws.close(1000, "Disconnected: game reset");
    delete clients[clientId];
    console.log(`cleared cons`);
  }
}

export function broadcastGameState() {
  checkPowerup();
  const msg = JSON.stringify({ type: "gameState", data: gameState });
  Object.values(clients).forEach((c) => {
    if (c.ws.readyState === WebSocket.OPEN) c.ws.send(msg);
  });
}
