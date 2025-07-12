import { createElement } from "../src/main.js";

const handleKeyDown = (e, sendToServer) => {
  let direction = null;
  switch (e.key) {
    case "ArrowUp":
      direction = "up";
      break;
    case "ArrowDown":
      direction = "down";
      break;
    case "ArrowLeft":
      direction = "left";
      break;
    case "ArrowRight":
      direction = "right";
      break;
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
  const maze = state.maze;
  const CELL_SIZE = 30;

  if (!maze) {
    removePlayerControls();
    return createElement("div", {
      attrs: { class: "screen loading-screen" },
      children: [createElement("h2", { children: ["Loading Game..."] })],
    });
  }

  addPlayerControls(sendToServer);

  // 1. Render the static map grid
  const mapChildren = maze.flatMap((row) =>
    row.map((cellType) => {
      let className = "cell";
      if (cellType === "#") className += " wall";
      else if (cellType === "*") className += " box";
      else className += " empty";
      return createElement("div", { attrs: { class: className } });
    })
  );

  // 2. Render explosions as separate elements
  const explosionChildren =
    state.explosions?.map((exp) => {
      const x = exp.col * CELL_SIZE;
      const y = exp.row * CELL_SIZE;
      return createElement("div", {
        attrs: {
          class: "explosion",
          style: `transform: translate(${x}px, ${y}px);`,
        },
      });
    }) || [];

  // 3. Render bombs as separate elements
  const bombChildren =
    state.bombs?.map((bomb) => {
      const x = bomb.col * CELL_SIZE;
      const y = bomb.row * CELL_SIZE;
      return createElement("div", {
        attrs: {
          class: "bomb",
          style: `transform: translate(${x}px, ${y}px);`,
        },
      });
    }) || [];

  // 4. Render players
  const playerChildren = Object.values(state.players)
    .map((p) => {
      if (!p.alive) return null;
      return createElement("div", {
        attrs: {
          class: `player player${p.playerId}`,
          id: `player-${p.playerId}`,
        },
      });
    })
    .filter(Boolean);

  const playerList = Object.values(state.players).map((p) =>
    createElement("li", {
      children: [`${p.nickname}: ${p.alive ? "Alive" : "Out"}`],
      attrs: {
        style: p.alive ? "" : "color: red; text-decoration: line-through;",
      },
    })
  );

  return createElement("div", {
    attrs: { class: "screen game-screen" },
    children: [
      createElement("h2", { children: ["Bomberman"] }),
      createElement("div", {
        attrs: { class: "game-container" },
        children: [
          createElement("div", {
            attrs: { class: "game-board-container" },
            children: [
              createElement("div", {
                attrs: { class: "game-board" },
                children: mapChildren,
              }),
              // Draw dynamic entities in order: explosions -> bombs -> players
              ...explosionChildren,
              ...bombChildren,
              ...playerChildren,
            ],
          }),
          createElement("div", {
            attrs: { class: "game-sidebar" },
            children: [
              createElement("h3", { children: ["Players"] }),
              createElement("ul", { children: playerList }),
            ],
          }),
        ],
      }),
    ],
  });
}
