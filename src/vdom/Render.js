function renderElement({ tagName, attrs, children, events }) {
  const element = document.createElement(tagName);

  if (tagName === 'input') {
    if (attrs.type === 'checkbox' || attrs.type === 'radio') {
      element.checked = attrs.checked;
    }
  }

  // Set attributes
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined && value !== false) {
      if (value === true) {
        element.setAttribute(key, '');
      } else {
        element.setAttribute(key, value);
      }
    }
  }
  
  // Bind events
  if (events) {
    for (const [eventName, handler] of Object.entries(events)) {
      element.addEventListener(eventName, handler);
    }
  }

  // Set children
  for (const child of children) {
    const childElement = render(child);
    element.appendChild(childElement);
  }

  return element;
}

export default function render(vNode) {
  if (typeof vNode === "string" || typeof vNode === "number") {
    return document.createTextNode(vNode);
  }
  return renderElement(vNode);
}