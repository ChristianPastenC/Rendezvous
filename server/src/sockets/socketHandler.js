const { db } = require('../config/firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');

const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`[${new Date().toLocaleTimeString()}] Cliente conectado: ${socket.id}`);

    socket.emit("connected", { message: "¡Conectado exitosamente al servidor!", socketId: socket.id });

    socket.on('ping', () => {
      console.log(`[${new Date().toLocaleTimeString()}] Ping recibido de: ${socket.id}`);
      socket.emit('pong');
    });

    socket.on('joinDefaultChannel', ({ channelId }) => {
      socket.join(channelId);
      console.log(`[Socket] Cliente ${socket.id} se unió al canal por defecto: ${channelId}`);
    });

    socket.on('sendMessage', async ({ channelId, groupId, content, authorInfo }) => {
      if (!channelId || !groupId || !content.trim()) return;

      try {
        const messageData = {
          content,
          authorId: authorInfo.uid,
          authorInfo: {
            displayName: authorInfo.displayName,
            photoURL: authorInfo.photoURL,
          },
          type: 'text',
          createdAt: FieldValue.serverTimestamp(),
        };

        const messageRef = await db
          .collection('groups')
          .doc(groupId)
          .collection('channels')
          .doc(channelId)
          .collection('messages')
          .add(messageData);

        const savedMessage = {
          ...messageData,
          id: messageRef.id,
          createdAt: new Date().toISOString()
        };

        io.to(channelId).emit('newMessage', savedMessage);

      } catch (error) {
        console.error("Error al guardar el mensaje:", error);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[${new Date().toLocaleTimeString()}] Cliente desconectado: ${socket.id}, Razón: ${reason}`);
    });

    socket.on("error", (error) => {
      console.error(`[${new Date().toLocaleTimeString()}] Error en socket ${socket.id}:`, error);
    });
  });
};

module.exports = { registerSocketHandlers };