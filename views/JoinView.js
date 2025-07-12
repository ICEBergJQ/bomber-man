import { createElement } from "../src/main.js";

export default function renderJoinScreen(gameState, sendToServer) {
  console.log("[JoinView.js] Rendering view.");
  return createElement("div", {
    attrs: { class: "screen join-screen" },
    children: [
      createElement("h1", { children: ["Welcome to Bomberman!"] }),
      createElement("p", { children: ["Enter your nickname to join:"] }),
      createElement("input", {
        attrs: {
          type: "text",
          placeholder: "Enter your nickname",
          id: "nicknameInput",

        },
        events: {
          input: (e) =>
            gameState.setState({
              ...gameState.getState(),
              nickname: e.target.value,
            }),
        },
      }),
      createElement("button", {
        attrs: { class: "btn btn-primary" },
        children: ["Join Game"],
        events: {
          click: () => {
            const nickname = gameState.getState().nickname.trim();
            console.log('[JoinView.js] "Join Game" button clicked.');
            if (nickname) {
              sendToServer({ type: "registerPlayer", nickname: nickname });
              window.location.hash = "#/lobby";
            } else {
              alert("Please enter a nickname!");
            }
          },
        },
      }),
      createElement("div", {
        attrs: { style: "margin-top: 20px;" },
        children: [
          createElement("label", {
            children: [
              "Simulate Host: ",
              createElement("input", {
                attrs: {
                  type: "checkbox",
                  checked: gameState.getState().isPlayer1,
                },
                events: {
                  change: (e) =>
                    gameState.setState({
                      ...gameState.getState(),
                      isPlayer1: e.target.checked,
                    }),
                },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
