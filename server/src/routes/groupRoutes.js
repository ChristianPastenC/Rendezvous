const express = require('express');
const { db } = require('../config/firebaseAdmin');
const { authMiddleware } = require('../middleware/authMiddleware');
const { FieldValue } = require('firebase-admin/firestore');
const { processUserDoc } = require('../utils/userUtils');
const { notifyUserOfNewConversation } = require('../utils/socketUtils');

const groupRoutes = (app, io, userSocketMap) => {
    // Get user groups
    app.get("/api/groups", authMiddleware, async (req, res) => {
        const userId = req.user.uid;
        try {
            const groupsSnapshot = await db.collection('groups').where('members', 'array-contains', userId).get();
            const userGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            res.status(200).json(userGroups);
        } catch (error) {
            console.error("Error al obtener los grupos:", error);
            res.status(500).json({ error: "Error al obtener los grupos." });
        }
    });

    // Get group channels
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
            console.error("Error al obtener los canales del grupo:", error);
            res.status(500).json({ error: "Error al obtener los canales." });
        }
    });

    // Create a new group
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

            // Notify members about the new conversation
            uniqueMemberIds.forEach(memberId => {
                if (memberId !== owner.uid) { // Owner already has it, or will fetch it
                    notifyUserOfNewConversation(memberId, newGroupRef, io, userSocketMap);
                }
            });

        } catch (error) {
            console.error("Error al crear el grupo:", error);
            res.status(500).json({ error: "No se pudo crear el grupo." });
        }
    });

    // Add member to group
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

            // Notify the newly added user about the group
            notifyUserOfNewConversation(userIdToAdd, groupRef, io, userSocketMap);

        } catch (error) {
            console.error("Error al añadir miembro:", error);
            res.status(500).json({ error: "No se pudo añadir el miembro al grupo." });
        }
    });

    // Get group members
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
};

module.exports = groupRoutes;