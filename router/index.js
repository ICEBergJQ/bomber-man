import { renderApp } from "../client.js";
import renderJoinScreen from '../views/JoinView.js';
import renderLobbyScreen from '../views/LobbyView.js';
import renderGameScreen from '../views/GameView.js';
import NotfoundView from '../views/NotfoundView.js';

export default function routes(gameState) {
    // This function should return the routes OBJECT that the framework expects.
    return {
        "/": () => {
            gameState.setState({ ...gameState.getState(), currentScreen: "join" });
            renderApp(renderJoinScreen(gameState));
        },
        "/lobby": () => {
            const state = gameState.getState();
            if (!state.nickname) {
                // Guard: If no nickname, redirect to home.
                window.location.hash = '#/';
                return;
            }
            gameState.setState({ ...state, currentScreen: "lobby" });
            renderApp(renderLobbyScreen(gameState));
        },
        "/game": () => {
            const state = gameState.getState();
            if (!state.nickname) {
                // Guard: If no nickname, redirect to home.
                window.location.hash = '#/';
                return;
            }
            gameState.setState({ ...state, currentScreen: "game" });
            renderApp(renderGameScreen(gameState));
        },
        "/404": () => {
            gameState.setState({ ...gameState.getState(), currentScreen: "404" });
            renderApp(NotfoundView());
        }
    };
}