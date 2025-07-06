// src/pages/renderJoinScreen.js
import createElement from "../src/vdom/CreateElement.js";
// No longer importing globalGameState, it's passed as a parameter

export default function renderJoinScreen(gameState) { // Accept gameState as parameter
  const state = gameState.getState(); // Get state from passed param

  return createElement("div", {
    attrs: { class: "screen join-screen" },
    children: [
      createElement("h1", { children: ["Welcome to Bomberman!"] }),
      createElement("p", {
        children: ["Enter your nickname to join:"],
      }),
      createElement("input", {
        attrs: {
          type: "text",
          placeholder: "Enter your nickname",
          value: state.nickname,
          id: "nicknameInput",
        },
        events: {
          input: (e) => {
            gameState.setState({ nickname: e.target.value }); // Use passed gameState
          },
        },
      }),
      createElement("button", {
        attrs: { class: "btn btn-primary", disabled: !state.nickname.trim() },
        children: ["Join Game"],
        events: {
          click: () => {
            if (state.nickname.trim()) {
                // Ensure the nickname is set in state before navigating
                gameState.setState({ nickname: state.nickname.trim() });
                window.location.hash = "#/lobby";
            } else {
                // TODO: Replace with a custom modal/message box
                alert("Please enter a nickname!");
            }
          },
        },
      }),
      createElement("div", {
        attrs: { style: "margin-top: 20px; font-size: 0.9em; color: #555;" },
        children: [
          createElement("label", {
            children: [
              "Simulate Player 1 status: ",
              createElement("input", {
                attrs: {
                  type: "checkbox",
                  checked: state.isPlayer1,
                },
                events: {
                  change: (e) => {
                    gameState.setState({
                      isPlayer1: e.target.checked,
                    });
                  },
                },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}