import type { Response, NextFunction } from 'express';
import { auth } from '../config/firebaseAdmin.js';
import type { AuthenticatedRequest } from '../types/index.js';

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(403).json({ error: 'Unauthorized: Missing bearer token.' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    res.status(403).json({ error: 'Unauthorized: Missing bearer token.' });
    return;
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('[Auth] Failed to verify Firebase ID token:', error);
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};
