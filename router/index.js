import { quiteGame, toGamefull } from "../clientUtils/stateUtils.js";

export default function routes(gameState) {
  return {
    "/": () => {
      quiteGame(gameState, true);
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
      toGamefull(gameState, true);
    },
  };
}
