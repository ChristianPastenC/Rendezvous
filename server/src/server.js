// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const { socketConfig } = require("./config/socket.config");
const initializeSockets = require("./sockets");
const apiRouter = require('./routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, socketConfig);

app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);

initializeSockets(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const now = new Date().toLocaleTimeString();
  console.log(`[${now}] Servidor escuchando en http://localhost:${PORT}`);
});