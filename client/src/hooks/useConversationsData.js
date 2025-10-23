// src/hooks/useConversationsData.js
import { useState, useEffect, useRef } from 'react';

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

  const getCurrentConversationId = () => {
    if (!selectedConversation || !currentUser) return null;
    if (selectedConversation.type === 'dm') {
      return [currentUser.uid, selectedConversation.userData.uid]
        .sort()
        .join('_');
    }
    return selectedConversation.groupData?.channelId;
  };

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      const conversationId = getCurrentConversationId();
      if (!conversationId) return;

      const currentCache = messagesCache.current[conversationId] || [];

      // Verificar si el mensaje ya existe en el cache
      const messageExists = currentCache.some(msg => msg.id === newMessage.id);

      if (!messageExists) {
        const updatedCache = [...currentCache, newMessage];
        messagesCache.current[conversationId] = updatedCache;

        if (conversationId === previousConversationId.current) {
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
    const loadConversation = async () => {
      if (!selectedConversation || !currentUser) {
        setMessages([]);
        setMembers([]);
        return;
      }
      setIsLoadingMessages(true);

      let conversationId,
        membersToSet = [];
      let isDirectMessage = selectedConversation.type === 'dm';

      if (isDirectMessage) {
        conversationId = [
          currentUser.uid,
          selectedConversation.userData.uid,
        ]
          .sort()
          .join('_');
        membersToSet = [currentUser, selectedConversation.userData];
      } else {
        const groupId = selectedConversation.groupData.id;
        let channelId = selectedConversation.groupData.channelId;

        if (!channelId) {
          const token = await currentUser.getIdToken();
          const channelsRes = await fetch(
            `http://localhost:3000/api/groups/${groupId}/channels`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const channelsData = await channelsRes.json();
          if (channelsData.length > 0) {
            channelId = channelsData[0].id;
            selectedConversation.groupData.channelId = channelId;
          }
        }
        conversationId = channelId;

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
          const memberIds = membersToSet.map((m) => m.uid);
          socket.emit('subscribeToStatus', memberIds);
        }
      }

      setMembers(membersToSet);

      if (previousConversationId.current)
        socket?.emit('leaveChannel', {
          conversationId: previousConversationId.current,
        });
      if (conversationId) {
        socket?.emit('joinChannel', { conversationId });
        previousConversationId.current = conversationId;

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