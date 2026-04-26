import type { User } from 'firebase/auth';

const VITE_SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const API_BASE_URL = `${VITE_SERVER_URL}/api/auth`;

/**
 * Syncs the authenticated Firebase user with the backend Firestore database.
 */
export const syncUserWithBackend = async (
  user: User | null,
  forceRefresh = false
): Promise<boolean> => {
  if (!user) return false;

  try {
    const token = await user.getIdToken(forceRefresh);

    const response = await fetch(`${API_BASE_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('Backend synchronization failed.');
    }

    await response.json();
    return true;
  } catch {
    return false;
  }
};
