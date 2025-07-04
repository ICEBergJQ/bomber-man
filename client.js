import {
  createElement,
  render,
  createStore,
  createRouter,
  mount,
  diff,
  on,
} from "./src/main.js";

//vieews
import JoinView from "./views/JoinView.js";
import LobbyView from "./views/LobbyView.js";
import GameView from "./views/GameView.js";

// const INITIAL_MAZE_ROWS = 13;
// const INITIAL_MAZE_COLS = 23;

const gameState = createStore({
  players: {},
  bombs: [],
  explosions: [],
  gameOver: false,
  winner: null,
  gameStarted: false,
  gameOver: false,
  mazeLayout: null,
  currentScreen: "join",
  isPlayer1: false,
  LobbyView,
});

let myPlayerId = null;
let ws = null;

// Connect to WebSocket server
function connectToServer() {
  const SERVER_IP = "192.168.1.10"; // Change this per machine
  ws = new WebSocket(`ws://${SERVER_IP}:8080`);

  ws.onopen = () => {
    console.log("Connected to server");
    showStatus("Connected to server");
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    } catch (error) {
      console.error("Error parsing server message:", error);
    }
  };

  ws.onclose = () => {
    console.log("Disconnected from server");
    showStatus("Disconnected from server");
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    showStatus("Connection error");
  };
}

// Handle messages from server
function handleServerMessage(message) {
  switch (message.type) {
    case "welcome":
      myPlayerId = message.data.playerId;
      console.log(`I am player ${myPlayerId}`);
      showStatus(`You are Player ${myPlayerId}`);
      break;

    case "gameState":
      gameState = message.data;
      // renderGame();

      if (gameState.gameOver && gameState.winner) {
        showStatus(
          `${gameState.winner.id.toUpperCase()} WINS! Press R to restart.`
        );
      } else if (gameState.gameOver) {
        showStatus("DRAW! Everyone died! Press R to restart.");
      } else if (!gameState.gameStarted) {
        showStatus("Waiting for more players...");
      } else {
        showStatus(
          `You are Player ${myPlayerId} - Use arrow keys to move, spacebar for bomb`
        );
      }
      break;

    case "error":
      showStatus(`Error: ${message.data.message}`);
      break;
  }
}

// Send message to server
function sendToServer(type, data = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}

// Show status message
function showStatus(message) {
  const statusDiv = document.getElementById("status");
  if (statusDiv) {
    statusDiv.textContent = message;
  }
}

// Generate maze for testing or offline mode
function generateMaze(rows, cols) {
  const maze = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      // Border walls all around
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        row.push("#");
      }
      // Place walls in a checkerboard pattern (for solid walls)
      else if (r % 2 === 0 && c % 2 === 0) {
        row.push("#");
      } else {
        // Randomly place boxes (*) or empty spaces ( )
        const rand = Math.random();
        if (rand < 0.2) row.push("*"); // 20% chance box
        else row.push(" "); // empty space
      }
    }
    maze.push(row);
  }

  // Clear starting positions for all 4 players
  // Player 1 - Top Left
  maze[1][1] = " ";
  maze[1][2] = " ";
  maze[2][1] = " ";

  // Player 2 - Top Right
  maze[1][cols - 2] = " ";
  maze[1][cols - 3] = " ";
  maze[2][cols - 2] = " ";

  // Player 3 - Bottom Left
  maze[rows - 2][1] = " ";
  maze[rows - 2][2] = " ";
  maze[rows - 3][1] = " ";

  // Player 4 - Bottom Right
  maze[rows - 2][cols - 2] = " ";
  maze[rows - 2][cols - 3] = " ";
  maze[rows - 3][cols - 2] = " ";

  return maze;
}

// Render maze cell
// export const mazeCell = (type, rowIndex, colIndex) => {
//   let className = "cell";

//   // Check if there's an explosion at this position (highest priority)
//   const explosionAtPosition = gameState.explosions?.find(
//     (exp) => exp.row === rowIndex && exp.col === colIndex
//   );

