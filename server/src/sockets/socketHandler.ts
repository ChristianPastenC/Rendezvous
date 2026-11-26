import { FieldValue } from 'firebase-admin/firestore';
import type { ClientToServerEvents, ServerToClientEvents } from '@rendezvous/shared';
import type { Socket } from 'socket.io';
import { auth, db } from '../config/firebaseAdmin.js';
import type { AuthenticatedSocket, TypedServer, UserSocketMap } from '../types/index.js';
import { registerChatHandlers } from './chatHandler.js';
import { registerWebRTCHandlers } from './webrtcHandlers.js';
import { logger } from '../utils/logger.js';

const socketAuthMiddleware = async (
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  next: (err?: Error) => void
): Promise<void> => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) {
    next(new Error('Authentication failed: Missing token.'));
    return;
  }
  try {
    const decodedToken = await auth.verifyIdToken(token);
    (socket as AuthenticatedSocket).user = decodedToken;
    next();
  } catch {
    next(new Error('Authentication failed: Invalid token.'));
  }
};

export const registerSocketHandlers = (io: TypedServer, userSocketMap: UserSocketMap): void => {
  io.use((socket, next) => {
    void socketAuthMiddleware(socket, next);
  });

  io.on('connection', async (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const uid = socket.user.uid;
    logger.info('Socket client authenticated', { socketId: socket.id, uid });

    let userSockets = userSocketMap.get(uid);
    if (!userSockets) {
      userSockets = new Set();
      userSocketMap.set(uid, userSockets);
    }
    const isFirstSession = userSockets.size === 0;
    userSockets.add(socket.id);

    if (isFirstSession) {
      try {
        const userRef = db.collection('users').doc(uid);
        await userRef.update({ status: 'online' });
        io.to(`status_${uid}`).emit('statusUpdate', {
          uid,
          status: 'online',
          lastSeen: null,
          photoURL: socket.user.picture,
          displayName: socket.user.name,
        });
        logger.info('User online status broadcast', { uid });
      } catch (error) {
        logger.error('Error setting online status', {
          uid,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    socket.on('security:register-public-key', async ({ publicKey }) => {
      if (typeof publicKey !== 'string' || !publicKey) return;
      try {
        await db.collection('users').doc(socket.user.uid).set({ publicKey }, { merge: true });
        io.to(`status_${socket.user.uid}`).emit('security:public-key-updated', {
          uid: socket.user.uid,
          publicKey,
        });
        logger.info('Registered and broadcast public key update', { uid: socket.user.uid });
      } catch (error) {
        logger.error('Error registering public key', {
          uid: socket.user.uid,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    socket.on('subscribeToStatus', (userIds) => {
      if (Array.isArray(userIds)) {
        userIds.forEach((targetUid) => {
          if (typeof targetUid === 'string' && targetUid) {
            void socket.join(`status_${targetUid}`);
          }
        });
      }
    });

    registerChatHandlers(io, socket, userSocketMap);
    registerWebRTCHandlers(io, socket, userSocketMap);

    socket.on('disconnect', async (reason) => {
      logger.info('Socket client disconnected', { socketId: socket.id, uid, reason });
      const sessions = userSocketMap.get(uid);
      if (sessions) {
        sessions.delete(socket.id);
        if (sessions.size > 0) {
          return;
        }
        userSocketMap.delete(uid);
      }

      try {
        const userRef = db.collection('users').doc(uid);
        await userRef.update({
          status: 'offline',
          lastSeen: FieldValue.serverTimestamp(),
        });
        io.to(`status_${uid}`).emit('statusUpdate', {
          uid,
          status: 'offline',
          lastSeen: new Date().toISOString(),
          photoURL: socket.user.picture,
          displayName: socket.user.name,
        });
        logger.info('User offline status broadcast', { uid });
      } catch (error) {
        logger.error('Error setting offline status', {
          uid,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  });
};
