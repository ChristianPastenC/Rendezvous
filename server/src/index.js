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

const processUserDoc = (doc) => {
  if (!doc.exists) return null;
  const data = doc.data();
  const lastSeenTimestamp = data.lastSeen;
  return {
    uid: doc.id,
    displayName: data.displayName || 'Usuario',
    email: data.email,
    photoURL: data.photoURL || null,
    publicKey: data.publicKey || null,
    status: data.status || 'offline',
    lastSeen: lastSeenTimestamp ? lastSeenTimestamp.toDate().toISOString() : null,
  };
};

const notifyUserOfNewConversation = async (userId, groupRef, io, userSocketMap) => {
  if (userSocketMap[userId]) {
    try {
      const groupDoc = await groupRef.get();
      if (!groupDoc.exists) return;

      const groupData = groupDoc.data();
      const channelsSnapshot = await groupRef.collection('channels').get();
      const channels = channelsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const payload = {
        id: `group_${groupRef.id}`,
        type: 'group',
        name: groupData.name,
        groupData: {
          ...groupData,
          id: groupRef.id,
          channelId: channels.length > 0 ? channels[0].id : null
        }
      };

      io.to(userSocketMap[userId]).emit('newConversation', payload);
      console.log(`[Socket] Emitiendo 'newConversation' (grupo) a ${userId}`);
    } catch (error) {
      console.error(`[Socket] Error al notificar a ${userId}:`, error);
    }
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
      await userRef.set({
        displayName: name,
        email,
        photoURL: picture || null,
        createdAt: FieldValue.serverTimestamp(),
        publicKey: null,
        wrappedPrivateKey: null,
        status: 'offline',
        lastSeen: null
      }, { merge: true });
    } else {
      await userRef.update({
        displayName: name,
        photoURL: picture || (userDoc.data() && userDoc.data().photoURL) || null
      });
    }
    res.status(200).json({ status: "success", uid });
  } catch (error) {
    res.status(401).json({ error: "Token inválido." });
  }
});

app.put("/api/users/profile", authMiddleware, async (req, res) => {
  const { displayName, photoURL } = req.body;
  const userId = req.user.uid;

  if (!displayName || !displayName.trim()) {
    return res.status(400).json({ error: "El nombre de usuario no puede estar vacío." });
  }

  try {
    await auth.updateUser(userId, {
      displayName: displayName.trim(),
      photoURL: photoURL || null,
    });

    await db.collection('users').doc(userId).update({
      displayName: displayName.trim(),
      photoURL: photoURL || null,
    });

    console.log(`[Perfil] Usuario ${userId} actualizó su perfil.`);
    res.status(200).json({ success: true, message: "Perfil actualizado correctamente." });

  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ error: "No se pudo actualizar el perfil." });
  }
});

app.delete("/api/users/me", authMiddleware, async (req, res) => {
  const userId = req.user.uid;
  console.log(`[Eliminación] Solicitud para eliminar usuario ${userId}`);

  try {
    const batch = db.batch();

    const groupsSnapshot = await db.collection('groups').where('members', 'array-contains', userId).get();
    if (!groupsSnapshot.empty) {
      groupsSnapshot.forEach(doc => {
        console.log(`[Eliminación] Quitando a ${userId} del grupo ${doc.id}`);
        const groupRef = db.collection('groups').doc(doc.id);
        batch.update(groupRef, { members: FieldValue.arrayRemove(userId) });
      });
    }

    const userDocRef = db.collection('users').doc(userId);
    batch.delete(userDocRef);
    console.log(`[Eliminación] Documento de Firestore para ${userId} marcado para borrado.`);

    await batch.commit();
    console.log(`[Eliminación] Limpieza de Firestore completada para ${userId}.`);

    await auth.deleteUser(userId);
    console.log(`[Eliminación] Usuario ${userId} eliminado de Firebase Auth exitosamente.`);

    res.status(200).json({ success: true, message: "Cuenta eliminada correctamente." });

  } catch (error) {
    console.error(`Error al eliminar la cuenta de ${userId}:`, error);
    res.status(500).json({ error: "No se pudo eliminar la cuenta. Por favor, inténtalo de nuevo." });
  }
});

