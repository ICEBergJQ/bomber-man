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

export function off(eventType, selector, handler) {
  if (eventRegistry[eventType]) {
    eventRegistry[eventType] = eventRegistry[eventType].filter(
      ({ selector: s, handler: h }) => !(s === selector && h === handler)
    );
  }
}

export function emit(eventType, detail = {}) {
  const event = new CustomEvent(eventType, { detail });
  document.dispatchEvent(event);
}