import { FieldValue, type CollectionReference } from 'firebase-admin/firestore';
import type { EncryptedMessage } from '@rendezvous/shared';
import { db } from '../config/firebaseAdmin.js';
import type { AuthenticatedSocket, TypedServer, UserSocketMap } from '../types/index.js';
import { sendMessageSchema } from '../utils/validation.js';

export const registerChatHandlers = (
  io: TypedServer,
  socket: AuthenticatedSocket,
  userSocketMap: UserSocketMap
): void => {
  socket.on('joinChannel', ({ conversationId }) => {
    if (typeof conversationId === 'string' && conversationId) {
      void socket.join(conversationId);
      console.log(`[Socket] User ${socket.user.uid} joined conversation: ${conversationId}`);
    }
  });

  socket.on('leaveChannel', ({ conversationId }) => {
    if (typeof conversationId === 'string' && conversationId) {
      void socket.leave(conversationId);
      console.log(`[Socket] User ${socket.user.uid} left conversation: ${conversationId}`);
    }
  });

  socket.on('sendMessage', async (rawPayload) => {
    try {
      const parsed = sendMessageSchema.safeParse(rawPayload);
      if (!parsed.success) {
        socket.emit('messageError', { message: 'Invalid message payload.' });
        return;
      }

      const { conversationId, isDirectMessage, groupId, encryptedPayload } = parsed.data;
      const author = socket.user;
      let messageCollectionRef: CollectionReference;
      let members: string[] = [];

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
          socket.emit('messageError', { message: 'Group ID is required for group messages.' });
          return;
        }

        const groupRef = db.collection('groups').doc(groupId);
        const groupDoc = await groupRef.get();
        const groupMembers = (groupDoc.data()?.members as string[] | undefined) || [];
        if (!groupDoc.exists || !groupMembers.includes(author.uid)) return;

        messageCollectionRef = groupRef
          .collection('channels')
          .doc(conversationId)
          .collection('messages');
        members = groupMembers;
      }

      const authorDoc = await db.collection('users').doc(author.uid).get();
      const authorData = authorDoc.exists ? authorDoc.data() : undefined;

      const authorInfo = {
        uid: author.uid,
        displayName: (authorData?.displayName as string) || author.name || 'User',
        photoURL: (authorData?.photoURL as string | null) || author.picture || null,
      };

      const messageRef = await messageCollectionRef.add({
        encryptedPayload,
        authorId: author.uid,
        authorInfo,
        createdAt: FieldValue.serverTimestamp(),
      });

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

      const savedMessage: EncryptedMessage = {
        id: messageRef.id,
        encryptedPayload,
        authorId: author.uid,
        authorInfo,
        createdAt: new Date().toISOString(),
        conversationId,
        groupId: isDirectMessage ? null : groupId ?? null,
      };

      io.to(conversationId).emit('encryptedMessage', savedMessage);
      console.log(`[Socket] Broadcast 'encryptedMessage' to room: ${conversationId}`);

      members.forEach((memberId) => {
        const memberSockets = userSocketMap.get(memberId);
        if (!memberSockets) return;
        memberSockets.forEach((memberSocketId) => {
          const memberSocket = io.sockets.sockets.get(memberSocketId);
          if (memberSocket && memberSocket.id !== socket.id && !memberSocket.rooms.has(conversationId)) {
            io.to(memberSocketId).emit('encryptedMessage', savedMessage);
          }
        });
      });
    } catch (error) {
      console.error(`[Socket] Error in sendMessage for ${socket.id}:`, error);
      socket.emit('messageError', { message: 'Failed to send message.' });
    }
  });
};
