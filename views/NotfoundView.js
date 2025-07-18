import { createElement } from "../src/main.js";

export default function render404Screen() {
  return createElement("div", {
    attrs: { class: "screen x404-screen" },
    children: [
      createElement("h1", { children: ["Oops! Page Not Found"] }),

      createElement("p", {
        children: ["Sorry, the page you are looking for doesn't exist."],
      }),

      createElement("button", {
        attrs: { class: "btn"  },
        children: ["Go to Home"],
        events: {
          click: () => {
            location.hash = "#/";
          },
        },
      }),
    ],
  });
}
