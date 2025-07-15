import { createElement } from "../src/main.js";
import { connectWebSocket, socket } from "../client.js";

let nickname = ''

function handleInput(gameState, sendToServer) {


  nickname = nickname.trim()

  if (nickname == '' || nickname.length > 10 || nickname.length < 2) {
    alert("Please enter a nickname between 2 and 10 chars!")
  } else {
    gameState.setState({ ...gameState.getState(), nickname })
    console.log('[JoinView.js] "Join Game" button clicked.', nickname)
    sendToServer({ type: "registerPlayer", nickname })
    location.hash = "#/lobby"
  }
}

export default function renderJoinScreen(gameState, sendToServer) {
  if (!socket) {
    connectWebSocket();
    console.log("[JoinView.js] WebSocket connection established.");
  }
  console.log("[JoinView.js] Rendering view.");
  return createElement("div", {
    attrs: { class: "  join-screen container" },
    children: [
      createElement("h1", { children: ["Welcome to Bomberman!"] }),
      //createElement("h1", { children: ["-------------!"] }),
      createElement("div", {
        attrs: { class: 'wrapper' },
        children: [

          createElement("input", {
            attrs: {
              type: "text",
              placeholder: "Enter your nickname",
              id: "nicknameInput",
              minlength:'2',
              maxlength:'10',
              autofocus: true
            },
            events: {
              change: (e) => nickname = e.target.value,
            },
          }),
          createElement("button", {
            attrs: { class: "btn" },
            children: ["Join Game"],
            events: {
              click: () => handleInput(gameState, sendToServer),
            },
          }),
          // createElement("div", { 
          //   children: [
          //     createElement("label", {
          //       children: [
          //         "Simulate Host: ",
          //         createElement("input", {
          //           attrs: {
          //             type: "checkbox",
          //             checked: gameState.getState().isPlayer1,
          //           },
          //           events: {
          //             change: (e) =>
          //               gameState.setState({
          //                 ...gameState.getState(),
          //                 isPlayer1: e.target.checked,
          //               }),
          //           },
          //         }),
          //       ],
          //     }),
          //   ],
          // }),
        ]
      }),
    ],
  });
}
