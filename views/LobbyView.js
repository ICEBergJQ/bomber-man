import { sendToServer } from "../client.js";
import createElement from "../src/vdom/CreateElement.js";

export default function renderLobbyScreen(gameState) {
  const state = gameState.getState();
  let lobbyContent;
  console.log("Rendering lobby screen with state:", state);

  if (state.isPlayer1) {
    lobbyContent = [
      createElement("h2", { children: ["Lobby: You are Player 1"] }),
      createElement("p", { children: ['Click "Start Game" when ready.'] }),
      createElement("button", {
        attrs: { class: "btn btn-success" },
        children: ["Start Game (Player 1)"],
        events: {
          click: () => {
            // When Player 1 starts, reset game state for a fresh game
            gameState.setState({
              ...gameState.getState(),
              players: {},
              bombs: [],
              explosions: [],
              gameOver: false,
              winner: null,
              // Removed mazeLayout generation here as it will come from the server
              currentScreen: "game",
            });
            window.location.hash = "#/game";
            sendToServer(
              "startGame"
            )
          },
        },
      }),
    ];
  } else {
    lobbyContent = [
      createElement("h2", { children: ["Lobby: Waiting for Player 1..."] }),
      createElement("p", {
        children: ["Please wait for Player 1 to start the game."],
      }),
    ];
  }

  // The outer div should not have an id="app" as #app is the root element.
  // The content generated here will be mounted inside the existing #app element.
  return createElement("div", {
    attrs: { class: "screen lobby-screen" },
    children: lobbyContent,
  });
}
