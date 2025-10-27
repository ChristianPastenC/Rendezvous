const { db } = require('../config/firebaseAdmin');

const notifyUserOfNewConversation = async (userId, groupRef, io, userSocketMap) => {
  if (userSocketMap[userId]) {
    try {
      const groupDoc = await groupRef.get();
      if (!groupDoc.exists) return;

      const groupData = groupDoc.data();
      const channelsSnapshot = await groupRef.collection('channels').get();
      const channels = channelsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const payload = {
        id: `group_${groupRef.id}`,
        type: 'group',
        name: groupData.name,
        groupData: {
          ...groupData,
          id: groupRef.id,
          channelId: channels.length > 0 ? channels[0].id : null
        }
      };

      io.to(userSocketMap[userId]).emit('newConversation', payload);
      console.log(`[Socket] Emitiendo 'newConversation' (grupo) a ${userId}`);
    } catch (error) {
      console.error(`[Socket] Error al notificar a ${userId}:`, error);
    }
  }
};

module.exports = { notifyUserOfNewConversation };