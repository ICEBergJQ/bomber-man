let socket; // Declare socket globally within this module
let _gameStateInstance = null; // Private variable to hold the gameState instance

export function connectWebSocket(gameState) { // Accept gameState as parameter
    _gameStateInstance = gameState; // Store the instance

    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("WebSocket already connected.");
        return;
    }

    socket = new WebSocket("ws://localhost:8080"); // Or wss://your-server.com

    socket.onopen = () => {
        console.log("WebSocket connected.");
        // After connection, send initial player registration/nickname
        const nickname = _gameStateInstance.getState().nickname; // Use stored instance
        if (nickname) {
            sendToServer({ type: 'registerPlayer', nickname: nickname });
        } else {
            console.warn("No nickname set yet. Player will register after entering one.");
        }
    };

    // This onmessage will be overridden by screen-specific listeners (Lobby, Game)
    // For general messages not handled by specific screens, you can add fallbacks here.
    socket.onmessage = (event) => {
        console.log("Unhandled WebSocket message:", JSON.parse(event.data));
    };

    socket.onclose = () => {
        console.log("WebSocket disconnected. Attempting to reconnect in 3 seconds...");
        setTimeout(() => connectWebSocket(_gameStateInstance), 3000); // Pass instance on reconnect
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

// Export socket itself so screen components can attach specific onmessage handlers
export { socket };

// Helper for maze cell rendering (example, adjust as needed)
export function mazeCell(cellType, rowIndex, colIndex) {
    let className = "maze-cell";
    if (cellType === 'W') { // Wall
        className += " wall";
    } else if (cellType === 'B') { // Breakable Block
        className += " block";
    } else { // Empty space
        className += " empty";
    }
    return createElement("div", {
        attrs: { class: className, 'data-row': rowIndex, 'data-col': colIndex },
        children: []
    });
}