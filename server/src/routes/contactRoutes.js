const { db } = require('../config/firebaseAdmin');
const { authMiddleware } = require('../middleware/authMiddleware');
const { processUserDoc } = require('../utils/userUtils');

const contactRoutes = (app) => {
  // Get user contacts ordered by last activity
  app.get('/api/contacts', authMiddleware, async (req, res) => {
    const userId = req.user.uid;
    try {
      const contactsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('contacts')
        .orderBy('lastActivity', 'desc')
        .get();

      if (contactsSnapshot.empty) return res.status(200).json([]);

      const userPromises = contactsSnapshot.docs.map((doc) =>
        db.collection('users').doc(doc.id).get()
      );
      const userDocs = await Promise.all(userPromises);

      const contactsData = userDocs.map(processUserDoc).filter((u) => u !== null);
      res.status(200).json(contactsData);
    } catch (error) {
      console.error('[Contacts] Error fetching contacts:', error);
      res.status(500).json({ error: 'Failed to fetch contacts.' });
    }
  });
};

module.exports = contactRoutes;
