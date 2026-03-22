import type { Express, Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  SyncAuthRequest,
  UpdateProfileRequest,
  SaveKeysRequest,
} from '@rendezvous/shared';
import { auth, db } from '../config/firebaseAdmin.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import type { AuthenticatedRequest } from '../types/index.js';
import {
  syncAuthSchema,
  updateProfileSchema,
  saveKeysSchema,
  validateBody,
} from '../utils/validation.js';

export const authRoutes = (app: Express): void => {
  app.post('/api/auth/sync', validateBody(syncAuthSchema), async (req, res: Response) => {
    const { token } = req.body as SyncAuthRequest;
    try {
      const decodedToken = await auth.verifyIdToken(token);
      const { uid, name, email, picture } = decodedToken;
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        await userRef.set(
          {
            displayName: name || 'User',
            email,
            photoURL: picture || null,
            createdAt: FieldValue.serverTimestamp(),
            publicKey: null,
            wrappedPrivateKey: null,
            status: 'offline',
            lastSeen: null,
          },
          { merge: true }
        );
      } else {
        const existingData = userDoc.data();
        await userRef.update({
          displayName: name || (existingData?.displayName as string) || 'User',
          photoURL: picture || (existingData?.photoURL as string | null) || null,
        });
      }

      res.status(200).json({ status: 'success', uid });
    } catch (error) {
      console.error('[Auth] Sync error:', error);
      res.status(401).json({ error: 'Invalid token.' });
    }
  });

  app.put(
    '/api/users/profile',
    authMiddleware,
    validateBody(updateProfileSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      const { displayName, photoURL } = req.body as UpdateProfileRequest;
      const userId = req.user!.uid;

      try {
        await auth.updateUser(userId, {
          displayName,
          photoURL: photoURL || null,
        });

        await db.collection('users').doc(userId).update({
          displayName,
          photoURL: photoURL || null,
        });

        console.log(`[Profile] User ${userId} updated their profile.`);
        res.status(200).json({ success: true, message: 'Profile updated successfully.' });
      } catch (error) {
        console.error('[Profile] Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile.' });
      }
    }
  );

  app.delete('/api/users/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.uid;
    console.log(`[Account] Deletion requested for user ${userId}`);

    try {
      const batch = db.batch();

      const groupsSnapshot = await db
        .collection('groups')
        .where('members', 'array-contains', userId)
        .get();

      if (!groupsSnapshot.empty) {
        groupsSnapshot.forEach((doc) => {
          const groupRef = db.collection('groups').doc(doc.id);
          batch.update(groupRef, { members: FieldValue.arrayRemove(userId) });
        });
      }

      const userDocRef = db.collection('users').doc(userId);
      batch.delete(userDocRef);

      await batch.commit();
      await auth.deleteUser(userId);

      console.log(`[Account] User ${userId} deleted successfully.`);
      res.status(200).json({ success: true, message: 'Account deleted successfully.' });
    } catch (error) {
      console.error(`[Account] Error deleting account for ${userId}:`, error);
      res.status(500).json({ error: 'Failed to delete account. Please try again.' });
    }
  });

  app.get('/api/users/me/keys', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.uid;

    try {
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      const userData = userDoc.data();

      if (userData?.publicKey && userData?.wrappedPrivateKey) {
        res.status(200).json({
          publicKey: userData.publicKey as string,
          wrappedPrivateKey: userData.wrappedPrivateKey as string,
        });
        return;
      }

      res.status(404).json({ error: 'Encryption keys not found.' });
    } catch (error) {
      console.error(`[Keys] Error fetching keys for ${userId}:`, error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });

  app.post(
    '/api/users/me/keys',
    authMiddleware,
    validateBody(saveKeysSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      const { publicKey, wrappedPrivateKey } = req.body as SaveKeysRequest;

      try {
        await db.collection('users').doc(userId).set(
          {
            publicKey,
            wrappedPrivateKey,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        console.log(`[Keys] Saved encryption keys for user ${userId}`);
        res.status(200).json({
          success: true,
          message: 'Encryption keys saved successfully.',
        });
      } catch (error) {
        console.error(`[Keys] Error saving keys for ${userId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
      }
    }
  );
};
