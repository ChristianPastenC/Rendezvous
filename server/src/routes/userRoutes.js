const express = require('express');
const { db } = require('../config/firebaseAdmin');
const { authMiddleware } = require('../middleware/authMiddleware');
const { processUserDoc } = require('../utils/userUtils');

const userRoutes = (app) => {
  // Get user public key
  app.get("/api/users/:uid/key", authMiddleware, async (req, res) => {
    const { uid } = req.params;
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists || !userDoc.data().publicKey) {
        return res.status(404).json({ error: "Clave publica no encontrada para este usuario." });
      }
      res.status(200).json({ publicKey: userDoc.data().publicKey });
    } catch (error) {
      res.status(500).json({ error: "Error interno del servidor." });
    }
  });

  // Get user profile
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

  // Search users
  app.get("/api/users/search", authMiddleware, async (req, res) => {
    const { query } = req.query;
    const currentUserUid = req.user.uid;
    if (!query || query.trim().length < 3) {
      return res.status(400).json({ error: "La búsqueda requiere al menos 3 caracteres." });
    }
    try {
      const searchTerm = query.toLowerCase().trim();
      // Firestore queries for 'startsWith' for both email and displayName
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
      console.error("Error al buscar usuarios:", error);
      res.status(500).json({ error: "Error interno del servidor." });
    }
  });
};

module.exports = userRoutes;