export default function routes(gameState) {
  return {
    "/": () => { 
      gameState.setState({ ...gameState.getState(), currentScreen: "join" });
    },
    "/lobby": () => {
      if (!gameState.getState().nickname) {
        window.location.hash = "#/";
        return;
      } 
      gameState.setState({ ...gameState.getState(), currentScreen: "lobby" });
    },
    "/game": () => {
      if (!gameState.getState().nickname) {
        window.location.hash = "#/";
        return;
      } 
      gameState.setState({ ...gameState.getState(), currentScreen: "game" });
    },
    "/404": () => { 
      gameState.setState({ ...gameState.getState(), currentScreen: "404" });
    },
  };
}
