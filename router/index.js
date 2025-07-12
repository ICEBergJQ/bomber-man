export default function routes(gameState) {
  return {
    "/": () => {
      // This handler's only job is to update the state
      gameState.setState({ ...gameState.getState(), currentScreen: "join" });
    },
    "/lobby": () => {
      if (!gameState.getState().nickname) {
        window.location.hash = "#/";
        return;
      }
      // This handler's only job is to update the state
      gameState.setState({ ...gameState.getState(), currentScreen: "lobby" });
    },
    "/game": () => {
      if (!gameState.getState().nickname) {
        window.location.hash = "#/";
        return;
      }
      // This handler's only job is to update the state
      gameState.setState({ ...gameState.getState(), currentScreen: "game" });
    },
    "/404": () => {
      // This handler's only job is to update the state
      gameState.setState({ ...gameState.getState(), currentScreen: "404" });
    },
  };
}
