import type { Express, Response } from 'express';
import { db } from '../config/firebaseAdmin.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { processUserDoc } from '../utils/userUtils.js';

export const contactRoutes = (app: Express): void => {
  app.get('/api/contacts', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.uid;
    try {
      const contactsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('contacts')
        .orderBy('lastActivity', 'desc')
        .get();

      if (contactsSnapshot.empty) {
        res.status(200).json([]);
        return;
      }

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
