import { useState, useEffect, useRef } from 'react';
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

const HomePage = () => {
  const {
    socket,
    currentUser,
    selectedConversation,
    loadAllData,
    onClearSelectedConversation,
  } = useOutletContext();

  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  const previousConversationId = useRef(null);
  const messagesCache = useRef({});
  const membersCache = useRef({});

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      const conversationId = previousConversationId.current;
      if (!conversationId) return;

      const updatedCache = [...(messagesCache.current[conversationId] || []), newMessage];
      messagesCache.current[conversationId] = updatedCache;

      let selectedConvId = null;
      if (selectedConversation) {
        if (selectedConversation.type === 'dm') {
          selectedConvId = [currentUser.uid, selectedConversation.userData.uid].sort().join('_');
        } else if (selectedConversation.type === 'group') {
          selectedConvId = selectedConversation.groupData.channelId;
        }
      }

      if (conversationId === selectedConvId) {
        setMessages(prevMessages => [...prevMessages, newMessage]);
      }
    };

    socket.on('encryptedMessage', handleNewMessage);

    return () => {
      socket.off('encryptedMessage', handleNewMessage);
    };
  }, [socket, currentUser, selectedConversation]);

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
  }

  useEffect(() => {
    const loadConversation = async () => {
      if (!selectedConversation || !currentUser) { setMessages([]); setMembers([]); return; }
      setIsLoadingMessages(true);

      let conversationId, membersToSet = [];
      let isDirectMessage = selectedConversation.type === 'dm';

      if (isDirectMessage) {
        conversationId = [currentUser.uid, selectedConversation.userData.uid].sort().join('_');
        membersToSet = [currentUser, selectedConversation.userData];
      } else {
        const groupId = selectedConversation.groupData.id;
        let channelId = selectedConversation.groupData.channelId;

        if (!channelId) {
          const token = await currentUser.getIdToken();
          const channelsRes = await fetch(
            `http://localhost:3000/api/groups/${groupId}/channels`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            });
          const channelsData = await channelsRes.json();
          if (channelsData.length > 0) {
            channelId = channelsData[0].id;
            selectedConversation.groupData.channelId = channelId;
          }
        }
        conversationId = channelId;

        if (membersCache.current[groupId]) {
          membersToSet = membersCache.current[groupId];
        } else {
          const token = await currentUser.getIdToken();
          const membersRes = await fetch(
            `http://localhost:3000/api/groups/${groupId}/members`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            });
          membersToSet = await membersRes.json();
          membersCache.current[groupId] = membersToSet;
        }

        if (socket && membersToSet.length > 0) {
          const memberIds = membersToSet.map(m => m.uid);
          socket.emit('subscribeToStatus', memberIds);
        }
      }

      setMembers(membersToSet);

      if (previousConversationId.current)
        socket?.emit(
          'leaveChannel',
          { conversationId: previousConversationId.current }
        );
      if (conversationId) {
        socket?.emit('joinChannel', { conversationId });
        previousConversationId.current = conversationId;

        if (messagesCache.current[conversationId]) {
          setMessages(messagesCache.current[conversationId]);
        } else {
          const token = await currentUser.getIdToken();
          const endpoint = isDirectMessage
            ? `/api/dms/${conversationId}/messages`
            : `/api/groups/${selectedConversation.groupData.id}/channels/${conversationId}/messages`;
          const response = await fetch(
            `http://localhost:3000${endpoint}`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            });
          const messagesData = response.ok ? await response.json() : [];
          messagesCache.current[conversationId] = messagesData;
          setMessages(messagesData);
        }
      }
      setIsLoadingMessages(false);
    };
    loadConversation();
  }, [selectedConversation, currentUser, socket]);

  const getMembersForMessage = () => {
    if (selectedConversation?.type === 'dm')
      return [{ uid: currentUser.uid }, { uid: selectedConversation.userData.uid }];
    return members;
  };
  const getCurrentConversationId = () => {
    if (selectedConversation?.type === 'dm')
      return [currentUser.uid, selectedConversation.userData.uid].sort().join('_');
    return selectedConversation?.groupData?.channelId;
  };
  const getCallTarget = () => {
    if (selectedConversation?.type === 'dm')
      return selectedConversation.userData;
    if (members.length > 1)
      return members.find(m => m.uid !== currentUser.uid);
    return null;
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
                  <MessageList messages={messages} currentUserUid={currentUser?.uid} />
                  {socket && (
                    <MessageInput
                      socket={socket}
                      isDirectMessage={selectedConversation.type === 'dm'}
                      conversationId={getCurrentConversationId()}
                      groupId={selectedConversation.type === 'group' ? selectedConversation.groupData.id : null}
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
            isOwner={currentUser.uid === selectedConversation.groupData.ownerId}
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
          isOwner={currentUser.uid === selectedConversation.groupData.ownerId}
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
          onMemberAdded={loadAllData}
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