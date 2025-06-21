export default (tagName, { attrs = {}, children = [], events = [] } = {}) => {
  return {
    tagName,
    attrs,
    children,
    events,
  };
};
