const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { socketConfig } = require("./config/socket.config");
const { registerSocketHandlers } = require("./sockets/socketHandler");

const app = express();
const server = http.createServer(app);
const io = new Server(server, socketConfig);

app.use(cors());

app.get("/api/healthcheck", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is healthy and running",
    timestamp: new Date().toISOString(),
  });
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[${new Date().toLocaleTimeString()}] Servidor escuchando en http://localhost:${PORT}`);
});