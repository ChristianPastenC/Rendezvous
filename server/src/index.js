const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { socketConfig } = require("./config/socket.config");
const { registerSocketHandlers } = require("./sockets/socketHandler");
const { authMiddleware } = require('./middleware/authMiddleware');
const { auth, db } = require('./config/firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');

const app = express();
const server = http.createServer(app);
const io = new Server(server, socketConfig);

app.use(cors());
app.use(express.json());

const ensureDefaultGroup = async (newUserUid) => {
  const defaultGroupId = 'general_group';
  const defaultChannelId = 'general_channel';
  const groupRef = db.collection('groups').doc(defaultGroupId);
  const groupDoc = await groupRef.get();

  if (!groupDoc.exists) {
    await groupRef.set({
      name: 'General',
      ownerId: 'system',
      members: [newUserUid]
    });
    await groupRef.collection('channels').doc(defaultChannelId).set({
      name: 'general',
      type: 'text'
    });
  } else {
    await groupRef.update({
      members: FieldValue.arrayUnion(newUserUid)
    });
  }
};


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
    const { uid, email, picture } = decodedToken;

    let displayName = decodedToken.name;

    if (!displayName) {
      const userRecord = await auth.getUser(uid);
      displayName = userRecord.displayName || 'Usuario';
    }

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log(`[Firebase] Creando nuevo usuario: ${displayName} (${uid})`);
      await userRef.set({
        displayName: displayName,
        email: email,
        photoURL: picture || null,
        createdAt: new Date().toISOString(),
      });

      await ensureDefaultGroup(uid);
    } else {
      console.log(`[Firebase] Usuario ya existe: ${displayName} (${uid})`);

      await userRef.update({
        displayName: displayName,
        email: email,
        photoURL: picture || userDoc.data().photoURL || null,
        updatedAt: new Date().toISOString(),
      });
    }

    res.status(200).json({ status: "success", uid });

  } catch (error) {
    console.error("Error al verificar token o sincronizar usuario:", error);
    res.status(401).json({ error: "Token inválido o expirado." });
  }
});

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({
    message: `Hola, ${req.user.name || req.user.email}!`,
    userData: req.user,
  });
});

app.get("/api/default-channel", authMiddleware, async (req, res) => {
  res.status(200).json({
    groupId: 'general_group',
    channelId: 'general_channel'
  });
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[${new Date().toLocaleTimeString()}] Servidor escuchando en http://localhost:${PORT}`);
});