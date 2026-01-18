const { auth, db } = require('../config/firebaseAdmin');
const { authMiddleware } = require('../middleware/authMiddleware');
const { FieldValue } = require('firebase-admin/firestore');
const {
  syncAuthSchema,
  updateProfileSchema,
  saveKeysSchema,
  validateBody,
} = require('../utils/validation');

const authRoutes = (app) => {
  // Sync Firebase user with Firestore
  app.post('/api/auth/sync', validateBody(syncAuthSchema), async (req, res) => {
    const { token } = req.body;
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
        await userRef.update({
          displayName: name || userDoc.data().displayName || 'User',
          photoURL: picture || userDoc.data()?.photoURL || null,
        });
      }

      res.status(200).json({ status: 'success', uid });
    } catch (error) {
      console.error('[Auth] Sync error:', error);
      res.status(401).json({ error: 'Invalid token.' });
    }
  });

  // Update user profile
  app.put('/api/users/profile', authMiddleware, validateBody(updateProfileSchema), async (req, res) => {
    const { displayName, photoURL } = req.body;
    const userId = req.user.uid;

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
  });

  // Delete user account and clean up group memberships
  app.delete('/api/users/me', authMiddleware, async (req, res) => {
    const userId = req.user.uid;
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

  // Get current user's E2EE keys
  app.get('/api/users/me/keys', authMiddleware, async (req, res) => {
    const userId = req.user.uid;

    try {
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const userData = userDoc.data();

      if (userData.publicKey && userData.wrappedPrivateKey) {
        return res.status(200).json({
          publicKey: userData.publicKey,
          wrappedPrivateKey: userData.wrappedPrivateKey,
        });
      }

      return res.status(404).json({ error: 'Encryption keys not found.' });
    } catch (error) {
      console.error(`[Keys] Error fetching keys for ${userId}:`, error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });

  // Save or update current user's E2EE keys
  app.post('/api/users/me/keys', authMiddleware, validateBody(saveKeysSchema), async (req, res) => {
    const userId = req.user.uid;
    const { publicKey, wrappedPrivateKey } = req.body;

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
  });
};

module.exports = authRoutes;
