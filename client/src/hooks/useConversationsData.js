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
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      const messageConvId = newMessage.conversationId;
      if (!messageConvId) {
        console.error("Mensaje recibido sin conversationId:", newMessage);
        return;
      }

      const currentCache = messagesCache.current[messageConvId] || [];
      const messageExists = currentCache.some(msg => msg.id === newMessage.id);

      if (!messageExists) {
        const updatedCache = [...currentCache, newMessage];
        messagesCache.current[messageConvId] = updatedCache;

        const activeConversationId = getCurrentConversationId();
        if (messageConvId === activeConversationId) {
          setMessages(updatedCache);
        }
      }
    };

    socket.on('encryptedMessage', handleNewMessage);

    return () => {
      socket.off('encryptedMessage', handleNewMessage);
    };

  }, [socket, messagesCache, getCurrentConversationId]);

  useEffect(() => {
    const conversationId = getCurrentConversationId();
    if (previousConversationId.current && previousConversationId.current !== conversationId) {
      socket?.emit('leaveChannel', {
        conversationId: previousConversationId.current,
      });
    }

    const loadConversation = async () => {
      if (!conversationId) {
        setMessages([]);
        setMembers([]);
        previousConversationId.current = null;
        return;
      }

      setIsLoadingMessages(true);

      socket?.emit('joinChannel', { conversationId });
      previousConversationId.current = conversationId;

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
          membersToSet = await membersRes.json();
          membersCache.current[groupId] = membersToSet;
        }
        if (socket && membersToSet.length > 0) {
          socket.emit('subscribeToStatus', membersToSet.map((m) => m.uid));
        }
      }
      setMembers(membersToSet);

      if (messagesCache.current[conversationId]) {
        setMessages(messagesCache.current[conversationId]);
      } else {
        const token = await currentUser.getIdToken();
        const endpoint = isDirectMessage
          ? `/api/dms/${conversationId}/messages`
          : `/api/groups/${selectedConversation.groupData.id}/channels/${conversationId}/messages`;
        const response = await fetch(`http://localhost:3000${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const messagesData = response.ok ? await response.json() : [];
        messagesCache.current[conversationId] = messagesData;
        setMessages(messagesData);
      }
      setIsLoadingMessages(false);
    };

    loadConversation();

  }, [
    selectedConversation,
    currentUser,
    socket,
    messagesCache,
    membersCache,
    forceRefetch,
    getCurrentConversationId
  ]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      const messageConvId = newMessage.conversationId;
      if (!messageConvId) {
        console.error("Mensaje recibido sin conversationId:", newMessage);
        return;
      }

      const currentCache = messagesCache.current[messageConvId] || [];
      const messageExistsInCache = currentCache.some(msg => msg.id === newMessage.id);

      if (!messageExistsInCache) {
        messagesCache.current[messageConvId] = [...currentCache, newMessage];
      }

      const activeConversationId = getCurrentConversationId();
      if (messageConvId === activeConversationId) {

        setMessages(prevMessages => {
          const messageExistsInState = prevMessages.some(msg => msg.id === newMessage.id);

          if (!messageExistsInState) {
            return [...prevMessages, newMessage];
          }

          return prevMessages;
        });
      }
    };

    socket.on('encryptedMessage', handleNewMessage);

    return () => {
      socket.off('encryptedMessage', handleNewMessage);
    };

  }, [socket, messagesCache, getCurrentConversationId, setMessages]);

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