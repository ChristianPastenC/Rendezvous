const registerWebRTCHandlers = (io, socket, userSocketMap) => {

  socket.on('webrtc:offer', ({ recipientUid, offer, callType, callerName }) => {
    const recipientSocketId = userSocketMap[recipientUid];

    if (recipientSocketId) {
      console.log(`[WebRTC] Oferta de ${socket.user.uid} a ${recipientUid} (${recipientSocketId})`);
      io.to(recipientSocketId).emit('webrtc:offer', {
        from: socket.user.uid,
        offer,
        callType,
        callerName: callerName || socket.user.name || 'Usuario'
      });
    } else {
      console.warn(`[WebRTC] Usuario no conectado: ${recipientUid}`);
      socket.emit('webrtc:error', { message: 'El usuario no está conectado.' });
    }
  });

  socket.on('webrtc:answer', ({ recipientUid, answer }) => {
    const recipientSocketId = userSocketMap[recipientUid];
    if (recipientSocketId) {
      console.log(`[WebRTC] Respuesta de ${socket.user.uid} a ${recipientUid}`);
      io.to(recipientSocketId).emit('webrtc:answer', {
        from: socket.user.uid,
        answer
      });
    }
  });

  socket.on('webrtc:ice-candidate', ({ recipientUid, candidate }) => {
    const recipientSocketId = userSocketMap[recipientUid];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('webrtc:ice-candidate', {
        from: socket.user.uid,
        candidate
      });
    }
  });

  // --- AÑADIR ESTE HANDLER ---
  socket.on('webrtc:ringing', ({ recipientUid }) => {
    const recipientSocketId = userSocketMap[recipientUid];
    if (recipientSocketId) {
      console.log(`[WebRTC] ${socket.user.uid} está sonando para ${recipientUid}`);
      io.to(recipientSocketId).emit('webrtc:ringing', { from: socket.user.uid });
    }
  });
  // --- FIN DE LA ADICIÓN ---

  socket.on('webrtc:hang-up', ({ recipientUid }) => {
    const recipientSocketId = userSocketMap[recipientUid];
    if (recipientSocketId) {
      console.log(`[WebRTC] ${socket.user.uid} colgó con ${recipientUid}`);
      io.to(recipientSocketId).emit('webrtc:hang-up', { from: socket.user.uid });
    }
  });

  socket.on('webrtc:call-rejected', ({ recipientUid }) => {
    const recipientSocketId = userSocketMap[recipientUid];
    if (recipientSocketId) {
      console.log(`[WebRTC] ${socket.user.uid} rechazó llamada de ${recipientUid}`);
      io.to(recipientSocketId).emit('webrtc:call-rejected', { from: socket.user.uid });
    }
  });
};

module.exports = registerWebRTCHandlers;