//   if (explosionAtPosition) {
//     className += " explosion";
//   }
//   // Check if there's a bomb at this position
//   else {
//     const bombAtPosition = gameState.bombs?.find(
//       (bomb) => bomb.row === rowIndex && bomb.col === colIndex
//     );

//     if (bombAtPosition) {
//       className += " bomb";
//     }
//     // Check if any ALIVE player is at this position
//     else {
//       const playerAtPosition = Object.values(gameState.players)?.find(
//         (p) => p.alive && p.row === rowIndex && p.col === colIndex
//       );

//       if (playerAtPosition) {
//         className += ` ${playerAtPosition.id}`;
//         // Highlight my player
//         if (playerAtPosition.playerId === myPlayerId) {
//           className += " my-player";
//         }
//       } else {
//         switch (type) {
//           case "#":
//             className += " wall";
//             break;
//           case "*":
//             className += " box";
//             break;
//           default:
//             className += " empty";
//             break;
//         }
//       }
//     }
//   }

//   return createElement("div", {
//     attrs: { class: className },
//   });
// };

export const mazeCell = (type, rowIndex, colIndex) => {
  const state = gameState.getState();
  let className = "cell";

  const explosionAtPosition = state.explosions.find(
    (exp) => exp.row === rowIndex && exp.col === colIndex
  );

  if (explosionAtPosition) {
    className += " explosion";
  } else {
    const bombAtPosition = state.bombs.find(
      (bomb) => bomb.row === rowIndex && bomb.col === colIndex
    );
    if (bombAtPosition) {
      className += " bomb";
    } else {
      const playerAtPosition = Object.values(state.players).find(
        (p) => p.alive && p.row === rowIndex && p.col === colIndex
      );
      if (playerAtPosition) {
        className += ` ${playerAtPosition.id}`;
      } else {
        switch (type) {
          case "#":
            className += " wall";
            break;
          case "*":
            className += " box";
            break;
          default:
            className += " empty";
            break;
        }
      }
    }
  }
  return createElement("div", { attrs: { class: className } });
};

// Render the game
function renderGame() {
  if (!gameState.maze) return;

  const gameDiv = createElement("div", {
    attrs: { class: "game" },
    children: gameState.maze.flatMap((row, rowIndex) =>
      row.map((cell, colIndex) => mazeCell(cell, rowIndex, colIndex))
    ),
  });

  const gameContainer = document.getElementById("game-container");
  if (gameContainer) {
    gameContainer.innerHTML = "";
    gameContainer.appendChild(render(gameDiv));
  }
}

// Handle input
document.addEventListener("keydown", (e) => {
  // Handle restart
  if (e.key.toLowerCase() === "r" && gameState.gameOver) {
    sendToServer("restart");
    return;
  }

  // Don't process game input if no player ID or game is over
  if (!myPlayerId || gameState.gameOver) return;

  // Handle movement keys
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    // Only allow movement if game has started
    if (!gameState.gameStarted) return;

    let direction;
    switch (e.key) {
      case "ArrowUp":
        direction = "up";
        break;
      case "ArrowDown":
        direction = "down";
        break;
      case "ArrowLeft":
        direction = "left";
        break;
      case "ArrowRight":
        direction = "right";
        break;
    }

    sendToServer("move", { direction });
  }

  // Handle WASD keys for alternative controls
  else if (["KeyW", "KeyS", "KeyA", "KeyD"].includes(e.code)) {
    // Only allow movement if game has started
    if (!gameState.gameStarted) return;

    let direction;
    switch (e.code) {
      case "KeyW":
        direction = "up";
        break;
      case "KeyS":
        direction = "down";
        break;
      case "KeyA":
        direction = "left";
        break;
      case "KeyD":
        direction = "right";
        break;
    }

    sendToServer("move", { direction });
  }

  // Handle bomb placement
  else if (e.key === " " || e.code === "KeyQ") {
    e.preventDefault(); // Prevent page scroll for spacebar

    // Only allow bombs if game has started
    if (!gameState.gameStarted) return;

    sendToServer("bomb");
  }

  // Testing: Generate local maze (only when not connected or game not started)
  else if (
    e.key.toLowerCase() === "g" &&
    (!gameState.gameStarted || !ws || ws.readyState !== WebSocket.OPEN)
  ) {
    // Generate test maze locally for testing UI
    gameState.maze = generateMaze(13, 23);
    renderGame();
    showStatus("Test maze generated locally (Press G)");
  }
});

