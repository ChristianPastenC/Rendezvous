const { auth } = require('../config/firebaseAdmin');
const registerChatHandlers = require('./chatHandler');

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

const registerSocketHandlers = (io) => {
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log(`[Socket] Cliente autenticado y conectado: ${socket.id} (Usuario: ${socket.user.uid})`);

    registerChatHandlers(io, socket);

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Cliente desconectado: ${socket.id}, Razón: ${reason}`);
    });
  });
};

module.exports = { registerSocketHandlers };