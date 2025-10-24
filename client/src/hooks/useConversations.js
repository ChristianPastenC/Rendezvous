// src/hooks/useConversations.js
import { useState, useEffect, useCallback, useRef } from 'react'; // <-- Añadimos useRef

export const useConversations = (currentUser, socket) => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  

  const loadAllData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const [groupsRes, contactsRes] = await Promise.all([
        fetch('http://localhost:3000/api/groups', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3000/api/contacts', {
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
            const channelsRes = await fetch(`http://localhost:3000/api/groups/${group.id}/channels`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!channelsRes.ok) {
              console.error(`No se pudieron cargar canales para el grupo ${group.id}`);
              return { ...group, channelId: null };
            }

            const channels = await channelsRes.json();

            return {
              ...group,
              channelId: channels.length > 0 ? channels[0].id : null
            };
          } catch (e) {
            console.error(`Error cargando canales para ${group.id}:`, e);
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
        })),
        ...groupsWithChannels.map((group) => ({
          id: `group_${group.id}`,
          type: 'group',
          name: group.name,
          groupData: group,
        })),
      ];

      setConversations(unifiedConversations);

    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    setIsLoading(true);
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = ({ uid, status, lastSeen, photoURL, displayName }) => {
      setConversations(prevConvs =>
        prevConvs.map(conv => {
          if (conv.type === 'dm' && conv.userData.uid === uid) {
            const updatedUserData = { ...conv.userData };

            if (status !== undefined) updatedUserData.status = status;
            if (lastSeen !== undefined) updatedUserData.lastSeen = lastSeen;
            if (photoURL !== undefined) updatedUserData.photoURL = photoURL;
            if (displayName !== undefined) updatedUserData.displayName = displayName;

            return {
              ...conv,
              name: updatedUserData.displayName,
              photoURL: updatedUserData.photoURL,
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

    const handleNewConversation = (newConv) => {
      const convExists = conversationsRef.current.some(c => c.id === newConv.id);
      if (!convExists) {
        console.log('[Socket] Añadiendo nueva conversación de grupo:', newConv.name);
        setConversations(prevConvs => [newConv, ...prevConvs]);
      }
    };

    const handleNewMessage = async (newMessage) => {
      if (newMessage.authorId === currentUser.uid) return;

      if (!newMessage.conversationId.includes('_')) {
        return;
      }

      const conversationExists = conversationsRef.current.some(
        c => c.id === `dm_${newMessage.authorId}`
      );

      if (conversationExists) {
        setConversations(prevConvs => {
          const convToMove = prevConvs.find(c => c.id === `dm_${newMessage.authorId}`);
          if (!convToMove) return prevConvs;

          const otherConvs = prevConvs.filter(c => c.id !== `dm_${newMessage.authorId}`);
          return [convToMove, ...otherConvs];
        });

      } else {
        console.log(`[Socket] Nuevo DM detectado de: ${newMessage.authorId}. Cargando perfil...`);
        try {
          const token = await currentUser.getIdToken();
          const res = await fetch(`http://localhost:3000/api/users/${newMessage.authorId}/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            const userData = await res.json();
            const newConv = {
              id: `dm_${userData.uid}`,
              type: 'dm',
              name: userData.displayName,
              photoURL: userData.photoURL,
              userData: userData,
            };

            setConversations(prevConvs => [newConv, ...prevConvs]);
          }
        } catch (error) {
          console.error("Error al cargar perfil de nuevo DM:", error);
        }
      }
    };

    socket.on('newConversation', handleNewConversation);
    socket.on('encryptedMessage', handleNewMessage);

    return () => {
      socket.off('newConversation', handleNewConversation);
      socket.off('encryptedMessage', handleNewMessage);
    };

  }, [socket, currentUser]);
  
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