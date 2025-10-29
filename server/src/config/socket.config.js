const socketConfig = {
  cors: {
    origin: [
      "https://rendezvous-chat.netlify.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
  },
};

module.exports = { socketConfig };