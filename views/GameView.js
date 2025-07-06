// src/pages/renderGameScreen.js
import { createElement } from "../src/vdom/CreateElement.js";
import { mazeCell } from "../client.js"; // Assuming mazeCell is a helper for rendering individual cells
import { sendToServer, socket } from "../client.js"; // Needed for joinGameRoom message
// No longer importing globalGameState, it's passed as a parameter

export default function renderGameScreen(gameState) { // Accept gameState as parameter
  const state = gameState.getState();
  console.log("Rendering game screen with current state:", state);

  const gameId = state.gameId || 'single-room'; // Fallback if not set yet

  const initialGameData = state.initialGameData;

  if (!initialGameData || !initialGameData.maze) {
      console.error("Error: Initial game data (maze) not found in store. Cannot render game board.");
      return createElement("div", {
          attrs: { class: "screen error-screen" },
          children: [
              createElement("h2", { children: ["Game Data Missing!"] }),
              createElement("p", { children: ["Please try joining a game from the lobby."] }),
          ],
      });
  }

  console.log("Initial game data available. Building game board.");

  // Inform the server that this client has successfully loaded the game screen
  // and is ready to receive ongoing updates for this specific game room.
  if (!window._gameScreenJoinSent) {
      sendToServer({ type: 'joinGameRoom', gameId: gameId });
      window._gameScreenJoinSent = true;
  }

  const gameBoardChildren = initialGameData.maze.flatMap((row, rowIndex) =>
    row.map((cell, colIndex) => mazeCell(cell, rowIndex, colIndex))
  );

  const gameDiv = createElement("div", {
    attrs: { class: "screen game-screen" },
    children: [
      createElement("h2", { children: [`Game in Progress (ID: ${gameId})`] }),
      createElement("div", {
        attrs: { class: "game-info" },
        children: [
          createElement("p", { children: [`Your Nickname: ${state.nickname}`] }),
          createElement("p", { children: [`Players: ${Object.keys(state.players || {}).join(', ')}`] }),
        ]
      }),
      createElement("div", {
        attrs: { class: "game-board" },
        children: gameBoardChildren,
      }),
    ],
  });

  return gameDiv;
}