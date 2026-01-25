# Bomberman Multiplayer

A real-time multiplayer Bomberman clone built from scratch using Node.js, WebSockets, and a custom client-side Virtual DOM framework.

## 🚀 Features

- **Real-time Multiplayer:** Play against other players using WebSockets.
- **Game Mechanics:** Classic Bomberman gameplay with bombs, destructible walls, and power-ups.
- **Custom Framework:** The frontend is built using a custom-made Virtual DOM implementation (no React/Vue/Angular).
- **Lobby System:** Join games and chat with other players before starting.
- **Power-ups:**
  - Extra Bombs
  - Speed Boosts
  - Blast Radius Increase

## 🛠️ Technologies

- **Backend:** Node.js (Vanilla HTTP server), `ws` library for WebSockets.
- **Frontend:** Vanilla JavaScript (ES Modules).
- **Architecture:** Custom Virtual DOM (`src/vdom`) for efficient UI rendering.

## 🎮 Controls

| Key | Action |
| :--- | :--- |
| **Arrow Keys** | Move Character (Up, Down, Left, Right) |
| **Spacebar** | Place Bomb |

## 📦 Installation & Usage

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Start the Server:**
    ```bash
    npm start
    ```
    *Or for development with auto-restart:*
    ```bash
    npm run dev
    ```

3.  **Play the Game:**
    Open your browser and navigate to:
    `http://localhost:8080`

    *Tip: Open multiple browser tabs to simulate multiple players.*

## 📂 Project Structure

- **`src/`**: Client-side source code, including the custom VDOM implementation (`src/vdom`).
- **`server.js`**: Main entry point for the Node.js server.
- **`client.js`**: Main entry point for the client-side logic.
- **`assets/`**: Game assets (images, styles).
- **`serverUtils/`**: Server-side game logic (movement, collisions, bombs).
- **`clientUtils/`**: Client-side utilities.
- **`views/`**: UI components/views for the application.

## 📝 License

This project is created for educational purposes to demonstrate building a multiplayer game and a frontend framework from scratch.