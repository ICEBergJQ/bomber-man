// No need to import renderApp here anymore
import renderJoinScreen from '../views/JoinView.js';
import renderLobbyScreen from '../views/LobbyView.js';
import renderGameScreen from '../views/GameView.js';
import NotfoundView from '../views/NotfoundView.js';

export default function routes(gameState) {
    return {
        "/": () => {
            // This handler's only job is to update the state
            gameState.setState({ ...gameState.getState(), currentScreen: "join" });
        },
        "/lobby": () => {
            if (!gameState.getState().nickname) {
                window.location.hash = '#/';
                return;
            }
            // This handler's only job is to update the state
            gameState.setState({ ...gameState.getState(), currentScreen: "lobby" });
        },
        "/game": () => {
            if (!gameState.getState().nickname) {
                window.location.hash = '#/';
                return;
            }
            // This handler's only job is to update the state
            gameState.setState({ ...gameState.getState(), currentScreen: "game" });
        },
        "/404": () => {
            // This handler's only job is to update the state
            gameState.setState({ ...gameState.getState(), currentScreen: "404" });
        }
    };
}