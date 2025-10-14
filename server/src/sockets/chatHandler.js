const { db } = require('../config/firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');

const registerChatHandlers = (io, socket, userSocketMap) => {
  socket.on('joinChannel', async ({ groupId, channelId }) => {
    try {
      const groupRef = db.collection('groups').doc(groupId);
      const groupDoc = await groupRef.get();
      if (groupDoc.exists && groupDoc.data().members.includes(socket.user.uid)) {
        socket.join(channelId);
      }
    } catch (error) {
      console.error("Error al unirse al canal:", error);
    }
  });

  socket.on('leaveChannel', ({ channelId }) => {
    socket.leave(channelId);
  });

  socket.on('sendMessage', async ({ groupId, channelId, encryptedPayload }) => {
    try {
      if (!groupId || !channelId || !encryptedPayload) {
        return socket.emit('messageError', { message: 'Datos del mensaje inválidos.' });
      }

      const author = socket.user;
      const groupRef = db.collection('groups').doc(groupId);
      const groupDoc = await groupRef.get();

      if (!groupDoc.exists || !groupDoc.data().members.includes(author.uid)) {
        return socket.emit('messageError', { message: 'No tienes permiso para enviar mensajes aquí.' });
      }

      const messageData = {
        encryptedPayload: encryptedPayload,
        authorId: author.uid,
        authorInfo: {
          displayName: author.name || 'Usuario',
          photoURL: author.picture || null,
        },
        createdAt: FieldValue.serverTimestamp(),
      };

      const messageRef = await db.collection('groups').doc(groupId).collection('channels').doc(channelId).collection('messages').add(messageData);
      const savedMessage = { ...messageData, id: messageRef.id, createdAt: new Date().toISOString() };

      io.to(channelId).emit('encryptedMessage', savedMessage);
    } catch (error) {
      console.error(`[Error] en sendMessage para ${socket.id}:`, error.message);
      socket.emit('messageError', { message: 'No se pudo enviar el mensaje.' });
    }
  });
};

module.exports = registerChatHandlers;