let socket;

export function connectWebSocket(gameState) {
  // Prevent multiple connections
  if (socket && socket.readyState === WebSocket.OPEN) {
    return;
  }

  socket = new WebSocket(`ws://${window.location.hostname}:8080`);

  socket.onopen = () => {
    console.log("WebSocket connection established.");
    const nickname = gameState.getState().nickname;
    if (nickname) {
      sendToServer({ type: "registerPlayer", nickname: nickname });
    }
  };

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "gameState") {
      // --- THIS IS THE FIX ---
      // The previous logic was not correctly updating the state object.
      // This version ensures that the *entire* state object received
      // from the server is merged with the client's current state.
      const currentState = gameState.getState();
      const serverState = msg.data;

      gameState.setState({
        ...currentState,
        ...serverState,
      });

    } else {
      console.warn("Received unhandled message type:", msg.type);
    }
  };

  socket.onclose = () => {
    console.log("WebSocket disconnected. Attempting to reconnect in 3 seconds...");
    setTimeout(() => connectWebSocket(gameState), 3000);
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
}

export function sendToServer(message) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    console.warn("WebSocket not open. Message not sent:", message);
  }
}