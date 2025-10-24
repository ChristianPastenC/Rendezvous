// src/hooks/useConversations.js
import { useState, useEffect, useCallback } from 'react';

export const useConversations = (currentUser, socket) => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

      const unifiedConversations = [
        ...contactsData.map((contact) => ({
          id: `dm_${contact.uid}`,
          type: 'dm',
          name: contact.displayName,
          photoURL: contact.photoURL,
          userData: contact,
        })),
        ...groupsData.map((group) => ({
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
  }, [socket, setConversations]);

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