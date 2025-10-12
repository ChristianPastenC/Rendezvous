const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`[${new Date().toLocaleTimeString()}] Cliente conectado: ${socket.id}`);

    socket.emit("connected", { message: "¡Conectado exitosamente al servidor!", socketId: socket.id });

    socket.on('ping', () => {
      console.log(`[${new Date().toLocaleTimeString()}] Ping recibido de: ${socket.id}`);
      socket.emit('pong');
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