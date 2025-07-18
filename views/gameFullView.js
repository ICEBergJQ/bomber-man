import { createElement } from "../src/main.js";
import { closeSocket } from "../clientUtils/WS.js";

export default function renderGameErr() {
  return createElement("div", {
    attrs: { class: "screen container" },
    children: [
      // Header: Page Not Found
      createElement("p", {
        attrs: { class: "bg" },
        children: [
          "Oops! the game is full or has already started, wait for the game to end and try again.",
        ],
      }),

      // Button to go back to the home screen
      createElement("button", {
        attrs: { class: "btn btn-primary", style: "margin-top: 20px;" },
        children: ["try again"],
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
