require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { corsOptions, socketConfig } = require('./config/socket.config');
const { registerSocketHandlers } = require('./sockets/socketHandler');

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
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Register API routes
authRoutes(app);
userRoutes(app);
contactRoutes(app);
groupRoutes(app, io, userSocketMap);
messageRoutes(app);

registerSocketHandlers(io, userSocketMap);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server listening on port ${PORT}`);
});
