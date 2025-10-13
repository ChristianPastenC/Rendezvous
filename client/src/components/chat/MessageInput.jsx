import React, { useState } from 'react';

const MessageInput = ({ socket, groupId, channelId, authorInfo }) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() || !socket || sending) return;

    setSending(true);

    socket.emit('sendMessage', {
      groupId,
      channelId,
      content: content.trim(),
      authorInfo,
    });

    setContent('');

    setTimeout(() => setSending(false), 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-800 border-t border-gray-900">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Enviar mensaje a #general...`}
          disabled={sending}
          className="flex-1 px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!content.trim() || sending}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </form>
  );
};

export default MessageInput;