import { createElement } from "../src/main.js";
import { connectWebSocket, getSocket } from "../client.js";
import chatMsgs from "../components/ChatCmp.js";
import QuitBtn from "../components/QuitBtn.js";
import { quiteGame } from "./GameView.js";
 
// https://excalidraw.com/#json=RJHu_-G6zzsMdhMu2waTM,Z0zJ3AAK6CPd9QM1WjLqew
let defaultplayers = new Array(4).fill(null);

function returnCount(gameState) {
  const state = gameState.getState()
  if (state.phase === "") {
    return ""
  } else {
    return state.phase + " " + state.countD
  }
}

export default function renderLobbyScreen(gameState, sendToServer) {
  const state = gameState.getState();
  const lobbyPlayers = Object.values(state.players || {});

  defaultplayers = defaultplayers.map((elem, i) => ({
    nickname: lobbyPlayers[i]?.nickname || "Waiting...",
  }));

  // console.log(defaultplayers, defaultplayers.length);
  let socket = getSocket();
  if (!socket) {
    // toGamefull(gameState);
  } else if (!state.nickname || state.currentScreen !== "lobby") {
    quiteGame(gameState);
  }

  const playersList = createElement('div', {
    attrs: { class: 'players-containersssssssss' },
    children: defaultplayers.map((player) =>
      createElement("div", {
        attrs: { class: `player-card ${state.nickname == player.nickname ? 'bounce' : ''} ` },
        children: [
          createElement("span", {
            children: [player.nickname],
          }),
        ],
      })
    )
  })

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
    chatMsgs(state, sendToServer, '',gameState),
    playersList,
  ];

  return createElement("div", {
    attrs: { class: "screen lobby-screen" },
    children: lobbyContent,
  });
}
