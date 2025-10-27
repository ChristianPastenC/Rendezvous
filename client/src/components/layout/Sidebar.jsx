// src/components/layout/Sidebar.jsx
import { useState } from 'react';
import UserSearch from '../dms/UserSearch';
import { PlusIcon, SettingIcon } from '../../assets/Icons';
import { formatLastSeen } from '../../utils/lastSeen';
import UserAvatar from '../user/UserAvatar';
import LastMessagePreview from '../chat/LastMessagePreview';
import { formatMessageTimestamp } from '../../utils/formatMessageTimestamp';

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
      className="w-full h-full bg-white flex flex-col flex-shrink-0 border-r border-gray-200"
    >
      <img
        src="/rendezvous.svg"
        alt="Logo"
        className="mx-auto h-12 w-auto my-2"
      />
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold text-2xl text-gray-900 mb-4">
          Conversaciones
        </h2>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('dms')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'dms'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Directos
          </button>
          <button
            onClick={() => setFilter('groups')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'groups'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            className={`w-full text-left p-3 rounded-lg flex items-center space-x-3 transition-colors ${selectedId === conv.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-800 hover:bg-gray-100'
              }`}
          >
            <div className="relative flex-shrink-0">
              <UserAvatar
                photoURL={conv.type === 'group' ? null : conv.photoURL}
                displayName={conv.name}
                size="lg"
                fallbackColor={conv.type === 'group' ? 'blue' : 'purple'}
              />

              {conv.type === 'dm' && conv.userData && (
                <span
                  className={`absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full ring-2 ring-white 
              ${conv.userData.status === 'online'
                      ? 'bg-green-500'
                      : 'bg-gray-400'
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

              <div className="flex justify-between items-baseline">
                <span className="font-semibold truncate block text-base">
                  {conv.name}
                </span>
                <span className={`text-xs flex-shrink-0 ml-2 ${selectedId === conv.id ? 'text-blue-200' : 'text-gray-400'
                  }`}>
                  {conv.lastMessage ? formatMessageTimestamp(conv.lastMessage.createdAt) : ''}
                </span>
              </div>

              <LastMessagePreview
                lastMessage={conv.lastMessage}
                currentUser={currentUser}
                isSelected={selectedId === conv.id}
              />
            </div>
  
          </button>
        ))}
      </div>

      <div className="p-3">
        <button
          onClick={onCreateGroup}
          className="w-full p-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-semibold text-white text-base"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Crear Grupo</span>
        </button>
      </div>

      <div className="p-3 border-t border-gray-200 mt-auto">
        {currentUser && (
          <button
            onClick={onEditProfile}
            className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Editar Perfil"
          >
            <div className="flex-shrink-0">
              {currentUser.photoURL ? (
                <UserAvatar
                  photoURL={currentUser.photoURL}
                  displayName={currentUser.displayName}
                  size="lg"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center font-bold text-lg text-white">
                  {currentUser.displayName
                    ? currentUser.displayName.charAt(0).toUpperCase()
                    : currentUser.email.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {currentUser.displayName || 'Usuario'}
              </p>
              <p
                className="text-xs text-gray-500 truncate"
                title={currentUser.email}
              >
                {currentUser.email}
              </p>
            </div>
            <SettingIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;