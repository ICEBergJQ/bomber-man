import createElement from "./vdom/CreateElement.js";
import render from "./vdom/Render.js";
import Mount from "./vdom/Mount.js";
import Diff from "./vdom/Diff.js";

const createVApp = (count) =>
  createElement("div", {
    attrs: {
      id: "app",
      dataCount: count,
    },
    children: [
      String(count),
      createElement("img", {
        attrs: {
          src: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWltZ3htZGtrb2U3eDgyYWkweTNscWh3djNrOHFnYm1yYzV1c3Q0cSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/SKAQ4kWov6tdC/giphy.gif",
        },
      }),
    ],
  });

let count = 0;
let vApp = createVApp(count);
const app = render(vApp);

let rootElement = Mount(app, document.getElementById("app"));

setInterval(() => {
  count++;
  const vNewApp = createVApp(count);
  const patch = Diff(vApp, vNewApp);
  rootElement = patch(rootElement);
  vApp = vNewApp;
}, 1000);

console.log(app);
