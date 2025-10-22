// src/components/layout/Sidebar.jsx

import React, { useState } from 'react';
import UserSearch from '../dms/UserSearch';
import { PlusIcon, SettingIcon } from '../../assets/Icons';

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

const Sidebar = ({
  currentUser,
  conversations,
  selectedId,
  onSelectConversation,
  onCreateGroup,
  onStartConversation,
  onEditProfile
}) => {
  const [filter, setFilter] = useState('all');

  const filteredConversations = conversations.filter(conv => {
    if (filter === 'all') return true;
    if (filter === 'dms') return conv.type === 'dm';
    if (filter === 'groups') return conv.type === 'group';
    return true;
  });

  return (
    <aside
      className={`w-full h-full bg-white flex flex-col flex-shrink-0`}
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg text-gray-800">
            Conversaciones
          </h2>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${filter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } `}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('dms')}
            className={`flex-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${filter === 'dms'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } `}
          >
            Directos
          </button>
          <button
            onClick={() => setFilter('groups')}
            className={`flex-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${filter === 'groups'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } `}
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
            onClick={() => {
              onSelectConversation(conv);
            }}
            className={`w-full text-left p-3 rounded-lg flex items-center space-x-3 transition-colors ${selectedId === conv.id
              ? 'bg-blue-50 text-gray-800'
              : 'text-gray-700 hover:bg-gray-50'
              } `}
          >
            <div className="relative flex-shrink-0">
              {conv.type === 'group' ? (
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-bold text-lg text-white">
                  {conv.name.charAt(0).toUpperCase()}
                </div>
              ) : conv.photoURL ? (
                <img
                  src={conv.photoURL}
                  alt={conv.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center font-bold text-lg text-white">
                  {conv.name.charAt(0).toUpperCase()}
                </div>
              )}

              {conv.type === 'dm' && conv.userData && (
                <span
                  className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white 
                    ${conv.userData.status === 'online'
                      ? 'bg-green-500'
                      : 'bg-gray-400'
                    } `}
                  title={
                    conv.userData.status === 'online'
                      ? 'Conectado'
                      : `Últ.vez: ${formatLastSeen(conv.userData.lastSeen)} `
                  }
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className="font-medium truncate block text-base">
                {conv.name}
              </span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onCreateGroup}
        className="m-3 p-3 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2 font-semibold text-white text-base"
      >
        <PlusIcon className='w-5 h-5' />
        <span>Crear Grupo</span>
      </button>

      <div className="p-3 border-t border-gray-200 mt-auto">
        {currentUser && (
          <div className="p-2 bg-gray-100 rounded-lg mb-2">
            <p className="text-sm font-semibold text-gray-800 truncate" title={currentUser.email}>
              {currentUser.displayName || currentUser.email}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={onEditProfile}
            className="flex-1 p-2 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            title="Editar Perfil"
          >
            <SettingIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;