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
      if (document.activeElement.id !== "chat-input")
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

  const mapChildren = maze.flatMap((row) =>
    row.map((cellType) => {
      let className = "cell";
      if (cellType === "#") className += " wall";
      else if (cellType === "*") className += " box";
      else className += " empty";
      return createElement("div", { attrs: { class: className } });
    })
  );
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

  const playerChildren = Object.values(state.players)
    .map((p) => {
      if (!p.alive) return null;
      let playerClass = `player player${p.playerId}`;
      if (p.invincible) playerClass += " invincible";
      return createElement("div", {
        attrs: {
          class: playerClass,
          id: `player-${p.playerId}`,
          // --- THIS IS THE FIX ---
          // Set the initial position directly when the element is created.
          style: `transform: translate(${p.x}px, ${p.y}px);`,
        },
      });
    })
    .filter(Boolean);

  const playerList = Object.values(state.players).map((p) => {
    const lifeDisplay = p.alive ? "❤️".repeat(p.lives) : "💀 OUT";
    return createElement("li", {
      children: [`${p.nickname}: ${lifeDisplay}`],
      attrs: {
        style: p.alive ? "" : "color: #888; text-decoration: line-through;",
      },
    });
  });

  const chatMessages = (state.chatMessages || []).map((msg) =>
    createElement("p", {
      children: [
        createElement("strong", { children: [`${msg.nickname}: `] }),
        msg.text,
      ],
    })
  );

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
            attrs: { class: "game-board-container" },
            children: [
              createElement("div", {
                attrs: { class: "game-board" },
                children: mapChildren,
              }),
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
              createElement("h3", {
                children: ["Chat"],
                attrs: { style: "margin-top: 20px;" },
              }),
              createElement("div", {
                attrs: { class: "chat-messages" },
                children: chatMessages,
              }),
              createElement("input", {
                attrs: {
                  type: "text",
                  id: "chat-input",
                  placeholder: "Type and press Enter...",
                  autocomplete: "off",
                },
                events: {
                  keypress: (e) => {
                    if (e.key === "Enter") {
                      const input = e.target;
                      const text = input.value.trim();
                      if (text) {
                        sendToServer({ type: "chat", text: text });
                        input.value = "";
                      }
                    }
                  },
                },
              }),
            ],
          }),

          createElement("div", {
            attrs: { class: "game-board" },
            children: gameBoardChildren,
          }),
        ],
      }),
    ],
  });
}
