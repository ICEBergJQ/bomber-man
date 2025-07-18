import { createElement } from "../src/main.js";
import { quiteGame} from "../clientUtils/stateUtils.js";



export default function QuitBtn(gameState) {
    return createElement("button", {
        attrs: { id: "quit-btn", title: 'quit', class: 'btn' },
        children: [
            createElement('img', {
                attrs: {
                    src: '../assets/img/off.png',
                    alt: 'Quit'
                }
            })
        ],
        events: {
            click: () => quiteGame(gameState),
        },
    })
}