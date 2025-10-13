const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { socketConfig } = require("./config/socket.config");
const { registerSocketHandlers } = require("./sockets/socketHandler");

const { auth, db } = require('./config/firebaseAdmin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, socketConfig);

app.use(cors());
app.use(express.json());

app.get("/api/healthcheck", (req, res) => {
  res.json({ status: "ok", message: "Server is healthy and running" });
});

app.post("/api/auth/sync", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token no proporcionado." });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    const { uid, name, email, picture } = decodedToken;

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log(`[Firebase] Creando nuevo usuario: ${name} (${uid})`);
      await userRef.set({
        displayName: name,
        email: email,
        photoURL: picture,
        createdAt: new Date().toISOString(),
      });
    } else {
      console.log(`[Firebase] Usuario ya existe: ${name} (${uid})`);
    }

    res.status(200).json({ status: "success", uid });

  } catch (error) {
    console.error("Error al verificar token o sincronizar usuario:", error);
    res.status(401).json({ error: "Token inválido o expirado." });
  }
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[${new Date().toLocaleTimeString()}] Servidor escuchando en http://localhost:${PORT}`);
});