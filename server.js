require('dotenv').config();
const express  = require("express");
const path     = require("path");
const mongoose = require("mongoose");
const app      = express();

// ── MongoDB ──────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/chat";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB conectado"))
  .catch(() => console.error("No se pudo conectar a MongoDB"));

const messageSchema = new mongoose.Schema({
  name:      { type: String, default: "Anónimo", maxlength: 30 },
  message:   { type: String, required: true, maxlength: 500 },
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

  socket.on("message", async (data, acknowledge) => {
    const reply = typeof acknowledge === "function" ? acknowledge : () => {};
    if (!data || typeof data.message !== "string" ||
        (data.name !== undefined && typeof data.name !== "string")) {
      reply({ ok: false, error: "El nombre y el mensaje deben ser texto." });
      return;
    }

    const name = data.name?.trim() || "Anónimo";
    const message = data.message.trim();
    if (name.length > 30 || !message || message.length > 500) {
      reply({ ok: false, error: "Usa hasta 30 caracteres para el nombre y entre 1 y 500 para el mensaje." });
      return;
    }

    try {
      const saved = await Message.create({ name, message });
      io.emit("messages", saved);
      reply({ ok: true });
    } catch {
      console.error("No se pudo guardar el mensaje");
      reply({ ok: false, error: "No se pudo guardar el mensaje." });
    }
  });

  socket.on("disconnect", () => {
    online--;
    io.emit("online", online);
  });
});

// ── Inicio ───────────────────────────────────────────────────────────────────
http.listen(3000, () => console.log("Servidor en :3000"));