////////////////////////////////ok

createRouter({
  "/": () => {
    gameState.setState({ ...gameState.getState(), currentScreen: "join" });
    renderApp();
  },
  "/lobby": () => {
    gameState.setState({ ...gameState.getState(), currentScreen: "lobby" });
    renderApp();
  },
  "/game": () => {
    gameState.setState({ ...gameState.getState(), currentScreen: "game" });
    renderApp();
  },
});

function renderApp() {
  let appRootElement = document.getElementById("app");

  // If #app doesn't exist, create it and append to body
  if (!appRootElement) {
    appRootElement = document.createElement("div");
    appRootElement.id = "app";
    document.body.appendChild(appRootElement); // Append the created div to the body
  }

  console.log(
    "Rendering app with current screen:",
    gameState.getState().currentScreen
  );

  let vNodeToRender;
  switch (gameState.getState().currentScreen) {
    case "join":
      console.log("Rendering join screen");
      vNodeToRender = JoinView(gameState);
      break;
    case "lobby":
      console.log("Rendering lobby screen");
      vNodeToRender = LobbyView(gameState);
      break;
    case "game":
      console.log("Rendering game screen");
      vNodeToRender = GameView(gameState);
      break;
    default:
      console.log(`Unknown screen: ${gameState.getState().currentScreen}`); // Use getState()
      vNodeToRender = createElement("div", {
        children: ["404 - Page Not Found"],
      });
  }

  console.log("VNode to render:", vNodeToRender);
  console.log("App root element (before render):", appRootElement);

  // Clear existing content and append new content to the appRootElement
  appRootElement.innerHTML = ''; // Clear existing children
  appRootElement.appendChild(render(vNodeToRender)); // Append the new rendered content

  console.log("App root element (after render):", appRootElement);
}

// gameState.subscribe(renderApp);

// function renderApp() {
//   let appRootElement = document.getElementById("app");
//   if (!appRootElement) {
//     // If #app doesn't exist, create it and append to body
//     const statusVNode = createElement("div", {
//       attrs: {
//         id: "app",
//       },
//     });
//    appRootElement = render(statusVNode);
//     // document.body.insertBefore(appRootElement, document.body.firstChild);
//   }

//   // const appRootElement = document.getElementById("app");

//   console.log(
//     "Rendering app with current screen:",
//     gameState.getState().currentScreen
//   );

//   let vNodeToRender;
//   switch (gameState.getState().currentScreen) {
//     case "join":
//       console.log("Rendering lobby screen");
//       vNodeToRender = JoinView(gameState);

//       break;
//     case "lobby":
//       console.log("Rendering lobby screen");

//       vNodeToRender = LobbyView(gameState);
//       break;
//     case "game":
//       vNodeToRender = GameView();
//       break;
//     default:
//       console.log(`Unknown screen: ${gameState.currentScreen}`);

//       vNodeToRender = createElement("div", {
//         children: ["404 - Page Not Found"],
//       });
//   }

//   console.log(vNodeToRender);
//   console.log(document.getElementById("app"));

//   // Render the VNode to a real DOM element and mount it into the app root.
//   mount(render(vNodeToRender), appRootElement);
// }


///////////////////////////////ok

// document.addEventListener("DOMContentLoaded", renderApp);
