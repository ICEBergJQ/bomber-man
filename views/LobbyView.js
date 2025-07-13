import { createElement } from "../src/main.js";
import { socket } from "../client.js";

export default function renderLobbyScreen(gameState, sendToServer) {
  const state = gameState.getState();
  const lobbyPlayers = state.players ? Object.values(state.players) : [];
  console.log(state);

  const playersList =
    lobbyPlayers.length > 0
      ? lobbyPlayers.map((player) =>
          createElement("li", {
            children: [player.nickname || "Unnamed Player"],
          })
        )
      : [createElement("li", { children: ["Waiting for players..."] })];

  const chatMessages = (state.chatMessages || []).map((msg) =>
    createElement("p", {
      children: [
        createElement("strong", { children: [`${msg.nickname}: `] }),
        msg.text,
      ],
    })
  );

  let lobbyContent;

  const sharedUI = [
    createElement("a", {
      attrs: { id: "quit-btn" },
      children: ["Quit"],
      events: {
        click: () => {
          if (socket) {
            socket.close();
          }
          window.location.hash = "#/";
        },
      },
    }),
    createElement("h3", { children: ["Players"] }),
    createElement("ul", { children: playersList }),
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
  ];

  if (state.isPlayer1) {
    lobbyContent = [
      createElement("header", {
        attrs: { class: 'container' },
        children: [
          createElement("h2", { children: ["Lobby: You are the Host"] }),
          createElement("p", { children: ['Click "Start Game" when ready.'] }),
          createElement("button", {
            attrs: { class: "btn btn-success" },
            children: ["Start Game"],
            events: { click: () => sendToServer({ type: "startGame" }) },
          })
        ]
      }),
      ...sharedUI,
    ];
  } else {
    lobbyContent = [
      createElement('header', {
        attrs: { class: 'container' },
        children: [
          createElement("h2", { children: ["Lobby: Waiting for Host..."] }),
          createElement("p", {
            children: ["Please wait for the host to start the game."],
          })
        ]
      }),
      ...sharedUI,
    ];
  }

  return createElement("div", {
    attrs: { class: "screen lobby-screen" },
    children: lobbyContent,
  });
}
