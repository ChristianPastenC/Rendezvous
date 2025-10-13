import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import MessageInput from '../components/chat/MessageInput'; // Asegúrate de crear este componente

const HomePage = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [channelInfo, setChannelInfo] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;

    const fetchChannelInfo = async () => {
      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:3000/api/default-channel', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setChannelInfo(data);

      socket.connect();
      socket.emit('joinDefaultChannel', { channelId: data.channelId });
    };

    fetchChannelInfo();

    const handleNewMessage = (newMessage) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    };
    socket.on('newMessage', handleNewMessage);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.disconnect();
    };
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-gray-800 text-white">
      <header className="p-4 bg-gray-700 shadow-md">
        <h2 className="font-bold"># general (Canal de Ejemplo)</h2>
      </header>

      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((msg, index) => (
          <div key={msg.id || index} className="flex items-start space-x-3">
            <div>
              <p className="font-semibold text-white">{msg.authorInfo.displayName}</p>
              <p className="text-gray-200 mt-1">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {channelInfo && (
        <MessageInput
          socket={socket}
          groupId={channelInfo.groupId}
          channelId={channelInfo.channelId}
          authorInfo={{
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          }}
        />
      )}
    </div>
  );
};

export default HomePage;