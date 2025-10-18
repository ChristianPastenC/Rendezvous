// sockets/index.js
const { registerSocketHandlers } = require('./socketHandler');

const initializeSockets = (io) => {
  const userSocketMap = {};
  registerSocketHandlers(io, userSocketMap);
};

module.exports = initializeSockets;