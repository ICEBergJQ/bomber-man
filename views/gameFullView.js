import { createElement } from "../src/main.js";
import {  closeSocket } from "../client.js";

export default function renderGameErr() {
  return createElement("div", {
    attrs: { class: "screen GF-screen" },
    children: [
      // Header: Page Not Found
      createElement("h1", { children: ["Oops! the game is full or has already started."] }),

      // Button to go back to the home screen
      createElement("button", {
        attrs: { class: "btn btn-primary", style: "margin-top: 20px;" },
        children: ["Go to Home"],
        events: {
          click: () => {
            closeSocket();
            window.location.hash = "#/";
          },
        },
      }),
    ],
  });
}
