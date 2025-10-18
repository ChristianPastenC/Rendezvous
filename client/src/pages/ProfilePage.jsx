// src/pages/ProfilePage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useConversations } from '../context/ConversationsContext';
import ConversationsSidebar from '../components/sidebar/ConversationsSidebar';
import ProfileEditModal from '../components/user/UserPerfilModal';
import CreateGroupModal from '../components/groups/CreateGroupModal';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { conversations, loadConversations } = useConversations();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(true);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);

  const handleSelectConversation = (conv) => {
    if (conv.type === 'dm') {
      navigate(`/chat/${conv.userData.uid}`);
    } else {
      navigate(`/group/${conv.groupData.id}`);
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
    }
  };

  const handleProfileUpdate = () => {
    loadConversations();
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar tu cuenta permanentemente? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:3000/api/users/me', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Tu cuenta ha sido eliminada exitosamente.');
        await signOut(auth);
        navigate('/auth');
      } else {
        const { error } = await response.json();
        alert(`Error al eliminar la cuenta: ${error}`);
      }
    } catch (error) {
      console.error('Error en el proceso de eliminación:', error);
      alert('Ocurrió un error de red. Inténtalo de nuevo.');
    }
  };

  const handleCloseProfile = () => {
    setIsProfileModalOpen(false);
    navigate('/home');
  };

  return (
    <>
      <div className="flex h-screen bg-gray-900 text-white">
        <ConversationsSidebar
          conversations={conversations}
          selectedId={null}
          onSelectConversation={handleSelectConversation}
          onCreateGroup={() => setIsCreateGroupModalOpen(true)}
          onStartConversation={(user) => navigate(`/chat/${user.uid}`)}
          onEditProfile={() => setIsProfileModalOpen(true)}
        />

        <main className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg
              className="w-24 h-24 mx-auto mb-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <p className="text-xl">Editando tu perfil</p>
          </div>
        </main>
      </div>

      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={handleCloseProfile}
        onProfileUpdate={handleProfileUpdate}
        onAccountDelete={handleDeleteAccount}
      />

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onCreate={handleCreateGroup}
      />
    </>
  );
};

export default ProfilePage;