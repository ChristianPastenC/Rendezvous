// src/hooks/useConversationsData.js
import { useState, useEffect, useRef, useCallback } from 'react';

export const useConversationsData = (
  socket,
  currentUser,
  selectedConversation,
  messagesCache,
  membersCache,
  setConversations // <-- [NUEVO] Aceptar setConversations
) => {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [forceRefetch, setForceRefetch] = useState(0);
  const previousConversationId = useRef(null);

  const getCurrentConversationId = useCallback(() => {
    // ... (no cambia)
    if (!selectedConversation || !currentUser) return null;
    if (selectedConversation.type === 'dm') {
      return [currentUser.uid, selectedConversation.userData.uid]
        .sort()
        .join('_');
    }
    return selectedConversation.groupData?.channelId;
  }, [selectedConversation, currentUser]);

  // [MODIFICADO] Este useEffect se fusionará con el de abajo
  // useEffect(() => {
  //   if (!socket) return;
  //   // ...
  // }, [socket, messagesCache, getCurrentConversationId]);


  useEffect(() => {
    const conversationId = getCurrentConversationId();
    if (previousConversationId.current && previousConversationId.current !== conversationId) {
      socket?.emit('leaveChannel', {
        conversationId: previousConversationId.current,
      });
    }

    // [NUEVO] Helper para actualizar la lista principal
    const updateConversationList = (messagesData) => {
      const lastMessage = messagesData.length > 0 ? messagesData[messagesData.length - 1] : null;

      if (lastMessage && setConversations && selectedConversation) {
        setConversations(prevConvs =>
          prevConvs.map(conv => {
            if (conv.id === selectedConversation.id) {
              return { ...conv, lastMessage: lastMessage };
            }
            return conv;
          })
        );
      }
    };

    const loadConversation = async () => {
      if (!conversationId) {
        setMessages([]);
        setMembers([]);
        previousConversationId.current = null;
        return;
      }

      setIsLoadingMessages(true);

      try {
        socket?.emit('joinChannel', { conversationId });
        previousConversationId.current = conversationId;

        let membersToSet = [];
        let isDirectMessage = selectedConversation.type === 'dm';

        if (isDirectMessage) {
          // ... (lógica de miembros DM no cambia)
          membersToSet = [currentUser, selectedConversation.userData];
        } else {
          // ... (lógica de miembros de grupo no cambia)
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

        // Lógica de carga de mensajes
        if (messagesCache.current[conversationId]) {
          const messagesData = messagesCache.current[conversationId]; // <-- Cache hit
          setMessages(messagesData);
          updateConversationList(messagesData); // <-- [NUEVO] Actualizar lista desde caché
        } else {
          const token = await currentUser.getIdToken();
          const endpoint = isDirectMessage
            ? `/api/dms/${conversationId}/messages`
            : `/api/groups/${selectedConversation.groupData.id}/channels/${conversationId}/messages`;

          const response = await fetch(`http://localhost:3000${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const messagesData = response.ok ? await response.json() : []; // <-- Cache miss

          messagesCache.current[conversationId] = messagesData;
          setMessages(messagesData);
          updateConversationList(messagesData); // <-- [NUEVO] Actualizar lista desde fetch
        }

      } catch (error) {
        console.error("Error al cargar la conversación:", error);
        setMessages([]);

      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadConversation();

  }, [
    selectedConversation,
    currentUser,
    socket,
    messagesCache,
    membersCache,
    forceRefetch,
    getCurrentConversationId,
    setConversations // <-- [NUEVO] Añadir dependencia
  ]);

  // [MODIFICADO] Este useEffect ahora maneja la *actualización* de la lista
  // cuando llega un mensaje nuevo (además de añadirlo al chat activo)
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      const messageConvId = newMessage.conversationId;
      if (!messageConvId) {
        console.error("Mensaje recibido sin conversationId:", newMessage);
        return;
      }

      // Lógica de caché (ya existía)
      const currentCache = messagesCache.current[messageConvId] || [];
      const messageExistsInCache = currentCache.some(msg => msg.id === newMessage.id);

      if (!messageExistsInCache) {
        messagesCache.current[messageConvId] = [...currentCache, newMessage];
      }

      // Lógica de estado del chat activo (ya existía)
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

      // [ELIMINADO] La lógica de actualizar la lista principal
      // ya se maneja en useConversations.js para mensajes nuevos.
      // No necesitamos setConversations aquí.
    };

    socket.on('encryptedMessage', handleNewMessage);

    return () => {
      socket.off('encryptedMessage', handleNewMessage);
    };

  }, [socket, messagesCache, getCurrentConversationId, setMessages]); // [MODIFICADO] Quitamos setConversations

  const refetchData = () => {
    // ... (no cambia)
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