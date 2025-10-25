// src/hooks/useConversations.js
import { useState, useEffect, useCallback, useRef } from 'react';

export const useConversations = (currentUser, socket, messagesCache) => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const initialFetchDone = useRef(false);

  // loadAllData (sin cambios)
  const loadAllData = useCallback(async () => {
    if (!currentUser) return;

    initialFetchDone.current = false;
    setIsLoading(true);

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
      console.error('Error al cargar datos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);


  // useEffect de carga inicial de previsualizaciones (sin cambios)
  useEffect(() => {
    if (!currentUser || conversations.length === 0 || !messagesCache || isLoading) {
      return;
    }
    if (initialFetchDone.current) {
      return;
    }
    initialFetchDone.current = true;

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
        const response = await fetch(`http://localhost:3000${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const messagesData = response.ok ? await response.json() : [];
        messagesCache.current[conversationId] = messagesData;
        return messagesData.length > 0 ? messagesData[messagesData.length - 1] : null;
      } catch (error) {
        console.error(`Error cargando previsualización para ${conv.id}:`, error);
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


  // useEffect para statusUpdate (sin cambios)
  useEffect(() => {
    if (!socket) return;
    const handleStatusUpdate = ({ uid, status, lastSeen, photoURL, displayName }) => {
      setConversations(prevConvs =>
        prevConvs.map(conv => {
          if (conv.type === 'dm' && conv.userData.uid === uid) {
            const updatedUserData = { ...conv.userData };
            // ... (actualizar userData)
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

  // [LÓGICA CORRECTA] Este useEffect interpreta el mensaje
  useEffect(() => {
    if (!socket || !currentUser) return;

    // handleNewConversation (sin cambios)
    const handleNewConversation = (newConv) => {
      const convExists = conversationsRef.current.some(c => c.id === newConv.id);
      if (!convExists) {
        console.log('[useConversations] Recibida nueva conversación:', newConv.name);
        setConversations(prevConvs => [{ ...newConv, lastMessage: null }, ...prevConvs]);
      }
    };

    // handleNewMessage (lógica robusta que soluciona el bug de "primer mensaje")
    const handleNewMessage = async (newMessage) => {
      const { conversationId, groupId } = newMessage;

      console.log('[useConversations] Mensaje recibido:', { conversationId, groupId });

      if (!conversationId) {
        console.error('[useConversations] Mensaje sin conversationId!');
        return;
      }

      let targetConvId = null; // ID de la lista (ej: "group_xyz" o "dm_user123")
      let isDM = false;
      let otherUserId = null;

      if (groupId) {
        targetConvId = `group_${groupId}`;
      } else {
        isDM = conversationId.includes('_');
        if (isDM) {
          const participants = conversationId.split('_');
          otherUserId = participants.find(uid => uid !== currentUser.uid);
          if (otherUserId) {
            targetConvId = `dm_${otherUserId}`;
          }
        }
      }

      if (!targetConvId) {
        console.warn('[useConversations] No se pudo determinar targetConvId. Mensaje ignorado.', newMessage);
        return;
      }

      console.log(`[useConversations] Mapeado a targetConvId: ${targetConvId}`);

      const conversationExists = conversationsRef.current.some(
        c => c.id === targetConvId
      );

      if (conversationExists) {
        // Conversación existente: actualizar y mover al inicio
        console.log(`[useConversations] Actualizando conversación existente: ${targetConvId}`);
        setConversations(prevConvs => {
          // De-duplicación: no actualizar si el mensaje ya es el último
          const currentConv = prevConvs.find(c => c.id === targetConvId);
          if (currentConv?.lastMessage?.id === newMessage.id) {
            return prevConvs;
          }

          const convToMove = currentConv || prevConvs.find(c => c.id === targetConvId);
          if (!convToMove) return prevConvs;

          const updatedConv = { ...convToMove, lastMessage: newMessage };
          const otherConvs = prevConvs.filter(c => c.id !== targetConvId);

          return [updatedConv, ...otherConvs];
        });
      } else if (isDM && otherUserId) {
        // Conversación NO existente y ES un DM: crearla
        console.log(`[useConversations] Es un DM nuevo. Buscando perfil de: ${otherUserId}`);
        try {
          const token = await currentUser.getIdToken();
          const res = await fetch(`http://localhost:3000/api/users/${otherUserId}/profile`, {
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
              lastMessage: newMessage
            };
            setConversations(prevConvs => [newConv, ...prevConvs]);
          } else {
            console.error(`[useConversations] Error al cargar perfil de ${otherUserId}:`, res.status);
          }
        } catch (error) {
          console.error("Error al cargar perfil de nuevo DM:", error);
        }
      } else {
        console.log(`[useConversations] Mensaje ignorado (es de grupo pero no existe en la lista): ${targetConvId}`);
      }
    };

    socket.on('newConversation', handleNewConversation);
    socket.on('encryptedMessage', handleNewMessage);

    return () => {
      socket.off('newConversation', handleNewConversation);
      socket.off('encryptedMessage', handleNewMessage);
    };

  }, [socket, currentUser]); // Dependencias correctas

  // useEffect para subscribeToStatus (sin cambios)
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