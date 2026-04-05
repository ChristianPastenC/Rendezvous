import type { AuthenticatedSocket, TypedServer, UserSocketMap } from '../types/index.js';

export const registerWebRTCHandlers = (
  io: TypedServer,
  socket: AuthenticatedSocket,
  userSocketMap: UserSocketMap
): void => {
  socket.on('webrtc:offer', ({ recipientUid, offer, callType, callerName }) => {
    const recipientSocketId = userSocketMap[recipientUid];

    if (recipientSocketId) {
      console.log(`[WebRTC] Offer from ${socket.user.uid} to ${recipientUid} (${recipientSocketId})`);
      io.to(recipientSocketId).emit('webrtc:offer', {
        from: socket.user.uid,
        offer,
        callType,
        callerName: callerName || socket.user.name || 'User',
      });
    } else {
      console.warn(`[WebRTC] User offline: ${recipientUid}`);
      socket.emit('webrtc:error', { message: 'User is not connected.' });
    }
  });

  socket.on('webrtc:answer', ({ recipientUid, answer }) => {
    const recipientSocketId = userSocketMap[recipientUid];
    if (recipientSocketId) {
      console.log(`[WebRTC] Answer from ${socket.user.uid} to ${recipientUid}`);
      io.to(recipientSocketId).emit('webrtc:answer', {
        from: socket.user.uid,
        answer,
      });
    }
  });

  socket.on('webrtc:ice-candidate', ({ recipientUid, candidate }) => {
    const recipientSocketId = userSocketMap[recipientUid];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('webrtc:ice-candidate', {
        from: socket.user.uid,
        candidate,
      });
    }
  });

  socket.on('webrtc:ringing', ({ recipientUid }) => {
    const recipientSocketId = userSocketMap[recipientUid];
    if (recipientSocketId) {
      console.log(`[WebRTC] Ringing from ${socket.user.uid} to ${recipientUid}`);
      io.to(recipientSocketId).emit('webrtc:ringing', { from: socket.user.uid });
    }
  });

  socket.on('webrtc:hang-up', ({ recipientUid }) => {
    const recipientSocketId = userSocketMap[recipientUid];
    if (recipientSocketId) {
      console.log(`[WebRTC] Hang-up from ${socket.user.uid} to ${recipientUid}`);
      io.to(recipientSocketId).emit('webrtc:hang-up', { from: socket.user.uid });
    }
  });

  socket.on('webrtc:call-rejected', ({ recipientUid }) => {
    const recipientSocketId = userSocketMap[recipientUid];
    if (recipientSocketId) {
      console.log(`[WebRTC] Call rejected by ${socket.user.uid} for ${recipientUid}`);
      io.to(recipientSocketId).emit('webrtc:call-rejected', { from: socket.user.uid });
    }
  });
};
