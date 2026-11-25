import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

/**
 * Resolves Firebase Admin credentials from environment variables or a local service account file.
 * Supports:
 * 1. Inline env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * 2. GOOGLE_APPLICATION_CREDENTIALS file path
 * 3. Fallback to ../../serviceAccountKey.json if present
 */
const initializeFirebaseAdmin = (): admin.app.App => {
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) as admin.ServiceAccount;
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const candidatePaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : null,
    path.resolve(__dirname, '../../serviceAccountKey.json'),
    path.resolve(__dirname, '../../../serviceAccountKey.json'),
    '/etc/secrets/serviceAccountKey.json',
  ].filter((p): p is string => Boolean(p));

  const credentialsPath = candidatePaths.find((candidate) => fs.existsSync(candidate));

  if (credentialsPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8')) as admin.ServiceAccount;
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  throw new Error(
    '[FirebaseAdmin] Missing credentials. Set FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY, FIREBASE_SERVICE_ACCOUNT, or GOOGLE_APPLICATION_CREDENTIALS.'
  );
};

initializeFirebaseAdmin();

export const auth = admin.auth();
export const db = admin.firestore();
export { admin };
