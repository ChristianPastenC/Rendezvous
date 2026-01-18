const { db } = require('../config/firebaseAdmin');
const { authMiddleware } = require('../middleware/authMiddleware');
const { processUserDoc } = require('../utils/userUtils');

const userRoutes = (app) => {
  // Search users by email or displayName (defined before parameterized :uid routes)
  app.get('/api/users/search', authMiddleware, async (req, res) => {
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    const currentUserUid = req.user.uid;

    if (query.length < 3) {
      return res.status(400).json({ error: 'Search query must be at least 3 characters.' });
    }

    try {
      const searchTerm = query.toLowerCase();
      const emailQuery = db
        .collection('users')
        .where('email', '>=', searchTerm)
        .where('email', '<=', `${searchTerm}\uf8ff`);
      const nameQuery = db
        .collection('users')
        .where('displayName', '>=', query)
        .where('displayName', '<=', `${query}\uf8ff`);

      const [emailSnapshot, nameSnapshot] = await Promise.all([emailQuery.get(), nameQuery.get()]);
      const usersMap = new Map();

      const processSnapshot = (snapshot) => {
        snapshot.docs.forEach((doc) => {
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
      console.error('[Users] Error searching users:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });

  // Get a user's public key
  app.get('/api/users/:uid/key', authMiddleware, async (req, res) => {
    const { uid } = req.params;
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists || !userDoc.data().publicKey) {
        return res.status(404).json({ error: 'Public key not found for this user.' });
      }
      res.status(200).json({ publicKey: userDoc.data().publicKey });
    } catch (error) {
      console.error(`[Users] Error fetching public key for ${uid}:`, error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });

  // Get a user's public profile
  app.get('/api/users/:uid/profile', authMiddleware, async (req, res) => {
    const { uid } = req.params;
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = processUserDoc(userDoc);
      if (!userData) {
        return res.status(404).json({ error: 'User not found.' });
      }
      res.status(200).json(userData);
    } catch (error) {
      console.error(`[Users] Error fetching profile for ${uid}:`, error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });
};

module.exports = userRoutes;
