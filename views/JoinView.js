import { createElement } from "../src/main.js";
import { connectWebSocket, getSocket } from "../client.js";

let nickname = "";

function handleInput(gameState, sendToServer) {
  nickname = nickname.trim();

  if (nickname == "" || nickname.length > 10 || nickname.length < 2) {
    alert("Please enter a nickname between 2 and 10 chars!");
  } else {
    let players = gameState.getState().players;
    console.log(players);

    let [_, value] = Object.entries(players);
    console.log(value?.nickname);
    let exist = false;

    Object.entries(players).forEach(([key, value]) => {
      if (value.nickname === nickname) {
        exist = true;
      }
    });

    if (exist) {
      alert("nickname already taken");
      return;
    }

    gameState.setState({ ...gameState.getState(), nickname });
    console.log('[JoinView.js] "Join Game" button clicked.', nickname);
    sendToServer({ type: "registerPlayer", nickname });
    location.hash = "#/lobby";
  }
}

export default function renderJoinScreen(gameState, sendToServer) {
  let socket = getSocket();
  if (!socket) {
    connectWebSocket();
    console.log("[JoinView.js] WebSocket connection established.");
  }

  console.log("[JoinView.js] Rendering view.");
  return createElement("div", {
    attrs: { class: "screen join-screen container" },
    children: [
      createElement("h1", { children: ["Welcome to Bomberman!"] }),
      //createElement("h1", { children: ["-------------!"] }),
      createElement("div", {
        attrs: { class: "wrapper" },
        children: [
          createElement("input", {
            attrs: {
              type: "text",
              placeholder: "Enter your nickname",
              id: "nicknameInput",
            },
            events: {
              change: (e) => (nickname = e.target.value),
            },
          }),
          createElement("button", {
            attrs: { class: "btn btn-primary" },
            children: ["Join Game"],
            events: {
              click: () => handleInput(gameState, sendToServer),
            },
          }),
        ],
      }),
    ],
  });
}
