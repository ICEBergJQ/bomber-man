import { closeSocket } from "../client.js";

export default function routes(gameState) {
  return {
    "/": () => {
      closeSocket();
      gameState.setState({
        players: {},
        bombs: [],
        explosions: [],
        gameOver: false,
        winner: null,
        gameStarted: false,
        maze: null,
        currentScreen: "join",
        nickname: "",
        chatMessages: [],
        winner: "",
      });
    },
    "/lobby": () => {
      const nickname = gameState.getState().nickname;
      if (!nickname || nickname.length < 2 || nickname.length > 10) {
        window.location.hash = "#/";
        return;
      }
      gameState.setState({ ...gameState.getState(), currentScreen: "lobby" });
    },
    "/game": () => {
      const nickname = gameState.getState().nickname;
      if (!nickname || nickname.length < 2 || nickname.length > 10) {
        window.location.hash = "#/";
        return;
      }
      gameState.setState({ ...gameState.getState(), currentScreen: "game" });
    },
    "/404": () => {
      gameState.setState({ ...gameState.getState(), currentScreen: "404" });
    },
    "/gameFull": () => {
      // This handler's only job is to update the state
      gameState.setState({
        ...gameState.getState(),
        currentScreen: "game",
      });
    },
  };
}
