// src/pages/ChatView.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useConversations } from '../context/ConversationsContext';
import ConversationsSidebar from '../components/sidebar/ConversationsSidebar';
import ChatHeader from '../components/chat/ChatHeader';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import VideoCallModal from '../components/chat/VideoCallModal';
import IncomingCallModal from '../components/chat/IncomingCallModal';
import CallTypeModal from '../components/chat/CallTypeModal';
import WebRTCService from '../lib/webrtcService';

const Loader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mb-3"></div>
      <p className="text-gray-400">Cargando mensajes...</p>
    </div>
  </div>
);

const ChatView = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { socket } = useSocket();
  const { conversations, loadConversations } = useConversations();

  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [otherUser, setOtherUser] = useState(null);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);

  const [webrtc, setWebrtc] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [currentCallType, setCurrentCallType] = useState('video');
  const [showCallTypeModal, setShowCallTypeModal] = useState(false);
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);

  const conversationId = [currentUser.uid, userId].sort().join('_');
  const previousConversationId = useRef(null);

  useEffect(() => {
    const conv = conversations.find(c => c.type === 'dm' && c.userData.uid === userId);
    if (conv) {
      setOtherUser(conv.userData);
    } else {
      const loadUserData = async () => {
        try {
          const token = await currentUser.getIdToken();
          const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const userData = await response.json();
            setOtherUser(userData);
          }
        } catch (error) {
          console.error('Error cargando usuario:', error);
        }
      };
      loadUserData();
    }
  }, [userId, conversations, currentUser]);

  useEffect(() => {
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(
          `http://localhost:3000/api/dms/${conversationId}/messages`,
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
  }, [conversationId, currentUser]);

  useEffect(() => {
    if (!socket) return;

    if (previousConversationId.current) {
      socket.emit('leaveChannel', { conversationId: previousConversationId.current });
    }

    socket.emit('joinChannel', { conversationId });
    previousConversationId.current = conversationId;

    return () => {
      if (socket && conversationId) {
        socket.emit('leaveChannel', { conversationId });
      }
    };
  }, [socket, conversationId]);

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

  const handleCall = () => {
    if (inCall) return;
    setShowCallTypeModal(true);
  };

  const handleSelectCallType = async (callType) => {
    setShowCallTypeModal(false);
    if (!webrtc || !otherUser) return;

    try {
      setCurrentCallType(callType);
      const stream = await webrtc.startLocalStream(callType);
      setLocalStream(stream);
      await webrtc.createOffer(otherUser.uid, callType, currentUser.displayName || 'Usuario');
      setInCall(true);
    } catch (error) {
      console.error('Error iniciando llamada:', error);
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCallData || !webrtc) return;

    try {
      setCurrentCallType(incomingCallData.callType);
      const stream = await webrtc.startLocalStream(incomingCallData.callType);
      setLocalStream(stream);
      await webrtc.acceptCall(incomingCallData.from, incomingCallData.offer, incomingCallData.callType);
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
    if (webrtc && otherUser) {
      webrtc.hangUp(otherUser.uid);
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

  if (!otherUser) {
    return <Loader />;
  }

  return (
    <>
      <div className="flex h-screen bg-gray-900 text-white">
        <ConversationsSidebar
          conversations={conversations}
          selectedId={`dm_${userId}`}
          onSelectConversation={handleSelectConversation}
          onCreateGroup={() => setIsCreateGroupModalOpen(true)}
          onStartConversation={(user) => navigate(`/chat/${user.uid}`)}
          onEditProfile={() => navigate('/profile')}
        />

        <main className="flex flex-col flex-1">
          <ChatHeader
            name={otherUser.displayName}
            photoURL={otherUser.photoURL}
            status={otherUser.status}
            lastSeen={otherUser.lastSeen}
            onCall={handleCall}
            inCall={inCall}
          />

          {isLoadingMessages ? (
            <Loader />
          ) : (
            <>
              <MessageList messages={messages} />
              {socket && (
                <MessageInput
                  socket={socket}
                  isDirectMessage={true}
                  conversationId={conversationId}
                  members={[
                    { uid: currentUser.uid },
                    { uid: userId }
                  ]}
                />
              )}
            </>
          )}
        </main>
      </div>

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onCreate={handleCreateGroup}
      />

      {showCallTypeModal && (
        <CallTypeModal
          onSelectType={handleSelectCallType}
          onCancel={() => setShowCallTypeModal(false)}
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

export default ChatView;