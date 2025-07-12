import { createElement } from "../src/main.js";

const handleKeyDown = (e, sendToServer) => {
  let direction = null;
  switch (e.key) {
    case "ArrowUp": direction = "up"; break;
    case "ArrowDown": direction = "down"; break;
    case "ArrowLeft": direction = "left"; break;
    case "ArrowRight": direction = "right"; break;
    case " ":
      e.preventDefault();
      sendToServer({ type: "bomb" });
      return;
  }
  if (direction) {
    e.preventDefault();
    sendToServer({ type: "move", direction: direction });
  }
};

let onKeyDownHandler = null;

function addPlayerControls(sendToServer) {
  if (onKeyDownHandler) {
      window.removeEventListener("keydown", onKeyDownHandler);
  }
  onKeyDownHandler = (e) => handleKeyDown(e, sendToServer);
  window.addEventListener("keydown", onKeyDownHandler);
}

function removePlayerControls() {
  if (onKeyDownHandler) {
      window.removeEventListener("keydown", onKeyDownHandler);
      onKeyDownHandler = null;
  }
}

export default function renderGameScreen(gameState, sendToServer) {
  const state = gameState.getState();
  // --- THIS IS THE FIX ---
  // The property from the server is `maze`, not `mazeLayout`.
  const maze = state.maze;

  if (!maze) {
    removePlayerControls();
    return createElement("div", { attrs: { class: "screen loading-screen" }, children: [createElement("h2", { children: ["Loading Game..."] })] });
  }

  addPlayerControls(sendToServer);

  const displayGrid = maze.map((row) => row.slice());

  state.explosions?.forEach((exp) => { displayGrid[exp.row][exp.col] = "EXP"; });
  state.bombs?.forEach((bomb) => { displayGrid[bomb.row][bomb.col] = "BOMB"; });

  if (state.players) {
    Object.values(state.players).forEach((p) => {
      if (p && p.alive) {
        displayGrid[p.row][p.col] = `P${p.playerId}`;
      }
    });
  }

  const gameBoardChildren = displayGrid.flatMap((row) =>
    row.map((cellType) => {
      let className = "cell";
      switch (cellType) {
        case "#": className += " wall"; break;
        case "*": className += " box"; break;
        case "P1": className += " player1"; break;
        case "P2": className += " player2"; break;
        case "P3": className += " player3"; break;
        case "P4": className += " player4"; break;
        case "BOMB": className += " bomb"; break;
        case "EXP": className += " explosion"; break;
        default: className += " empty"; break;
      }
      return createElement("div", { attrs: { class: className } });
    })
  );

  const playerList = state.players ? Object.values(state.players).map(p =>
    createElement("li", {
      children: [`${p.nickname}: ${p.alive ? "Alive" : "Out"}`],
      attrs: { style: p.alive ? "color: white;" : "color: red; text-decoration: line-through;" }
    })
  ) : [];

  return createElement("div", {
    attrs: { class: "screen game-screen" },
    children: [
      createElement("h2", { children: ["Bomberman"] }),
      createElement("div", {
        attrs: { class: "game-container" },
        children: [
          createElement("div", { attrs: { class: "game-board" }, children: gameBoardChildren }),
          createElement("div", { attrs: { class: "game-sidebar" },
            children: [
              createElement("h3", { children: ["Players"] }),
              createElement("ul", { children: playerList })
            ]
          })
        ]
      }),
    ],
  });
}