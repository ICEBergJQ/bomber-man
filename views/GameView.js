import { createElement } from "../src/main.js";
import { getSocket } from "../clientUtils/WS.js";
import chatMsgs from "../components/ChatCmp.js";
import { toGamefull } from "../clientUtils/stateUtils.js";
import QuitBtn from "../components/QuitBtn.js";

export default function renderGameScreen(gameState, sendToServer) {
  const state = gameState.getState();
  const maze = state.maze;
  const CELL_SIZE = 30;
  let socket = getSocket();
  if (!state.gameStarted || !socket) {
    toGamefull(gameState);
    return;
  }

  if (!maze) {
    // No need to call removePlayerControls() anymore
    return createElement("div", {
      attrs: { class: "screen loading-screen" },
      children: [createElement("h2", { children: ["Loading Game..."] })],
    });
  }

  const powerupChildren = (state.powerups || []).map((powerup) => {
    const x = powerup.col * CELL_SIZE;
    const y = powerup.row * CELL_SIZE;

    return createElement("div", {
      attrs: {
        class: `powerup powerup-${powerup.type}`,
        style: `
        left: ${x}px;
        top: ${y}px;
      `,
        "data-type": powerup.type,
      },
    });
  });
  const mapChildren = maze?.flatMap((row) =>
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
      // Cleaned up class assignment for clarity
      const playerClasses = ["player", `player${p.playerId}`];
      if (p.invincible) {
        playerClasses.push("invincible");
      }
      return createElement("div", {
        attrs: {
          class: playerClasses.join(" "),
          id: `player-${p.playerId}`,
        },
      });
    })
    .filter(Boolean);

  const playerList = Object.values(state.players).map((p) => {
    const lifeDisplay = p.alive ? "❤️".repeat(p.lives) : "💀 OUT";

    return createElement("div", {
      attrs: {
        class: "game-player",
        style: p.alive ? "" : "color: #888; text-decoration: line-through;",
      },
      children: [
        createElement("div", {
          attrs: {
            class: "game-player-img",
          },
        }),
        createElement("div", {
          children: [
            createElement("span", {
              children: [p.nickname],
            }),
            createElement("div", {
              children: [lifeDisplay],
            }),
          ],
        }),
      ],
    });
  });

  return createElement("div", {
    attrs: { class: "screen game-screen" },
    children: !state.winner
      ? [
          QuitBtn(gameState),
          createElement("div", {
            attrs: { class: "game-container" },
            children: [
              createElement("div", {
                attrs: { class: "game-sidebar" },
                children: [createElement("div", { children: playerList })],
              }),
              createElement("div", {
                attrs: { class: "game-board-container" },
                children: [
                  createElement("div", {
                    attrs: { class: "game-board" },
                    children: mapChildren,
                  }),
                  createElement("div", {
                    attrs: { class: "explosions-container" },
                    children: explosionChildren,
                  }),
                  createElement("div", {
                    attrs: { class: "bombs-container" },
                    children: bombChildren,
                  }),
                  createElement("div", {
                    attrs: { class: "powerups-container" },
                    children: powerupChildren,
                  }),
                  createElement("div", {
                    attrs: { class: "players-container" },
                    children: playerChildren,
                  }),
                ],
              }),
            ],
          }),
          chatMsgs(state, sendToServer, "game-chat", gameState),
        ]
      : [
          createElement("div", {
            attrs: { class: "win" },
            children: [
              createElement("span", {
                children: [`${state.winner.nickname} is the Winner!`],
              }),
            ],
          }),
        ],
  });
}
