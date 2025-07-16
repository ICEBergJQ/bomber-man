import { createElement } from "../src/main.js";
import {  getSocket } from "../client.js";
import chatMsgs from "../components/ChatCmp.js";
import { quiteGame } from "./GameView.js";

// https://excalidraw.com/#json=RJHu_-G6zzsMdhMu2waTM,Z0zJ3AAK6CPd9QM1WjLqew
let defaultplayers = new Array(4).fill(null)


export default function renderLobbyScreen(gameState, sendToServer) {
  const state = gameState.getState();
  const lobbyPlayers = Object.values(state.players || {})

  defaultplayers = defaultplayers.map((elem, i) => ({
    nickname: lobbyPlayers[i]?.nickname || 'Waiting...'
  }))

  // console.log(defaultplayers, defaultplayers.length);
  let socket = getSocket()
  if (!socket) {
     window.location.hash = "#/gameFull";
  } else if (!state.nickname || state.currentScreen !== "lobby") {
      window.location.reload();
  }

  const playersList = defaultplayers.map((player) =>
    createElement("div", {
      attrs: { class: 'player-card' },
      children: [
        createElement('span', {
          children: [player.nickname]
        })
      ],
    })
  )


  let lobbyContent;
 

  // if (state.isPlayer1) {
  lobbyContent = [
    createElement("header", {
      attrs: { class: 'container' },
      children: [
        createElement("h2", { children: ["welcome to waiting area"] }),
        createElement("button", {
          attrs: { class: "btn-success" },
          children: ["Start Game"],
          events: { click: () => sendToServer({ type: "startGame" }) },
        }),
        createElement("button", {
          attrs: { id: "quit-btn" },
          children: ["Quit"],
          events: {
            click: () => quiteGame(gameState, sendToServer),
          },
        })
      ]
    }),
    chatMsgs(state, sendToServer),
    ...playersList
  ]
 

  return createElement("div", {
    attrs: { class: "screen lobby-screen" },
    children: lobbyContent,
  });
}
