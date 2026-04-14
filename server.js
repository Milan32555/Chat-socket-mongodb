require('dotenv').config();
const express  = require("express");
const path     = require("path");
const mongoose = require("mongoose");
const app      = express();

// ── MongoDB ──────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/chat";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB conectado:", MONGO_URI))
  .catch((err) => console.error("Error MongoDB:", err));

const messageSchema = new mongoose.Schema({
  name:      { type: String, default: "Anónimo" },
  message:   { type: String, required: true },
  createdAt: { type: Date,   default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

// ── HTTP / Socket.io ─────────────────────────────────────────────────────────
app.get("/", (_req, res) =>
  res.sendFile(path.join(__dirname, "index (1).html"))
);

const http = require("http").createServer(app);
const io   = require("socket.io")(http, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

let online = 0;

io.on("connection", async (socket) => {
  online++;
  io.emit("online", online);

  // historial: últimos 60 mensajes en orden cronológico
  try {
    const history = await Message.find()
      .sort({ createdAt: 1 })
      .limit(60)
      .lean();
    socket.emit("history", history);
  } catch (e) {
    console.error("Error cargando historial:", e);
  }

  socket.on("message", async (data) => {
    try {
      const msg = await Message.create({
        name:    (data.name || "Anónimo").trim().slice(0, 30),
        message: String(data.message).trim().slice(0, 500),
      });
      io.emit("messages", msg);
    } catch (e) {
      console.error("Error guardando mensaje:", e);
    }
  });

  socket.on("disconnect", () => {
    online--;
    io.emit("online", online);
  });
});

// ── Inicio ───────────────────────────────────────────────────────────────────
http.listen(3000, () => console.log("Servidor en :3000"));
