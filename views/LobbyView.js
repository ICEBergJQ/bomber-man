import { createElement } from "../src/main.js";
import { socket } from "../client.js";


// https://excalidraw.com/#json=RJHu_-G6zzsMdhMu2waTM,Z0zJ3AAK6CPd9QM1WjLqew
let defaultplayers = new Array(4).fill(null)


function handleInput(e, sendToServer) {
  if (e.key === "Enter") {
    const input = e.target;
    const text = input.value.trim();
    if (text == '' || text.length > 100) {
      alert('enter a msg between 1 and 100 char!!')
    } else {
      sendToServer({ type: "chat", text: text });
      input.value = "";

    }
  }
}
export default function renderLobbyScreen(gameState, sendToServer) {
  const state = gameState.getState();
  const lobbyPlayers = Object.values(state.players || {})

  defaultplayers = defaultplayers.map((elem, i) => ({
    nickname: lobbyPlayers[i]?.nickname || 'Waiting...'
  }))

  // console.log(defaultplayers, defaultplayers.length);
  if (!socket || state.currentScreen !== "lobby") {
     window.location.hash = "#/gameFull";
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

  const chatMessages = (state.chatMessages || []).map((msg) =>
    createElement("span", {
      children: [
        createElement("strong", { children: [`${msg.nickname}: `] }),
        msg.text,
      ],
    })
  );

  let lobbyContent;

  const sharedUI = [
    createElement("div", {
      attrs: { class: "chat-container" },

      children: [
        createElement('div', {
          attrs: { class: 'chat-wrapper' },
          children: [
            createElement('div', {
              attrs: { class: 'chat-messages' },
              children: chatMessages
            }),

            createElement("input", {
              attrs: {
                type: "text",
                id: "chat-input",
                placeholder: "Type and press Enter..."

              },
              events: {
                keypress: (e) => handleInput(e, sendToServer),
              },
            }),
          ]
        })

      ],
    }),
  ];

  // if (state.isPlayer1) {
  lobbyContent = [
    createElement("header", {
      attrs: { class: 'container' },
      children: [
        createElement("h2", { children: ["welcome to waiting area"] }),
        createElement("button", {
          attrs: { class: "btn btn-success" },
          children: ["Start Game"],
          events: { click: () => sendToServer({ type: "startGame" }) },
        }),
        createElement("button", {
          attrs: { id: "quit-btn" },
          children: ["Quit"],
          events: {
            click: () => {
              console.log(123);

              if (socket) {
                socket.close();
              }
              sendToServer({ type: "quitGame" });
              gameState.setState({
                players: {},
                bombs: [],
                explosions: [],
                gameOver: false,
                winner: null,
                gameStarted: false,
                maze: null,
                currentScreen: "join",
                isPlayer1: false,
                nickname: "",
                chatMessages: [],
              });
              // location.hash = "#/";
              location.reload()
            },
          },
        })
      ]
    }),
    ...sharedUI,
    ...playersList
  ];
  // } else {
  //   lobbyContent = [
  //     createElement('header', {
  //       attrs: { class: 'container' },
  //       children: [
  //         createElement("h2", { children: ["Lobby: Waiting for Host..."] }),
  //         createElement("p", {
  //           children: ["Please wait for the host to start the game."],
  //         })
  //       ]
  //     }),
  //     ...sharedUI,
  //   ];
  // }

  return createElement("div", {
    attrs: { class: "screen lobby-screen" },
    children: lobbyContent,
  });
}
