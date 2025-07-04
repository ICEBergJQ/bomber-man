import { createElement } from "../src/main.js";
import { mazeCell } from "../client.js";

export default function renderGameScreen(store) {
  const state = store.getState();
  const gameDiv = createElement("div", {
    attr: { id: "app" },
    children: [
      createElement("div", {
        attrs: { class: "game-board" },
        children: state.mazeLayout.flatMap((row, rowIndex) =>
          row.map((cell, colIndex) => mazeCell(cell, rowIndex, colIndex))
        ),
      }),
    ],
  });
  return gameDiv;
}
