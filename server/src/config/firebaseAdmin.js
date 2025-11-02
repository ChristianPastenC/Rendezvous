const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

/**
 * Resolves Firebase Admin credentials from environment variables or a local service account file.
 * Supports:
 * 1. Inline env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * 2. GOOGLE_APPLICATION_CREDENTIALS file path
 * 3. Fallback to ../../serviceAccountKey.json if present
 */
const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : path.resolve(__dirname, '../../serviceAccountKey.json');

  if (fs.existsSync(credentialsPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  throw new Error(
    '[FirebaseAdmin] Missing credentials. Set FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS.'
  );
};

initializeFirebaseAdmin();

const auth = admin.auth();
const db = admin.firestore();

module.exports = { admin, auth, db };
