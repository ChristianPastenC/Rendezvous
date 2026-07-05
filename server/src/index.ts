import 'dotenv/config';

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { ClientToServerEvents, ServerToClientEvents } from '@rendezvous/shared';
import { corsOptions, socketConfig } from './config/socket.config.js';
import { registerSocketHandlers } from './sockets/socketHandler.js';
import type { UserSocketMap } from './types/index.js';
import { authRoutes } from './routes/authRoutes.js';
import { userRoutes } from './routes/userRoutes.js';
import { contactRoutes } from './routes/contactRoutes.js';
import { groupRoutes } from './routes/groupRoutes.js';
import { messageRoutes } from './routes/messageRoutes.js';

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, socketConfig);

const userSocketMap: UserSocketMap = new Map();

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
