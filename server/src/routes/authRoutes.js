const express = require('express');
const { auth, db } = require('../config/firebaseAdmin');
const { authMiddleware } = require('../middleware/authMiddleware');
const { FieldValue } = require('firebase-admin/firestore');

const authRoutes = (app) => {
  // Sync user with backend
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
          displayName: name || 'Usuario',
          email: email,
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
      res.status(401).json({ error: "Token invalido." });
    }
  });

  // Update user profile
  app.put("/api/users/profile", authMiddleware, async (req, res) => {
    const { displayName, photoURL } = req.body;
    const userId = req.user.uid;

    if (!displayName || !displayName.trim()) {
      return res.status(400).json({ error: "El nombre de usuario no puede estar vacio." });
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

      console.log(`[Perfil] Usuario ${userId} actualizo su perfil.`);
      res.status(200).json({ success: true, message: "Perfil actualizado correctamente." });

    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      res.status(500).json({ error: "No se pudo actualizar el perfil." });
    }
  });

  // Delete user account
  app.delete("/api/users/me", authMiddleware, async (req, res) => {
    const userId = req.user.uid;
    console.log(`[Eliminacion] Solicitud para eliminar usuario ${userId}`);

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
      res.status(500).json({ error: "No se pudo eliminar la cuenta. Por favor, intentalo de nuevo." });
    }
  });

  // Get user keys
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

  // Save user keys
  app.post("/api/users/me/keys", authMiddleware, async (req, res) => {
    const userId = req.user.uid;
    const { publicKey, wrappedPrivateKey } = req.body;

    if (!publicKey || !wrappedPrivateKey) {
      return res.status(400).json({
        error: 'Se requieren publicKey y wrappedPrivateKey'
      });
    }

    try {
      // Use set with merge: true to handle both creation and update of keys robustly
      await db.collection('users').doc(userId).set({
        publicKey,
        wrappedPrivateKey,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`[Keys] Claves guardadas/actualizadas para usuario ${userId}`);
      res.status(200).json({
        success: true,
        message: 'Claves guardadas correctamente'
      });
    } catch (error) {
      console.error(`[Keys] Error al guardar claves para ${userId}:`, error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
};

module.exports = authRoutes;