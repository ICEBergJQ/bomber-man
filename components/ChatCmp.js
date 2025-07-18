
import { createElement } from "../src/main.js";

function handleInput(e, sendToServer) {
    if (e.key === "Enter") {
        console.log('from handle input');

        const input = e.target;
        const text = input.value.trim();
        if (text == '' || text.length > 100) {
            alert('enter a msg between 1 and 100 char!!')
        } else {
            sendToServer({ type: "chat", text: text });
            input.value = "";
        }
    }
}

function toggleChat(e, gameState) {
    e.target.parentElement.classList.toggle('show')
    let state = gameState.getState();
    gameState.setState({
        ...state,
        isChatOpen: !state.isChatOpen,
    });
}

export default function ChatUI(state, sendToServer, className = '', gameState = {}) {
    
    const st = gameState?.getState();
    const { isChatOpen } = st;

    const chatMsgs = (state.chatMessages || []).map((msg) =>
        createElement("span", {
            attrs: { class: msg.nickname === state.nickname ? 'right' : '' },
            children: [
                createElement("strong", {
                    children: [`${msg.nickname}`]
                }),
                msg.text,
            ],
        })
    );

    return createElement("div", {
        attrs: { class: `chat ${className} ${isChatOpen ? 'show' : ''}` },
        children: [
            className && createElement('span', {
                attrs: { class: 'opener' },
                children:['chat'],
                events: {
                    click: (e) => toggleChat(e, gameState)
                }
            }),
            createElement('div', {
                children: [
                    createElement('div', {
                        attrs: { class: 'chat-messages' },
                        children: chatMsgs
                    }),

                    createElement("input", {
                        attrs: {
                            type: "text",
                            id: "chat-input",
                            placeholder: "Type and press Enter...",
                            autofocus: true
                        },
                        events: {
                            keypress: (e) => handleInput(e, sendToServer),
                        },
                    }),
                ]
            })

        ],
    })

}