// src/components/layout/MainLayout.jsx
import {
  useCallback,
  useState,
  useRef
} from 'react';
import { Outlet, useNavigate } from 'react-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import CreateGroupModal from '../groups/CreateGroupModal';
import ProfileEditModal from '../user/UserPerfilModal';
import MobileNav from './MobileNav';
import UserSearchModal from '../dms/UserSearchModal';
import { useSocketManager } from '../../hooks/useSocketManager';
import { useConversations } from '../../hooks/useConversations';

const Loader = () => (
  <div className="flex items-center justify-center h-screen bg-gray-100">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#3B82F6] mb-4"></div>
      <p className="text-gray-800 text-lg">Cargando...</p>
    </div>
  </div>
);

const MainLayout = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const socket = useSocketManager(currentUser);

  const messagesCache = useRef({});
  const membersCache = useRef({});

  const { conversations, setConversations, loadAllData, isLoading } = useConversations(
    currentUser,
    socket,
    messagesCache // <-- [IMPORTANTE] Asegúrate de que esto se está pasando
  );

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserSearchModalOpen, setIsUserSearchModalOpen] = useState(false);

  // ... (toda la lógica de handle... no cambia)
  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
      console.log('Usuario cerró sesión exitosamente.');
      navigate('/auth');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }, [navigate]);

  const handleSelectConversation = useCallback((conv) => {
    setSelectedConversation(conv);
  }, []);

  const handleStartConversation = useCallback(
    (user) => {
      const existingConv = conversations.find(
        (c) => c.type === 'dm' && c.userData.uid === user.uid
      );
      if (existingConv) {
        setSelectedConversation(existingConv);
      } else {
        const newConv = {
          id: `dm_${user.uid}`,
          type: 'dm',
          name: user.displayName,
          photoURL: user.photoURL,
          userData: user,
          lastMessage: null
        };
        setConversations((prev) => [newConv, ...prev]);
        setSelectedConversation(newConv);
      }
    },
    [conversations, setConversations]
  );

  const handleStartConversationAndCloseModal = useCallback(
    (user) => {
      handleStartConversation(user);
      setIsUserSearchModalOpen(false);
    },
    [handleStartConversation]
  );

  const handleCreateGroup = useCallback(
    async (name, memberIds) => {
      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:3000/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, memberIds }),
      });
      if (response.ok) {
        setIsCreateGroupModalOpen(false);
        messagesCache.current = {};
        membersCache.current = {};
        await loadAllData();
      } else {
        alert('Error al crear el grupo.');
      }
    },
    [currentUser, loadAllData]
  );

  const handleProfileUpdate = useCallback(() => {
    loadAllData();
  }, [loadAllData]);

  const handleDeleteAccount = useCallback(async () => {
    if (
      !window.confirm(
        '¿Estás seguro de que quieres eliminar tu cuenta permanentemente? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:3000/api/users/me', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('Tu cuenta ha sido eliminada exitosamente.');
        await signOut(auth);
        navigate('/auth');
        window.location.reload();
      } else {
        const { error } = await response.json();
        alert(`Error al eliminar la cuenta: ${error}`);
      }
    } catch (error) {
      console.error('Error en el proceso de eliminación:', error);
      alert('Ocurrió un error de red. Inténtalo de nuevo.');
    }
  }, [currentUser, navigate]);

  const handleClearSelectedConversation = useCallback(() => {
    setSelectedConversation(null);
  }, []);

  if (isLoading) return <Loader />;

  const outletContext = {
    socket,
    currentUser,
    selectedConversation,
    loadAllData,
    onClearSelectedConversation: handleClearSelectedConversation,
    messagesCache,
    membersCache,
    setConversations
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 overflow-hidden">
      <div className="hidden md:block w-80 h-screen border-r border-gray-200 flex-shrink-0">
        <Sidebar
          currentUser={currentUser}
          conversations={conversations}
          selectedId={selectedConversation?.id}
          onSelectConversation={handleSelectConversation}
          onCreateGroup={() => setIsCreateGroupModalOpen(true)}
          onStartConversation={handleStartConversation}
          onEditProfile={() => setIsProfileModalOpen(true)}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto md:pb-0 pb-16">
          <div className="md:hidden h-full">
            {!selectedConversation ? (
              <Sidebar
                currentUser={currentUser}
                conversations={conversations}
                selectedId={selectedConversation?.id}
                onSelectConversation={handleSelectConversation}
                onCreateGroup={() => setIsCreateGroupModalOpen(true)}
                onStartConversation={handleStartConversation}
                onEditProfile={() => setIsProfileModalOpen(true)}
              />
            ) : (
              <Outlet
                context={outletContext}
              />
            )}
          </div>

          <div className="hidden md:block h-full">
            <Outlet
              context={outletContext}
            />
          </div>
        </main>

        <MobileNav
          onCreateGroup={() => setIsCreateGroupModalOpen(true)}
          onEditProfile={() => setIsProfileModalOpen(true)}
          onShowSearch={() => setIsUserSearchModalOpen(true)}
        />
      </div>

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onCreate={handleCreateGroup}
      />

      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdate={handleProfileUpdate}
        onAccountDelete={handleDeleteAccount}
        onSignOut={handleSignOut}
      />

      <UserSearchModal
        isOpen={isUserSearchModalOpen}
        onClose={() => setIsUserSearchModalOpen(false)}
        onSelectUser={handleStartConversationAndCloseModal}
      />
    </div>
  );
};

export default MainLayout;