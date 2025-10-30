// src/components/layout/MainLayout.jsx
import {
  useCallback,
  useState,
  useRef
} from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import CreateGroupModal from '../groups/CreateGroupModal';
import ProfileEditModal from '../user/UserPerfilModal';
import MobileNav from './MobileNav';
import UserSearchModal from '../user/UserSearchModal';
import { useSocketManager } from '../../hooks/useSocketManager';
import { useConversations } from '../../hooks/useConversations';
import { useWebRTC } from '../../hooks/useWebRTC';
import VideoCallModal from '../calls/VideoCallModal';
import IncomingCallModal from '../calls/IncomingCallModal'
import CallTypeModal from '../calls/CallTypeModal';
import OutgoingCallModal from '../calls/OutgoingCallModal';
import Footer from './Footer';

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

/**
 * A simple loader component displayed while data is being fetched.
 * @param {object} props - The component props.
 * @param {function} props.t - The translation function.
 * @returns {JSX.Element} The rendered loader.
 */
const Loader = ({ t }) => (
  <div className="flex items-center justify-center h-screen bg-gray-100">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#3B82F6] mb-4"></div>
      <p className="text-gray-800 text-lg">{t('common.loading')}</p>
    </div>
  </div>
);

const MainLayout = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const socket = useSocketManager(currentUser);

  const messagesCache = useRef({});
  const membersCache = useRef({});

  const { conversations, setConversations, loadAllData, isLoading } = useConversations(
    currentUser,
    socket,
    messagesCache
  );

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserSearchModalOpen, setIsUserSearchModalOpen] = useState(false);

  const {
    inCall,
    callState,
    localStream,
    remoteStream,
    incomingCallData,
    currentCallType,
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
  } = useWebRTC(socket, currentUser);

  const [showCallTypeModal, setShowCallTypeModal] = useState(false);
  const [selectedMemberToCall, setSelectedMemberToCall] = useState(null);

  /**
   * Initiates the call process by showing the call type selection modal.
   * @param {object} member - The user object of the member to call.
   */
  const startCallProcess = useCallback((member) => {
    if (inCall || callState !== 'idle') return;
    setSelectedMemberToCall(member);
    setShowCallTypeModal(true);
  }, [inCall, callState]);

  /**
   * Handles the selection of a call type ('video' or 'audio') and starts the call.
   * @param {'video' | 'audio'} callType - The type of call to start.
   */
  const handleSelectCallType = useCallback((callType) => {
    setShowCallTypeModal(false);
    if (!selectedMemberToCall || !startCall) return;
    startCall(selectedMemberToCall.uid, callType);
  }, [selectedMemberToCall, startCall]);

  /**
   * Cancels the call type selection process and closes the modal.
   */
  const handleCancelCallType = useCallback(() => {
    setShowCallTypeModal(false);
    setSelectedMemberToCall(null);
  }, []);

  /**
   * Gets the display name of the user being called for the outgoing call modal.
   * @returns {string} The display name of the call target.
   */
  const getCallTargetName = () => {
    return selectedMemberToCall?.displayName || t('calls.defaultTargetName');
  };

  /**
   * Handles the user sign-out process. It hangs up any active call,
   * signs the user out from Firebase, and navigates to the authentication page.
   */
  const handleSignOut = useCallback(async () => {
    try {
      if (inCall) {
        hangUp();
      }
      await signOut(auth);
      navigate('/auth');
    } catch (error) {
      throw new Error("Error during sign-out:", error);
    }
  }, [navigate, inCall, hangUp, t]);

  /**
   * Sets the currently selected conversation in the state.
   * @param {object} conv - The conversation object to select.
   */
  const handleSelectConversation = useCallback((conv) => {
    setSelectedConversation(conv);
  }, []);

  /**
   * Starts a new direct message conversation or selects an existing one.
   * If the conversation doesn't exist, it's created locally and added to the list.
   * @param {object} user - The user object to start a conversation with.
   */
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

  /**
   * A wrapper function to start a conversation and then close the user search modal.
   * @param {object} user - The user object selected from the search modal.
   */
  const handleStartConversationAndCloseModal = useCallback(
    (user) => {
      handleStartConversation(user);
      setIsUserSearchModalOpen(false);
    },
    [handleStartConversation]
  );

  /**
   * Handles the creation of a new group.
   * Makes an API call and reloads all data on success.
   * @param {string} name - The name of the new group.
   * @param {string[]} memberIds - An array of user UIDs to add to the group.
   */
  const handleCreateGroup = useCallback(
    async (name, memberIds) => {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_URL}/api/groups`, {
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
        alert(t('layout.main.createGroupError'));
      }
    },
    [currentUser, loadAllData, t]
  );

  /**
   * Callback executed after a user's profile has been updated.
   * Triggers a full data reload to reflect changes.
   */
  const handleProfileUpdate = useCallback(() => {
    loadAllData();
  }, [loadAllData]);

  /**
   * Handles the account deletion process. It shows a confirmation dialog,
   * makes an API call to delete the user data, and signs the user out.
   */
  const handleDeleteAccount = useCallback(async () => {
    if (
      !window.confirm(
        t('layout.main.deleteConfirm')
      )
    ) {
      return;
    }
    try {
      if (inCall) {
        hangUp();
      }
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_URL}/api/users/me`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert(t('layout.main.deleteSuccess'));
        await signOut(auth);
        navigate('/auth');
        window.location.reload();
      } else {
        const { error } = await response.json();
        alert(`${t('layout.main.deleteError')} ${error}`);
      }
    } catch (error) {
      alert(t('layout.main.deleteNetworkError'));
    }
  }, [currentUser, navigate, inCall, hangUp, t]);

  /**
   * Clears the currently selected conversation, returning to the default view on mobile.
   */
  const handleClearSelectedConversation = useCallback(() => {
    setSelectedConversation(null);
  }, []);

  if (isLoading) return <Loader t={t} />;

  const outletContext = {
    socket,
    currentUser,
    selectedConversation,
    loadAllData,
    onClearSelectedConversation: handleClearSelectedConversation,
    messagesCache,
    membersCache,
    setConversations,
    startCallProcess,
    inCall,
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
        <Footer />
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

      {showCallTypeModal && (
        <CallTypeModal
          onSelectType={handleSelectCallType}
          onCancel={handleCancelCallType}
        />
      )}

      {(callState === 'calling' || callState === 'ringing') && !inCall && (
        <OutgoingCallModal
          targetName={getCallTargetName()}
          status={callState}
          onCancel={hangUp}
        />
      )}

      {callState === 'incoming' && incomingCallData && (
        <IncomingCallModal
          callerName={incomingCallData.callerName}
          callType={incomingCallData.callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {inCall && (callState === 'connected' || callState === 'ended') && (
        <VideoCallModal
          localStream={localStream}
          remoteStream={remoteStream}
          onHangUp={hangUp}
          callType={currentCallType}
          callState={callState}
        />
      )}
    </div>
  );
};

export default MainLayout;