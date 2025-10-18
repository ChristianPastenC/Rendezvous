// sockets/socketHandler.js
const { auth, db } = require('../config/firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');
const registerChatHandlers = require('./chatHandler');
const registerWebRTCHandlers = require('./webrtcHandlers');

const socketAuthMiddleware = async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Autenticación fallida: Token no proporcionado.'));
  }
  try {
    const decodedToken = await auth.verifyIdToken(token);
    socket.user = decodedToken;
    next();
  } catch (error) {
    return next(new Error('Autenticación fallida: Token inválido.'));
  }
};

const registerSocketHandlers = (io, userSocketMap) => {
  io.use(socketAuthMiddleware);

  io.on("connection", async (socket) => {
    console.log(`[Socket] Cliente autenticado: ${socket.id} (Usuario: ${socket.user.uid})`);

    userSocketMap[socket.user.uid] = socket.id;

    try {
      const userRef = db.collection('users').doc(socket.user.uid);
      await userRef.update({ status: 'online' });
      io.to(`status_${socket.user.uid}`).emit('statusUpdate', {
        uid: socket.user.uid,
        status: 'online',
        lastSeen: null
      });
      console.log(`[Status] Usuario ${socket.user.uid} está online.`);
    } catch (error) {
      console.error(`Error al actualizar estado a online para ${socket.user.uid}:`, error);
    }

    socket.on('security:register-public-key', async ({ publicKey }) => {
      try {
        await db.collection('users').doc(socket.user.uid).set({ publicKey }, { merge: true });
        console.log(`[Seguridad] Clave pública registrada para ${socket.user.uid}`);
      } catch (error) {
        console.error("Error al registrar la clave pública:", error);
      }
    });

    socket.on('subscribeToStatus', (userIds) => {
      if (Array.isArray(userIds)) {
        userIds.forEach(uid => {
          socket.join(`status_${uid}`);
        });
      }
    });


    registerChatHandlers(io, socket, userSocketMap);
    registerWebRTCHandlers(io, socket, userSocketMap);

    socket.on("disconnect", async (reason) => {
      console.log(`[Socket] Cliente desconectado: ${socket.id}, Razon: ${reason}`);
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
        });
        console.log(`[Status] Usuario ${socket.user.uid} está offline.`);
      } catch (error) {
        console.error(`Error al actualizar estado a offline para ${socket.user.uid}:`, error);
      }
    });
  });
};

module.exports = { registerSocketHandlers };