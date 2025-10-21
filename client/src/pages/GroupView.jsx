// src/pages/GroupView.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useConversations } from '../context/ConversationsContext';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import MembersList from '../components/groups/MembersList';
import AddMemberModal from '../components/groups/AddMemberModal';
import VideoCallModal from '../components/chat/VideoCallModal';
import IncomingCallModal from '../components/chat/IncomingCallModal';
import CallTypeModal from '../components/chat/CallTypeModal';
import WebRTCService from '../lib/webrtcService';

const Loader = () => (
  <div className="flex items-center justify-center h-full bg-gray-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mb-3"></div>
      <p className="text-gray-600">Cargando mensajes...</p>
    </div>
  </div>
);

const GroupView = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { socket } = useSocket();
  const { conversations } = useConversations();

  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [groupData, setGroupData] = useState(null);
  const [channelId, setChannelId] = useState(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  const [webrtc, setWebrtc] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [currentCallType, setCurrentCallType] = useState('video');
  const [showCallTypeModal, setShowCallTypeModal] = useState(false);
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [selectedMemberToCall, setSelectedMemberToCall] = useState(null);

  const [isMembersOpen, setIsMembersOpen] = useState(false);

  const previousChannelId = useRef(null);

  useEffect(() => {
    const loadGroupData = async () => {
      try {
        const token = await currentUser.getIdToken();

        const conv = conversations.find(c => c.type === 'group' && c.groupData.id === groupId);
        if (conv) {
          setGroupData(conv.groupData);
        }

        const channelsRes = await fetch(
          `http://localhost:3000/api/groups/${groupId}/channels`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const channelsData = await channelsRes.json();

        if (channelsData.length > 0) {
          setChannelId(channelsData[0].id);
        }

        const membersRes = await fetch(
          `http://localhost:3000/api/groups/${groupId}/members`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const membersData = await membersRes.json();
        setMembers(membersData);

        if (socket && membersData.length > 0) {
          const memberIds = membersData.map(m => m.uid);
          socket.emit('subscribeToStatus', memberIds);
        }
      } catch (error) {
        console.error('Error cargando datos del grupo:', error);
      }
    };

    loadGroupData();
  }, [groupId, conversations, currentUser, socket]);

  useEffect(() => {
    if (!channelId) return;

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(
          `http://localhost:3000/api/groups/${groupId}/channels/${channelId}/messages`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const messagesData = response.ok ? await response.json() : [];
        setMessages(messagesData);
      } catch (error) {
        console.error('Error cargando mensajes:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [channelId, groupId, currentUser]);

  useEffect(() => {
    if (!socket || !channelId) return;

    if (previousChannelId.current) {
      socket.emit('leaveChannel', { conversationId: previousChannelId.current });
    }

    socket.emit('joinChannel', { conversationId: channelId });
    previousChannelId.current = channelId;

    return () => {
      if (socket && channelId) {
        socket.emit('leaveChannel', { conversationId: channelId });
      }
    };
  }, [socket, channelId]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
    };

    socket.on('encryptedMessage', handleNewMessage);

    return () => {
      socket.off('encryptedMessage', handleNewMessage);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = ({ uid, status, lastSeen }) => {
      setMembers(prevMembers =>
        prevMembers.map(member =>
          member.uid === uid ? { ...member, status, lastSeen } : member
        )
      );
    };

    socket.on('statusUpdate', handleStatusUpdate);

    return () => {
      socket.off('statusUpdate', handleStatusUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !currentUser) return;

    const webrtcService = new WebRTCService(socket);
    setWebrtc(webrtcService);

    webrtcService.onIncomingCall = ({ from, offer, callType, callerName }) => {
      setIncomingCallData({ from, offer, callType, callerName });
      setShowIncomingCallModal(true);
    };

    webrtcService.onRemoteStream = (stream) => setRemoteStream(stream);

    webrtcService.onCallEnded = () => {
      setInCall(false);
      setLocalStream(null);
      setRemoteStream(null);
    };

    return () => {
      webrtcService.cleanup();
    };
  }, [socket, currentUser]);

  const handleCallMember = (member) => {
    if (inCall) return;
    setSelectedMemberToCall(member);
    setShowCallTypeModal(true);
  };

  const handleSelectCallType = async (callType) => {
    setShowCallTypeModal(false);
    if (!selectedMemberToCall || !webrtc) return;

    try {
      setCurrentCallType(callType);
      const stream = await webrtc.startLocalStream(callType);
      setLocalStream(stream);
      await webrtc.createOffer(
        selectedMemberToCall.uid,
        callType,
        currentUser.displayName || 'Usuario'
      );
      setInCall(true);
    } catch (error) {
      console.error('Error iniciando llamada:', error);
      setSelectedMemberToCall(null);
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCallData || !webrtc) return;

    try {
      setCurrentCallType(incomingCallData.callType);
      const stream = await webrtc.startLocalStream(incomingCallData.callType);
      setLocalStream(stream);
      await webrtc.acceptCall(
        incomingCallData.from,
        incomingCallData.offer,
        incomingCallData.callType
      );
      setInCall(true);
      setShowIncomingCallModal(false);
      setIncomingCallData(null);
    } catch (error) {
      console.error('Error aceptando llamada:', error);
      handleRejectCall();
    }
  };

  const handleRejectCall = () => {
    if (incomingCallData && webrtc) {
      webrtc.rejectCall(incomingCallData.from);
    }
    setShowIncomingCallModal(false);
    setIncomingCallData(null);
  };

  const handleHangUp = () => {
    if (webrtc) {
      const remoteId = incomingCallData?.from || selectedMemberToCall?.uid;
      if (remoteId) {
        webrtc.hangUp(remoteId);
      }
    }
  };

  const handleMemberAdded = () => {
    const loadMembers = async () => {
      try {
        const token = await currentUser.getIdToken();
        const membersRes = await fetch(
          `http://localhost:3000/api/groups/${groupId}/members`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const membersData = await membersRes.json();
        setMembers(membersData);
      } catch (error) {
        console.error('Error recargando miembros:', error);
      }
    };
    loadMembers();
  };

  if (!groupData) {
    return <Loader />;
  }

  const isOwner = currentUser.uid === groupData.ownerId;

  return (
    <>
      <main className="flex flex-col flex-1 min-w-0 h-full pb-16 lg:pb-0">
        <div className="flex items-center justify-between p-3 sm:p-4 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
          <button
              onClick={() => navigate('/')}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500 flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0 text-white">
              {groupData?.name?.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-base sm:text-lg leading-tight text-gray-800 truncate">
                {groupData?.name}
              </h2>
            </div>
          </div>

          <button
            onClick={() => setIsMembersOpen(true)}
            className="xl:hidden p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
        </div>

        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mb-3"></div>
              <p className="text-gray-600">Cargando...</p>
            </div>
          </div>
        ) : (
          <>
            <MessageList messages={messages} />
            {socket && channelId && (
              <MessageInput
                socket={socket}
                isDirectMessage={false}
                conversationId={channelId}
                groupId={groupId}
                members={members}
              />
            )}
          </>
        )}
      </main>

      <MembersList
        members={members}
        onCallMember={handleCallMember}
        currentUserId={currentUser.uid}
        isOwner={isOwner}
        onAddMemberClick={() => setIsAddMemberModalOpen(true)}
        isOpen={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
      />
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onMemberAdded={handleMemberAdded}
        groupId={groupId}
      />

      {showCallTypeModal && (
        <CallTypeModal
          onSelectType={handleSelectCallType}
          onCancel={() => {
            setShowCallTypeModal(false);
            setSelectedMemberToCall(null);
          }}
        />
      )}

      {showIncomingCallModal && incomingCallData && (
        <IncomingCallModal
          callerName={incomingCallData.callerName}
          callType={incomingCallData.callType}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {inCall && (
        <VideoCallModal
          localStream={localStream}
          remoteStream={remoteStream}
          onHangUp={handleHangUp}
          callType={currentCallType}
        />
      )}
    </>
  );
};

export default GroupView;