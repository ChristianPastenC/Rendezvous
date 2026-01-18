const { db } = require('../config/firebaseAdmin');
const { authMiddleware } = require('../middleware/authMiddleware');
const { FieldValue } = require('firebase-admin/firestore');
const { processUserDoc } = require('../utils/userUtils');
const { notifyUserOfNewConversation } = require('../utils/socketUtils');
const {
  createGroupSchema,
  addGroupMemberSchema,
  validateBody,
} = require('../utils/validation');

const groupRoutes = (app, io, userSocketMap) => {
  // Get groups the current user belongs to
  app.get('/api/groups', authMiddleware, async (req, res) => {
    const userId = req.user.uid;
    try {
      const groupsSnapshot = await db
        .collection('groups')
        .where('members', 'array-contains', userId)
        .get();
      const userGroups = groupsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.status(200).json(userGroups);
    } catch (error) {
      console.error('[Groups] Error fetching groups:', error);
      res.status(500).json({ error: 'Failed to fetch groups.' });
    }
  });

  // Get channels for a specific group
  app.get('/api/groups/:groupId/channels', authMiddleware, async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.uid;
    try {
      const groupRef = db.collection('groups').doc(groupId);
      const groupDoc = await groupRef.get();
      if (!groupDoc.exists || !groupDoc.data().members.includes(userId)) {
        return res.status(403).json({ error: 'You do not have permission to view these channels.' });
      }
      const channelsSnapshot = await groupRef.collection('channels').orderBy('name').get();
      const channels = channelsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.status(200).json(channels);
    } catch (error) {
      console.error('[Groups] Error fetching channels:', error);
      res.status(500).json({ error: 'Failed to fetch channels.' });
    }
  });

  // Create a new group with a default 'general' channel
  app.post('/api/groups', authMiddleware, validateBody(createGroupSchema), async (req, res) => {
    const { name, memberIds } = req.body;
    const owner = req.user;
    try {
      const uniqueMemberIds = Array.from(
        new Set([owner.uid, ...memberIds.filter((id) => id && id !== owner.uid)])
      );
      const newGroupRef = await db.collection('groups').add({
        name,
        ownerId: owner.uid,
        members: uniqueMemberIds,
        createdAt: FieldValue.serverTimestamp(),
      });
      await newGroupRef.collection('channels').add({ name: 'general', type: 'text' });
      const newGroupData = (await newGroupRef.get()).data();

      res.status(201).json({ id: newGroupRef.id, ...newGroupData });

      uniqueMemberIds.forEach((memberId) => {
        if (memberId !== owner.uid) {
          notifyUserOfNewConversation(memberId, newGroupRef, io, userSocketMap);
        }
      });
    } catch (error) {
      console.error('[Groups] Error creating group:', error);
      res.status(500).json({ error: 'Failed to create group.' });
    }
  });

  // Add a member to a group (owner only)
  app.post(
    '/api/groups/:groupId/members',
    authMiddleware,
    validateBody(addGroupMemberSchema),
    async (req, res) => {
      const { groupId } = req.params;
      const { userIdToAdd } = req.body;
      const requesterId = req.user.uid;

      try {
        const groupRef = db.collection('groups').doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists || groupDoc.data().ownerId !== requesterId) {
          return res.status(403).json({ error: 'You do not have permission to add members to this group.' });
        }

        if (groupDoc.data().members.includes(userIdToAdd)) {
          return res.status(409).json({ error: 'User is already a member of this group.' });
        }

        await groupRef.update({
          members: FieldValue.arrayUnion(userIdToAdd),
        });

        res.status(200).json({ success: true, message: 'User added to group.' });
        notifyUserOfNewConversation(userIdToAdd, groupRef, io, userSocketMap);
      } catch (error) {
        console.error('[Groups] Error adding member:', error);
        res.status(500).json({ error: 'Failed to add member to group.' });
      }
    }
  );

  // Get members of a group
  app.get('/api/groups/:groupId/members', authMiddleware, async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.uid;
    try {
      const groupRef = db.collection('groups').doc(groupId);
      const groupDoc = await groupRef.get();

      if (!groupDoc.exists || !groupDoc.data().members.includes(userId)) {
        return res.status(403).json({ error: 'You do not have permission to view these members.' });
      }

      const memberIds = groupDoc.data().members || [];
      const membersPromises = memberIds.map((id) => db.collection('users').doc(id).get());
      const memberDocs = await Promise.all(membersPromises);
      const members = memberDocs.map(processUserDoc).filter((m) => m !== null);

      res.status(200).json(members);
    } catch (error) {
      console.error('[Groups] Error fetching members:', error);
      res.status(500).json({ error: 'Failed to fetch members.' });
    }
  });
};

module.exports = groupRoutes;
