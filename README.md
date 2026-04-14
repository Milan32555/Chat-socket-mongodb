# Arquitectura · Chat

Real-time chat application built with Node.js, Socket.IO, and MongoDB. Designed for the Arquitectura community with a clean dark UI and persistent message history.

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?logo=socket.io&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)

## Features

- **Real-time messaging** via WebSockets (Socket.IO)
- **Persistent history** — last 60 messages loaded on connect (MongoDB)
- **Live user count** — online badge updates as users join/leave
- **Color-coded avatars** — consistent color per username across sessions
- **XSS-safe** — all user input escaped before rendering
- **Responsive dark UI** — works on desktop and mobile

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Runtime   | Node.js                           |
| Framework | Express 5                         |
| Realtime  | Socket.IO 4                       |
| Database  | MongoDB via Mongoose              |
| Frontend  | Vanilla JS + CSS (no framework)   |
| Fonts     | Inter · JetBrains Mono (Google Fonts) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/) instance (local or Atlas)

### Installation

```bash
# Clone the repository
git clone https://github.com/Milan32555/Chat-socket-mongodb.git
cd arquitectura-chat

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
MONGO_URI=mongodb://localhost:27017/chat
```

For MongoDB Atlas:

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/chat
```

### Run

```bash
npm start
```

The server starts on `http://localhost:3000`.

## Project Structure

```
.
├── server.js          # Express + Socket.IO server, MongoDB models
├── index (1).html     # Single-page frontend (served statically)
├── package.json
├── .env               # Local environment variables (not committed)
└── README.md
```

## How It Works

1. Client connects via Socket.IO
2. Server sends the last 60 messages as `history`
3. Client emits `message` events on form submit
4. Server persists each message to MongoDB and broadcasts to all connected clients via `messages`
5. Online count is tracked server-side and emitted as `online` on each connect/disconnect

## Deployment with Dev Tunnels

The frontend is pre-configured to connect through a VS Code Dev Tunnel. To use your own tunnel:

1. Open the project in VS Code
2. Forward port `3000` via **Ports** panel and set visibility to **Public**
3. Replace the tunnel URL in `index (1).html`:

```js
// Line ~238 — update both occurrences
const socket = io("https://<your-tunnel-url>/")
```

```html
<!-- Line ~237 -->
<script src="https://<your-tunnel-url>/socket.io/socket.io.js"></script>
```

## Message Schema

```js
{
  name:      String,   // max 30 chars, defaults to "Anónimo"
  message:   String,   // max 500 chars, required
  createdAt: Date      // auto-generated
}
```

## License

ISC
