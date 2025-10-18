// src/pages/GroupView.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useConversations } from '../context/ConversationsContext';
import ConversationsSidebar from '../components/sidebar/ConversationsSidebar';
import ChatHeader from '../components/chat/ChatHeader';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import MembersList from '../components/groups/MembersList';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import AddMemberModal from '../components/groups/AddMemberModal';
import VideoCallModal from '../components/chat/VideoCallModal';
import IncomingCallModal from '../components/chat/IncomingCallModal';
import CallTypeModal from '../components/chat/CallTypeModal';
import WebRTCService from '../lib/webrtcService';

const Loader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mb-3"></div>
      <p className="text-gray-400">Cargando...</p>
    </div>
  </div>
);

const GroupView = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { socket } = useSocket();
  const { conversations, loadConversations } = useConversations();

  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [groupData, setGroupData] = useState(null);
  const [channelId, setChannelId] = useState(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  // WebRTC state
  const [webrtc, setWebrtc] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [currentCallType, setCurrentCallType] = useState('video');
  const [showCallTypeModal, setShowCallTypeModal] = useState(false);
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [selectedMemberToCall, setSelectedMemberToCall] = useState(null);

  const previousChannelId = useRef(null);

  // Cargar datos del grupo
  useEffect(() => {
    const loadGroupData = async () => {
      try {
        const token = await currentUser.getIdToken();

        // Cargar datos básicos del grupo
        const conv = conversations.find(c => c.type === 'group' && c.groupData.id === groupId);
        if (conv) {
          setGroupData(conv.groupData);
        }

        // Cargar canales
        const channelsRes = await fetch(
          `http://localhost:3000/api/groups/${groupId}/channels`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const channelsData = await channelsRes.json();

        if (channelsData.length > 0) {
          setChannelId(channelsData[0].id);
        }

        // Cargar miembros
        const membersRes = await fetch(
          `http://localhost:3000/api/groups/${groupId}/members`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const membersData = await membersRes.json();
        setMembers(membersData);

        // Suscribirse a estados de miembros
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

  // Cargar mensajes cuando tengamos el channelId
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

  // Unirse/Salir del canal
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

  // Escuchar nuevos mensajes
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

  // Escuchar actualizaciones de estado de miembros
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

  // WebRTC setup
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

  const handleMemberAdded = () => {
    // Recargar miembros del grupo
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
      <div className="flex h-screen bg-gray-900 text-white">
        <ConversationsSidebar
          conversations={conversations}
          selectedId={`group_${groupId}`}
          onSelectConversation={handleSelectConversation}
          onCreateGroup={() => setIsCreateGroupModalOpen(true)}
          onStartConversation={(user) => navigate(`/chat/${user.uid}`)}
          onEditProfile={() => navigate('/profile')}
        />

        <main className="flex flex-col flex-1">
          <ChatHeader
            name={groupData.name}
            isGroup={true}
          />

          {isLoadingMessages ? (
            <Loader />
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
        />
      </div>

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onCreate={handleCreateGroup}
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

export default GroupView