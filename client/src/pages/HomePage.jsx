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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      <div className="flex h-screen bg-gray-50 text-gray-800 overflow-hidden">
        <ConversationsSidebar
          conversations={conversations}
          selectedId={null}
          onSelectConversation={handleSelectConversation}
          onCreateGroup={() => setIsCreateGroupModalOpen(true)}
          onStartConversation={handleStartConversation}
          onEditProfile={() => navigate('/profile')}
          onSignOut={handleSignOut}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 flex flex-col min-w-0">
          {/* Header para móvil */}
          <div className="lg:hidden p-4 bg-white border-b border-gray-200">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500 px-4">
              <svg
                className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-lg sm:text-xl text-gray-600">Selecciona una conversación para empezar</p>
            </div>
          </div>
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