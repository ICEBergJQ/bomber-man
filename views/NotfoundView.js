import { createElement } from "../src/main.js";

export default function render404Screen() {
  return createElement("div", {
    attrs: { class: "screen x404-screen" },
    children: [
      // Header: Page Not Found
      createElement("h1", { children: ["Oops! Page Not Found"] }),

      // Description
+      createElement("p", {
        children: ["Sorry, the page you are looking for doesn't exist."],
      }),

      // Image or graphic (optional)
      createElement("img", {
        attrs: {
          src: "https://example.com/404-image.png",
          alt: "404 Not Found",
          style: "width: 200px; margin-top: 20px;",
        },
      }),

      // Button to go back to the home screen
      createElement("button", {
        attrs: { class: "btn btn-primary", style: "margin-top: 20px;" },
        children: ["Go to Home"],
        events: {
          click: () => {
            window.location.hash = "#/";
          },
        },
      }),
    ],
  });
}
