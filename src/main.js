// import createElement from "./vdom/CreateElement.js";
// import render from "./vdom/Render.js";
// import Mount from "./vdom/Mount.js";
// import Diff from "./vdom/Diff.js";
// import { createStore } from "./core/store.js";
// import { createRouter } from "./core/router.js";
// import { on } from "./core/events.js";

// const initialTodos = [];
// const store = createStore({ todos: initialTodos, filter: "all" });

// function toggleTodo(index) {
//   const todos = store.getState().todos.map((todo, i) => {
//     return i === index ? { ...todo, done: !todo.done } : todo;
//   });
//   store.setState({ ...store.getState(), todos });
// }

// function getFilteredTodos() {
//   const { todos, filter } = store.getState();
//   if (filter === "active") return todos.filter((t) => !t.done);
//   if (filter === "completed") return todos.filter((t) => t.done);
//   return todos;
// }

// function createVApp() {
//   const input = createElement("input", {
//     attrs: {
//       id: "input",
//       placeholder: "Add todo",
//     },
//     events: {
//       keydown: (e) => {
//         if (e.key === "Enter") {
//           const text = e.target.value.trim();
//           if (text.length >= 2) {
//             const newTodo = { text, done: false };
//             const updatedTodos = [...store.getState().todos, newTodo];
//             store.setState({ ...store.getState(), todos: updatedTodos });
//             e.target.value = "";
//           }
//         }
//       },
//     },
//   });

//   // const button = createElement("button", {
//   //   attrs: { id: "submit" },
//   //   events: {
//   //     click: () => {
//   //       const inputEl = document.getElementById("input");
//   //       const text = inputEl.value.trim();
//   //       if (text.length >= 2) {
//   //         const newTodo = { text, done: false };
//   //         const updatedTodos = [...store.getState().todos, newTodo];
//   //         store.setState({ ...store.getState(), todos: updatedTodos });
//   //         inputEl.value = "";
//   //       }
//   //     },
//   //   },
//   //   children: ["Add"],
//   // });


//   const filtered = getFilteredTodos();
//   const todoList = createElement("ul", {
//     children: filtered.map((todo, index) =>
//       createElement("li", {
//         children: [
//           createElement("input", {
//             attrs: {
//               type: "checkbox",
//               checked: todo.done ? "checked" : null,
//             },
//             events: {
//               click: () => toggleTodo(index),
//             },
//           }),
//           todo.text,
//         ],
//       })
//     ),
//   });

//   const nav = createElement("div", {
//     attrs: { id: "nav" },
//     children: [
//       createElement("a", {
//         attrs: { href: "#/" },
//         children: ["All"],
//       }),
//       createElement("a", {
//         attrs: { href: "#/active" },
//         children: ["Active"],
//       }),
//       createElement("a", {
//         attrs: { href: "#/completed" },
//         children: ["Completed"],
//       }),
//     ],
//   });

//   return createElement("div", {
//     attrs: { id: "app" },
//     children: [input, nav, todoList],
//   });
// }

// // Initial mount
// let vApp = createVApp();
// let rootElement = Mount(render(vApp), document.getElementById("app"));

// // Re-render on state change
// store.subscribe(() => {
//   const newVApp = createVApp();
//   const patch = Diff(vApp, newVApp);
//   rootElement = patch(rootElement);
//   vApp = newVApp;
// });

// // Setup router
// createRouter({
//   "/": () => store.setState({ ...store.getState(), filter: "all" }),
//   "/active": () => store.setState({ ...store.getState(), filter: "active" }),
//   "/completed": () =>
//     store.setState({ ...store.getState(), filter: "completed" }),
// });

// // on("click", "#submit", () => {
// //   const inputEl = document.getElementById("input");
// //   const text = inputEl.value.trim();
// //   if (text.length >= 2) {
// //     const newTodo = { text, done: false };
// //     const updatedTodos = [...store.getState().todos, newTodo];
// //     store.setState({ ...store.getState(), todos: updatedTodos });
// //     inputEl.value = "";
// //   }
// // });



import render from "./vdom/Render.js";
// import Mount from "./vdom/Mount.js";
// import Diff from "./vdom/Diff.js";
// import { createStore } from "./core/store.js";
// import { createRouter } from "./core/router.js";
// import { on } from "./core/events.js";


import createElement from "./vdom/CreateElement.js";
let player = {
  row: 1,
  col: 1,
};

function generateMaze(rows, cols) {
  const maze = [];

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      // Border walls all around
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        row.push('#');
      }
      // Place walls in a checkerboard pattern (for solid walls)
      else if (r % 2 === 0 && c % 2 === 0) {
        row.push('#');
      }
      else {
        // Randomly place boxes (*) or empty spaces ( )
        const rand = Math.random();
        if (rand < 0.2) row.push('*');    // 20% chance box
        else row.push(' ');               // empty space
      }
    }
    maze.push(row);
  }

  // Make sure the player's starting position is empty
  maze[1][1] = ' ';
  maze[1][2] = ' ';
  maze[2][1] = ' ';

  return maze;
}

const mazeLayout = generateMaze(13, 23);


const mazeCell = (type, rowIndex, colIndex) => {
  let className = 'cell';

  if (rowIndex === player.row && colIndex === player.col) {
    className += ' player';
  } else {
    switch (type) {
      case '#': className += ' wall'; break;
      case '*': className += ' box'; break;
      default:  className += ' empty'; break;
    }
  }

  return createElement('div', {
    attrs: { class: className }
  });
};
;

const gameDiv = createElement('div', {
  attrs: { class: 'game' },
  children: mazeLayout.flatMap(row =>
    row.map(cell => mazeCell(cell))
  ),
});

// const app = document.getElementById('app');
// const rendered = render(gameDiv);
// app.appendChild(rendered);


function renderGame() {
  const gameDiv = createElement('div', {
    attrs: { class: 'game' },
    children: mazeLayout.flatMap((row, rowIndex) =>
      row.map((cell, colIndex) => mazeCell(cell, rowIndex, colIndex))
    ),
  });

  const root = document.getElementById('app');
  root.innerHTML = '';
  root.appendChild(render(gameDiv));
}

renderGame();

document.addEventListener('keydown', (e) => {
  let newRow = player.row;
  let newCol = player.col;

  switch (e.key) {
    case 'ArrowUp': newRow--; break;
    case 'ArrowDown': newRow++; break;
    case 'ArrowLeft': newCol--; break;
    case 'ArrowRight': newCol++; break;
    default: return; // ignore other keys
  }

  // Check bounds and wall collisions
  if (
    mazeLayout[newRow] &&
    mazeLayout[newRow][newCol] !== '#' &&
    mazeLayout[newRow][newCol] !== undefined
  ) {
    player.row = newRow;
    player.col = newCol;
    renderGame();
  }
});





 





