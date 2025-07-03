import createElement  from "../src/vdom/CreateElement.js";


export default function renderLobbyScreen(gameState) {
  const state = gameState.getState();
  let lobbyContent;
  console.log("Rendering lobby screen with state:", state);

  if (state.isPlayer1) {
    lobbyContent = [
      createElement("h2", { children: ["Lobby: You are Player 1"] }),
      createElement("p", { children: ['Click "Start Game" when ready.'] }),
    //   createElement("button", {
    //     attrs: { class: "btn btn-success" },
    //     children: ["Start Game (Player 1)"],
    //     events: {
    //       click: () => {
    //         // When Player 1 starts, reset game state for a fresh game
    //         gameState.setState({
    //           ...gameState.getState(),
    //           players: {},
    //           bombs: [],
    //           explosions: [],
    //           gameOver: false,
    //           winner: null,
    //           mazeLayout: generateMaze(INITIAL_MAZE_ROWS, INITIAL_MAZE_COLS),
    //           currentScreen: "game",
    //         });
    //         window.location.hash = "#/game"; // Update URL hash
    //       },
    //     },
    //   }),
    ];
  } else {
    lobbyContent = [
      createElement("h2", { children: ["Lobby: Waiting for Player 1..."] }),
      createElement("p", {
        children: ["Please wait for Player 1 to start the game."],
      }),
    ];
  }
  return createElement("div", {
    attrs: { class: "screen lobby-screen" },
    children: lobbyContent,
  });
}
