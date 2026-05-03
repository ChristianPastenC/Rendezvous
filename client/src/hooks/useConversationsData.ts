import { useState, useEffect, useRef, useCallback, type MutableRefObject } from 'react';
import type { User } from 'firebase/auth';
import type { ConversationItem, EncryptedMessage, UserProfile } from '@rendezvous/shared';
import type { TypedClientSocket } from '../lib/socket';

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export const useConversationsData = (
  socket: TypedClientSocket | null,
  currentUser: User | null,
  selectedConversation: ConversationItem | null,
  messagesCache: MutableRefObject<Record<string, EncryptedMessage[]>>,
  membersCache: MutableRefObject<Record<string, UserProfile[]>>
) => {
  const [messages, setMessages] = useState<EncryptedMessage[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [forceRefetch, setForceRefetch] = useState(0);
  const previousConversationId = useRef<string | null>(null);

  const getCurrentConversationId = useCallback((): string | null => {
    if (!selectedConversation || !currentUser) return null;
    if (selectedConversation.type === 'dm' && selectedConversation.userData) {
      return [currentUser.uid, selectedConversation.userData.uid].sort().join('_');
    }
    return selectedConversation.groupData?.channelId ?? null;
  }, [selectedConversation, currentUser]);

  useEffect(() => {
    const conversationId = getCurrentConversationId();
    if (previousConversationId.current && previousConversationId.current !== conversationId) {
      socket?.emit('leaveChannel', {
        conversationId: previousConversationId.current,
      });
    }

    const loadConversation = async () => {
      if (!selectedConversation || !currentUser) {
        setMessages([]);
        setMembers([]);
        previousConversationId.current = null;
        return;
      }

      setIsLoadingMessages(true);
      const backendConversationId = getCurrentConversationId();
      if (!backendConversationId) {
        setIsLoadingMessages(false);
        return;
      }

      try {
        socket?.emit('joinChannel', { conversationId: backendConversationId });
        previousConversationId.current = backendConversationId;

        let membersToSet: UserProfile[] = [];
        const isDirectMessage = selectedConversation.type === 'dm';

        if (isDirectMessage && selectedConversation.userData) {
          const selfProfile: UserProfile = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'User',
            email: currentUser.email ?? undefined,
            photoURL: currentUser.photoURL,
            publicKey: null,
            status: 'online',
            lastSeen: null,
          };
          membersToSet = [selfProfile, selectedConversation.userData];
        } else if (selectedConversation.groupData) {
          const groupId = selectedConversation.groupData.id;
          const cachedMembers = membersCache.current[groupId];
          if (cachedMembers) {
            membersToSet = cachedMembers;
          } else {
            const token = await currentUser.getIdToken();
            const membersRes = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!membersRes.ok) throw new Error('Failed to load group members');
            membersToSet = (await membersRes.json()) as UserProfile[];
            membersCache.current[groupId] = membersToSet;
          }
          if (socket && membersToSet.length > 0) {
            socket.emit(
              'subscribeToStatus',
              membersToSet.map((m) => m.uid)
            );
          }
        }
        setMembers(membersToSet);

        const cachedMsgs = messagesCache.current[backendConversationId];
        if (cachedMsgs) {
          setMessages(cachedMsgs);
        } else {
          const token = await currentUser.getIdToken();
          const endpoint = isDirectMessage
            ? `/api/dms/${backendConversationId}/messages`
            : `/api/groups/${selectedConversation.groupData?.id}/channels/${backendConversationId}/messages`;

          const response = await fetch(`${API_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const messagesData = response.ok
            ? ((await response.json()) as EncryptedMessage[])
            : [];

          messagesCache.current[backendConversationId] = messagesData;
          setMessages(messagesData);
        }
      } catch {
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    void loadConversation();

    const handleNewMessage = (newMessage: EncryptedMessage) => {
      const messageConvId = newMessage.conversationId;
      if (!messageConvId) return;

      const currentCache = messagesCache.current[messageConvId] || [];
      if (!currentCache.some((msg) => msg.id === newMessage.id)) {
        messagesCache.current[messageConvId] = [...currentCache, newMessage];
      }

      if (messageConvId === getCurrentConversationId()) {
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    socket?.on('encryptedMessage', handleNewMessage);

    return () => {
      socket?.off('encryptedMessage', handleNewMessage);
    };
  }, [
    selectedConversation,
    currentUser,
    socket,
    messagesCache,
    membersCache,
    forceRefetch,
    getCurrentConversationId,
  ]);

  const refetchData = () => {
    const conversationId = getCurrentConversationId();
    if (conversationId) {
      delete messagesCache.current[conversationId];
    }
    if (selectedConversation?.type === 'group' && selectedConversation.groupData) {
      delete membersCache.current[selectedConversation.groupData.id];
    }
    setForceRefetch((c) => c + 1);
  };

  return { messages, members, isLoadingMessages, refetchData, getCurrentConversationId };
};
