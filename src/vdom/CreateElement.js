export default function createElement(tagName, { attrs = {}, children = [], events = {} } = {}) {
  return {
    tagName,
    attrs,
    children,
    events,
  };
}