app.get("/api/users/me/keys", authMiddleware, async (req, res) => {
  const userId = req.user.uid;

  try {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userData = userDoc.data();

    if (userData.publicKey && userData.wrappedPrivateKey) {
      console.log(`[Keys] Claves recuperadas para usuario ${userId}`);
      return res.status(200).json({
        publicKey: userData.publicKey,
        wrappedPrivateKey: userData.wrappedPrivateKey
      });
    }

    console.log(`[Keys] Usuario ${userId} no tiene claves generadas`);
    return res.status(404).json({ error: 'Claves no encontradas' });
  } catch (error) {
    console.error(`[Keys] Error al obtener claves para ${userId}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post("/api/users/me/keys", authMiddleware, async (req, res) => {
  const userId = req.user.uid;
  const { publicKey, wrappedPrivateKey } = req.body;

  if (!publicKey || !wrappedPrivateKey) {
    return res.status(400).json({
      error: 'Se requieren publicKey y wrappedPrivateKey'
    });
  }

  try {
    await db.collection('users').doc(userId).update({
      publicKey,
      wrappedPrivateKey,
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log(`[Keys] Claves guardadas/actualizadas para usuario ${userId}`);
    res.status(200).json({
      success: true,
      message: 'Claves guardadas correctamente'
    });
  } catch (error) {
    console.error(`[Keys] Error al guardar claves para ${userId}:`, error);

    if (error.code === 5) {
      try {
        await db.collection('users').doc(userId).set({
          publicKey,
          wrappedPrivateKey,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`[Keys] Usuario ${userId} creado con claves`);
        return res.status(200).json({
          success: true,
          message: 'Claves guardadas correctamente'
        });
      } catch (createError) {
        console.error(`[Keys] Error al crear usuario ${userId}:`, createError);
        return res.status(500).json({ error: 'Error al crear usuario' });
      }
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get("/api/contacts", authMiddleware, async (req, res) => {
  const userId = req.user.uid;
  try {
    const contactsSnapshot = await db.collection('users').doc(userId).collection('contacts').orderBy('lastActivity', 'desc').get();
    if (contactsSnapshot.empty) return res.status(200).json([]);

    const userPromises = contactsSnapshot.docs.map(doc => db.collection('users').doc(doc.id).get());
    const userDocs = await Promise.all(userPromises);

    const contactsData = userDocs
      .map(processUserDoc)
      .filter(u => u !== null);

    res.status(200).json(contactsData);
  } catch (error) {
    console.error("Error al obtener contactos:", error);
    res.status(500).json({ error: "Error al obtener contactos." });
  }
});

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

app.get("/api/users/:uid/profile", authMiddleware, async (req, res) => {
  const { uid } = req.params;
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = processUserDoc(userDoc);
    if (!userData) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }
    res.status(200).json(userData);
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

    uniqueMemberIds.forEach(memberId => {
      if (memberId !== owner.uid) {
        notifyUserOfNewConversation(memberId, newGroupRef, io, userSocketMap);
      }
    });

  } catch (error) {
    res.status(500).json({ error: "No se pudo crear el grupo." });
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

    if (groupDoc.data().members.includes(userIdToAdd)) {
      return res.status(409).json({ error: "El usuario ya es miembro de este grupo." });
    }

    await groupRef.update({
      members: FieldValue.arrayUnion(userIdToAdd)
    });

    res.status(200).json({ success: true, message: "Usuario añadido al grupo." });

    notifyUserOfNewConversation(userIdToAdd, groupRef, io, userSocketMap);

  } catch (error) {
    console.error("Error al añadir miembro:", error);
    res.status(500).json({ error: "No se pudo añadir el miembro al grupo." });
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
    const processSnapshot = (snapshot) => {
      snapshot.docs.forEach(doc => {
        if (doc.id !== currentUserUid) {
          const userData = processUserDoc(doc);
          if (userData) usersMap.set(doc.id, userData);
        }
      });
    };
    processSnapshot(emailSnapshot);
    processSnapshot(nameSnapshot);
    res.status(200).json(Array.from(usersMap.values()));
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
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
    const membersPromises = memberIds.map(id => db.collection('users').doc(id).get());
    const memberDocs = await Promise.all(membersPromises);
    const members = memberDocs.map(processUserDoc).filter(m => m !== null);

    res.status(200).json(members);

  } catch (error) {
    console.error("Error al obtener miembros:", error);
    res.status(500).json({ error: "Error al obtener miembros." });
  }
});

registerSocketHandlers(io, userSocketMap);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[${new Date().toLocaleTimeString()}] Servidor escuchando en http://localhost:${PORT}`);
});