// controllers/auth.controller.js
const { auth, db } = require('../config/firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');

const syncUser = async (req, res) => {
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
        status: 'offline',
        lastSeen: null
      }, { merge: true });
    } else {
      await userRef.update({ displayName: name, photoURL: picture || (userDoc.data()?.photoURL) || null });
    }
    res.status(200).json({ status: "success", uid });
  } catch (error) {
    res.status(401).json({ error: "Token inválido." });
  }
};

module.exports = { syncUser };