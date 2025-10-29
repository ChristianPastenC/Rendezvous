// src/lib/authService.js
const VITE_SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const API_BASE_URL = `${VITE_SERVER_URL}/api/auth`;

/**
 * Sync user firebase with backend
 * @param {import('firebase/auth').User} user - User obj from firebase
* @param {boolean} [forceRefresh=false] - 'true' in order to force the token refreshing 
* @returns {Promise<void>}
 */
export const syncUserWithBackend = async (user, forceRefresh = false) => {
  if (!user) return false;

  try {
    const token = await user.getIdToken(forceRefresh); 
    
    const response = await fetch(`${API_BASE_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('La sincronización con el backend falló.');
    }

    const data = await response.json();
    return true;
  } catch (error) {
    return false; 
  }
};