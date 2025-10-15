const { auth, db } = require('../config/firebaseAdmin');
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

  io.on("connection", (socket) => {
    console.log(`[Socket] Cliente autenticado: ${socket.id} (Usuario: ${socket.user.uid})`);

    userSocketMap[socket.user.uid] = socket.id;

    socket.on('security:register-public-key', async ({ publicKey }) => {
      try {
        await db.collection('users').doc(socket.user.uid).set({ publicKey }, { merge: true });
        console.log(`[Seguridad] Clave pública registrada para ${socket.user.uid}`);
      } catch (error) {
        console.error("Error al registrar la clave pública:", error);
      }
    });

    registerChatHandlers(io, socket, userSocketMap);
    registerWebRTCHandlers(io, socket, userSocketMap);

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Cliente desconectado: ${socket.id}, Razon: ${reason}`);
      delete userSocketMap[socket.user.uid];
    });
  });
};

module.exports = { registerSocketHandlers };