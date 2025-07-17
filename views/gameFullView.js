import { createElement } from "../src/main.js";
import { closeSocket } from "../client.js";

export default function renderGameErr() {
  return createElement("div", {
    attrs: { class: "screen container" },
    children: [
      // Header: Page Not Found
      createElement("p", {
        attrs: { class: 'bg' },
        children: ["Oops! the game is full or has already started, wait for the game to end and try again."]
      }),
 
      createElement("button", {
        attrs: { class: "btn " },
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
