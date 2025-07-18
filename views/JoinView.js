import { createElement } from "../src/main.js";
import { connectWebSocket, getSocket } from "../clientUtils/WS.js";

let nickname = "";

///validate and check user nickname
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
    
    sendToServer({ type: "registerPlayer", nickname });
    location.hash = "#/lobby";
  }
}
///create join screen elements
export default function renderJoinScreen(gameState, sendToServer) {
  let socket = getSocket();
  if (!socket) {
    connectWebSocket(gameState);
    console.log("[JoinView.js] WebSocket connection established.");
  }
 
  return createElement("div", {
    attrs: { class: "join-screen container" },
    children: [
      createElement("h1", { 
        children: ["Welcome to Bomberman!"] 
      }),
      createElement("div", { 
        children: [
          createElement("input", {
            attrs: {
              type: "text",
              placeholder: "Enter your nickname",
              id: "nicknameInput",
              minlength: '2',
              maxlength: '10',
              autofocus: true
            },
            events: {
              change: (e) => (nickname = e.target.value),
            },
          }),
          createElement("button", { 
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
