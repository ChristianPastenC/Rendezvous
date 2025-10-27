const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { socketConfig } = require("./config/socket.config");
const { registerSocketHandlers } = require("./sockets/socketHandler");

// Import route modules
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const contactRoutes = require('./routes/contactRoutes');
const groupRoutes = require('./routes/groupRoutes');
const messageRoutes = require('./routes/messageRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, socketConfig);

const userSocketMap = {};

// Middleware
app.use(cors());
app.use(express.json());

// Register API routes
authRoutes(app);
userRoutes(app);
contactRoutes(app);
groupRoutes(app, io, userSocketMap);
messageRoutes(app);

registerSocketHandlers(io, userSocketMap);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[${new Date().toLocaleTimeString()}] Servidor escuchando en ${PORT}`);
});