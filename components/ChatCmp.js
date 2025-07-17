
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
function toggleChat(e) {
    e.target.parentElement.classList.toggle('show')
}

export default function ChatUI(state, sendToServer, className = '') {
    console.log('chat ui', state, document.activeElement);

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
        //    attrs: { class: `chat-container ${className} show` },
        attrs: { class: `chat-container ${className}` },
        children: [
            className && createElement('button', {
                attrs: { class: 'opener btn' },
                children: ['Chat'],
                events: {
                    click: (e) => toggleChat(e)
                }
            }),
            createElement('div', {
                attrs: { class: 'chat-wrapper' },
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