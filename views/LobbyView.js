import { createElement } from "../src/main.js";

export default function renderLobbyScreen(gameState, sendToServer) {
  const state = gameState.getState();
  const lobbyPlayers = state.players ? Object.values(state.players) : [];

  const playersList =
    lobbyPlayers.length > 0
      ? lobbyPlayers.map((player) =>
          createElement("li", { children: [player.nickname || "Unnamed Player"] })
        )
      : [createElement("li", { children: ["No players yet..."] })];

  const countdownDisplay =
    state.lobbyCountdown !== null && state.lobbyCountdown > 0
      ? createElement("p", { children: [`Game starts in: ${state.lobbyCountdown} seconds!`] })
      : null;

  let lobbyContent;

  if (state.isPlayer1) {
    lobbyContent = [
      createElement("h2", { children: ["Lobby: You are the Host"] }),
      createElement("p", { children: ['Click "Start Game" when ready.'] }),
      createElement("ul", { children: playersList }),
      countdownDisplay,
      createElement("button", {
        attrs: { class: "btn btn-success" },
        children: ["Start Game"],
        events: { click: () => sendToServer({ type: "startGame" }) },
      }),
    ];
  } else {
    lobbyContent = [
      createElement("h2", { children: ["Lobby: Waiting for Host..."] }),
      createElement("p", { children: ["Please wait for the host to start the game."] }),
      createElement("ul", { children: playersList }),
      countdownDisplay,
    ];
  }

  return createElement("div", {
    attrs: { class: "screen lobby-screen" },
    children: lobbyContent.filter(Boolean),
  });
}