import { useState, useEffect, useCallback, useRef, type MutableRefObject } from 'react';
import type { User } from 'firebase/auth';
import type {
  Channel,
  ConversationItem,
  EncryptedMessage,
  Group,
  StatusUpdatePayload,
  UserProfile,
} from '@rendezvous/shared';
import type { TypedClientSocket } from '../lib/socket';
import { playSound } from '../lib/soundService';

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export const useConversations = (
  currentUser: User | null,
  socket: TypedClientSocket | null,
  messagesCache: MutableRefObject<Record<string, EncryptedMessage[]>>
) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const conversationsRef = useRef<ConversationItem[]>(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const initialFetchDone = useRef(false);

  const loadAllData = useCallback(async () => {
    if (!currentUser) return;

    initialFetchDone.current = false;
    setIsLoading(true);

    try {
      const token = await currentUser.getIdToken();
      const [groupsRes, contactsRes] = await Promise.all([
        fetch(`${API_URL}/api/groups`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!groupsRes.ok || !contactsRes.ok) {
        throw new Error(`API Error: Groups ${groupsRes.status}, Contacts ${contactsRes.status}`);
      }

      const groupsData = (await groupsRes.json()) as Group[];
      const contactsData = (await contactsRes.json()) as UserProfile[];

      const groupsWithChannels: Group[] = await Promise.all(
        groupsData.map(async (group) => {
          try {
            const channelsRes = await fetch(`${API_URL}/api/groups/${group.id}/channels`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!channelsRes.ok) {
              return { ...group, channelId: null };
            }

            const channels = (await channelsRes.json()) as Channel[];
            return {
              ...group,
              channelId: channels.length > 0 && channels[0] ? channels[0].id : null,
            };
          } catch {
            return { ...group, channelId: null };
          }
        })
      );

      const unifiedConversations: ConversationItem[] = [
        ...contactsData.map((contact): ConversationItem => ({
          id: `dm_${contact.uid}`,
          type: 'dm',
          name: contact.displayName,
          photoURL: contact.photoURL,
          userData: contact,
          lastMessage: null,
        })),
        ...groupsWithChannels.map((group): ConversationItem => ({
          id: `group_${group.id}`,
          type: 'group',
          name: group.name,
          groupData: group,
          lastMessage: null,
        })),
      ];

      setConversations(unifiedConversations);
    } catch (error) {
      console.error('[Conversations] Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (!currentUser || conversations.length === 0 || !messagesCache || isLoading) {
      return;
    }
    if (initialFetchDone.current) {
      return;
    }
    initialFetchDone.current = true;

    const fetchLastMessage = async (conv: ConversationItem): Promise<EncryptedMessage | null> => {
      let conversationId: string | null = null;
      let endpoint: string | null = null;
      const isDirectMessage = conv.type === 'dm';

      if (isDirectMessage && conv.userData) {
        conversationId = [currentUser.uid, conv.userData.uid].sort().join('_');
        endpoint = `/api/dms/${conversationId}/messages`;
      } else if (conv.groupData?.channelId) {
        conversationId = conv.groupData.channelId;
        endpoint = `/api/groups/${conv.groupData.id}/channels/${conversationId}/messages`;
      }

      if (!conversationId || !endpoint) return null;

      const cached = messagesCache.current[conversationId];
      if (cached) {
        return cached.length > 0 ? cached[cached.length - 1] ?? null : null;
      }

      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`${API_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const messagesData = response.ok
          ? ((await response.json()) as EncryptedMessage[])
          : [];
        messagesCache.current[conversationId] = messagesData;
        return messagesData.length > 0 ? messagesData[messagesData.length - 1] ?? null : null;
      } catch {
        return null;
      }
    };

    void Promise.all(conversations.map(fetchLastMessage)).then((allLastMessages) => {
      setConversations((prevConvs) =>
        prevConvs.map((conv, index) => {
          const fetchedLastMessage = allLastMessages[index];
          if (fetchedLastMessage && conv.lastMessage === null) {
            return { ...conv, lastMessage: fetchedLastMessage };
          }
          return conv;
        })
      );
    });
  }, [conversations, currentUser, messagesCache, isLoading]);

  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = ({
      uid,
      status,
      lastSeen,
      photoURL,
      displayName,
    }: StatusUpdatePayload) => {
      setConversations((prevConvs) =>
        prevConvs.map((conv) => {
          const isUserInConv =
            (conv.type === 'dm' && conv.userData?.uid === uid) ||
            (conv.type === 'group' && conv.groupData?.members?.includes(uid));

          if (!isUserInConv) return conv;

          if (conv.type === 'dm' && conv.userData) {
            const updatedUserData: UserProfile = {
              ...conv.userData,
              status: status ?? conv.userData.status,
              lastSeen: lastSeen !== undefined ? lastSeen : conv.userData.lastSeen,
              photoURL: photoURL !== undefined ? photoURL : conv.userData.photoURL,
              displayName: displayName !== undefined ? displayName : conv.userData.displayName,
            };
            return {
              ...conv,
              photoURL: photoURL !== undefined ? photoURL : conv.photoURL,
              name: displayName !== undefined ? displayName : conv.name,
              userData: updatedUserData,
            };
          }
          return conv;
        })
      );
    };

    socket.on('statusUpdate', handleStatusUpdate);
    return () => {
      socket.off('statusUpdate', handleStatusUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleNewMessage = (newMessage: EncryptedMessage) => {
      const { conversationId, groupId, authorInfo } = newMessage;

      if (authorInfo?.uid !== currentUser.uid) {
        playSound('messageReceived');

        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          const title = authorInfo.displayName || 'New Message';
          new Notification(title, {
            body: 'New encrypted message',
            icon: authorInfo.photoURL || '/default-avatar.png',
            tag: conversationId || groupId || undefined,
          });
        }
      }

      if (!conversationId) return;

      let targetConvId: string | null = null;
      if (groupId) {
        targetConvId = `group_${groupId}`;
      } else {
        const participants = conversationId.split('_');
        const otherUserId = participants.find((uid) => uid !== currentUser.uid);
        if (otherUserId) {
          targetConvId = `dm_${otherUserId}`;
        }
      }

      if (!targetConvId) return;

      setConversations((prevConvs) => {
        const convIndex = prevConvs.findIndex((c) => c.id === targetConvId);

        if (convIndex === -1) {
          if (!groupId) {
            const participants = conversationId.split('_');
            const otherUserId = participants.find((uid) => uid !== currentUser.uid);

            if (otherUserId) {
              void (async () => {
                try {
                  const token = await currentUser.getIdToken();
                  const res = await fetch(`${API_URL}/api/users/${otherUserId}/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (res.ok) {
                    const userProfile = (await res.json()) as UserProfile;
                    const newConv: ConversationItem = {
                      id: `dm_${userProfile.uid}`,
                      type: 'dm',
                      name: userProfile.displayName,
                      photoURL: userProfile.photoURL,
                      userData: userProfile,
                      lastMessage: newMessage,
                    };
                    setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
                  }
                } catch (error) {
                  console.error('[Conversations] Error creating DM conversation:', error);
                }
              })();
            }
          }
          return prevConvs;
        }

        const existing = prevConvs[convIndex]!;
        const convToUpdate: ConversationItem = { ...existing, lastMessage: newMessage };
        const otherConvs = prevConvs.filter((c) => c.id !== targetConvId);

        return [convToUpdate, ...otherConvs];
      });
    };

    socket.on('encryptedMessage', handleNewMessage);

    return () => {
      socket.off('encryptedMessage', handleNewMessage);
    };
  }, [socket, currentUser]);

  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleNewConversation = (newConv: ConversationItem) => {
      const convExists = conversationsRef.current.some((c) => c.id === newConv.id);
      if (!convExists) {
        setConversations((prevConvs) => [{ ...newConv, lastMessage: null }, ...prevConvs]);
      }
    };

    socket.on('newConversation', handleNewConversation);

    return () => {
      socket.off('newConversation', handleNewConversation);
    };
  }, [socket, currentUser]);

  useEffect(() => {
    if (!socket || conversations.length === 0) return;
    const userIdsToWatch = conversations
      .filter((c) => c.type === 'dm' && c.userData)
      .map((c) => c.userData!.uid);
    if (userIdsToWatch.length > 0) {
      socket.emit('subscribeToStatus', userIdsToWatch);
    }
  }, [socket, conversations]);

  return { conversations, setConversations, loadAllData, isLoading };
};
