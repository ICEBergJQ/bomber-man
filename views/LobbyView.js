import { sendToServer } from "../ws.js";
import createElement from "../src/vdom/CreateElement.js";

export default function renderLobbyScreen(gameState) {
  const state = gameState.getState();

  // Defensive: Ensure lobbyPlayers is always an array from the server state
  const lobbyPlayers = Array.isArray(state.players) ? state.players : Object.values(state.players);


  // Build players list
  const playersList =
    lobbyPlayers.length > 0
      ? lobbyPlayers.map((player) =>
          createElement("li", {
            children: [player.nickname || "Unnamed Player"],
          })
        )
      : [createElement("li", { children: ["No players yet..."] })];

  // Optional countdown - this can be null
  const countdownDisplay =
    state.lobbyCountdown !== null && state.lobbyCountdown > 0
      ? createElement("p", {
          children: [`Game starts in: ${state.lobbyCountdown} seconds!`],
        })
      : null;

  let lobbyContent;

  // Different view for player 1 (host) vs others
  if (state.isPlayer1) {
    lobbyContent = [
      createElement("h2", { children: ["Lobby: You are Player 1"] }),
      createElement("p", { children: ['Click "Start Game" when ready.'] }),
      createElement("ul", { children: playersList }),
      countdownDisplay, // countdownDisplay can be null
      createElement("button", {
        attrs: { class: "btn btn-success" },
        children: ["Start Game (Player 1)"],
        events: {
          click: () => {
            console.log("Sending 'startGame' message to server...");
            // This now sends a message to the server to start the game
            sendToServer({ type: "startGame" });
          },
        },
      }),
    ];
  } else {
    lobbyContent = [
      createElement("h2", { children: ["Lobby: Waiting for Player 1..."] }),
      createElement("p", {
        children: ["Please wait for the host to start the game."],
      }),
      createElement("ul", { children: playersList }),
      countdownDisplay, // countdownDisplay can be null
    ];
  }

  return createElement("div", {
    attrs: { class: "screen lobby-screen" },
    // Filter out any null values from the children array before rendering
    children: lobbyContent.filter(Boolean),
  });
}