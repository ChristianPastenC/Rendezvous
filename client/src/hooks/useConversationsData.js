// src/hooks/useConversationsData.js
import { useState, useEffect, useRef, useCallback } from 'react';

export const useConversationsData = (
  socket,
  currentUser,
  selectedConversation,
  messagesCache,
  membersCache
) => {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [forceRefetch, setForceRefetch] = useState(0);
  const previousConversationId = useRef(null);

  const getCurrentConversationId = useCallback(() => {
    if (!selectedConversation || !currentUser) return null;
    if (selectedConversation.type === 'dm') {
      return [currentUser.uid, selectedConversation.userData.uid]
        .sort()
        .join('_');
    }
    return selectedConversation.groupData?.channelId;
  }, [selectedConversation, currentUser]);

  useEffect(() => {
    const conversationId = getCurrentConversationId();
    if (previousConversationId.current && previousConversationId.current !== conversationId) {
      socket?.emit('leaveChannel', {
        conversationId: previousConversationId.current,
      });
    }

    const updateConversationListFromCache = (messagesData) => {
      if (messagesData.length > 0 && selectedConversation) {
        const lastMessage = messagesData[messagesData.length - 1];
      }
    };

    const loadConversation = async () => {
      if (!selectedConversation) {
        setMessages([]);
        setMembers([]);
        previousConversationId.current = null;
        return;
      }

      setIsLoadingMessages(true);
      const backendConversationId = getCurrentConversationId();

      try {
        socket?.emit('joinChannel', { conversationId: backendConversationId });
        previousConversationId.current = backendConversationId;

        let membersToSet = [];
        let isDirectMessage = selectedConversation.type === 'dm';

        if (isDirectMessage) {
          membersToSet = [currentUser, selectedConversation.userData];
        } else {
          const groupId = selectedConversation.groupData.id;
          if (membersCache.current[groupId]) {
            membersToSet = membersCache.current[groupId];
          } else {
            const token = await currentUser.getIdToken();
            const membersRes = await fetch(
              `http://localhost:3000/api/groups/${groupId}/members`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            if (!membersRes.ok) throw new Error('Error al cargar miembros');
            membersToSet = await membersRes.json();
            membersCache.current[groupId] = membersToSet;
          }
          if (socket && membersToSet.length > 0) {
            socket.emit('subscribeToStatus', membersToSet.map((m) => m.uid));
          }
        }
        setMembers(membersToSet);

        if (messagesCache.current[backendConversationId]) {
          const messagesData = messagesCache.current[backendConversationId];
          setMessages(messagesData);
          updateConversationListFromCache(messagesData);
        } else {
          const token = await currentUser.getIdToken();
          const endpoint = isDirectMessage
            ? `/api/dms/${backendConversationId}/messages`
            : `/api/groups/${selectedConversation.groupData.id}/channels/${backendConversationId}/messages`;

          const response = await fetch(`http://localhost:3000${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const messagesData = response.ok ? await response.json() : [];

          messagesCache.current[backendConversationId] = messagesData;
          setMessages(messagesData);
          updateConversationListFromCache(messagesData);
        }

      } catch (error) {
        console.error("Error al cargar la conversación:", error);
        setMessages([]);

      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadConversation();

    const handleNewMessage = (newMessage) => {
      const messageConvId = newMessage.conversationId;
      if (!messageConvId) return;

      const currentCache = messagesCache.current[messageConvId] || [];
      if (!currentCache.some(msg => msg.id === newMessage.id)) {
        messagesCache.current[messageConvId] = [...currentCache, newMessage];
      }

      if (messageConvId === getCurrentConversationId()) {
        setMessages(prev => [...prev, newMessage]);
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
    if (selectedConversation?.type === 'group') {
      const groupId = selectedConversation.groupData.id;
      delete membersCache.current[groupId];
    }
    setForceRefetch((c) => c + 1);
  };

  return { messages, members, isLoadingMessages, refetchData, getCurrentConversationId };
};