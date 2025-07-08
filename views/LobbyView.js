import createElement from "../src/vdom/CreateElement.js";

export default function renderLobbyScreen(gameState) {
  const state = gameState.getState();

  console.log("Rendering lobby screen with state:", state.nickname);
  console.log("Is Player 1:", state.isPlayer1);

  let lobbyContent;

  // Build players list
  const playersList = state.lobbyPlayers.length > 0
    ? state.lobbyPlayers.map(player => createElement("li", { children: [player.nickname] }))
    : [createElement("li", { children: ["No players yet..."] })];

  // Optional countdown
  const countdownDisplay = state.lobbyCountdown !== null && state.lobbyCountdown > 0
    ? createElement("p", { children: [`Game starts in: ${state.lobbyCountdown} seconds!`] })
    : null;

  // Different view for player 1 (host) vs others
  if (state.isPlayer1) {
    lobbyContent = [
      createElement("h2", { children: ["Lobby: You are Player 1"] }),
      createElement("p", { children: ['Click "Start Game" when ready.'] }),
      createElement("ul", { children: playersList }),
      countdownDisplay,
      createElement("button", {
        attrs: { class: "btn btn-success" },
        children: ["Start Game (Player 1)"],
        // You may later wire this to a UI event dispatcher, since we removed direct socket calls
        events: {
          click: () => console.log("Start Game button clicked (no direct socket here)")
        },
      }),
    ];
  } else {
    lobbyContent = [
      createElement("h2", { children: ["Lobby: Waiting for Player 1..."] }),
      createElement("p", {
        children: ["Please wait for Player 1 to start the game."],
      }),
      createElement("ul", { children: playersList }),
      countdownDisplay,
    ];
  }

  return createElement("div", {
    attrs: { class: "screen lobby-screen" },
    children: lobbyContent,
  });
}
