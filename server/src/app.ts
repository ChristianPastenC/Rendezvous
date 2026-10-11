import express, { type Express } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { ClientToServerEvents, ServerToClientEvents } from '@rendezvous/shared';
import { corsOptions, socketConfig } from './config/socket.config.js';
import { registerSocketHandlers } from './sockets/socketHandler.js';
import type { TypedServer, UserSocketMap } from './types/index.js';
import { authRoutes } from './routes/authRoutes.js';
import { userRoutes } from './routes/userRoutes.js';
import { contactRoutes } from './routes/contactRoutes.js';
import { groupRoutes } from './routes/groupRoutes.js';
import { messageRoutes } from './routes/messageRoutes.js';

export interface AppInstance {
  app: Express;
  server: http.Server;
  io: TypedServer;
  userSocketMap: UserSocketMap;
}

/**
 * Creates and configures the Express application, HTTP server, and Socket.IO instance.
 */
export const createApp = (): AppInstance => {
  const app = express();
  const server = http.createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, socketConfig);
  const userSocketMap: UserSocketMap = new Map();

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  authRoutes(app);
  userRoutes(app);
  contactRoutes(app);
  groupRoutes(app, io, userSocketMap);
  messageRoutes(app);

  registerSocketHandlers(io, userSocketMap);

  return { app, server, io, userSocketMap };
};
