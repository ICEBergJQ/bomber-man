import createElement from "../src/vdom/CreateElement.js";

export default function renderJoinScreen(gameState) {
  return createElement("div", {
    attr: { id: "app" },
    children: [
      createElement("div", {
        attrs: { class: "screen join-screen" },
        children: [
          createElement("h1", { children: ["Welcome to Bomberman!"] }),
          createElement("p", {
            children: ["Join the game and battle your friends!"],
          }),
          createElement("button", {
            attrs: { class: "btn btn-primary" },
            children: ["Join Game"],
            events: {
              click: () => {
                // This will trigger the router to update the hash, which updates the store,
                // which then triggers renderApp to render the lobby screen.
                window.location.hash = "#/lobby";
              },
            },
          }),
          // Simple checkbox to simulate Player 1 status for testing
          createElement("div", {
            attrs: { style: "margin-top: 20px; font-size: 0.9em; color: #555;" },
            children: [
              createElement("label", {
                children: [
                  "Simulate Player 1 status: ",
                  createElement("input", {
                    attrs: {
                      type: "checkbox",
                      checked: gameState.getState().isPlayer1,
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
      }),
    ],
  });
}
