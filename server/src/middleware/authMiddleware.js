const { auth } = require('../config/firebaseAdmin');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Acceso no autorizado. Token no proporcionado.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error al verificar el token de Firebase:', error);
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

module.exports = { authMiddleware };