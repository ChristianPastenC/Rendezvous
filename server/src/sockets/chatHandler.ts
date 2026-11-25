import { FieldValue, type CollectionReference } from 'firebase-admin/firestore';
import type { EncryptedMessage } from '@rendezvous/shared';
import { db } from '../config/firebaseAdmin.js';
import type { AuthenticatedSocket, TypedServer, UserSocketMap } from '../types/index.js';
import { sendMessageSchema } from '../utils/validation.js';
import { SocketEventRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { logger } from '../utils/logger.js';

export const registerChatHandlers = (
  io: TypedServer,
  socket: AuthenticatedSocket,
  userSocketMap: UserSocketMap
): void => {
  const messageRateLimiter = new SocketEventRateLimiter(10_000, 20);

  socket.on('joinChannel', ({ conversationId }) => {
    if (typeof conversationId === 'string' && conversationId) {
      void socket.join(conversationId);
      logger.info('User joined conversation channel', {
        uid: socket.user.uid,
        socketId: socket.id,
        conversationId,
      });
    }
  });

  socket.on('leaveChannel', ({ conversationId }) => {
    if (typeof conversationId === 'string' && conversationId) {
      void socket.leave(conversationId);
      logger.info('User left conversation channel', {
        uid: socket.user.uid,
        socketId: socket.id,
        conversationId,
      });
    }
  });

  socket.on('sendMessage', async (rawPayload, ack) => {
    const clientTempId =
      rawPayload && typeof rawPayload === 'object' && 'clientTempId' in rawPayload
        ? (rawPayload.clientTempId as string | undefined)
        : undefined;

    if (!messageRateLimiter.consume(socket.user.uid)) {
      const errorMsg = 'Rate limit exceeded: sending messages too quickly.';
      socket.emit('messageError', { message: errorMsg, clientTempId });
      if (typeof ack === 'function') {
        ack({ ok: false, error: errorMsg });
      }
      return;
    }

    try {
      const parsed = sendMessageSchema.safeParse(rawPayload);
      if (!parsed.success) {
        const errorMsg = 'Invalid message payload.';
        socket.emit('messageError', { message: errorMsg, clientTempId });
        if (typeof ack === 'function') {
          ack({ ok: false, error: errorMsg });
        }
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
          const errorMsg = 'Group ID is required for group messages.';
          socket.emit('messageError', { message: errorMsg, clientTempId });
          if (typeof ack === 'function') {
            ack({ ok: false, error: errorMsg });
          }
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

      const createdAtIso = new Date().toISOString();
      const savedMessage: EncryptedMessage = {
        id: messageRef.id,
        encryptedPayload,
        authorId: author.uid,
        authorInfo,
        createdAt: createdAtIso,
        conversationId,
        groupId: isDirectMessage ? null : groupId ?? null,
        clientTempId,
        status: 'sent',
      };

      io.to(conversationId).emit('encryptedMessage', savedMessage);
      logger.info('Broadcast encryptedMessage to room', {
        conversationId,
        messageId: messageRef.id,
        authorId: author.uid,
      });

      members.forEach((memberId) => {
        const memberSockets = userSocketMap.get(memberId);
        if (!memberSockets) return;
        memberSockets.forEach((memberSocketId) => {
          const memberSocket = io.sockets.sockets.get(memberSocketId);
          if (
            memberSocket &&
            memberSocket.id !== socket.id &&
            !memberSocket.rooms.has(conversationId)
          ) {
            io.to(memberSocketId).emit('encryptedMessage', savedMessage);
          }
        });
      });

      if (typeof ack === 'function') {
        ack({ ok: true, id: messageRef.id, createdAt: createdAtIso });
      }
    } catch (error) {
      logger.error('Error in sendMessage handler', {
        socketId: socket.id,
        uid: socket.user.uid,
        error: error instanceof Error ? error.message : String(error),
      });
      const errorMsg = 'Failed to send message.';
      socket.emit('messageError', { message: errorMsg, clientTempId });
      if (typeof ack === 'function') {
        ack({ ok: false, error: errorMsg });
      }
    }
  });
};
