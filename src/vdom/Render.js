const renderElement = ({ tagName, attrs, children, events }) => {
  const element = document.createElement(tagName);
  // set attributes
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }

  // Bind events
  if (events) {
    for (const [eventName, handler] of Object.entries(events)) {
      element[`on${eventName}`] = handler;
    }
  }

  // set children
  for (const child of children) {
    const childe = render(child);
    element.appendChild(childe);
  }
  return element;
};

function render(vNode) {
  if (typeof vNode === "string") {
    return document.createTextNode(vNode);
  }
  return renderElement(vNode);
}

export default render;
