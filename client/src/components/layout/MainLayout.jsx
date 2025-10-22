// src/components/layout/MainLayout.jsx

import React, { 
  useCallback, 
  useState, 
  useEffect, 
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
import { initSocket } from '../../lib/socket';
import { cryptoService } from '../../lib/cryptoService';

const Loader = () => (
  <div className="flex items-center justify-center h-screen bg-gray-900">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
      <p className="text-gray-400 text-lg">Cargando...</p>
    </div>
  </div>
);

const MainLayout = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserSearchModalOpen, setIsUserSearchModalOpen] = useState(false);

  const messagesCache = useRef({});
  const membersCache = useRef({});

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
      console.log('Usuario cerró sesión exitosamente.');
      navigate('/auth');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }, [navigate]);

  const loadAllData = useCallback(async () => {
    if (!currentUser) return;
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
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (!currentUser) return;
    let socketInstance;
    const connect = async () => {
      socketInstance = await initSocket();
      if (socketInstance) {
        setSocket(socketInstance);
        const { publicKey } = await cryptoService.generateAndStoreKeys();
        socketInstance.emit('security:register-public-key', { publicKey });
      }
    };
    connect();
    return () => {
      if (socketInstance) socketInstance.disconnect();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = ({ uid, status, lastSeen }) => {
      setConversations(prevConvs =>
        prevConvs.map(conv => {
          if (conv.type === 'dm' && conv.userData.uid === uid) {
            return {
              ...conv,
              userData: { ...conv.userData, status, lastSeen },
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
        };
        setConversations((prev) => [newConv, ...prev]);
        setSelectedConversation(newConv);
      }
    },
    [conversations]
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
                context={{
                  socket,
                  currentUser,
                  selectedConversation,
                  loadAllData,
                  onClearSelectedConversation: handleClearSelectedConversation,
                }}
              />
            )}
          </div>

          <div className="hidden md:block h-full">
            <Outlet
              context={{
                socket,
                currentUser,
                selectedConversation,
                loadAllData,
                onClearSelectedConversation: handleClearSelectedConversation,
              }}
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