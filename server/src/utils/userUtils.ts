import type { DocumentSnapshot } from 'firebase-admin/firestore';
import type { UserProfile } from '@rendezvous/shared';

export const processUserDoc = (doc: DocumentSnapshot): UserProfile | null => {
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data) return null;

  const lastSeenTimestamp = data.lastSeen as { toDate?: () => Date } | null | undefined;
  return {
    uid: doc.id,
    displayName: (data.displayName as string) || 'User',
    email: data.email as string | undefined,
    photoURL: (data.photoURL as string) || null,
    publicKey: (data.publicKey as string) || null,
    status: data.status === 'online' ? 'online' : 'offline',
    lastSeen:
      lastSeenTimestamp && typeof lastSeenTimestamp.toDate === 'function'
        ? lastSeenTimestamp.toDate().toISOString()
        : null,
  };
};
