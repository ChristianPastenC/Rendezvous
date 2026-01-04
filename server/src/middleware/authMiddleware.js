const { auth } = require('../config/firebaseAdmin');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Unauthorized: Missing bearer token.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('[Auth] Failed to verify Firebase ID token:', error);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = { authMiddleware };
