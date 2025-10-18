// controllers/group.controller.js
const { db } = require('../config/firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');
const { processUserDoc } = require('../utils/processUserDoc');

exports.getUserGroups = async (req, res) => {
  const userId = req.user.uid;
  try {
    const groupsSnapshot = await db.collection('groups').where('members', 'array-contains', userId).get();
    const userGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(userGroups);
  } catch (error) {
    console.error("Error al obtener los grupos:", error);
    res.status(500).json({ error: "Error al obtener los grupos." });
  }
};

exports.createGroup = async (req, res) => {
  const { name, memberIds = [] } = req.body;
  const owner = req.user;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "El nombre del grupo es inválido." });
  }

  try {
    const uniqueMemberIds = Array.from(new Set([owner.uid, ...memberIds.filter(id => id && id !== owner.uid)]));

    const newGroupRef = await db.collection('groups').add({
      name: name.trim(),
      ownerId: owner.uid,
      members: uniqueMemberIds,
      createdAt: FieldValue.serverTimestamp()
    });

    await newGroupRef.collection('channels').add({ name: 'general', type: 'text' });

    const newGroupData = (await newGroupRef.get()).data();
    res.status(201).json({ id: newGroupRef.id, ...newGroupData });

  } catch (error) {
    console.error("Error al crear el grupo:", error);
    res.status(500).json({ error: "No se pudo crear el grupo." });
  }
};

exports.getGroupChannels = async (req, res) => {
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
    console.error(`Error al obtener canales para el grupo ${groupId}:`, error);
    res.status(500).json({ error: "Error al obtener los canales." });
  }
};

exports.getChannelMessages = async (req, res) => {
  const { groupId, channelId } = req.params;
  const userId = req.user.uid;
  try {
    const groupDoc = await db.collection('groups').doc(groupId).get();

    if (!groupDoc.exists || !groupDoc.data().members.includes(userId)) {
      return res.status(403).json({ error: "No tienes permiso para acceder a este canal." });
    }

    const messagesSnapshot = await db.collection('groups').doc(groupId)
      .collection('channels').doc(channelId)
      .collection('messages').orderBy('createdAt', 'asc').limit(50).get();

    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toISOString()
    }));

    res.status(200).json(messages);

  } catch (error) {
    console.error(`Error al obtener mensajes para el canal ${channelId}:`, error);
    res.status(500).json({ error: "Error al obtener mensajes." });
  }
};

exports.getGroupMembers = async (req, res) => {
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
    console.error(`Error al obtener miembros para el grupo ${groupId}:`, error);
    res.status(500).json({ error: "Error al obtener miembros." });
  }
};

exports.addMemberToGroup = async (req, res) => {
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
    console.error(`Error al añadir miembro ${userIdToAdd} al grupo ${groupId}:`, error);
    res.status(500).json({ error: "No se pudo añadir el miembro al grupo." });
  }
};