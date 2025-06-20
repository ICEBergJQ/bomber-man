const renderElement = ({ tagName, attrs, children }) => {
  const element = document.createElement(tagName);
  // set attributes
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
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
