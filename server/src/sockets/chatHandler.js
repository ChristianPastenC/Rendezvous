const { db } = require('../config/firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');
const { sendMessageSchema } = require('../utils/validation');

const registerChatHandlers = (io, socket, userSocketMap) => {
  socket.on('joinChannel', ({ conversationId }) => {
    if (typeof conversationId === 'string' && conversationId) {
      socket.join(conversationId);
      console.log(`[Socket] User ${socket.user.uid} joined conversation: ${conversationId}`);
    }
  });

  socket.on('leaveChannel', ({ conversationId }) => {
    if (typeof conversationId === 'string' && conversationId) {
      socket.leave(conversationId);
      console.log(`[Socket] User ${socket.user.uid} left conversation: ${conversationId}`);
    }
  });

  socket.on('sendMessage', async (rawPayload) => {
    try {
      const parsed = sendMessageSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return socket.emit('messageError', { message: 'Invalid message payload.' });
      }

      const { conversationId, isDirectMessage, groupId, encryptedPayload } = parsed.data;
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
        if (!groupId) {
          return socket.emit('messageError', { message: 'Group ID is required for group messages.' });
        }

        const groupRef = db.collection('groups').doc(groupId);
        const groupDoc = await groupRef.get();
        if (!groupDoc.exists || !groupDoc.data().members.includes(author.uid)) return;

        messageCollectionRef = groupRef.collection('channels').doc(conversationId).collection('messages');
        members = groupDoc.data().members;
      }

      const authorDoc = await db.collection('users').doc(author.uid).get();
      const authorData = authorDoc.exists
        ? authorDoc.data()
        : {
            displayName: author.name || 'User',
            photoURL: author.picture || null,
            status: 'offline',
            lastSeen: null,
          };

      const messageData = {
        encryptedPayload,
        authorId: author.uid,
        authorInfo: {
          uid: author.uid,
          displayName: authorData.displayName || author.name || 'User',
          photoURL: authorData.photoURL || author.picture || null,
        },
        createdAt: FieldValue.serverTimestamp(),
      };

      const messageRef = await messageCollectionRef.add(messageData);

      if (isDirectMessage) {
        const now = FieldValue.serverTimestamp();
        const otherUserId = members.find((uid) => uid !== author.uid);
        if (otherUserId) {
          await db
            .collection('users')
            .doc(author.uid)
            .collection('contacts')
            .doc(otherUserId)
            .set({ lastActivity: now, dmId: conversationId }, { merge: true });
          await db
            .collection('users')
            .doc(otherUserId)
            .collection('contacts')
            .doc(author.uid)
            .set({ lastActivity: now, dmId: conversationId }, { merge: true });
        }
      }

      const savedMessage = {
        ...messageData,
        id: messageRef.id,
        createdAt: new Date().toISOString(),
        conversationId,
        groupId: isDirectMessage ? null : groupId,
      };

      io.to(conversationId).emit('encryptedMessage', savedMessage);
      console.log(`[Socket] Broadcast 'encryptedMessage' to room: ${conversationId}`);

      members.forEach((memberId) => {
        const memberSocketId = userSocketMap[memberId];
        if (memberSocketId) {
          const memberSocket = io.sockets.sockets.get(memberSocketId);
          if (memberSocket && memberSocket.id !== socket.id && !memberSocket.rooms.has(conversationId)) {
            io.to(memberSocketId).emit('encryptedMessage', savedMessage);
          }
        }
      });
    } catch (error) {
      console.error(`[Socket] Error in sendMessage for ${socket.id}:`, error);
      socket.emit('messageError', { message: 'Failed to send message.' });
    }
  });
};

module.exports = registerChatHandlers;
