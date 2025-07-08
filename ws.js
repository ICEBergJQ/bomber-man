let socket;
let _gameStateInstance = null;

export function connectWebSocket(gameState) {
  _gameStateInstance = gameState;
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log("WebSocket already connected.");
    return;
  }

  socket = new WebSocket("ws://192.168.1.10:8080");

  socket.onopen = () => {
    console.log("WebSocket connected.");
    const nickname = _gameStateInstance.getState().nickname;
    if (nickname) {
      sendToServer({ type: "registerPlayer", nickname: nickname });
    } else {
      console.warn(
        "No nickname set yet. Player will register after entering one."
      );
    }
  };

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log("Unhandled WebSocket message:------", msg);
    if (msg.type === "gameState") {
      const current = gameState.getState();
      gameState.setState({
        ...current,
        ...msg.data,
      });
    }
  };

  socket.onclose = () => {
    console.log(
      "WebSocket disconnected. Attempting to reconnect in 3 seconds..."
    );
    setTimeout(() => connectWebSocket(_gameStateInstance), 3000);
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

export { socket };

export function mazeCell(cellType, rowIndex, colIndex) {
  let className = "maze-cell";
  if (cellType === "W") {
    className += " wall";
  } else if (cellType === "B") {
    className += " block";
  } else {
    className += " empty";
  }
  return createElement("div", {
    attrs: { class: className, "data-row": rowIndex, "data-col": colIndex },
    children: [],
  });
}
