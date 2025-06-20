import render from "./Render.js";

const diffAttrs = (oldAttrs, newAttrs) => {
  const patches = [];
  // set new Attributes
  for (const [key, value] of Object.entries(newAttrs)) {
    patches.push((node) => {
      node.setAttribute(key, value);
      return node;
    });
  }

  // remove old Attributes
  for (const key in oldAttrs) {
    if (!(key in newAttrs)) {
      patches.push((node) => {
        node.removeAttribute(key);
        return node;
      });
    }
  }

  return node => {
    for (const patch of patches) {
      patch(node);
    }
    // return node;
  }
};

const Diff = (vOldNode, vNewNode) => {
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
      return (node) => {
        return undefined;
      };
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
//   const patchChildren = diffChildren(vOldNode.children, vNewNode.children);

  return (node) => {
    patchAttrs(node);
    // patchChildren(node);
    return node;
  };
};

export default Diff;
