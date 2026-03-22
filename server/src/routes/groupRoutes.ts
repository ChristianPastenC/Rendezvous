import type { Express, Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import type { CreateGroupRequest, AddGroupMemberRequest } from '@rendezvous/shared';
import { db } from '../config/firebaseAdmin.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import type { AuthenticatedRequest, TypedServer, UserSocketMap } from '../types/index.js';
import { processUserDoc } from '../utils/userUtils.js';
import { notifyUserOfNewConversation } from '../utils/socketUtils.js';
import {
  createGroupSchema,
  addGroupMemberSchema,
  validateBody,
} from '../utils/validation.js';

export const groupRoutes = (
  app: Express,
  io: TypedServer,
  userSocketMap: UserSocketMap
): void => {
  app.get('/api/groups', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.uid;
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

  app.get(
    '/api/groups/:groupId/channels',
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      const groupId = String(req.params.groupId);
      const userId = req.user!.uid;
      try {
        const groupRef = db.collection('groups').doc(groupId);
        const groupDoc = await groupRef.get();
        const members = (groupDoc.data()?.members as string[] | undefined) || [];
        if (!groupDoc.exists || !members.includes(userId)) {
          res.status(403).json({ error: 'You do not have permission to view these channels.' });
          return;
        }
        const channelsSnapshot = await groupRef.collection('channels').orderBy('name').get();
        const channels = channelsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(channels);
      } catch (error) {
        console.error('[Groups] Error fetching channels:', error);
        res.status(500).json({ error: 'Failed to fetch channels.' });
      }
    }
  );

  app.post(
    '/api/groups',
    authMiddleware,
    validateBody(createGroupSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      const { name, memberIds = [] } = req.body as CreateGroupRequest;
      const owner = req.user!;
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
            void notifyUserOfNewConversation(memberId, newGroupRef, io, userSocketMap);
          }
        });
      } catch (error) {
        console.error('[Groups] Error creating group:', error);
        res.status(500).json({ error: 'Failed to create group.' });
      }
    }
  );

  app.post(
    '/api/groups/:groupId/members',
    authMiddleware,
    validateBody(addGroupMemberSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      const groupId = String(req.params.groupId);
      const { userIdToAdd } = req.body as AddGroupMemberRequest;
      const requesterId = req.user!.uid;

      try {
        const groupRef = db.collection('groups').doc(groupId);
        const groupDoc = await groupRef.get();
        const groupData = groupDoc.data();

        if (!groupDoc.exists || groupData?.ownerId !== requesterId) {
          res.status(403).json({ error: 'You do not have permission to add members to this group.' });
          return;
        }

        const members = (groupData?.members as string[] | undefined) || [];
        if (members.includes(userIdToAdd)) {
          res.status(409).json({ error: 'User is already a member of this group.' });
          return;
        }

        await groupRef.update({
          members: FieldValue.arrayUnion(userIdToAdd),
        });

        res.status(200).json({ success: true, message: 'User added to group.' });
        void notifyUserOfNewConversation(userIdToAdd, groupRef, io, userSocketMap);
      } catch (error) {
        console.error('[Groups] Error adding member:', error);
        res.status(500).json({ error: 'Failed to add member to group.' });
      }
    }
  );

  app.get(
    '/api/groups/:groupId/members',
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      const groupId = String(req.params.groupId);
      const userId = req.user!.uid;
      try {
        const groupRef = db.collection('groups').doc(groupId);
        const groupDoc = await groupRef.get();
        const memberIds = (groupDoc.data()?.members as string[] | undefined) || [];

        if (!groupDoc.exists || !memberIds.includes(userId)) {
          res.status(403).json({ error: 'You do not have permission to view these members.' });
          return;
        }

        const membersPromises = memberIds.map((id) => db.collection('users').doc(id).get());
        const memberDocs = await Promise.all(membersPromises);
        const members = memberDocs.map(processUserDoc).filter((m) => m !== null);

        res.status(200).json(members);
      } catch (error) {
        console.error('[Groups] Error fetching members:', error);
        res.status(500).json({ error: 'Failed to fetch members.' });
      }
    }
  );
};
