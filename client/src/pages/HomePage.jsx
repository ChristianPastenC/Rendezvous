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

const NavigationBar = ({ view, onChangeView }) => (
  <div className="w-20 bg-gray-900 p-2 flex flex-col items-center space-y-2 flex-shrink-0">
    <button
      onClick={() => onChangeView('dms')}
      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl transition-all duration-200 ${view === 'dms' ? 'bg-blue-600 rounded-2xl' : 'bg-gray-700 hover:bg-blue-600 hover:rounded-2xl'}`}
      title="Mensajes Directos"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
    </button>
    <div className="w-full h-px bg-gray-700 my-2"></div>
    <button
      onClick={() => onChangeView('groups')}
      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl transition-all duration-200 ${view === 'groups' ? 'bg-blue-600 rounded-2xl' : 'bg-gray-700 hover:bg-blue-600 hover:rounded-2xl'}`}
      title="Ver Grupos"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    </button>
  </div>
);

const GroupList = ({ groups, selectedGroupId, onSelectGroup, onCreateGroup }) => (
  <aside className="w-64 bg-gray-800 flex flex-col flex-shrink-0">
    <h2 className="font-bold text-lg text-white p-4 border-b border-gray-900">Grupos</h2>
    <div className="flex-1 p-2 space-y-1 overflow-y-auto">
      {groups.map(group => (
        <button key={group.id} onClick={() => onSelectGroup(group.id)}
          className={`w-full text-left p-3 rounded-md flex items-center space-x-3 transition-colors ${selectedGroupId === group.id ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg flex-shrink-0">{group.name.charAt(0).toUpperCase()}</div>
          <span className="truncate">{group.name}</span>
        </button>
      ))}
    </div>
    <button onClick={onCreateGroup} className="m-2 p-3 rounded-md bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 font-semibold">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
      <span>Crear Grupo</span>
    </button>
  </aside>
);

const DirectMessagesList = ({ contacts, onSelectContact, selectedContactId, onStartConversation }) => (
  <aside className="w-64 bg-gray-800 flex flex-col flex-shrink-0">
    <UserSearch onSelectUser={onStartConversation} />
    <div className="flex-1 p-2 space-y-1 overflow-y-auto">
      <h2 className="font-bold text-xs text-gray-400 uppercase px-2 mb-2">Mensajes Directos</h2>
      {contacts.length === 0 ? (
        <p className="text-gray-500 text-sm px-2 py-4">Busca usuarios para iniciar un chat.</p>
      ) : (
        contacts.map(contact => (
          <button key={contact.uid} onClick={() => onSelectContact(contact)}
            className={`w-full text-left p-3 rounded-md flex items-center space-x-3 transition-colors ${selectedContactId === contact.uid ? 'bg-gray-600' : 'hover:bg-gray-700'}`}>
            {contact.photoURL ? <img src={contact.photoURL} alt={contact.displayName} className="w-8 h-8 rounded-full flex-shrink-0" /> : <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">{contact.displayName?.charAt(0).toUpperCase() || '?'}</div>}
            <span className="text-gray-300 truncate">{contact.displayName}</span>
          </button>
        ))
      )}
    </div>
  </aside>
);

const MessageList = ({ messages }) => {
  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const renderContent = (msg) => {
    const encryptedDataForUser = msg.encryptedPayload[currentUser.uid];
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
          <div className="flex-shrink-0">{msg.authorInfo?.photoURL ? <img src={msg.authorInfo.photoURL} alt={msg.authorInfo.displayName} className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">{msg.authorInfo?.displayName?.charAt(0).toUpperCase() || '?'}</div>}</div>
          <div className="flex-1">
            <div className="flex items-baseline space-x-2"><span className="font-semibold text-white">{msg.authorInfo?.displayName || 'Usuario'}</span><span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
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
    <h2 className="font-bold text-lg text-white mb-4">Miembros</h2>
    <div className="space-y-2 flex-1 overflow-y-auto">
      {members.map(member => (
        <div key={member.uid} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-700">
          <span className="text-gray-200 text-sm">{member.displayName}</span>
          {member.uid !== currentUserId && (<button onClick={() => onCallMember(member)} className="p-1" title="Llamar"><svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></button>)}
        </div>
      ))}
    </div>
    {isOwner && (<button onClick={onAddMemberClick} className="mt-4 p-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold w-full">Añadir Miembro</button>)}
  </aside>
);

const HomePage = () => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [mainView, setMainView] = useState('dms');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [selectedDM, setSelectedDM] = useState(null);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const previousConversationId = useRef(null);

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
    const token = await currentUser.getIdToken();
    const response = await fetch('http://localhost:3000/api/groups', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await response.json();
    setGroups(data);
  }, [currentUser]);

  const fetchContacts = useCallback(async () => {
    if (!currentUser) return;
    const token = await currentUser.getIdToken();
    const response = await fetch('http://localhost:3000/api/contacts', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await response.json();
    setContacts(data);
  }, [currentUser]);

  useEffect(() => { fetchGroups(); fetchContacts(); }, [fetchGroups, fetchContacts]);

  useEffect(() => {
    if (!selectedGroup || !currentUser) return;
    const fetchGroupData = async () => {
      const token = await currentUser.getIdToken();
      const [channelsRes, membersRes] = await Promise.all([
        fetch(`http://localhost:3000/api/groups/${selectedGroup.id}/channels`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`http://localhost:3000/api/groups/${selectedGroup.id}/members`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const channelsData = await channelsRes.json();
      const membersData = await membersRes.json();

      // Como solo hay un canal, lo seleccionamos directamente
      if (channelsData.length > 0) {
        setSelectedChannelId(channelsData[0].id);
      } else {
        setSelectedChannelId(null);
      }
      setMembers(membersData);
    };
    fetchGroupData();
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
        socketInstance.on('encryptedMessage', (newMessage) => setMessages(prev => [...prev, newMessage]));
      }
    };
    connect();
    return () => { if (socketInstance) { socketInstance.off('encryptedMessage'); socketInstance.disconnect(); } };
  }, [currentUser]);

  useEffect(() => {
    const loadDataAndJoin = async () => {
      if (!socket || !currentUser || (!selectedChannelId && !selectedDM)) { setMessages([]); return; }
      if (previousConversationId.current) socket.emit('leaveChannel', { conversationId: previousConversationId.current });

      let conversationId, endpoint, isDirectMessage = !!selectedDM;

      if (selectedDM) {
        conversationId = [currentUser.uid, selectedDM.uid].sort().join('_');
        endpoint = `/api/dms/${conversationId}/messages`;
      } else if (selectedGroup && selectedChannelId) {
        conversationId = selectedChannelId;
        endpoint = `/api/groups/${selectedGroup.id}/channels/${selectedChannelId}/messages`;
      } else {
        return;
      }

      socket.emit('joinChannel', { conversationId, isDirectMessage });
      previousConversationId.current = conversationId;

      const token = await currentUser.getIdToken();
      const response = await fetch(`http://localhost:3000${endpoint}`, { headers: { 'Authorization': `Bearer ${token}` } });
      setMessages(response.ok ? await response.json() : []);
    };
    loadDataAndJoin();
  }, [selectedDM, selectedChannelId, selectedGroup, socket, currentUser]);

  useEffect(() => {
    if (socket && currentUser) {
      const webrtcService = new WebRTCService(socket);
      setWebrtc(webrtcService);
      webrtcService.onIncomingCall = ({ from, offer, callType, callerName }) => { setIncomingCallData({ from, offer, callType, callerName }); setShowIncomingCallModal(true); };
      webrtcService.onRemoteStream = (stream) => setRemoteStream(stream);
      webrtcService.onCallEnded = () => { setInCall(false); setLocalStream(null); setRemoteStream(null); setCurrentCallType('video'); };
      return () => { webrtcService.cleanup(); };
    }
  }, [socket, currentUser]);

  const handleChangeMainView = (view) => { setMainView(view); setSelectedGroup(null); setSelectedChannelId(null); setSelectedDM(null); };
  const handleSelectGroup = (groupId) => { setSelectedDM(null); setSelectedGroup(groups.find(g => g.id === groupId)); setMainView('groups'); };
  const handleSelectContact = (user) => { setSelectedGroup(null); setSelectedChannelId(null); setSelectedDM(user); setMainView('dms'); };
  const handleCallMember = (member) => { if (inCall) return; setSelectedMemberToCall(member); setShowCallTypeModal(true); };
  const handleSelectCallType = async (callType) => { setShowCallTypeModal(false); if (!selectedMemberToCall || !webrtc) return; try { setCurrentCallType(callType); const stream = await webrtc.startLocalStream(callType); setLocalStream(stream); await webrtc.createOffer(selectedMemberToCall.uid, callType, currentUser.displayName || 'Usuario'); setInCall(true); } catch (e) { setSelectedMemberToCall(null); } };
  const handleAcceptCall = async () => { if (!incomingCallData || !webrtc) return; try { setCurrentCallType(incomingCallData.callType); const stream = await webrtc.startLocalStream(incomingCallData.callType); setLocalStream(stream); await webrtc.acceptCall(incomingCallData.from, incomingCallData.offer, incomingCallData.callType); setInCall(true); setShowIncomingCallModal(false); setIncomingCallData(null); } catch (e) { handleRejectCall(); } };
  const handleRejectCall = () => { if (incomingCallData && webrtc) webrtc.rejectCall(incomingCallData.from); setShowIncomingCallModal(false); setIncomingCallData(null); };
  const handleHangUp = () => { if (webrtc) { const remoteId = incomingCallData?.from || selectedMemberToCall?.uid; if (remoteId) webrtc.hangUp(remoteId); } setInCall(false); setLocalStream(null); setRemoteStream(null); };
  const handleCreateGroup = async (name, memberIds) => { const token = await currentUser.getIdToken(); const response = await fetch('http://localhost:3000/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name, memberIds }) }); if (response.ok) { setIsCreateGroupModalOpen(false); await fetchGroups(); } else { alert('Error al crear el grupo.'); } };
  const handleMemberAdded = () => { fetchMembers(); };

  const getHeaderTitle = () => {
    if (selectedDM) return selectedDM.displayName;
    if (selectedGroup) return selectedGroup.name;
    return 'Selecciona una conversación';
  };

  const getMembersForMessage = () => {
    if (selectedDM) return [{ uid: currentUser.uid }, { uid: selectedDM.uid }];
    return members;
  };

  const getCurrentConversationId = () => {
    if (selectedDM) return [currentUser.uid, selectedDM.uid].sort().join('_');
    return selectedChannelId;
  };

  return (
    <>
      <div className="flex h-screen bg-gray-700 text-white">
        <NavigationBar view={mainView} onChangeView={handleChangeMainView} />
        {mainView === 'dms' ? (
          <DirectMessagesList contacts={contacts} selectedContactId={selectedDM?.uid} onSelectContact={handleSelectContact} onStartConversation={handleSelectContact} />
        ) : (
          <GroupList groups={groups} selectedGroupId={selectedGroup?.id} onSelectGroup={handleSelectGroup} onCreateGroup={() => setIsCreateGroupModalOpen(true)} />
        )}
        <main className="flex flex-col flex-1">
          <header className="p-4 bg-gray-700 shadow-md border-b-2 border-gray-900 flex justify-between items-center">
            <h2 className="font-bold text-lg">{getHeaderTitle()}</h2>
            {(selectedDM || (mainView === 'groups' && members.length > 1)) && <button onClick={() => handleCallMember(selectedDM || members.find(m => m.uid !== currentUser.uid))} disabled={inCall} className="px-3 py-1 bg-green-600 rounded">Llamar</button>}
          </header>
          <MessageList messages={messages} />
          {(selectedChannelId || selectedDM) && socket && (
            <MessageInput
              socket={socket}
              isDirectMessage={!!selectedDM}
              conversationId={getCurrentConversationId()}
              groupId={selectedGroup?.id}
              members={getMembersForMessage()}
            />
          )}
        </main>
        {mainView === 'groups' && selectedGroup && <MembersList members={members} onCallMember={handleCallMember} currentUserId={currentUser.uid} isOwner={currentUser.uid === selectedGroup.ownerId} onAddMemberClick={() => setIsAddMemberModalOpen(true)} />}
      </div>
      <CreateGroupModal isOpen={isCreateGroupModalOpen} onClose={() => setIsCreateGroupModalOpen(false)} onCreate={handleCreateGroup} />
      {selectedGroup && <AddMemberModal isOpen={isAddMemberModalOpen} onClose={() => setIsAddMemberModalOpen(false)} onMemberAdded={handleMemberAdded} groupId={selectedGroup.id} />}
      {showCallTypeModal && <CallTypeModal onSelectType={handleSelectCallType} onCancel={() => { setShowCallTypeModal(false); setSelectedMemberToCall(null); }} />}
      {showIncomingCallModal && incomingCallData && <IncomingCallModal callerName={incomingCallData.callerName} callType={incomingCallData.callType} onAccept={handleAcceptCall} onReject={handleRejectCall} />}
      {inCall && <VideoCallModal localStream={localStream} remoteStream={remoteStream} onHangUp={handleHangUp} callType={currentCallType} />}
    </>
  );
};

export default HomePage;