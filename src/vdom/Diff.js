import render from './Render.js';

const zip = (xs, ys) => {
  const zipped = [];
  for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
    zipped.push([xs[i], ys[i]]);
  }
  return zipped;
};

const diffAttrs = (oldAttrs, newAttrs) => {
  const patches = [];

  // Always remove all old events first
  if (oldAttrs.events) {
    patches.push(node => {
      for (const [event, handler] of Object.entries(oldAttrs.events)) {
        node.removeEventListener(event, handler);
      }
      return node;
    });
  }

  // Then add new events
  if (newAttrs.events) {
    patches.push(node => {
      for (const [event, handler] of Object.entries(newAttrs.events)) {
        node.addEventListener(event, handler);
      }
      return node;
    });
  }

  if (newAttrs.type === 'checkbox' || newAttrs.type === 'radio') {
    patches.push(node => {
      node.checked = !!newAttrs.checked;
      return node;
    });
  }

  // handling for input values
  if ('value' in newAttrs && newAttrs.value !== oldAttrs.value) {
    patches.push(node => {
      node.value = newAttrs.value;
      return node;
    });
  }

  // Set or remove new attributes
  for (const [key, value] of Object.entries(newAttrs)) {
    patches.push((node) => {
      if (value === false || value === null || value === undefined) {
        node.removeAttribute(key);
      } else {
        node.setAttribute(key, value === true ? '' : value);
      }
      return node;
    });
  }

  // Remove attributes that no longer exist
  for (const key in oldAttrs) {
    if (!(key in newAttrs)) {
      patches.push((node) => {
        node.removeAttribute(key);
        return node;
      });
    }
  }

  return (node) => {
    for (const patch of patches) {
      patch(node);
    }
    return node;
  };
};

const diffChildren = (oldVChildren, newVChildren) => {
  const childPatches = [];
  oldVChildren.forEach((oldVChild, i) => {
    childPatches.push(diff(oldVChild, newVChildren[i]));
  });

  const additionalPatches = [];
  for (const additionalVChild of newVChildren.slice(oldVChildren.length)) {
    additionalPatches.push(node => {
      node.appendChild(render(additionalVChild));
      return node;
    });
  }

  return (parent) => {
    for (const [patch, child] of zip(childPatches, parent.childNodes)) {
      patch(child);
    }

    for (const patch of additionalPatches) {
      patch(parent);
    }

    // Remove extra children
    while (parent.childNodes.length > newVChildren.length) {
      parent.removeChild(parent.lastChild);
    }

    return parent;
  };
};

export default function diff(vOldNode, vNewNode) {
  if (vNewNode === undefined) {
    return (node) => {
      node.remove();
      return undefined;
    };
  }

  if (typeof vNewNode === "string" || typeof vOldNode === "string") {
    if (vNewNode !== vOldNode) {
      return (node) => {
        const newNode = render(vNewNode);
        node.replaceWith(newNode);
        return newNode;
      };
    } else {
      return (node) => node;
    }
  }

  if (vOldNode.tagName !== vNewNode.tagName) {
    return (node) => {
      const newNode = render(vNewNode);
      node.replaceWith(newNode);
      return newNode;
    };
  }

  const patchAttrs = diffAttrs(vOldNode.attrs, vNewNode.attrs);
  const patchChildren = diffChildren(vOldNode.children, vNewNode.children);

  return (node) => {
    patchAttrs(node);
    patchChildren(node);
    return node;
  };
}