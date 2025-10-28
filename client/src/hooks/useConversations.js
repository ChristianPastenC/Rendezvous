// src/hooks/useConversations.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { playSound } from '../lib/soundService';

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

/**
 * Custom hook to manage conversations, including fetching, real-time updates, and last message previews.
 * @param {object | null} currentUser - The authenticated Firebase user object.
 * @param {import('socket.io-client').Socket | null} socket - The Socket.IO client instance.
 * @param {React.RefObject<Object<string, any[]>>} messagesCache - A ref object used to cache message lists for each conversation.
 * @returns {{
 *  conversations: any[], 
 *  setConversations: React.Dispatch<React.SetStateAction<any[]>>, 
 *  loadAllData: () => Promise<void>, 
 *  isLoading: boolean
 * }} An object containing the conversations state and management functions.
 */
export const useConversations = (currentUser, socket, messagesCache) => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const initialFetchDone = useRef(false);

  /**
   * Fetches all initial data, including groups and contacts (DMs),
   * and unifies them into a single conversations list.
   */
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
        throw new Error(`Error en la API: Grupos ${groupsRes.status}, Contactos ${contactsRes.status}`);
      }

      const groupsData = await groupsRes.json();
      const contactsData = await contactsRes.json();

      const groupsWithChannels = await Promise.all(
        groupsData.map(async (group) => {
          try {
            const channelsRes = await fetch(`${API_URL}/api/groups/${group.id}/channels`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!channelsRes.ok) {
              return { ...group, channelId: null };
            }

            const channels = await channelsRes.json();

            return {
              ...group,
              channelId: channels.length > 0 ? channels[0].id : null
            };
          } catch (e) {
            return { ...group, channelId: null };
          }
        })
      );

      const unifiedConversations = [
        ...contactsData.map((contact) => ({
          id: `dm_${contact.uid}`,
          type: 'dm',
          name: contact.displayName,
          photoURL: contact.photoURL,
          userData: contact,
          lastMessage: null
        })),
        ...groupsWithChannels.map((group) => ({
          id: `group_${group.id}`,
          type: 'group',
          name: group.name,
          groupData: group,
          lastMessage: null
        })),
      ];

      setConversations(unifiedConversations);

    } catch (error) {
      throw new Error('Error al cargar datos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  /**
   * Effect to fetch the last message for each conversation to display a preview.
   * It runs once after the initial conversation list is loaded.
   */
  useEffect(() => {
    if (!currentUser || conversations.length === 0 || !messagesCache || isLoading) {
      return;
    }
    if (initialFetchDone.current) {
      return;
    }
    initialFetchDone.current = true;

    /**
     * Fetches the last message for a given conversation, utilizing a cache to prevent redundant requests.
     * @param {object} conv - The conversation object.
     * @returns {Promise<object|null>} A promise that resolves to the last message object or null.
     * @async
     */
    const fetchLastMessage = async (conv) => {
      let conversationId = null;
      let endpoint = null;
      let isDirectMessage = conv.type === 'dm';

      if (isDirectMessage) {
        conversationId = [currentUser.uid, conv.userData.uid].sort().join('_');
        endpoint = `/api/dms/${conversationId}/messages`;
      } else {
        conversationId = conv.groupData?.channelId;
        if (!conversationId) return null;
        endpoint = `/api/groups/${conv.groupData.id}/channels/${conversationId}/messages`;
      }

      if (messagesCache.current[conversationId]) {
        const cachedMessages = messagesCache.current[conversationId];
        return cachedMessages.length > 0 ? cachedMessages[cachedMessages.length - 1] : null;
      }

      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`${API_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const messagesData = response.ok ? await response.json() : [];
        messagesCache.current[conversationId] = messagesData;
        return messagesData.length > 0 ? messagesData[messagesData.length - 1] : null;
      } catch (error) {
        return null;
      }
    };

    const promises = conversations.map(fetchLastMessage);

    Promise.all(promises).then(allLastMessages => {
      setConversations(prevConvs => {
        return prevConvs.map((conv, index) => {
          const fetchedLastMessage = allLastMessages[index];
          if (fetchedLastMessage && conv.lastMessage === null) {
            return { ...conv, lastMessage: fetchedLastMessage };
          }
          return conv;
        });
      });
    });

  }, [conversations, currentUser, messagesCache, isLoading]);

  /**
   * Effect to handle real-time user status updates via sockets.
   * Updates the status of users in DM conversations.
   */
  useEffect(() => {
    if (!socket) return;
    /**
     * Handles the 'statusUpdate' socket event to update user presence information.
     */
    const handleStatusUpdate = ({ uid, status, lastSeen, photoURL, displayName }) => {
      setConversations(prevConvs =>
        prevConvs.map(conv => {
          const isUserInConv = (conv.type === 'dm' && conv.userData?.uid === uid) ||
            (conv.type === 'group' && conv.groupData?.members?.includes(uid));

          if (!isUserInConv) return conv;

          if (conv.type === 'dm') {
            const updatedConv = { ...conv };
            const updatedUserData = { ...updatedConv.userData };

            if (status !== undefined) updatedUserData.status = status;
            if (lastSeen !== undefined) updatedUserData.lastSeen = lastSeen;
            if (photoURL !== undefined) { updatedUserData.photoURL = photoURL; updatedConv.photoURL = photoURL; }
            if (displayName !== undefined) { updatedUserData.displayName = displayName; updatedConv.name = displayName; }

            updatedConv.userData = updatedUserData;
            return updatedConv;
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

  /**
   * Effect to handle incoming new messages via sockets.
   * It updates the relevant conversation's last message, plays a sound, and shows a desktop notification.
   */
  useEffect(() => {
    if (!socket || !currentUser) return;

    /**
     * Handles the 'encryptedMessage' socket event. This function processes the new message,
     * triggers notifications, and updates the conversations list to show the new message preview.
     * @param {object} newMessage - The new message object received from the server.
     */
    const handleNewMessage = (newMessage) => {
      const { conversationId, groupId, authorInfo, content, type } = newMessage;

      if (authorInfo?.uid !== currentUser.uid) {

        playSound('messageReceived');

        if (!("Notification" in window)) {
          alert("Este navegador no soporta notificaciones de escritorio.");

        } else if (Notification.permission === "granted") {

          if (document.hidden) {
            const title = authorInfo.displayName || "Nuevo Mensaje";

            let body;
            if (type === 'text') {
              body = content;
            } else if (type === 'image') {
              body = "Te enviaron una imagen";
            } else if (type === 'file') {
              body = "Te enviaron un archivo";
            } else {
              body = "Nuevo mensaje";
            }

            const options = {
              body: body,
              icon: authorInfo.photoURL || '/default-avatar.png',
              tag: conversationId || groupId,
            };

            new Notification(title, options);
          }

        } else if (Notification.permission === "default") {
          return; 
        }
      }

      if (!conversationId) {
        return;
      }

      let targetConvId = null;
      if (groupId) {
        targetConvId = `group_${groupId}`;
      } else {
        const participants = conversationId.split('_');
        const otherUserId = participants.find(uid => uid !== currentUser.uid);
        if (otherUserId) {
          targetConvId = `dm_${otherUserId}`;
        }
      }

      if (!targetConvId) return;

      setConversations(prevConvs => {
        const convIndex = prevConvs.findIndex(c => c.id === targetConvId);

        if (convIndex === -1) {
          if (!groupId) {
            const participants = conversationId.split('_');
            const otherUserId = participants.find(uid => uid !== currentUser.uid);

            if (otherUserId) {
              (async () => {
                try {
                  const token = await currentUser.getIdToken();
                  const res = await fetch(`${API_URL}/api/users/${otherUserId}/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (res.ok) {
                    const authorInfo = newMessage.authorInfo;
                    const newConv = {
                      id: `dm_${authorInfo.uid}`,
                      type: 'dm',
                      name: authorInfo.displayName,
                      photoURL: authorInfo.photoURL,
                      userData: authorInfo,
                      lastMessage: newMessage,
                    };
                    setConversations(prev => [newConv, ...prev.filter(c => c.id !== newConv.id)]);
                  }
                } catch (error) {
                  throw new Error("Error creando nueva conversación de DM al recibir mensaje:", error);
                }
              })();
            }
          }
          return prevConvs;
        }

        const convToUpdate = { ...prevConvs[convIndex], lastMessage: newMessage };
        const otherConvs = prevConvs.filter(c => c.id !== targetConvId);

        return [convToUpdate, ...otherConvs];
      });
    };

    socket.on('encryptedMessage', handleNewMessage);

    return () => {
      socket.off('encryptedMessage', handleNewMessage);
    };
  }, [socket, currentUser]);

  /**
   * Effect to handle the creation of new conversations (e.g., being added to a new group).
   */
  useEffect(() => {
    if (!socket || !currentUser) return;

    /**
     * Handles the 'newConversation' socket event, adding the new conversation to the list
     * if it doesn't already exist.
     */
    const handleNewConversation = (newConv) => {
      const convExists = conversationsRef.current.some(c => c.id === newConv.id);
      if (!convExists) {
        setConversations(prevConvs => [{ ...newConv, lastMessage: null }, ...prevConvs]);
      }
    };

    socket.on('newConversation', handleNewConversation);

    return () => {
      socket.off('newConversation', handleNewConversation);
    };

  }, [socket, currentUser]);

  /**
   * Effect to subscribe to the status updates of users in the current DM conversations.
   * This tells the server which users' presence to monitor.
   */
  useEffect(() => {
    if (!socket || conversations.length === 0) return;
    const userIdsToWatch = conversations
      .filter(c => c.type === 'dm')
      .map(c => c.userData.uid);
    if (userIdsToWatch.length > 0) {
      socket.emit('subscribeToStatus', userIdsToWatch);
    }
  }, [socket, conversations]);

  return { conversations, setConversations, loadAllData, isLoading };
};