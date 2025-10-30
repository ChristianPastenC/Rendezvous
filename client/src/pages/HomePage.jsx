// client/src/pages/HomePage.jsx
import { useState } from 'react';
import { useOutletContext } from 'react-router';
import MessageInput from '../components/chat/MessageInput';
import AddMemberModal from '../components/groups/AddMemberModal';
import MembersList from '../components/groups/MembersList';
import MembersModal from '../components/groups/MembersModal';
import MessageList from '../components/chat/MessageList';
import { EmptyStateIcon } from '../assets/Icons';
import MainHeader from '../components/layout/MainHeader';
import { useConversationsData } from '../hooks/useConversationsData';
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
  } = useOutletContext();

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

  /**
   * Initiates the call process for a specific member, if not already in a call.
   * @param {object} member - The member object to call.
   */
  const handleCallMember = (member) => {
    if (inCall) return;
    startCallProcess(member);
  };

  /**
   * Gets the list of members required for encrypting and sending a message.
   * For a DM, it returns the two participants. For a group, it returns all members.
   * @returns {Array<object>} An array of member objects.
   */
  const getMembersForMessage = () => {
    if (selectedConversation?.type === 'dm')
      return [
        { uid: currentUser.uid },
        { uid: selectedConversation.userData.uid },
      ];
    return members;
  };

  /**
   * Determines the target user for initiating a call from the main header.
   * In a DM, it's the other user. In a group, it's the first other member found.
   * @returns {object | null} The user object to call, or null if no suitable target is found.
   */
  const getCallTarget = () => {
    if (selectedConversation?.type === 'dm')
      return selectedConversation.userData;
    if (members.length > 1) return members.find((m) => m.uid !== currentUser.uid);
    return null;
  };

  /**
   * Callback function executed after a new member has been successfully added to a group.
   * It triggers a full data reload for the conversations list and a refetch for the
   * current conversation's data to reflect the changes.
   */
  const handleMemberAdded = () => {
    loadAllData();
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
                            ? selectedConversation.groupData.id
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
        {selectedConversation?.type === 'group' && (
          <MembersList
            members={members}
            onCallMember={handleCallMember}
            currentUserId={currentUser.uid}
            isOwner={
              currentUser.uid === selectedConversation.groupData.ownerId
            }
            onAddMemberClick={() => setIsAddMemberModalOpen(true)}
          />
        )}
      </div>
      {selectedConversation?.type === 'group' && (
        <MembersModal
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          members={members}
          onCallMember={handleCallMember}
          currentUserId={currentUser.uid}
          isOwner={
            currentUser.uid === selectedConversation.groupData.ownerId
          }
          onAddMemberClick={() => {
            setIsMembersModalOpen(false);
            setIsAddMemberModalOpen(true);
          }}
        />
      )}
      {selectedConversation?.type === 'group' && (
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