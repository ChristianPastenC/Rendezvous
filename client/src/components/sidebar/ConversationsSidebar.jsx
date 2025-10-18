// src/components/sidebar/ConversationsSidebar.jsx

import React, { useState } from 'react';
import UserSearch from '../dms/UserSearch';

const formatLastSeen = (isoString) => {
  if (!isoString) return 'hace mucho tiempo';
  const now = new Date();
  const lastSeenDate = new Date(isoString);
  const diffSeconds = Math.round((now - lastSeenDate) / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSeconds < 60) return 'hace unos segundos';
  if (diffMinutes === 1) return `hace 1 minuto`;
  if (diffMinutes < 60) return `hace ${diffMinutes} minutos`;
  if (diffHours === 1) return `hace 1 hora`;
  if (diffHours < 24) return `hace ${diffHours} horas`;
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;

  return lastSeenDate.toLocaleDateString();
};

const ConversationsSidebar = ({
  conversations,
  selectedId,
  onSelectConversation,
  onCreateGroup,
  onStartConversation,
  onEditProfile,
  onSignOut
}) => {
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
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('dms')}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'dms'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            Directos
          </button>
          <button
            onClick={() => setFilter('groups')}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'groups'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            Grupos
          </button>
        </div>

        <UserSearch onSelectUser={onStartConversation} />
      </div>

      <div className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredConversations.map(conv => (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv)}
            className={`w-full text-left p-3 rounded-md flex items-center space-x-3 transition-colors ${selectedId === conv.id
                ? 'bg-gray-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
              }`}
          >
            <div className="relative flex-shrink-0">
              {conv.type === 'group' ? (
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">
                  {conv.name.charAt(0).toUpperCase()}
                </div>
              ) : conv.photoURL ? (
                <img
                  src={conv.photoURL}
                  alt={conv.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-lg">
                  {conv.name.charAt(0).toUpperCase()}
                </div>
              )}

              {conv.type === 'dm' && conv.userData && (
                <span
                  className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-gray-800 ${conv.userData.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  title={
                    conv.userData.status === 'online'
                      ? 'Conectado'
                      : `Últ. vez: ${formatLastSeen(conv.userData.lastSeen)}`
                  }
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className="font-medium truncate">{conv.name}</span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onCreateGroup}
        className="m-3 p-3 rounded-md bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 font-semibold"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span>Crear Grupo</span>
      </button>

      <div className="p-3 border-t border-gray-900 mt-auto">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onEditProfile}
            className="flex-1 p-2 rounded-lg hover:bg-gray-700 flex items-center justify-center"
            title="Editar Perfil"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
        <div className="p-2 bg-gray-800 rounded-lg">
          <button
            onClick={onSignOut}
            className="w-full mt-2 text-left text-sm text-red-400 hover:bg-red-500 hover:text-white rounded p-1 transition-colors font-semibold"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </aside>
  );
};

export default ConversationsSidebar;