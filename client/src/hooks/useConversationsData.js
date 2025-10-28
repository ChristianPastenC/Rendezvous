// src/hooks/useConversationsData.js
import { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

/**
 * Custom hook to manage the data for a single, selected conversation.
 * It fetches and manages messages and members, handles real-time updates via sockets,
 * and utilizes a cache to optimize data loading.
 * @param {import('socket.io-client').Socket | null} socket - The Socket.IO client instance.
 * @param {object | null} currentUser - The authenticated Firebase user object.
 * @param {object | null} selectedConversation - The currently selected conversation object.
 * @param {React.RefObject<Object<string, any[]>>} messagesCache - A ref object for caching message lists.
 * @param {React.RefObject<Object<string, any[]>>} membersCache - A ref object for caching group member lists.
 * @returns {{
 *  messages: any[],
 *  members: any[],
 *  isLoadingMessages: boolean,
 *  refetchData: () => void,
 *  getCurrentConversationId: () => string | null
 * }} An object with the conversation's data and management functions.
 */
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

  /**
   * Calculates the unique backend-compatible ID for the currently selected conversation.
   * For DMs, it's a sorted, concatenated string of user UIDs.
   * For groups, it's the channel ID.
   * @returns {string | null} The unique conversation ID or null if not applicable.
   */
  const getCurrentConversationId = useCallback(() => {
    if (!selectedConversation || !currentUser) return null;
    if (selectedConversation.type === 'dm') {
      return [currentUser.uid, selectedConversation.userData.uid]
        .sort()
        .join('_');
    }
    return selectedConversation.groupData?.channelId;
  }, [selectedConversation, currentUser]);

  /**
   * Main effect to load conversation data (messages and members) when the selected conversation changes.
   * It handles joining/leaving socket channels, fetching data from cache or API,
   * and setting up a listener for new incoming messages.
   */
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

    /**
     * Fetches members and messages for the selected conversation.
     * @async
     */
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
              `${API_URL}/api/groups/${groupId}/members`,
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

          const response = await fetch(`${API_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const messagesData = response.ok ? await response.json() : [];

          messagesCache.current[backendConversationId] = messagesData;
          setMessages(messagesData);
          updateConversationListFromCache(messagesData);
        }

      } catch (error) {
        setMessages([]);

      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadConversation();

    /**
     * Handles the 'encryptedMessage' socket event.
     * Updates the message cache and the local state if the message belongs to the current conversation.
     * @param {object} newMessage - The new message object received from the server.
     */
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

  /**
   * Triggers a full refetch of the current conversation's data.
   * It clears the relevant caches and updates a state variable to re-run the main effect.
   * @memberof useConversationsData
   */
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