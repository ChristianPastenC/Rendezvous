// src/components/chat/MessageList.jsx
import React, { useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cryptoService } from '../../lib/cryptoService';

const MessageList = ({ messages }) => {
  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const renderContent = (msg) => {
    const encryptedDataForUser = msg.encryptedPayload?.[currentUser.uid];

    if (!encryptedDataForUser) {
      return (
        <p className="text-gray-400 italic mt-1">
          [No tienes permiso para ver este mensaje]
        </p>
      );
    }

    const decryptedString = cryptoService.decrypt(encryptedDataForUser);

    if (!decryptedString) {
      return (
        <p className="text-red-400 italic mt-1">
          [Error al descifrar]
        </p>
      );
    }

    try {
      const messageObject = JSON.parse(decryptedString);

      switch (messageObject.type) {
        case 'image':
          return (
            <a
              href={messageObject.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={messageObject.fileUrl}
                alt={messageObject.content}
                className="mt-2 rounded-lg max-w-xs max-h-64"
              />
            </a>
          );

        case 'file':
          return (
            <a
              href={messageObject.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center bg-gray-700 hover:bg-gray-600 p-2 rounded-lg"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {messageObject.content}
            </a>
          );

        default:
          return (
            <p className="text-gray-200 mt-1">
              {messageObject.content}
            </p>
          );
      }
    } catch (e) {
      return (
        <p className="text-red-400 italic mt-1">
          [Mensaje corrupto]
        </p>
      );
    }
  };

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-3">
      {messages.map(msg => (
        <div key={msg.id} className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {msg.authorInfo?.photoURL ? (
              <img
                src={msg.authorInfo.photoURL}
                alt={msg.authorInfo.displayName}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
                {msg.authorInfo?.displayName?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-baseline space-x-2">
              <span className="font-semibold text-white">
                {msg.authorInfo?.displayName || 'Usuario'}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            {renderContent(msg)}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;