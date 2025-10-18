// src/pages/HomePage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useConversations } from '../context/ConversationsContext';
import ConversationsSidebar from '../components/sidebar/ConversationsSidebar';
import EmptyState from '../components/chat/EmptyState';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { conversations, loadConversations } = useConversations();
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);

  const handleSelectConversation = (conv) => {
    if (conv.type === 'dm') {
      navigate(`/chat/${conv.userData.uid}`);
    } else if (conv.type === 'group') {
      navigate(`/group/${conv.groupData.id}`);
    }
  };

  const handleStartConversation = (user) => {
    navigate(`/chat/${user.uid}`);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("Usuario cerró sesión exitosamente.");
      navigate("/auth");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleCreateGroup = async (name, memberIds) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:3000/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, memberIds })
      });

      if (response.ok) {
        const newGroup = await response.json();
        setIsCreateGroupModalOpen(false);
        await loadConversations();
        navigate(`/group/${newGroup.id}`);
      } else {
        alert('Error al crear el grupo.');
      }
    } catch (error) {
      console.error('Error creando grupo:', error);
      alert('Error al crear el grupo.');
    }
  };

  return (
    <>
      <div className="flex h-screen bg-gray-900 text-white">
        <ConversationsSidebar
          conversations={conversations}
          selectedId={null}
          onSelectConversation={handleSelectConversation}
          onCreateGroup={() => setIsCreateGroupModalOpen(true)}
          onStartConversation={handleStartConversation}
          onEditProfile={() => navigate('/profile')}
          onSignOut={handleSignOut}
        />

        <main className="flex-1">
          <EmptyState />
        </main>
      </div>

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onCreate={handleCreateGroup}
      />
    </>
  );
};

export default HomePage;