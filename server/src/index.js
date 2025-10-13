const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { socketConfig } = require("./config/socket.config");
const { registerSocketHandlers } = require("./sockets/socketHandler");
const { auth, db } = require('./config/firebaseAdmin');
const { authMiddleware } = require('./middleware/authMiddleware');
const { FieldValue } = require('firebase-admin/firestore');

const app = express();
const server = http.createServer(app);
const io = new Server(server, socketConfig);

app.use(cors());
app.use(express.json());

const ensureDefaultGroup = async (newUserUid) => {
  const defaultGroupId = 'general_group';
  const groupRef = db.collection('groups').doc(defaultGroupId);
  const groupDoc = await groupRef.get();

  if (!groupDoc.exists) {
    await groupRef.set({ name: 'General', ownerId: 'system', members: [newUserUid] });
    await groupRef.collection('channels').doc('general_channel').set({ name: 'general', type: 'text' });
  } else {
    await groupRef.update({ members: FieldValue.arrayUnion(newUserUid) });
  }
};

app.post("/api/auth/sync", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token no proporcionado." });
  try {
    const decodedToken = await auth.verifyIdToken(token);
    const { uid, name, email, picture } = decodedToken;
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      await userRef.set({ displayName: name, email, photoURL: picture || null, createdAt: FieldValue.serverTimestamp() }, { merge: true });
      await ensureDefaultGroup(uid);
    } else {
      await userRef.update({ displayName: name, photoURL: picture || (userDoc.data() && userDoc.data().photoURL) || null });
    }
    res.status(200).json({ status: "success", uid });
  } catch (error) {
    res.status(401).json({ error: "Token inválido." });
  }
});

app.get("/api/groups", authMiddleware, async (req, res) => {
  const userId = req.user.uid;
  try {
    const groupsSnapshot = await db.collection('groups').where('members', 'array-contains', userId).get();
    const userGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(userGroups);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los grupos." });
  }
});

app.get("/api/groups/:groupId/channels", authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.uid;
  try {
    const groupRef = db.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists || !groupDoc.data().members.includes(userId)) {
      return res.status(403).json({ error: "No tienes permiso para ver estos canales." });
    }
    const channelsSnapshot = await groupRef.collection('channels').orderBy('name').get();
    const channels = channelsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(channels);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los canales." });
  }
});

app.get("/api/groups/:groupId/channels/:channelId/messages", authMiddleware, async (req, res) => {
  const { groupId, channelId } = req.params;
  const userId = req.user.uid;
  try {
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists || !groupDoc.data().members.includes(userId)) {
      return res.status(403).json({ error: "No tienes permiso para acceder a este canal." });
    }
    const messagesSnapshot = await db.collection('groups').doc(groupId).collection('channels').doc(channelId).collection('messages').orderBy('createdAt', 'asc').limit(50).get();
    const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate().toISOString() }));
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener mensajes." });
  }
});

app.post("/api/groups", authMiddleware, async (req, res) => {
  const { name } = req.body;
  const owner = req.user;
  if (!name || !name.trim()) return res.status(400).json({ error: "El nombre del grupo es inválido." });
  try {
    const newGroupRef = await db.collection('groups').add({ name: name.trim(), ownerId: owner.uid, members: [owner.uid] });
    await newGroupRef.collection('channels').add({ name: 'general', type: 'text' });
    const newGroupData = (await newGroupRef.get()).data();
    res.status(201).json({ id: newGroupRef.id, ...newGroupData });
  } catch (error) {
    res.status(500).json({ error: "No se pudo crear el grupo." });
  }
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[${new Date().toLocaleTimeString()}] Servidor escuchando en http://localhost:${PORT}`);
});