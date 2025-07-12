# 🧩 MyMiniFramework

A minimal JavaScript framework built from scratch to demonstrate how real frameworks like React or Vue work under the hood.

It features:
- ✅ Virtual DOM abstraction
- ✅ Render and Mount engine
- ✅ Diffing algorithm
- ✅ State Management
- ✅ Hash-based Routing
- ✅ Global Event Handling System
- ✅ TodoMVC demo

---

## 📁 Project Structure

```

src/
├── index.html              # Entry HTML file
├── main.js                 # Main TodoMVC app using the framework
├── core/
│   ├── store.js            # State management
│   ├── router.js           # Simple hash router
│   └── events.js           # Global event delegation system
├── vdom/
│   ├── CreateElement.js    # Virtual element factory
│   ├── Render.js           # Converts VDOM to real DOM
│   ├── Diff.js             # Patches DOM differences
│   └── Mount.js            # Replaces DOM root
└── README.md               # You're reading it :)

````

---

## 🚀 Getting Started

### 🔧 Render the App

```js
import render from "./vdom/Render.js";
import Mount from "./vdom/Mount.js";

const app = render(vApp);
Mount(app, document.getElementById("app"));
````

---

## 🧱 Core API

### 1. Create a DOM Element

```js
createElement("div", {
  attrs: { class: "box" },
  children: ["Hello!"]
});
```

---

### 2. Nest Elements

```js
createElement("ul", {
  children: [
    createElement("li", { children: ["Item 1"] }),
    createElement("li", { children: ["Item 2"] }),
  ],
});
```

---

### 3. Add Attributes

```js
createElement("input", {
  attrs: {
    type: "text",
    placeholder: "Write something",
  },
});
```

---

### 4. Add Inline Events

```js
createElement("button", {
  attrs: { id: "clicker" },
  events: {
    click: () => console.log("Clicked"),
  },
  children: ["Click Me"],
});
```

---

### 5. Global Event Handling

```js
import { on } from "./core/events.js";

on("click", "#submit", () => {
  alert("Button clicked using global system!");
});
```

You only need to call `on()` once — it will match **future dynamic elements** too.

---

### 6. State Management

```js
import { createStore } from "./core/store.js";

const store = createStore({ counter: 0 });

store.subscribe(() => {
  console.log("Updated:", store.getState());
});

store.setState({ counter: store.getState().counter + 1 });
```

---

### 7. Routing

```js
import { createRouter } from "./core/router.js";

createRouter({
  "/": () => console.log("Home route"),
  "/about": () => console.log("About route"),
});
```

Supported routes: `#/`, `#/active`, `#/completed`

---

## ✅ TodoMVC Features

This framework powers a full-featured TodoMVC app:

* ✅ Add new todos
* ✅ Mark todos as complete/incomplete
* ✅ Filter by route: All / Active / Completed
* ✅ Re-render on state changes
* ✅ URL reflects filter state
* ✅ Clean and fast performance

---

## 🌐 How to Run

Simply open the app in your browser:

```bash
cd src/
open index.html  # or double click it
```

No server or build step needed!

---

## 🤓 Why This Works

* Virtual DOM represents your UI as plain JS objects
* `render()` turns virtual elements into real DOM nodes
* `Diff()` compares trees and patches the DOM efficiently
* Global state drives reactivity and UI sync
* Router syncs app state with URL
* Events are handled efficiently using event delegation

---

## 🛠️ Tech Stack

* HTML
* JavaScript (ES Modules)
* No libraries or frameworks used — 100% native code

---

## 👨‍💻 Author

Built by **\[abdeladim jabbouri]**

---

```

---