import { createElement } from "../src/main.js";

export default function renderJoinScreen(gameState) {
  // Accept gameState as parameter
  const state = gameState.getState(); // Get state from passed param
  console.log(state);

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
            gameState.setState({ ...gameState.getState(), nickname: e.target.value });
            console.log("Input event - new nickname value in store:", gameState.getState().nickname);
          },
          keypress: (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              console.log("Current nickname in store:", gameState.getState().nickname);
              
            }
          },
        },
      }),
      createElement("button", {
        attrs: { class: "btn btn-primary" },
        children: ["Join Game"],
        events: {
          click: () => {
            if (gameState.getState().nickname.trim()) {
              console.log("----Current nickname: ", gameState.getState().nickname);
              ///0..toExponential.
              // Ensure the nickname is set in state before navigating
              gameState.setState({ ...gameState.getState(), nickname: gameState.getState().nickname.trim() });
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
                      ...gameState.getState(),
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
