const { db } = require('../config/firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');

const registerChatHandlers = (io, socket, userSocketMap) => {
  socket.on('joinChannel', ({ conversationId }) => {
    if (conversationId) {
      socket.join(conversationId);
      console.log(`[Socket] Usuario ${socket.user.uid} se unió a la conversación: ${conversationId}`);
    }
  });

  socket.on('leaveChannel', ({ conversationId }) => {
    if (conversationId) {
      socket.leave(conversationId);
      console.log(`[Socket] Usuario ${socket.user.uid} salió de la conversación: ${conversationId}`);
    }
  });

  socket.on('sendMessage', async ({ conversationId, isDirectMessage, groupId, encryptedPayload }) => {
    try {
      if (!conversationId || !encryptedPayload) {
        return socket.emit('messageError', { message: 'Datos del mensaje inválidos.' });
      }

      const author = socket.user;
      let messageCollectionRef;
      let members = [];

      if (isDirectMessage) {
        const participants = conversationId.split('_');
        if (!participants.includes(author.uid)) return;

        const dmRef = db.collection('directMessages').doc(conversationId);
        const dmDoc = await dmRef.get();

        if (!dmDoc.exists) {
          await dmRef.set({ participants, createdAt: FieldValue.serverTimestamp() });
        }
        messageCollectionRef = dmRef.collection('messages');
        members = participants;

      } else {
        if (!groupId) return socket.emit('messageError', { message: 'GroupID es requerido para mensajes de grupo.' });

        const groupRef = db.collection('groups').doc(groupId);
        const groupDoc = await groupRef.get();
        if (!groupDoc.exists || !groupDoc.data().members.includes(author.uid)) return;

        messageCollectionRef = groupRef.collection('channels').doc(conversationId).collection('messages');
        members = groupDoc.data().members;
      }

      const messageData = {
        encryptedPayload,
        authorId: author.uid,
        authorInfo: { displayName: author.name || 'Usuario', photoURL: author.picture || null },
        createdAt: FieldValue.serverTimestamp(),
      };

      const messageRef = await messageCollectionRef.add(messageData);

      if (isDirectMessage) {
        const now = FieldValue.serverTimestamp();
        const otherUserId = members.find(uid => uid !== author.uid);
        if (otherUserId) {
          await db.collection('users').doc(author.uid).collection('contacts').doc(otherUserId).set({ lastActivity: now, dmId: conversationId }, { merge: true });
          await db.collection('users').doc(otherUserId).collection('contacts').doc(author.uid).set({ lastActivity: now, dmId: conversationId }, { merge: true });
        }
      }

      const savedMessage = {
        ...messageData,
        id: messageRef.id,
        createdAt: new Date().toISOString(),
        conversationId: conversationId
      };

      io.to(conversationId).emit('encryptedMessage', savedMessage);

    } catch (error) {
      console.error(`[Error] en sendMessage para ${socket.id}:`, error);
    }
  });
};

module.exports = registerChatHandlers;