// src/components/layout/MainLayout.jsx
import {
  useCallback,
  useEffect,
  useState,
  useRef,
  type MutableRefObject,
  type Dispatch,
  type SetStateAction
} from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { signOut, type User } from 'firebase/auth';
import type { CallType, ConversationItem, EncryptedMessage, UserProfile } from '@rendezvous/shared';
import { auth } from '../../lib/firebase';
import type { TypedClientSocket } from '../../lib/socket';
import type { PassphrasePromptOptions } from '../../lib/cryptoService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import Sidebar from './Sidebar';
import CreateGroupModal from '../groups/CreateGroupModal';
import ProfileEditModal from '../user/UserPerfilModal';
import MobileNav from './MobileNav';
import UserSearchModal from '../user/UserSearchModal';
import { useSocketManager } from '../../hooks/useSocketManager';
import { useConversations } from '../../hooks/useConversations';
import { useWebRTC } from '../../hooks/useWebRTC';
import VideoCallModal from '../calls/VideoCallModal';
import IncomingCallModal from '../calls/IncomingCallModal';
import CallTypeModal from '../calls/CallTypeModal';
import OutgoingCallModal from '../calls/OutgoingCallModal';
import Footer from './Footer';
import SecurityPassphraseModal from '../auth/SecurityPassphraseModal';

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export interface MainOutletContext {
  socket: TypedClientSocket | null;
  currentUser: User | null;
  selectedConversation: ConversationItem | null;
  loadAllData: () => Promise<void>;
  onClearSelectedConversation: () => void;
  messagesCache: MutableRefObject<Record<string, EncryptedMessage[]>>;
  membersCache: MutableRefObject<Record<string, UserProfile[]>>;
  setConversations: Dispatch<SetStateAction<ConversationItem[]>>;
  startCallProcess: (member: UserProfile) => void;
  inCall: boolean;
}

const Loader = ({ t }: { t: TFunction }) => (
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
  const { showToast, confirmAction } = useNotification();
  const navigate = useNavigate();

  const [passphraseModal, setPassphraseModal] = useState<{
    isOpen: boolean;
    isNewUser: boolean;
    isRetry: boolean;
  }>({
    isOpen: false,
    isNewUser: false,
    isRetry: false,
  });
  const passphraseResolverRef = useRef<((value: string | null) => void) | null>(null);

  const requestPassphrase = useCallback(({ isNewUser, isRetry }: PassphrasePromptOptions) => {
    return new Promise<string | null>((resolve) => {
      passphraseResolverRef.current = resolve;
      setPassphraseModal({ isOpen: true, isNewUser, isRetry });
    });
  }, []);

  const handlePassphraseSubmit = useCallback((value: string) => {
    setPassphraseModal((prev) => ({ ...prev, isOpen: false }));
    if (passphraseResolverRef.current) {
      passphraseResolverRef.current(value);
      passphraseResolverRef.current = null;
    }
  }, []);

  const handlePassphraseCancel = useCallback(() => {
    setPassphraseModal((prev) => ({ ...prev, isOpen: false }));
    if (passphraseResolverRef.current) {
      passphraseResolverRef.current(null);
      passphraseResolverRef.current = null;
    }
  }, []);

  const socket = useSocketManager(currentUser, requestPassphrase);

  const messagesCache = useRef<Record<string, EncryptedMessage[]>>({});
  const membersCache = useRef<Record<string, UserProfile[]>>({});

  const { conversations, setConversations, loadAllData, isLoading } = useConversations(
    currentUser,
    socket,
    messagesCache
  );

  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
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
    callError,
    clearCallError,
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
  } = useWebRTC(socket, currentUser);

  useEffect(() => {
    if (callError) {
      showToast(callError, 'error');
      clearCallError();
    }
  }, [callError, clearCallError, showToast]);

  const [showCallTypeModal, setShowCallTypeModal] = useState(false);
  const [selectedMemberToCall, setSelectedMemberToCall] = useState<UserProfile | null>(null);

  const startCallProcess = useCallback((member: UserProfile) => {
    if (inCall || callState !== 'idle') return;
    setSelectedMemberToCall(member);
    setShowCallTypeModal(true);
  }, [inCall, callState]);

  const handleSelectCallType = useCallback((callType: CallType) => {
    setShowCallTypeModal(false);
    if (!selectedMemberToCall || !startCall) return;
    void startCall(selectedMemberToCall.uid, callType);
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
      console.error('Error during sign-out:', error);
    }
  }, [navigate, inCall, hangUp]);

  const handleSelectConversation = useCallback((conv: ConversationItem) => {
    setSelectedConversation(conv);
  }, []);

  const handleStartConversation = useCallback(
    (user: UserProfile) => {
      const existingConv = conversations.find(
        (c) => c.type === 'dm' && c.userData?.uid === user.uid
      );
      if (existingConv) {
        setSelectedConversation(existingConv);
      } else {
        const newConv: ConversationItem = {
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
    (user: UserProfile) => {
      handleStartConversation(user);
      setIsUserSearchModalOpen(false);
    },
    [handleStartConversation]
  );

  const handleCreateGroup = useCallback(
    async (name: string, memberIds: string[] = []) => {
      if (!currentUser) return;
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
        showToast(t('layout.main.createGroupError'), 'error');
      }
    },
    [currentUser, loadAllData, t, showToast]
  );

  const handleProfileUpdate = useCallback(() => {
    void loadAllData();
  }, [loadAllData]);

  const handleDeleteAccount = useCallback(async () => {
    if (!currentUser) return;
    const confirmed = await confirmAction({
      title: t('layout.main.deleteTitle', 'Delete account'),
      message: t('layout.main.deleteConfirm'),
      confirmLabel: t('common.delete', 'Delete'),
      cancelLabel: t('common.cancel', 'Cancel'),
      isDanger: true,
    });
    if (!confirmed) {
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
        showToast(t('layout.main.deleteSuccess'), 'success');
        await signOut(auth);
        navigate('/auth');
        window.location.reload();
      } else {
        const { error } = (await response.json()) as { error?: string };
        showToast(`${t('layout.main.deleteError')} ${error || ''}`, 'error');
      }
    } catch {
      showToast(t('layout.main.deleteNetworkError'), 'error');
    }
  }, [currentUser, navigate, inCall, hangUp, t, confirmAction, showToast]);

  const handleClearSelectedConversation = useCallback(() => {
    setSelectedConversation(null);
  }, []);

  if (isLoading) return <Loader t={t} />;

  const outletContext: MainOutletContext = {
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
                selectedId={undefined}
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

      <SecurityPassphraseModal
        isOpen={passphraseModal.isOpen}
        isNewUser={passphraseModal.isNewUser}
        isRetry={passphraseModal.isRetry}
        onSubmit={handlePassphraseSubmit}
        onCancel={handlePassphraseCancel}
      />
    </div>
  );
};

export default MainLayout;