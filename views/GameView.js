import { createElement } from "../src/main.js";
import { sendToServer } from "../ws.js";

// --- Player Controls ---
const handleKeyDown = (e) => {
  let direction = null;
  switch (e.key) {
    case "ArrowUp": direction = "up"; break;
    case "ArrowDown": direction = "down"; break;
    case "ArrowLeft": direction = "left"; break;
    case "ArrowRight": direction = "right"; break;
    case " ": // Space bar
      e.preventDefault();
      sendToServer({ type: "bomb" });
      return;
  }
  if (direction) {
    e.preventDefault();
    sendToServer({ type: "move", direction: direction });
  }
};

function addPlayerControls() {
  // Remove listener first to prevent duplicates, then add it.
  window.removeEventListener("keydown", handleKeyDown);
  window.addEventListener("keydown", handleKeyDown);
}

function removePlayerControls() {
  window.removeEventListener("keydown", handleKeyDown);
}


// --- View Rendering ---
export default function renderGameScreen(gameState) {
  const state = gameState.getState();
  const maze = state.mazeLayout;

  if (!maze) {
    removePlayerControls();
    return createElement("div", {
      attrs: { class: "screen loading-screen" },
      children: [createElement("h2", { children: ["Loading Game..."] })],
    });
  }

  addPlayerControls();

  const displayGrid = maze.map((row) => row.slice());

  // Use optional chaining (?.) in case these objects are not yet defined
  state.explosions?.forEach((exp) => { displayGrid[exp.row][exp.col] = "EXP"; });
  state.bombs?.forEach((bomb) => { displayGrid[bomb.row][bomb.col] = "BOMB"; });

  // --- THIS IS THE CRITICAL LOGIC ---
  // We now safely check if state.players exists before trying to render them.
  if (state.players) {
    Object.values(state.players).forEach((p) => {
      if (p && p.alive) { // Ensure player object and `alive` property exist
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
  console.log(state);

  const playerList = state.players ? Object.values(state.players).map(p =>
    createElement("li", {
      children: [`${p.nickname}: ${p.alive ? "Alive" : "Out"}`],
      attrs: { style: p.alive ? "color: white;" : "color: red; text-decoration: line-through;" }
    })
  ) : [];

  return createElement("div", {
    attrs: { class: "screen game-screen" },
    children: [
      createElement("h4", {
        attrs: {
          class: 'nickname'
        },
        children: ["Moh"]
      }),
      createElement("h2", { children: ["Bomberman"] }),
      createElement("div", {
        attrs: { class: "game-container" },
        children: [
          createElement("div", {
            attrs: { class: "game-sidebar" },
            children: [
              createElement("h3", { children: ["Players"] }),
              createElement("ul", { children: playerList }),
            ],
          }),

          createElement("div", {
            attrs: { class: "game-board" },
            children: gameBoardChildren,
          }),
        ],
      }),
      // --- LIVE DEBUG VIEW ---
      // This box will show you the exact content of `state.players` in real time.
      createElement("div", {
        attrs: { style: "margin-top: 20px; background: #222; padding: 10px; font-family: monospace; white-space: pre-wrap; word-wrap: break-word;" },
        children: [
          createElement("h4", { children: ["Live Game State Debug"] }),
          `state.players = ${JSON.stringify(state.players || {}, null, 2)}`
        ]
      })
    ],
  });
}