import type { DocumentReference } from 'firebase-admin/firestore';
import type { Channel, Group } from '@rendezvous/shared';
import type { TypedServer, UserSocketMap } from '../types/index.js';

export const notifyUserOfNewConversation = async (
  userId: string,
  groupRef: DocumentReference,
  io: TypedServer,
  userSocketMap: UserSocketMap
): Promise<void> => {
  const socketId = userSocketMap[userId];
  if (!socketId) return;

  try {
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) return;

    const groupData = groupDoc.data() as Omit<Group, 'id'> | undefined;
    if (!groupData) return;

    const channelsSnapshot = await groupRef.collection('channels').get();
    const channels = channelsSnapshot.docs.map(
      (doc) => ({ id: doc.id, ...(doc.data() as Omit<Channel, 'id'>) })
    );

    io.to(socketId).emit('newConversation', {
      id: `group_${groupRef.id}`,
      type: 'group',
      name: groupData.name,
      groupData: {
        ...groupData,
        id: groupRef.id,
        channelId: channels.length > 0 && channels[0] ? channels[0].id : null,
      },
    });
    console.log(`[Socket] Emitted 'newConversation' (group) to ${userId}`);
  } catch (error) {
    console.error(`[Socket] Error notifying ${userId}:`, error);
  }
};
