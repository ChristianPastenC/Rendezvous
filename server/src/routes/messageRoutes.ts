import type { Express, Response } from 'express';
import type { CollectionReference, Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { db } from '../config/firebaseAdmin.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import type { AuthenticatedRequest } from '../types/index.js';

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;

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

const fetchPaginatedMessages = async (
  collectionRef: CollectionReference,
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const rawLimit = Number(req.query.limit);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), MAX_PAGE_LIMIT)
      : DEFAULT_PAGE_LIMIT;

  let query: Query = collectionRef.orderBy('createdAt', 'desc');

  const rawBefore = req.query.before;
  if (typeof rawBefore === 'string' && rawBefore.trim().length > 0) {
    const beforeDate = new Date(rawBefore);
    if (Number.isNaN(beforeDate.getTime())) {
      res.status(400).json({ error: 'Invalid "before" cursor timestamp.' });
      return;
    }
    query = query.where('createdAt', '<', beforeDate);
  }

  const snapshot = await query.limit(limit + 1).get();
  const hasMore = snapshot.docs.length > limit;
  const pageDocs = (hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs).reverse();

  res.setHeader('Access-Control-Expose-Headers', 'X-Has-More');
  res.setHeader('X-Has-More', hasMore ? 'true' : 'false');
  res.status(200).json(pageDocs.map(serializeMessage));
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
        const collectionRef = db
          .collection('groups')
          .doc(groupId)
          .collection('channels')
          .doc(channelId)
          .collection('messages');

        await fetchPaginatedMessages(collectionRef, req, res);
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
        const collectionRef = db
          .collection('directMessages')
          .doc(conversationId)
          .collection('messages');

        await fetchPaginatedMessages(collectionRef, req, res);
      } catch (error) {
        console.error('[Messages] Error fetching direct messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages.' });
      }
    }
  );
};
