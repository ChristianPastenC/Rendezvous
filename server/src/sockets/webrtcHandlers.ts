import type { AuthenticatedSocket, TypedServer, UserSocketMap } from '../types/index.js';
import { logger } from '../utils/logger.js';

export const registerWebRTCHandlers = (
  io: TypedServer,
  socket: AuthenticatedSocket,
  userSocketMap: UserSocketMap
): void => {
  const emitToRecipient = (
    recipientUid: string,
    emitFn: (socketId: string) => void
  ): boolean => {
    const recipientSockets = userSocketMap.get(recipientUid);
    if (!recipientSockets || recipientSockets.size === 0) {
      return false;
    }
    recipientSockets.forEach((socketId) => emitFn(socketId));
    return true;
  };

  socket.on('webrtc:offer', ({ recipientUid, offer, callType, callerName }) => {
    const delivered = emitToRecipient(recipientUid, (recipientSocketId) => {
      logger.info('WebRTC offer forwarded', {
        from: socket.user.uid,
        to: recipientUid,
        recipientSocketId,
        callType,
      });
      io.to(recipientSocketId).emit('webrtc:offer', {
        from: socket.user.uid,
        offer,
        callType,
        callerName: callerName || socket.user.name || 'User',
      });
    });

    if (!delivered) {
      logger.warn('WebRTC recipient offline', {
        from: socket.user.uid,
        to: recipientUid,
      });
      socket.emit('webrtc:error', {
        message: 'User is not connected.',
        code: 'USER_OFFLINE',
      });
    }
  });

  socket.on('webrtc:answer', ({ recipientUid, answer }) => {
    emitToRecipient(recipientUid, (recipientSocketId) => {
      logger.info('WebRTC answer forwarded', {
        from: socket.user.uid,
        to: recipientUid,
      });
      io.to(recipientSocketId).emit('webrtc:answer', {
        from: socket.user.uid,
        answer,
      });
    });
  });

  socket.on('webrtc:ice-candidate', ({ recipientUid, candidate }) => {
    emitToRecipient(recipientUid, (recipientSocketId) => {
      io.to(recipientSocketId).emit('webrtc:ice-candidate', {
        from: socket.user.uid,
        candidate,
      });
    });
  });

  socket.on('webrtc:ringing', ({ recipientUid }) => {
    emitToRecipient(recipientUid, (recipientSocketId) => {
      logger.info('WebRTC ringing forwarded', {
        from: socket.user.uid,
        to: recipientUid,
      });
      io.to(recipientSocketId).emit('webrtc:ringing', { from: socket.user.uid });
    });
  });

  socket.on('webrtc:hang-up', ({ recipientUid }) => {
    emitToRecipient(recipientUid, (recipientSocketId) => {
      logger.info('WebRTC hang-up forwarded', {
        from: socket.user.uid,
        to: recipientUid,
      });
      io.to(recipientSocketId).emit('webrtc:hang-up', { from: socket.user.uid });
    });
  });

  socket.on('webrtc:call-rejected', ({ recipientUid }) => {
    emitToRecipient(recipientUid, (recipientSocketId) => {
      logger.info('WebRTC call rejected', {
        from: socket.user.uid,
        to: recipientUid,
      });
      io.to(recipientSocketId).emit('webrtc:call-rejected', { from: socket.user.uid });
    });
  });

  socket.on('webrtc:busy', ({ recipientUid }) => {
    emitToRecipient(recipientUid, (recipientSocketId) => {
      logger.info('WebRTC recipient busy', {
        from: socket.user.uid,
        to: recipientUid,
      });
      io.to(recipientSocketId).emit('webrtc:busy', { from: socket.user.uid });
    });
  });
};
