import createElement from "./vdom/CreateElement.js";
import render from "./vdom/Render.js";
import Mount from "./vdom/Mount.js";
import Diff from "./vdom/Diff.js";
import { createStore } from "./core/store.js";
import { createRouter } from "./core/router.js";
import { on } from "./core/events.js";

const initialTodos = [];
const store = createStore({ todos: initialTodos, filter: "all" });

function toggleTodo(index) {
  const todos = store.getState().todos.map((todo, i) => {
    return i === index ? { ...todo, done: !todo.done } : todo;
  });
  store.setState({ ...store.getState(), todos });
}

function getFilteredTodos() {
  const { todos, filter } = store.getState();
  if (filter === "active") return todos.filter((t) => !t.done);
  if (filter === "completed") return todos.filter((t) => t.done);
  return todos;
}

function createVApp() {
  const input = createElement("input", {
    attrs: {
      id: "input",
      placeholder: "Add todo",
    },
    events: {
      keydown: (e) => {
        if (e.key === "Enter") {
          const text = e.target.value.trim();
          if (text.length >= 2) {
            const newTodo = { text, done: false };
            const updatedTodos = [...store.getState().todos, newTodo];
            store.setState({ ...store.getState(), todos: updatedTodos });
            e.target.value = "";
          }
        }
      },
    },
  });

  // const button = createElement("button", {
  //   attrs: { id: "submit" },
  //   events: {
  //     click: () => {
  //       const inputEl = document.getElementById("input");
  //       const text = inputEl.value.trim();
  //       if (text.length >= 2) {
  //         const newTodo = { text, done: false };
  //         const updatedTodos = [...store.getState().todos, newTodo];
  //         store.setState({ ...store.getState(), todos: updatedTodos });
  //         inputEl.value = "";
  //       }
  //     },
  //   },
  //   children: ["Add"],
  // });


  const filtered = getFilteredTodos();
  const todoList = createElement("ul", {
    children: filtered.map((todo, index) =>
      createElement("li", {
        children: [
          createElement("input", {
            attrs: {
              type: "checkbox",
              checked: todo.done ? "checked" : null,
            },
            events: {
              click: () => toggleTodo(index),
            },
          }),
          todo.text,
        ],
      })
    ),
  });

  const nav = createElement("div", {
    attrs: { id: "nav" },
    children: [
      createElement("a", {
        attrs: { href: "#/" },
        children: ["All"],
      }),
      createElement("a", {
        attrs: { href: "#/active" },
        children: ["Active"],
      }),
      createElement("a", {
        attrs: { href: "#/completed" },
        children: ["Completed"],
      }),
    ],
  });

  return createElement("div", {
    attrs: { id: "app" },
    children: [input, nav, todoList],
  });
}

// Initial mount
let vApp = createVApp();
let rootElement = Mount(render(vApp), document.getElementById("app"));

// Re-render on state change
store.subscribe(() => {
  const newVApp = createVApp();
  const patch = Diff(vApp, newVApp);
  rootElement = patch(rootElement);
  vApp = newVApp;
});

// Setup router
createRouter({
  "/": () => store.setState({ ...store.getState(), filter: "all" }),
  "/active": () => store.setState({ ...store.getState(), filter: "active" }),
  "/completed": () =>
    store.setState({ ...store.getState(), filter: "completed" }),
});

// on("click", "#submit", () => {
//   const inputEl = document.getElementById("input");
//   const text = inputEl.value.trim();
//   if (text.length >= 2) {
//     const newTodo = { text, done: false };
//     const updatedTodos = [...store.getState().todos, newTodo];
//     store.setState({ ...store.getState(), todos: updatedTodos });
//     inputEl.value = "";
//   }
// });
