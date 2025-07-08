import { renderApp } from "../client.js"


import renderJoinScreen from '../views/JoinView.js';
import renderLobbyScreen from '../views/LobbyView.js';
import renderGameScreen from '../views/GameView.js';
import NotfoundView from '../views/NotfoundView.js';

export default function routes(gameState) {
    return {
        "/": () => {
            gameState.setState({ ...gameState.getState(), currentScreen: "join" }) 
            renderApp(renderJoinScreen(gameState)) 
        },
        "/lobby": () => {
            gameState.setState({ ...gameState.getState(),currentScreen: "lobby" }) 
            renderApp(renderLobbyScreen(gameState))
        },
        "/game": () => {
            gameState.setState({ ...gameState.getState(),currentScreen: "game" }) 
            renderApp(renderGameScreen(gameState)) 
        },
        "/404": () => {
            gameState.setState({ ...gameState.getState(), currentScreen: "404" })
            renderApp(NotfoundView())
        }
    }
} 