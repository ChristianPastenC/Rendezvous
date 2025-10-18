// src/context/ConversationsContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const ConversationsContext = createContext(null);

export const useConversations = () => {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error('useConversations debe usarse dentro de ConversationsProvider');
  }
  return context;
};

export const ConversationsProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();

      const [groupsRes, contactsRes] = await Promise.all([
        fetch('http://localhost:3000/api/groups', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3000/api/contacts', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const groupsData = await groupsRes.json();
      const contactsData = await contactsRes.json();

      const unifiedConversations = [
        ...contactsData.map(contact => ({
          id: `dm_${contact.uid}`,
          type: 'dm',
          name: contact.displayName,
          photoURL: contact.photoURL,
          userData: contact
        })),
        ...groupsData.map(group => ({
          id: `group_${group.id}`,
          type: 'group',
          name: group.name,
          groupData: group
        }))
      ];

      setConversations(unifiedConversations);
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = ({ uid, status, lastSeen }) => {
      setConversations(prevConvs =>
        prevConvs.map(conv => {
          if (conv.type === 'dm' && conv.userData.uid === uid) {
            return {
              ...conv,
              userData: { ...conv.userData, status, lastSeen }
            };
          }
          return conv;
        })
      );
    };

    socket.on('statusUpdate', handleStatusUpdate);

    if (conversations.length > 0) {
      const userIdsToWatch = conversations
        .filter(c => c.type === 'dm')
        .map(c => c.userData.uid);
      socket.emit('subscribeToStatus', userIdsToWatch);
    }

    return () => {
      socket.off('statusUpdate', handleStatusUpdate);
    };
  }, [socket, conversations]);

  const addConversation = useCallback((conversation) => {
    setConversations(prev => [conversation, ...prev]);
  }, []);

  const updateConversation = useCallback((conversationId, updates) => {
    setConversations(prev =>
      prev.map(conv => conv.id === conversationId ? { ...conv, ...updates } : conv)
    );
  }, []);

  return (
    <ConversationsContext.Provider
      value={{
        conversations,
        isLoading,
        loadConversations,
        addConversation,
        updateConversation
      }}
    >
      {children}
    </ConversationsContext.Provider>
  );
};