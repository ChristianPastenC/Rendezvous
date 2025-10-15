import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { initSocket } from '../lib/socket';
import { cryptoService } from '../lib/cryptoService';
import WebRTCService from '../lib/webrtcService';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import MessageInput from '../components/chat/MessageInput';
import VideoCallModal from '../components/chat/VideoCallModal';
import IncomingCallModal from '../components/chat/IncomingCallModal';
import CallTypeModal from '../components/chat/CallTypeModal';

const GroupList = ({ groups, selectedGroupId, onSelectGroup, onCreateGroup }) => (
  <aside className="w-20 bg-gray-900 p-2 flex flex-col items-center space-y-2">
    {groups.map(group => (
      <button key={group.id} onClick={() => onSelectGroup(group.id)} title={group.name}
        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl transition-all duration-200 ${selectedGroupId === group.id ? 'bg-blue-600 rounded-2xl' : 'bg-gray-700 hover:bg-blue-600 hover:rounded-2xl'}`}>
        {group.name.charAt(0).toUpperCase()}
      </button>
    ))}
    <button onClick={onCreateGroup} title="Crear un grupo"
      className="w-12 h-12 rounded-full bg-gray-700 hover:bg-green-600 transition-all duration-200 flex items-center justify-center font-bold text-2xl text-green-400 hover:text-white">
      +
    </button>
  </aside>
);

const ChannelList = ({ channels, selectedChannelId, onSelectChannel }) => (
  <aside className="w-64 bg-gray-800 p-2">
    <h2 className="font-bold text-lg text-white p-2">Canales</h2>
    {channels.map(channel => (
      <button key={channel.id} onClick={() => onSelectChannel(channel.id)}
        className={`w-full text-left p-2 rounded-md transition-colors text-gray-300 hover:bg-gray-700 ${selectedChannelId === channel.id ? 'bg-gray-600 text-white' : ''}`}>
        # {channel.name}
      </button>
    ))}
  </aside>
);

const MessageList = ({ messages }) => {
  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const renderContent = (msg) => {
    const encryptedDataForUser = msg.encryptedPayload[currentUser.uid];
    if (!encryptedDataForUser) {
      return <p className="text-gray-400 italic mt-1">[No tienes permiso para ver este mensaje]</p>;
    }
    const decryptedString = cryptoService.decrypt(encryptedDataForUser);
    if (!decryptedString) {
      return <p className="text-red-400 italic mt-1">[Error al descifrar el mensaje]</p>;
    }
    try {
      const messageObject = JSON.parse(decryptedString);
      switch (messageObject.type) {
        case 'image':
          return <a href={messageObject.fileUrl} target="_blank" rel="noopener noreferrer"><img src={messageObject.fileUrl} alt={messageObject.content} className="mt-2 rounded-lg max-w-xs max-h-64" /></a>;
        case 'file':
          return <a href={messageObject.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center bg-gray-700 hover:bg-gray-600 p-2 rounded-lg"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>{messageObject.content}</a>;
        default:
          return <p className="text-gray-200 mt-1">{messageObject.content}</p>;
      }
    } catch (e) {
      return <p className="text-red-400 italic mt-1">[Mensaje corrupto]</p>;
    }
  };

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-3">
      {messages.map(msg => (
        <div key={msg.id} className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {msg.authorInfo?.photoURL ? (
              <img src={msg.authorInfo.photoURL} alt={msg.authorInfo.displayName} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
                {msg.authorInfo?.displayName?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-baseline space-x-2">
              <span className="font-semibold text-white">{msg.authorInfo?.displayName || 'Usuario'}</span>
              <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {renderContent(msg)}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

const MembersList = ({ members, onCallMember, currentUserId }) => (
  <aside className="w-64 bg-gray-800 p-4 border-l border-gray-900">
    <h2 className="font-bold text-lg text-white mb-4">Miembros</h2>
    <div className="space-y-2">
      {members.map(member => (
        <div key={member.uid} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-700">
          <div className="flex items-center space-x-2">
            {member.photoURL ? (
              <img src={member.photoURL} alt={member.displayName} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
                {member.displayName?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-gray-200 text-sm">{member.displayName}</span>
          </div>
          {member.uid !== currentUserId && (
            <button
              onClick={() => onCallMember(member)}
              className="p-1 rounded hover:bg-gray-600 transition-colors"
              title="Llamar"
            >
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  </aside>
);

const HomePage = () => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [channels, setChannels] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const previousChannelRef = useRef(null);

  const [webrtc, setWebrtc] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [currentCallType, setCurrentCallType] = useState('video');
  const [showCallTypeModal, setShowCallTypeModal] = useState(false);
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [selectedMemberToCall, setSelectedMemberToCall] = useState(null);

  const fetchGroups = useCallback(async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:3000/api/groups', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      setGroups(data);
      if (data.length > 0 && !selectedGroup) {
        setSelectedGroup(data[0].id);
      }
    } catch (error) {
      console.error("Error al obtener grupos:", error);
    }
  }, [currentUser, selectedGroup]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  useEffect(() => {
    const fetchChannels = async () => {
      if (!selectedGroup || !currentUser) return;
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`http://localhost:3000/api/groups/${selectedGroup}/channels`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        setChannels(data);
        if (data.length > 0) {
          setSelectedChannel(data[0].id);
        } else {
          setSelectedChannel(null);
          setMessages([]);
        }
      } catch (error) {
        console.error("Error al obtener canales:", error);
      }
    };
    fetchChannels();
  }, [selectedGroup, currentUser]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!selectedGroup || !currentUser) return;
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`http://localhost:3000/api/groups/${selectedGroup}/members`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
          const data = await response.json();
          setMembers(data);
        }
      } catch (error) {
        console.error("Error al obtener miembros:", error);
      }
    };
    fetchMembers();
  }, [selectedGroup, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    let socketInstance;
    const connect = async () => {
      socketInstance = await initSocket();
      if (socketInstance) {
        setSocket(socketInstance);
        const { publicKey } = await cryptoService.generateAndStoreKeys();
        socketInstance.emit('security:register-public-key', { publicKey });
        socketInstance.on('encryptedMessage', (newMessage) => {
          setMessages(prev => [...prev, newMessage]);
        });
      }
    };
    connect();
    return () => {
      if (socketInstance) {
        socketInstance.off('encryptedMessage');
        socketInstance.disconnect();
      }
    };
  }, [currentUser]);

  useEffect(() => {
    const loadDataAndJoin = async () => {
      if (!selectedChannel || !socket || !currentUser) return;

      if (previousChannelRef.current) {
        socket.emit('leaveChannel', { channelId: previousChannelRef.current });
      }
      socket.emit('joinChannel', { groupId: selectedGroup, channelId: selectedChannel });
      previousChannelRef.current = selectedChannel;

      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`http://localhost:3000/api/groups/${selectedGroup}/channels/${selectedChannel}/messages`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
          const historicalMessages = await response.json();
          setMessages(historicalMessages);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error("Error al cargar mensajes:", error);
        setMessages([]);
      }
    };
    loadDataAndJoin();
  }, [selectedChannel, selectedGroup, socket, currentUser]);

  useEffect(() => {
    if (socket && currentUser) {
      const webrtcService = new WebRTCService(socket);
      setWebrtc(webrtcService);
      webrtcService.onIncomingCall = ({ from, offer, callType, callerName }) => {
        setIncomingCallData({ from, offer, callType, callerName });
        setShowIncomingCallModal(true);
      };
      webrtcService.onRemoteStream = (stream) => setRemoteStream(stream);
      webrtcService.onCallEnded = () => {
        setInCall(false); setLocalStream(null); setRemoteStream(null); setCurrentCallType('video');
      };
      return () => { webrtcService.cleanup(); };
    }
  }, [socket, currentUser]);

  const handleCallMember = (member) => {
    if (inCall) return alert('Ya estás en una llamada');
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
      await webrtc.createOffer(selectedMemberToCall.uid, callType, currentUser.displayName || 'Usuario');
      setInCall(true);
      setSelectedMemberToCall(null);
    } catch (error) {
      console.error('Error al iniciar llamada:', error);
      setSelectedMemberToCall(null);
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
      console.error('Error al aceptar llamada:', error);
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
      if (remoteId) webrtc.hangUp(remoteId);
    }
    setInCall(false);
    setLocalStream(null);
    setRemoteStream(null);
  };

  const handleCreateGroup = async (name) => {
    const token = await currentUser.getIdToken();
    const response = await fetch('http://localhost:3000/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name })
    });
    if (response.ok) {
      setIsModalOpen(false);
      await fetchGroups();
    } else {
      alert('Error al crear el grupo.');
    }
  };

  return (
    <>
      <div className="flex h-screen bg-gray-700 text-white">
        <GroupList groups={groups} selectedGroupId={selectedGroup} onSelectGroup={setSelectedGroup} onCreateGroup={() => setIsModalOpen(true)} />
        <ChannelList channels={channels} selectedChannelId={selectedChannel} onSelectChannel={setSelectedChannel} />
        <main className="flex flex-col flex-1">
          <header className="p-4 bg-gray-700 shadow-md border-b-2 border-gray-900">
            <h2 className="font-bold">{selectedChannel ? `# ${channels.find(c => c.id === selectedChannel)?.name}` : 'Selecciona un canal'}</h2>
          </header>
          <MessageList messages={messages} />
          {selectedGroup && selectedChannel && socket && (
            <MessageInput socket={socket} groupId={selectedGroup} channelId={selectedChannel} members={members} />
          )}
        </main>
        {selectedGroup && <MembersList members={members} onCallMember={handleCallMember} currentUserId={currentUser.uid} />}
      </div>

      {showCallTypeModal && <CallTypeModal onSelectType={handleSelectCallType} onCancel={() => { setShowCallTypeModal(false); setSelectedMemberToCall(null); }} />}
      {showIncomingCallModal && incomingCallData && <IncomingCallModal callerName={incomingCallData.callerName} callType={incomingCallData.callType} onAccept={handleAcceptCall} onReject={handleRejectCall} />}
      {inCall && <VideoCallModal localStream={localStream} remoteStream={remoteStream} onHangUp={handleHangUp} callType={currentCallType} />}
      <CreateGroupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreateGroup} />
    </>
  );
};

export default HomePage;