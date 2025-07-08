import { sendToServer, socket } from "../ws.js";
import createElement from "../src/vdom/CreateElement.js";
// No longer importing globalGameState, it's passed as a parameter

export default function renderLobbyScreen(gameState) { // Accept gameState as parameter
  const state = gameState.getState();

  console.log("Rendering lobby screen with state:", state);
  console.log("Is Player 1 (simulated):", state.isPlayer1);

  let lobbyContent;

  // IMPORTANT: This WebSocket listener setup should ideally be done ONCE
  // when your main application initializes, or within a dedicated WebSocket module,
  // not repeatedly every time renderLobbyScreen is called.
  // For now, we'll keep the simple flag, but be aware of this for larger apps.
  if (!window._lobbyGameStartedListenerSet) {
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Lobby received WebSocket message:", message);

      if (message.type === 'gameStarted') {
        const { gameId, initialState: serverInitialState } = message.payload;

        // Update the global game state with the initial game data
        gameState.setState({ // Use passed gameState
          gameId: gameId,
          initialGameData: serverInitialState, // Store the maze and other initial data here
          gameStarted: true, // Mark game as started
          currentScreen: "game", // Update client's internal screen state
        });
        console.log('Game started message received. Storing initial state and redirecting...');

        window.location.hash = `#/game`; // Redirect to the game page (no ID needed in hash for single room)
      }
      // Handle other lobby-related messages here (e.g., playerJoinedLobby, countdownUpdate)
      else if (message.type === 'playerJoinedLobby') {
          gameState.setState({ // Use passed gameState
              lobbyPlayers: message.payload.players // Assuming payload has an updated list of players
          });
      } else if (message.type === 'lobbyCountdown') {
          gameState.setState({ // Use passed gameState
              lobbyCountdown: message.payload.timeRemaining
          });
      }
    };
    window._lobbyGameStartedListenerSet = true;
  }

  // Display lobby players and countdown
  const playersList = state.lobbyPlayers.length > 0
    ? state.lobbyPlayers.map(player => createElement("li", { children: [player.nickname] }))
    : [createElement("li", { children: ["No players yet..."] })];

  const countdownDisplay = state.lobbyCountdown !== null && state.lobbyCountdown > 0
    ? createElement("p", { children: [`Game starts in: ${state.lobbyCountdown} seconds!`] })
    : null;

  if (state.isPlayer1) {
    lobbyContent = [
      createElement("h2", { children: ["Lobby: You are Player 1"] }),
      createElement("p", { children: ['Click "Start Game" when ready.'] }),
      createElement("ul", { children: playersList }),
      countdownDisplay,
      createElement("button", {
        attrs: { class: "btn btn-success" },
        children: ["Start Game (Player 1)"],
        events: {
          click: () => {
            console.log("Player 1 clicked Start Game. Sending request to server...");
            sendToServer({ type: 'startGameRequest' }); // No roomId needed for single room
          },
        },
      }),
    ];
  } else {
    lobbyContent = [
      createElement("h2", { children: ["Lobby: Waiting for Player 1..."] }),
      createElement("p", {
        children: ["Please wait for Player 1 to start the game."],
      }),
      createElement("ul", { children: playersList }),
      countdownDisplay,
    ];
  }

  return createElement("div", {
    attrs: { class: "screen lobby-screen" },
    children: lobbyContent,
  });
}