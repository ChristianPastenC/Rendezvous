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
import UserSearch from '../components/dms/UserSearch';
import AddMemberModal from '../components/groups/AddMemberModal';
import ProfileEditModal from '../components/user/UserPerfilModal';

const Loader = () => (
  <div className="flex items-center justify-center h-screen bg-gray-900">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
      <p className="text-gray-400 text-lg">Cargando...</p>
    </div>
  </div>
);

const UnifiedSidebar = ({ conversations, selectedId, onSelectConversation, onCreateGroup, onStartConversation, onEditProfile }) => {
  const [filter, setFilter] = useState('all');
  const filteredConversations = conversations.filter(conv => {
    if (filter === 'all') return true;
    if (filter === 'dms') return conv.type === 'dm';
    if (filter === 'groups') return conv.type === 'group';
    return true;
  });

  return (
    <aside className="w-72 bg-gray-800 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-900">
        <h2 className="font-bold text-lg text-white mb-3">Conversaciones</h2>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setFilter('all')} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Todos</button>
          <button onClick={() => setFilter('dms')} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'dms' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Directos</button>
          <button onClick={() => setFilter('groups')} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'groups' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Grupos</button>
        </div>
        <UserSearch onSelectUser={onStartConversation} />
      </div>
      <div className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredConversations.map(conv => (
          <button key={conv.id} onClick={() => onSelectConversation(conv)} className={`w-full text-left p-3 rounded-md flex items-center space-x-3 transition-colors ${selectedId === conv.id ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
            {conv.type === 'group' ? (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg flex-shrink-0">{conv.name.charAt(0).toUpperCase()}</div>
            ) : conv.photoURL ? (
              <img src={conv.photoURL} alt={conv.name} className="w-10 h-10 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-lg flex-shrink-0">{conv.name.charAt(0).toUpperCase()}</div>
            )}
            <div className="flex-1 min-w-0">
              <span className="font-medium truncate">{conv.name}</span>
            </div>
          </button>
        ))}
      </div>
      <button onClick={onCreateGroup} className="m-3 p-3 rounded-md bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 font-semibold">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        <span>Crear Grupo</span>
      </button>
      <div className="p-2 border-t border-gray-900 mt-auto">
        <div className="flex items-center justify-between">
          <button onClick={onEditProfile} className="p-2 rounded-lg hover:bg-gray-700" title="Editar Perfil">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

const MessageList = ({ messages }) => {
  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const renderContent = (msg) => {
    const encryptedDataForUser = msg.encryptedPayload?.[currentUser.uid];
    if (!encryptedDataForUser) return <p className="text-gray-400 italic mt-1">[No tienes permiso para ver este mensaje]</p>;
    const decryptedString = cryptoService.decrypt(encryptedDataForUser);
    if (!decryptedString) return <p className="text-red-400 italic mt-1">[Error al descifrar]</p>;
    try {
      const messageObject = JSON.parse(decryptedString);
      switch (messageObject.type) {
        case 'image':
          return <a href={messageObject.fileUrl} target="_blank" rel="noopener noreferrer"><img src={messageObject.fileUrl} alt={messageObject.content} className="mt-2 rounded-lg max-w-xs max-h-64" /></a>;
        case 'file':
          return <a href={messageObject.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center bg-gray-700 hover:bg-gray-600 p-2 rounded-lg"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>{messageObject.content}</a>;
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

const MembersList = ({ members, onCallMember, currentUserId, onAddMemberClick, isOwner }) => (
  <aside className="w-64 bg-gray-800 p-4 border-l border-gray-900 flex-shrink-0 flex flex-col">
    <h2 className="font-bold text-lg text-white mb-4">Miembros ({members.length})</h2>
    <div className="space-y-2 flex-1 overflow-y-auto">
      {members.map(member => (
        <div key={member.uid} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-700 transition-colors">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {member.photoURL ? (<img src={member.photoURL} alt={member.displayName} className="w-8 h-8 rounded-full flex-shrink-0" />) : (<div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">{member.displayName?.charAt(0).toUpperCase() || '?'}</div>)}
            <span className="text-gray-200 text-sm truncate">{member.displayName}</span>
          </div>
          {member.uid !== currentUserId && (<button onClick={() => onCallMember(member)} className="p-1 hover:bg-gray-600 rounded" title="Llamar"><svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></button>)}
        </div>
      ))}
    </div>
    {isOwner && (<button onClick={onAddMemberClick} className="mt-4 p-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold w-full transition-colors">Añadir Miembro</button>)}
  </aside>
);

const HomePage = () => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const previousConversationId = useRef(null);
  const messagesCache = useRef({});
  const membersCache = useRef({});

  const [webrtc, setWebrtc] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [currentCallType, setCurrentCallType] = useState('video');
  const [showCallTypeModal, setShowCallTypeModal] = useState(false);
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [selectedMemberToCall, setSelectedMemberToCall] = useState(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const loadAllData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const [groupsRes, contactsRes] = await Promise.all([
        fetch('http://localhost:3000/api/groups', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:3000/api/contacts', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const groupsData = await groupsRes.json();
      const contactsData = await contactsRes.json();
      const unifiedConversations = [
        ...contactsData.map(contact => ({ id: `dm_${contact.uid}`, type: 'dm', name: contact.displayName, photoURL: contact.photoURL, userData: contact })),
        ...groupsData.map(group => ({ id: `group_${group.id}`, type: 'group', name: group.name, groupData: group }))
      ];
      setConversations(unifiedConversations);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  useEffect(() => {
    if (!currentUser) return;
    let socketInstance;
    const connect = async () => {
      socketInstance = await initSocket();
      if (socketInstance) {
        setSocket(socketInstance);
        const { publicKey } = await cryptoService.generateAndStoreKeys();
        socketInstance.emit('security:register-public-key', { publicKey });
      }
    };
    connect();
    return () => { if (socketInstance) socketInstance.disconnect(); };
  }, [currentUser]);

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
          const channelsRes = await fetch(`http://localhost:3000/api/groups/${groupId}/channels`, { headers: { 'Authorization': `Bearer ${token}` } });
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
          const membersRes = await fetch(`http://localhost:3000/api/groups/${groupId}/members`, { headers: { 'Authorization': `Bearer ${token}` } });
          membersToSet = await membersRes.json();
          membersCache.current[groupId] = membersToSet;
        }
      }

      setMembers(membersToSet);

      if (previousConversationId.current) socket?.emit('leaveChannel', { conversationId: previousConversationId.current });
      if (conversationId) {
        socket?.emit('joinChannel', { conversationId });
        previousConversationId.current = conversationId;

        if (messagesCache.current[conversationId]) {
          setMessages(messagesCache.current[conversationId]);
        } else {
          const token = await currentUser.getIdToken();
          const endpoint = isDirectMessage ? `/api/dms/${conversationId}/messages` : `/api/groups/${selectedConversation.groupData.id}/channels/${conversationId}/messages`;
          const response = await fetch(`http://localhost:3000${endpoint}`, { headers: { 'Authorization': `Bearer ${token}` } });
          const messagesData = response.ok ? await response.json() : [];
          messagesCache.current[conversationId] = messagesData;
          setMessages(messagesData);
        }
      }
      setIsLoadingMessages(false);
    };
    loadConversation();
  }, [selectedConversation, currentUser, socket]);

  useEffect(() => {
    if (socket && currentUser) {
      const webrtcService = new WebRTCService(socket);
      setWebrtc(webrtcService);
      webrtcService.onIncomingCall = ({ from, offer, callType, callerName }) => { setIncomingCallData({ from, offer, callType, callerName }); setShowIncomingCallModal(true); };
      webrtcService.onRemoteStream = (stream) => setRemoteStream(stream);
      webrtcService.onCallEnded = () => { setInCall(false); setLocalStream(null); setRemoteStream(null); };
      return () => { webrtcService.cleanup(); };
    }
  }, [socket, currentUser]);

  const handleSelectConversation = (conv) => { setSelectedConversation(conv); };
  const handleStartConversation = (user) => {
    const existingConv = conversations.find(c => c.type === 'dm' && c.userData.uid === user.uid);
    if (existingConv) {
      setSelectedConversation(existingConv);
    } else {
      const newConv = { id: `dm_${user.uid}`, type: 'dm', name: user.displayName, photoURL: user.photoURL, userData: user };
      setConversations(prev => [newConv, ...prev]);
      setSelectedConversation(newConv);
    }
  };

  const handleCallMember = (member) => { if (inCall) return; setSelectedMemberToCall(member); setShowCallTypeModal(true); };
  const handleSelectCallType = async (callType) => { setShowCallTypeModal(false); if (!selectedMemberToCall || !webrtc) return; try { setCurrentCallType(callType); const stream = await webrtc.startLocalStream(callType); setLocalStream(stream); await webrtc.createOffer(selectedMemberToCall.uid, callType, currentUser.displayName || 'Usuario'); setInCall(true); } catch (e) { setSelectedMemberToCall(null); } };
  const handleAcceptCall = async () => { if (!incomingCallData || !webrtc) return; try { setCurrentCallType(incomingCallData.callType); const stream = await webrtc.startLocalStream(incomingCallData.callType); setLocalStream(stream); await webrtc.acceptCall(incomingCallData.from, incomingCallData.offer, incomingCallData.callType); setInCall(true); setShowIncomingCallModal(false); setIncomingCallData(null); } catch (e) { handleRejectCall(); } };
  const handleRejectCall = () => { if (incomingCallData && webrtc) webrtc.rejectCall(incomingCallData.from); setShowIncomingCallModal(false); setIncomingCallData(null); };
  const handleHangUp = () => { if (webrtc) { const remoteId = incomingCallData?.from || selectedMemberToCall?.uid; if (remoteId) webrtc.hangUp(remoteId); } };
  const handleCreateGroup = async (name, memberIds) => {
    const token = await currentUser.getIdToken();
    const response = await fetch('http://localhost:3000/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name, memberIds }) });
    if (response.ok) {
      setIsCreateGroupModalOpen(false);
      messagesCache.current = {}; membersCache.current = {};
      await loadAllData();
    } else {
      alert('Error al crear el grupo.');
    }
  };

  const getMembersForMessage = () => {
    if (selectedConversation?.type === 'dm') return [{ uid: currentUser.uid }, { uid: selectedConversation.userData.uid }];
    return members;
  };

  const getCurrentConversationId = () => {
    if (selectedConversation?.type === 'dm') return [currentUser.uid, selectedConversation.userData.uid].sort().join('_');
    return selectedConversation?.groupData?.channelId;
  };

  const getCallTarget = () => {
    if (selectedConversation?.type === 'dm') return selectedConversation.userData;
    if (members.length > 1) return members.find(m => m.uid !== currentUser.uid);
    return null;
  };

  const handleProfileUpdate = () => {
    loadAllData();
  };

  if (isLoading) return <Loader />;

  return (
    <>
      <div className="flex h-screen bg-gray-900 text-white">
        <UnifiedSidebar
          conversations={conversations}
          selectedId={selectedConversation?.id}
          onSelectConversation={handleSelectConversation}
          onCreateGroup={() => setIsCreateGroupModalOpen(true)}
          onStartConversation={handleStartConversation}
          onEditProfile={() => setIsProfileModalOpen(true)}
        />
        <main className="flex flex-col flex-1">
          <header className="p-4 bg-gray-800 shadow-lg border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center space-x-3">{selectedConversation ? (<>{selectedConversation.type === 'group' ? (<div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">{selectedConversation.name.charAt(0).toUpperCase()}</div>) : selectedConversation.photoURL ? (<img src={selectedConversation.photoURL} alt={selectedConversation.name} className="w-10 h-10 rounded-full" />) : (<div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-lg">{selectedConversation.name.charAt(0).toUpperCase()}</div>)}<h2 className="font-bold text-lg">{selectedConversation.name}</h2></>) : (<h2 className="font-bold text-lg text-gray-400">Selecciona una conversación</h2>)}</div>
            {selectedConversation && getCallTarget() && (<button onClick={() => handleCallMember(getCallTarget())} disabled={inCall} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></button>)}
          </header>
          {selectedConversation ? (
            <>
              {isLoadingMessages ? (<div className="flex-1 flex items-center justify-center"><div className="text-center"><div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mb-3"></div><p className="text-gray-400">Cargando mensajes...</p></div></div>) : (
                <>
                  <MessageList messages={messages} />
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
            <div className="flex-1 flex items-center justify-center"><div className="text-center text-gray-500"><svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><p className="text-xl">Selecciona una conversación para empezar</p></div></div>
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
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdate={handleProfileUpdate}
      />
      <CreateGroupModal isOpen={isCreateGroupModalOpen} onClose={() => setIsCreateGroupModalOpen(false)} onCreate={handleCreateGroup} />
      {selectedConversation?.type === 'group' && <AddMemberModal isOpen={isAddMemberModalOpen} onClose={() => setIsAddMemberModalOpen(false)} onMemberAdded={loadAllData} groupId={selectedConversation.groupData.id} />}
      {showCallTypeModal && <CallTypeModal onSelectType={handleSelectCallType} onCancel={() => { setShowCallTypeModal(false); setSelectedMemberToCall(null); }} />}
      {showIncomingCallModal && incomingCallData && <IncomingCallModal callerName={incomingCallData.callerName} callType={incomingCallData.callType} onAccept={handleAcceptCall} onReject={handleRejectCall} />}
      {inCall && <VideoCallModal localStream={localStream} remoteStream={remoteStream} onHangUp={handleHangUp} callType={currentCallType} />}
    </>
  );
};

export default HomePage;