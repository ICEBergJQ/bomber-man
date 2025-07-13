import { createElement } from "../src/main.js";
import {connectWebSocket, socket} from "../client.js";

let nickname = ''
function handleInput(gameState, sendToServer) {
  nickname = nickname.trim()
  if (nickname) {
    gameState.setState({ ...gameState.getState(), nickname })
    console.log('[JoinView.js] "Join Game" button clicked.', nickname)
    sendToServer({ type: "registerPlayer", nickname })
    location.hash = "#/lobby"
  } else {
    alert("Please enter a nickname!")
  }
}

export default function renderJoinScreen(gameState, sendToServer) {
  if (!socket) {
    connectWebSocket();
    console.log("[JoinView.js] WebSocket connection established.");
  }
  console.log("[JoinView.js] Rendering view.");
  return createElement("div", {
    attrs: { class: "screen join-screen container" },
    children: [
      // TODO
      //createElement("h1", { children: ["Welcome to Bomberman!"] }),
      createElement("p", { children: ["Enter your nickname to join:"] }),
      createElement("input", {
        attrs: {
          type: "text",
          placeholder: "Enter your nickname",
          id: "nicknameInput",
        },
        events: {
          change: (e) => nickname = e.target.value,
        },
      }),
      createElement("button", {
        attrs: { class: "btn btn-primary" },
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
    ],
  });
}
