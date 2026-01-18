const { auth, db } = require('../config/firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');
const registerChatHandlers = require('./chatHandler');
const registerWebRTCHandlers = require('./webrtcHandlers');

const socketAuthMiddleware = async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication failed: Missing token.'));
  }
  try {
    const decodedToken = await auth.verifyIdToken(token);
    socket.user = decodedToken;
    next();
  } catch (_error) {
    return next(new Error('Authentication failed: Invalid token.'));
  }
};

const registerSocketHandlers = (io, userSocketMap) => {
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    console.log(`[Socket] Client authenticated: ${socket.id} (User: ${socket.user.uid})`);

    userSocketMap[socket.user.uid] = socket.id;

    try {
      const userRef = db.collection('users').doc(socket.user.uid);
      await userRef.update({ status: 'online' });
      io.to(`status_${socket.user.uid}`).emit('statusUpdate', {
        uid: socket.user.uid,
        status: 'online',
        lastSeen: null,
        photoURL: socket.user.photoURL,
        displayName: socket.user.displayName,
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
            socket.join(`status_${uid}`);
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
        const lastSeenTime = FieldValue.serverTimestamp();
        await userRef.update({
          status: 'offline',
          lastSeen: lastSeenTime,
        });
        io.to(`status_${socket.user.uid}`).emit('statusUpdate', {
          uid: socket.user.uid,
          status: 'offline',
          lastSeen: new Date().toISOString(),
          photoURL: socket.user.photoURL,
          displayName: socket.user.displayName,
        });
        console.log(`[Status] User ${socket.user.uid} is offline.`);
      } catch (error) {
        console.error(`[Status] Error setting offline status for ${socket.user.uid}:`, error);
      }
    });
  });
};

module.exports = { registerSocketHandlers };
