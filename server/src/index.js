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

const userSocketMap = {};

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
      await userRef.set({ displayName: name, email, photoURL: picture || null, createdAt: FieldValue.serverTimestamp(), publicKey: null }, { merge: true });
      await ensureDefaultGroup(uid);
    } else {
      await userRef.update({ displayName: name, photoURL: picture || (userDoc.data() && userDoc.data().photoURL) || null });
    }
    res.status(200).json({ status: "success", uid });
  } catch (error) {
    res.status(401).json({ error: "Token inválido." });
  }
});

// --- RUTA /api/contacts CORREGIDA Y SIMPLIFICADA ---
app.get("/api/contacts", authMiddleware, async (req, res) => {
  const userId = req.user.uid;
  try {
    const contactsSnapshot = await db.collection('users').doc(userId).collection('contacts').orderBy('lastActivity', 'desc').get();

    if (contactsSnapshot.empty) {
      return res.status(200).json([]); // Devuelve un array vacío si no hay contactos
    }

    // Mapear cada ID de contacto a una promesa que obtiene los datos del usuario
    const userPromises = contactsSnapshot.docs.map(doc =>
      db.collection('users').doc(doc.id).get()
    );

    // Esperar a que todas las promesas se resuelvan
    const userDocs = await Promise.all(userPromises);

    // Filtrar los que existen y mapear los datos
    const contactsData = userDocs
      .filter(doc => doc.exists)
      .map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));

    res.status(200).json(contactsData);
  } catch (error) {
    console.error("Error al obtener contactos:", error);
    res.status(500).json({ error: "Error al obtener contactos." });
  }
});


// --- RESTO DE LAS RUTAS (SIN CAMBIOS) ---
app.get("/api/users/:uid/key", authMiddleware, async (req, res) => {
  const { uid } = req.params;
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || !userDoc.data().publicKey) {
      return res.status(404).json({ error: "Clave pública no encontrada para este usuario." });
    }
    res.status(200).json({ publicKey: userDoc.data().publicKey });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
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

app.get("/api/dms/:conversationId/messages", authMiddleware, async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.uid;
  try {
    const participants = conversationId.split('_');
    if (!participants.includes(userId)) {
      return res.status(403).json({ error: "No tienes permiso para acceder a esta conversación." });
    }
    const dmRef = db.collection('directMessages').doc(conversationId);
    const messagesSnapshot = await dmRef.collection('messages').orderBy('createdAt', 'asc').limit(50).get();
    const messages = messagesSnapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, ...data, createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString() };
    });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener mensajes." });
  }
});

app.post("/api/groups", authMiddleware, async (req, res) => {
  const { name, memberIds = [] } = req.body;
  const owner = req.user;
  if (!name || !name.trim()) return res.status(400).json({ error: "El nombre del grupo es inválido." });
  try {
    const uniqueMemberIds = Array.from(new Set([owner.uid, ...memberIds.filter(id => id && id !== owner.uid)]));
    const newGroupRef = await db.collection('groups').add({ name: name.trim(), ownerId: owner.uid, members: uniqueMemberIds, createdAt: FieldValue.serverTimestamp() });
    await newGroupRef.collection('channels').add({ name: 'general', type: 'text' });
    const newGroupData = (await newGroupRef.get()).data();
    res.status(201).json({ id: newGroupRef.id, ...newGroupData });
  } catch (error) {
    res.status(500).json({ error: "No se pudo crear el grupo." });
  }
});

app.get("/api/groups/:groupId/members", authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.uid;
  try {
    const groupRef = db.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists || !groupDoc.data().members.includes(userId)) {
      return res.status(403).json({ error: "No tienes permiso para ver estos miembros." });
    }
    const memberIds = groupDoc.data().members || [];
    const membersPromises = memberIds.map(async (memberId) => {
      const userDoc = await db.collection('users').doc(memberId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        return { uid: memberId, displayName: userData.displayName || 'Usuario', photoURL: userData.photoURL || null, email: userData.email || null };
      }
      return null;
    });
    const members = (await Promise.all(membersPromises)).filter(m => m !== null);
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener miembros." });
  }
});

app.get("/api/users/search", authMiddleware, async (req, res) => {
  const { query } = req.query;
  const currentUserUid = req.user.uid;
  if (!query || query.trim().length < 3) {
    return res.status(400).json({ error: "La búsqueda requiere al menos 3 caracteres." });
  }
  try {
    const searchTerm = query.toLowerCase().trim();
    const emailQuery = db.collection('users').where('email', '>=', searchTerm).where('email', '<=', searchTerm + '\uf8ff');
    const nameQuery = db.collection('users').where('displayName', '>=', query).where('displayName', '<=', query + '\uf8ff');
    const [emailSnapshot, nameSnapshot] = await Promise.all([emailQuery.get(), nameQuery.get()]);
    const usersMap = new Map();
    emailSnapshot.docs.forEach(doc => { if (doc.id !== currentUserUid) { usersMap.set(doc.id, { uid: doc.id, ...doc.data() }); } });
    nameSnapshot.docs.forEach(doc => { if (doc.id !== currentUserUid) { usersMap.set(doc.id, { uid: doc.id, ...doc.data() }); } });
    res.status(200).json(Array.from(usersMap.values()));
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

app.post("/api/groups/:groupId/members", authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { userIdToAdd } = req.body;
  const requesterId = req.user.uid;

  if (!userIdToAdd) {
    return res.status(400).json({ error: "Se requiere el ID del usuario a agregar." });
  }

  try {
    const groupRef = db.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists || groupDoc.data().ownerId !== requesterId) {
      return res.status(403).json({ error: "No tienes permiso para añadir miembros a este grupo." });
    }

    await groupRef.update({
      members: FieldValue.arrayUnion(userIdToAdd)
    });

    res.status(200).json({ success: true, message: "Usuario añadido al grupo." });

  } catch (error) {
    console.error("Error al añadir miembro:", error);
    res.status(500).json({ error: "No se pudo añadir el miembro al grupo." });
  }
});

registerSocketHandlers(io, userSocketMap);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[${new Date().toLocaleTimeString()}] Servidor escuchando en http://localhost:${PORT}`);
});