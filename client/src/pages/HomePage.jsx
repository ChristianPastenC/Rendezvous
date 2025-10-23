import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { useWebRTC } from '../hooks/useWebRTC';
import MessageInput from '../components/chat/MessageInput';
import VideoCallModal from '../components/chat/VideoCallModal';
import IncomingCallModal from '../components/chat/IncomingCallModal';
import CallTypeModal from '../components/chat/CallTypeModal';
import AddMemberModal from '../components/groups/AddMemberModal';
import MembersList from '../components/groups/MembersList';
import MembersModal from '../components/groups/MembersModal';
import MessageList from '../components/chat/MessageList';
import { EmptyStateIcon } from '../assets/Icons';
import MainHeader from '../components/layout/MainHeader';
import { useConversationsData } from '../hooks/useConversationsData';

const HomePage = () => {
  const {
    socket,
    currentUser,
    selectedConversation,
    loadAllData,
    onClearSelectedConversation,
    messagesCache,
    membersCache
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

  const {
    inCall,
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

  const handleCallMember = (member) => {
    if (inCall) return;
    setSelectedMemberToCall(member);
    setShowCallTypeModal(true);
  };

  const handleSelectCallType = (callType) => {
    setShowCallTypeModal(false);
    if (!selectedMemberToCall || !startCall) return;
    startCall(selectedMemberToCall.uid, callType);
    setSelectedMemberToCall(null);
  };

  const handleCancelCallType = () => {
    setShowCallTypeModal(false);
    setSelectedMemberToCall(null);
  };

  const getMembersForMessage = () => {
    if (selectedConversation?.type === 'dm')
      return [
        { uid: currentUser.uid },
        { uid: selectedConversation.userData.uid },
      ];
    return members;
  };

  const getCallTarget = () => {
    if (selectedConversation?.type === 'dm')
      return selectedConversation.userData;
    if (members.length > 1) return members.find((m) => m.uid !== currentUser.uid);
    return null;
  };

  const handleMemberAdded = () => {
    loadAllData();
    refetchData();
  };

  return (
    <>
      <div className="flex h-full bg-gray-100">
        <main className="flex flex-col flex-1 bg-white">
          <MainHeader
            selectedConversation={selectedConversation}
            onClearSelectedConversation={onClearSelectedConversation}
            inCall={inCall}
            callTarget={getCallTarget()}
            onCallClick={() => handleCallMember(getCallTarget())}
            onMembersClick={() => setIsMembersModalOpen(true)}
          />
          {selectedConversation ? (
            <>
              {isLoadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#3B82F6] mb-3">
                    </div>
                    <p className="text-gray-500">
                      Cargando mensajes...
                    </p>
                  </div>
                </div>)
                : (<>
                  <MessageList
                    messages={messages}
                    currentUserUid={currentUser?.uid}
                  />
                  {socket && (
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
                  )}
                </>
                )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <EmptyStateIcon className="w-24 h-24 mx-auto mb-4 text-gray-600" />
                <p className="text-xl">Selecciona una conversación para empezar</p>
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
      {showCallTypeModal && (
        <CallTypeModal
          onSelectType={handleSelectCallType}
          onCancel={handleCancelCallType}
        />
      )}

      {incomingCallData && (
        <IncomingCallModal
          callerName={incomingCallData.callerName}
          callType={incomingCallData.callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {inCall && (
        <VideoCallModal
          localStream={localStream}
          remoteStream={remoteStream}
          onHangUp={hangUp}
          callType={currentCallType}
        />
      )}
    </>
  );
};

export default HomePage;