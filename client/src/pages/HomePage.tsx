// client/src/pages/HomePage.jsx
import { useState } from 'react';
import { useOutletContext } from 'react-router';
import type { UserProfile } from '@rendezvous/shared';
import type { MainOutletContext } from '../components/layout/MainLayout';
import MessageInput from '../components/chat/MessageInput';
import AddMemberModal from '../components/groups/AddMemberModal';
import MembersList from '../components/groups/MembersList';
import MembersModal from '../components/groups/MembersModal';
import MessageList from '../components/chat/MessageList';
import { EmptyStateIcon } from '../assets/Icons';
import MainHeader from '../components/layout/MainHeader';
import { useConversationsData } from '../hooks/useConversationsData';
import type { MessageMember } from '../hooks/useSendMessages';
import { useTranslation } from 'react-i18next';

const HomePage = () => {
  const { t } = useTranslation();

  const {
    socket,
    currentUser,
    selectedConversation,
    loadAllData,
    onClearSelectedConversation,
    messagesCache,
    membersCache,
    startCallProcess,
    inCall
  } = useOutletContext<MainOutletContext>();

  const {
    messages,
    members,
    isLoadingMessages,
    refetchData,
    getCurrentConversationId,
  } = useConversationsData(
    socket,
    currentUser,
    selectedConversation,
    messagesCache,
    membersCache
  );

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  const handleCallMember = (member: UserProfile | null | undefined) => {
    if (inCall || !member) return;
    startCallProcess(member);
  };

  const getMembersForMessage = (): MessageMember[] => {
    if (selectedConversation?.type === 'dm' && currentUser && selectedConversation.userData) {
      return [
        { uid: currentUser.uid },
        { uid: selectedConversation.userData.uid },
      ];
    }
    return members;
  };

  const getCallTarget = (): UserProfile | null => {
    if (selectedConversation?.type === 'dm') {
      return selectedConversation.userData ?? null;
    }
    if (members.length > 1 && currentUser) {
      return members.find((m) => m.uid !== currentUser.uid) ?? null;
    }
    return null;
  };

  const handleMemberAdded = () => {
    void loadAllData();
    refetchData();
  };

  return (
    <>
      <div className="flex h-full bg-gray-100">
        <main className="flex flex-col flex-1 bg-white relative overflow-hidden">
          <div className="sticky top-0 bg-white">
            <MainHeader
              selectedConversation={selectedConversation}
              onClearSelectedConversation={onClearSelectedConversation}
              inCall={inCall}
              callTarget={getCallTarget()}
              onCallClick={() => handleCallMember(getCallTarget())}
              onMembersClick={() => setIsMembersModalOpen(true)}
            />
          </div>

          {selectedConversation ? (
            <>
              {isLoadingMessages ? (
                <div className="flex-1 flex items-center justify-center overflow-hidden">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#3B82F6] mb-3">
                    </div>
                    <p className="text-gray-500">
                      {t('pages.home.loadingMessages')}
                    </p>
                  </div>
                </div>)
                : (<>
                  <div className="flex-1 overflow-y-auto max-w-[100dvw]" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <MessageList
                      messages={messages}
                      currentUserUid={currentUser?.uid}
                    />
                  </div>
                  {socket && (
                    <div className="sticky bottom-0 bg-white">
                      <MessageInput
                        socket={socket}
                        isDirectMessage={selectedConversation.type === 'dm'}
                        conversationId={getCurrentConversationId()}
                        groupId={
                          selectedConversation.type === 'group'
                            ? (selectedConversation.groupData?.id ?? null)
                            : null
                        }
                        members={getMembersForMessage()}
                      />
                    </div>
                  )}
                </>
                )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <div className="text-center text-gray-500">
                <EmptyStateIcon className="w-24 h-24 mx-auto mb-4 text-gray-600" />
                <p className="text-xl">
                  {t('pages.home.emptyPrompt')}
                </p>
              </div>
            </div>
          )}
        </main>
        {selectedConversation?.type === 'group' && selectedConversation.groupData && (
          <MembersList
            members={members}
            onCallMember={handleCallMember}
            currentUserId={currentUser?.uid}
            isOwner={
              currentUser?.uid === selectedConversation.groupData.ownerId
            }
            onAddMemberClick={() => setIsAddMemberModalOpen(true)}
          />
        )}
      </div>
      {selectedConversation?.type === 'group' && selectedConversation.groupData && (
        <MembersModal
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          members={members}
          onCallMember={handleCallMember}
          currentUserId={currentUser?.uid}
          isOwner={
            currentUser?.uid === selectedConversation.groupData.ownerId
          }
          onAddMemberClick={() => {
            setIsMembersModalOpen(false);
            setIsAddMemberModalOpen(true);
          }}
        />
      )}
      {selectedConversation?.type === 'group' && selectedConversation.groupData && (
        <AddMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          onMemberAdded={handleMemberAdded}
          groupId={selectedConversation.groupData.id}
        />
      )}
    </>
  );
};

export default HomePage;