const { db } = require('../config/firebaseAdmin');
const { authMiddleware } = require('../middleware/authMiddleware');

const serializeMessage = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt:
      data.createdAt && typeof data.createdAt.toDate === 'function'
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString(),
  };
};

const messageRoutes = (app) => {
  // Get group channel messages
  app.get('/api/groups/:groupId/channels/:channelId/messages', authMiddleware, async (req, res) => {
    const { groupId, channelId } = req.params;
    const userId = req.user.uid;
    try {
      const groupDoc = await db.collection('groups').doc(groupId).get();
      if (!groupDoc.exists || !groupDoc.data().members.includes(userId)) {
        return res.status(403).json({ error: 'You do not have permission to access this channel.' });
      }
      const messagesSnapshot = await db
        .collection('groups')
        .doc(groupId)
        .collection('channels')
        .doc(channelId)
        .collection('messages')
        .orderBy('createdAt', 'asc')
        .limit(50)
        .get();

      res.status(200).json(messagesSnapshot.docs.map(serializeMessage));
    } catch (error) {
      console.error('[Messages] Error fetching group channel messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages.' });
    }
  });

  // Get direct messages
  app.get('/api/dms/:conversationId/messages', authMiddleware, async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.uid;
    try {
      const participants = conversationId.split('_');
      if (!participants.includes(userId)) {
        return res.status(403).json({ error: 'You do not have permission to access this conversation.' });
      }
      const dmRef = db.collection('directMessages').doc(conversationId);
      const messagesSnapshot = await dmRef
        .collection('messages')
        .orderBy('createdAt', 'asc')
        .limit(50)
        .get();

      res.status(200).json(messagesSnapshot.docs.map(serializeMessage));
    } catch (error) {
      console.error('[Messages] Error fetching direct messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages.' });
    }
  });
};

module.exports = messageRoutes;
