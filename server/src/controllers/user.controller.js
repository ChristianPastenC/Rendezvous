// controllers/user.controller.js
const { auth, db } = require('../config/firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');
const { processUserDoc } = require('../utils/processUserDoc');

exports.updateUserProfile = async (req, res) => {
  const { displayName, photoURL } = req.body;
  const userId = req.user.uid;

  if (!displayName || !displayName.trim()) {
    return res.status(400).json({ error: "El nombre de usuario no puede estar vacío." });
  }
  try {
    await auth.updateUser(userId, { displayName: displayName.trim(), photoURL: photoURL || null });
    await db.collection('users').doc(userId).update({ displayName: displayName.trim(), photoURL: photoURL || null });
    console.log(`[Perfil] Usuario ${userId} actualizó su perfil.`);
    res.status(200).json({ success: true, message: "Perfil actualizado correctamente." });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ error: "No se pudo actualizar el perfil." });
  }
};

exports.deleteAccount = async (req, res) => {
  const userId = req.user.uid;
  console.log(`[Eliminación] Solicitud para eliminar usuario ${userId}`);
  try {
    const batch = db.batch();
    const groupsSnapshot = await db.collection('groups').where('members', 'array-contains', userId).get();
    if (!groupsSnapshot.empty) {
      groupsSnapshot.forEach(doc => {
        const groupRef = db.collection('groups').doc(doc.id);
        batch.update(groupRef, { members: FieldValue.arrayRemove(userId) });
      });
    }
    const userDocRef = db.collection('users').doc(userId);
    batch.delete(userDocRef);
    await batch.commit();
    await auth.deleteUser(userId);
    console.log(`[Eliminación] Usuario ${userId} eliminado exitosamente.`);
    res.status(200).json({ success: true, message: "Cuenta eliminada correctamente." });
  } catch (error) {
    console.error(`Error al eliminar la cuenta de ${userId}:`, error);
    res.status(500).json({ error: "No se pudo eliminar la cuenta." });
  }
};

exports.getUserPublicKey = async (req, res) => {
  const { uid } = req.params;
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || !userDoc.data().publicKey) {
      return res.status(404).json({ error: "Clave pública no encontrada." });
    }
    res.status(200).json({ publicKey: userDoc.data().publicKey });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

exports.searchUsers = async (req, res) => {
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
};

exports.getDmMessages = async (req, res) => {
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
};