const express = require("express");
const path = require("path");
const app = express();

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index (1).html"));
});

//socket
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {  
  socket.on("message", (message) => {
    io.emit("messages", message );
  });
});

//inicio del servidor
http.listen(3000, () => {
  console.log("Server Running");
});
