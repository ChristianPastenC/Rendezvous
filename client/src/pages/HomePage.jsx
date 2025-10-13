import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { initSocket } from '../lib/socket';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import MessageInput from '../components/chat/MessageInput';

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
        className={`w-full text-left p-2 rounded-md transition-colors text-gray-300 hover:bg-gray-700 ${selectedChannelId === channel.id ? 'bg-gray-600' : ''}`}>
        # {channel.name}
      </button>
    ))}
  </aside>
);

const MessageList = ({ messages }) => {
  const messagesEndRef = useRef(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-3">
      {messages.length === 0 ? <p className="text-center text-gray-400">No hay mensajes. ¡Sé el primero en escribir!</p> :
        messages.map(msg => (
          <div key={msg.id} className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {msg.authorInfo.photoURL ? <img src={msg.authorInfo.photoURL} alt={msg.authorInfo.displayName} className="w-10 h-10 rounded-full" /> :
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">{msg.authorInfo.displayName.charAt(0).toUpperCase()}</div>}
            </div>
            <div>
              <div className="flex items-baseline space-x-2">
                <span className="font-semibold text-white">{msg.authorInfo.displayName}</span>
                <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-gray-200 mt-1">{msg.content}</p>
            </div>
          </div>
        ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

const HomePage = () => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const previousChannelRef = useRef(null);

  const fetchGroups = useCallback(async () => {
    if (!currentUser) return;
    const token = await currentUser.getIdToken();
    const response = await fetch('http://localhost:3000/api/groups', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await response.json();
    setGroups(data);
    if (data.length > 0 && !selectedGroup) {
      setSelectedGroup(data[0].id);
    }
  }, [currentUser, selectedGroup]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  useEffect(() => {
    const fetchChannels = async () => {
      if (!selectedGroup || !currentUser) return;
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
    };
    fetchChannels();
  }, [selectedGroup, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    let socketInstance;
    const connect = async () => {
      socketInstance = await initSocket();
      if (socketInstance) {
        setSocket(socketInstance);
        socketInstance.on('newMessage', (newMessage) => setMessages(prev => [...prev, newMessage]));
      }
    };
    connect();
    return () => { if (socketInstance) socketInstance.disconnect(); };
  }, [currentUser]);

  useEffect(() => {
    const loadAndJoin = async () => {
      if (!selectedChannel || !socket || !currentUser) return;
      if (previousChannelRef.current) {
        socket.emit('leaveChannel', { channelId: previousChannelRef.current });
      }
      socket.emit('joinChannel', { groupId: selectedGroup, channelId: selectedChannel });
      previousChannelRef.current = selectedChannel;
      const token = await currentUser.getIdToken();
      const response = await fetch(`http://localhost:3000/api/groups/${selectedGroup}/channels/${selectedChannel}/messages`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      setMessages(data);
    };
    loadAndJoin();
  }, [selectedChannel, selectedGroup, socket, currentUser]);

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
          <header className="p-4 bg-gray-700 shadow-md">
            <h2 className="font-bold">{selectedChannel ? `# ${channels.find(c => c.id === selectedChannel)?.name}` : 'Selecciona un canal'}</h2>
          </header>
          <MessageList messages={messages} />
          {selectedGroup && selectedChannel && socket && (
            <MessageInput socket={socket} groupId={selectedGroup} channelId={selectedChannel} authorInfo={{ uid: currentUser.uid, displayName: currentUser.displayName, photoURL: currentUser.photoURL }} />
          )}
        </main>
      </div>
      <CreateGroupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreateGroup} />
    </>
  );
};

export default HomePage;