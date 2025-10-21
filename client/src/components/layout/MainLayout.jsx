// src/layouts/MainLayout.jsx
import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useConversations } from '../../context/ConversationsContext';
import { useAuth } from '../../context/AuthContext';
import ConversationsSidebar from '../sidebar/ConversationsSidebar';
import CreateGroupModal from '../groups/CreateGroupModal';
import MobileTabBar from '../layout/MobileTabBar';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { conversations, loadConversations } = useConversations();
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);

  const isDetailPage = location.pathname.startsWith('/chat') ||
    location.pathname.startsWith('/group') ||
    location.pathname.startsWith('/profile');

  let selectedId = null;
  if (location.pathname.startsWith('/chat/')) {
    selectedId = `dm_${location.pathname.split('/')[2]}`;
  } else if (location.pathname.startsWith('/group/')) {
    selectedId = `group_${location.pathname.split('/')[2]}`;
  }

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
    }
  };

  return (
    <>
      <div className="flex h-screen bg-gray-50 text-gray-800 overflow-hidden">

        <div className={`
          ${isDetailPage ? 'hidden' : 'block w-full'} {/* <-- CAMBIO: Usa isDetailPage */}
          lg:flex lg:flex-col lg:w-72 sm:lg:w-80 lg:flex-shrink-0
        `}>
          <ConversationsSidebar
            conversations={conversations}
            selectedId={selectedId}
            onSelectConversation={handleSelectConversation}
            onCreateGroup={() => setIsCreateGroupModalOpen(true)}
            onStartConversation={handleStartConversation}
            onEditProfile={() => navigate('/profile')}
          />
        </div>

        <main className={`
          ${isDetailPage ? 'block w-full' : 'hidden'} {/* <-- CAMBIO: Usa isDetailPage */}
          lg:flex flex-1 flex-col min-w-0 h-full
        `}>
          <Outlet />
        </main>
      </div>

      <MobileTabBar
        activeTab={
          location.pathname.startsWith('/profile') ? 'profile' :
            (isDetailPage ? 'chat' : 'home')
        }
        onCreateGroup={() => setIsCreateGroupModalOpen(true)}
        onEditProfile={() => navigate('/profile')}
      />

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onCreate={handleCreateGroup}
      />
    </>
  );
};

export default MainLayout;