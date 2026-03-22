import type { Express, Response } from 'express';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { db } from '../config/firebaseAdmin.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import type { AuthenticatedRequest } from '../types/index.js';

const serializeMessage = (doc: QueryDocumentSnapshot) => {
  const data = doc.data();
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  return {
    id: doc.id,
    ...data,
    createdAt:
      createdAt && typeof createdAt.toDate === 'function'
        ? createdAt.toDate().toISOString()
        : new Date().toISOString(),
  };
};

export const messageRoutes = (app: Express): void => {
  app.get(
    '/api/groups/:groupId/channels/:channelId/messages',
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      const groupId = String(req.params.groupId);
      const channelId = String(req.params.channelId);
      const userId = req.user!.uid;
      try {
        const groupDoc = await db.collection('groups').doc(groupId).get();
        const members = (groupDoc.data()?.members as string[] | undefined) || [];
        if (!groupDoc.exists || !members.includes(userId)) {
          res.status(403).json({ error: 'You do not have permission to access this channel.' });
          return;
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
    }
  );

  app.get(
    '/api/dms/:conversationId/messages',
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      const conversationId = String(req.params.conversationId);
      const userId = req.user!.uid;
      try {
        const participants = conversationId.split('_');
        if (!participants.includes(userId)) {
          res.status(403).json({ error: 'You do not have permission to access this conversation.' });
          return;
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
    }
  );
};
