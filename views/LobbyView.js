import { createElement } from "../src/main.js";
import { getSocket } from "../clientUtils/WS.js";
import chatMsgs from "../components/ChatCmp.js";
import { quiteGame } from "../clientUtils/stateUtils.js";

import QuitBtn from "../components/QuitBtn.js";

// https://excalidraw.com/#json=RJHu_-G6zzsMdhMu2waTM,Z0zJ3AAK6CPd9QM1WjLqew
let defaultplayers = new Array(4).fill(null);

function returnCount(gameState) {
  const state = gameState.getState();
  if (state.phase === "") {
    return "";
  } else {
    return state.phase + " " + state.countD;
  }
}

export default function renderLobbyScreen(gameState, sendToServer) {
  const state = gameState.getState();
  const lobbyPlayers = Object.values(state.players || {});

  defaultplayers = defaultplayers.map((elem, i) => ({
    nickname: lobbyPlayers[i]?.nickname || "Waiting...",
    playerID :  lobbyPlayers[i]?.playerId 
  }));

  let socket = getSocket();
  if (!socket) {
    // toGamefull(gameState);
  } else if (!state.nickname || state.currentScreen !== "lobby") {
    quiteGame(gameState);
  }

  const playersList = createElement("div", {
    attrs: { class: "players-containersssssssss" },
    children: defaultplayers.map((player) =>
      createElement("div", {
        attrs: {
          id:`player-card-${player.playerID}`,
          class: `player-card ${
            state.nickname == player.nickname ? "bounce" : ""
          } `,
        },
        children: [
          createElement("span", {
            children: [player.nickname],
          }),
        ],
      })
    ),
  });

  let lobbyContent;

  lobbyContent = [
    createElement("header", {
      attrs: { class: "container" },
      children: [
        createElement("h2", { children: ["welcome to the waiting area"] }),

        createElement("div", {
          attrs: { class: "countdown" },
          children: [returnCount(gameState)],
        }),
        QuitBtn(gameState),
      ],
    }),
    chatMsgs(state, sendToServer, "", gameState), 
    ///players counter
    createElement("div", {
      attrs: { class: "players-counter" },
      children: [`Players (${state.playerCount}/4)`],
    }),
    playersList,
  ];

  return createElement("div", {
    attrs: { class: "screen lobby-screen" },
    children: lobbyContent,
  });
}
