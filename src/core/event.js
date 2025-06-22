const eventRegistry = {};

export function on(eventType, selector, handler) {
  if (!eventRegistry[eventType]) {
    eventRegistry[eventType] = [];

    // Set up the global listener once per event type
    document.addEventListener(eventType, (event) => {
      eventRegistry[eventType].forEach(({ selector, handler }) => {
        if (event.target.matches(selector)) {
          handler(event);
        }
      });
    });
  }

  eventRegistry[eventType].push({ selector, handler });
}
