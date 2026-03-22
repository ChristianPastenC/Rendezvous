import type { Express, Response } from 'express';
import type { QuerySnapshot } from 'firebase-admin/firestore';
import type { UserProfile } from '@rendezvous/shared';
import { db } from '../config/firebaseAdmin.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { processUserDoc } from '../utils/userUtils.js';

export const userRoutes = (app: Express): void => {
  app.get('/api/users/search', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    const currentUserUid = req.user!.uid;

    if (query.length < 3) {
      res.status(400).json({ error: 'Search query must be at least 3 characters.' });
      return;
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
      const usersMap = new Map<string, UserProfile>();

      const processSnapshot = (snapshot: QuerySnapshot) => {
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

  app.get('/api/users/:uid/key', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const uid = String(req.params.uid);
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      const publicKey = userDoc.data()?.publicKey as string | undefined;
      if (!userDoc.exists || !publicKey) {
        res.status(404).json({ error: 'Public key not found for this user.' });
        return;
      }
      res.status(200).json({ publicKey });
    } catch (error) {
      console.error(`[Users] Error fetching public key for ${uid}:`, error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });

  app.get('/api/users/:uid/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const uid = String(req.params.uid);
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = processUserDoc(userDoc);
      if (!userData) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      res.status(200).json(userData);
    } catch (error) {
      console.error(`[Users] Error fetching profile for ${uid}:`, error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });
};
