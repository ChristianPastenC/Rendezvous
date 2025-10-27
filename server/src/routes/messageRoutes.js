const express = require('express');
const { db } = require('../config/firebaseAdmin');
const { authMiddleware } = require('../middleware/authMiddleware');

const messageRoutes = (app) => {
  // Get group channel messages
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
      console.error("Error al obtener mensajes del canal de grupo:", error);
      res.status(500).json({ error: "Error al obtener mensajes." });
    }
  });

  // Get direct messages
  app.get("/api/dms/:conversationId/messages", authMiddleware, async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.uid;
    try {
      const participants = conversationId.split('_');
      if (!participants.includes(userId)) {
        return res.status(403).json({ error: "No tienes permiso para acceder a esta conversacion." });
      }
      const dmRef = db.collection('directMessages').doc(conversationId);
      const messagesSnapshot = await dmRef.collection('messages').orderBy('createdAt', 'asc').limit(50).get();
      const messages = messagesSnapshot.docs.map(doc => {
        const data = doc.data();
        // Ensure createdAt is a timestamp before calling toDate()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt && typeof data.createdAt.toDate === 'function'
            ? data.createdAt.toDate().toISOString()
            : new Date().toISOString() // Fallback if createdAt is missing or not a Timestamp
        };
      });
      res.status(200).json(messages);
    } catch (error) {
      console.error("Error al obtener mensajes directos:", error);
      res.status(500).json({ error: "Error al obtener mensajes." });
    }
  });
};

module.exports = messageRoutes;