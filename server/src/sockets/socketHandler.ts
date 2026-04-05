import { FieldValue } from 'firebase-admin/firestore';
import type { ClientToServerEvents, ServerToClientEvents } from '@rendezvous/shared';
import type { Socket } from 'socket.io';
import { auth, db } from '../config/firebaseAdmin.js';
import type { AuthenticatedSocket, TypedServer, UserSocketMap } from '../types/index.js';
import { registerChatHandlers } from './chatHandler.js';
import { registerWebRTCHandlers } from './webrtcHandlers.js';

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
    console.log(`[Socket] Client authenticated: ${socket.id} (User: ${socket.user.uid})`);

    userSocketMap[socket.user.uid] = socket.id;

    try {
      const userRef = db.collection('users').doc(socket.user.uid);
      await userRef.update({ status: 'online' });
      io.to(`status_${socket.user.uid}`).emit('statusUpdate', {
        uid: socket.user.uid,
        status: 'online',
        lastSeen: null,
        photoURL: socket.user.picture,
        displayName: socket.user.name,
      });
      console.log(`[Status] User ${socket.user.uid} is online.`);
    } catch (error) {
      console.error(`[Status] Error setting online status for ${socket.user.uid}:`, error);
    }

    socket.on('security:register-public-key', async ({ publicKey }) => {
      if (typeof publicKey !== 'string' || !publicKey) return;
      try {
        await db.collection('users').doc(socket.user.uid).set({ publicKey }, { merge: true });
        console.log(`[Security] Registered public key for ${socket.user.uid}`);
      } catch (error) {
        console.error('[Security] Error registering public key:', error);
      }
    });

    socket.on('subscribeToStatus', (userIds) => {
      if (Array.isArray(userIds)) {
        userIds.forEach((uid) => {
          if (typeof uid === 'string' && uid) {
            void socket.join(`status_${uid}`);
          }
        });
      }
    });

    registerChatHandlers(io, socket, userSocketMap);
    registerWebRTCHandlers(io, socket, userSocketMap);

    socket.on('disconnect', async (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id}, Reason: ${reason}`);
      delete userSocketMap[socket.user.uid];

      try {
        const userRef = db.collection('users').doc(socket.user.uid);
        await userRef.update({
          status: 'offline',
          lastSeen: FieldValue.serverTimestamp(),
        });
        io.to(`status_${socket.user.uid}`).emit('statusUpdate', {
          uid: socket.user.uid,
          status: 'offline',
          lastSeen: new Date().toISOString(),
          photoURL: socket.user.picture,
          displayName: socket.user.name,
        });
        console.log(`[Status] User ${socket.user.uid} is offline.`);
      } catch (error) {
        console.error(`[Status] Error setting offline status for ${socket.user.uid}:`, error);
      }
    });
  });
};
