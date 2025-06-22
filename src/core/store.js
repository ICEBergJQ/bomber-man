export function createStore(initialState) {
  let state = initialState;
  const listeners = [];

  return {
    getState: () => state,
    setState: (newState) => {
      state = newState;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.push(listener);
    },
  };
}
