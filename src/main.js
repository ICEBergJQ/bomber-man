import createElement from "./vdom/CreateElement.js";
import render from "./vdom/Render.js";
import Mount from "./vdom/Mount.js";
import Diff from "./vdom/Diff.js";

const createVApp = () =>
  createElement("div", {
    attrs: {
      id: "app",
    },
    children: [
      createElement("input", {
        attrs: {
          id: "input",
        },
      }),
      createElement("button", {
        attrs: {
          id: "submit",
        },
        events: {
          click: (e) => addToDo(e)
        },
        children: ["click you"]
      })
    ]
  });

function addToDo(e) {
  if (e.key === 'Enter' && e.target.value.trim() && e.target.value.trim().length >= 2) {
    e.target.value = '';
  }

}


let vApp = createVApp();
const app = render(vApp);

let rootElement = Mount(app, document.getElementById("app"));

function init() {
  const vNewApp = createVApp();
  const patch = Diff(vApp, vNewApp);
  rootElement = patch(rootElement);
  vApp = vNewApp;
}
init();
console.log(app);
