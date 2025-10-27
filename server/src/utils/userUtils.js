const processUserDoc = (doc) => {
  if (!doc.exists) return null;
  const data = doc.data();
  const lastSeenTimestamp = data.lastSeen;
  return {
    uid: doc.id,
    displayName: data.displayName || 'Usuario',
    email: data.email,
    photoURL: data.photoURL || null,
    publicKey: data.publicKey || null,
    status: data.status || 'offline',
    lastSeen: lastSeenTimestamp ? lastSeenTimestamp.toDate().toISOString() : null,
  };
};

module.exports = { processUserDoc };