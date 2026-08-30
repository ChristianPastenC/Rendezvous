// src/components/layout/Sidebar.jsx
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from 'firebase/auth';
import type { ConversationItem, UserProfile } from '@rendezvous/shared';
import UserSearch from '../user/UserSearch';
import { PlusIcon, SettingIcon } from '../../assets/Icons';
import { formatLastSeen } from '../../utils/lastSeen';
import UserAvatar from '../user/UserAvatar';
import LastMessagePreview from '../chat/LastMessagePreview';
import { formatMessageTimestamp } from '../../utils/formatMessageTimestamp';

interface SidebarProps {
  currentUser: User | null;
  conversations: ConversationItem[];
  selectedId?: string;
  onSelectConversation: (conv: ConversationItem) => void;
  onCreateGroup: () => void;
  onStartConversation: (user: UserProfile) => void;
  onEditProfile: () => void;
}

const Sidebar = ({
  currentUser,
  conversations,
  selectedId,
  onSelectConversation,
  onCreateGroup,
  onStartConversation,
  onEditProfile
}: SidebarProps) => {
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'dms' | 'groups'>('all');
  const currentLang = i18n.resolvedLanguage?.startsWith('es') ? 'es' : 'en';

  const getLastMessageTimestamp = (conv: ConversationItem): number => {
    const createdAt = conv.lastMessage?.createdAt as
      | string
      | { _seconds?: number; toDate?: () => Date }
      | undefined;
    if (!createdAt) return 0;

    if (typeof createdAt === 'object') {
      if (createdAt._seconds) return createdAt._seconds * 1000;
      if (createdAt.toDate) return createdAt.toDate().getTime();
      return 0;
    }
    return new Date(createdAt).getTime();
  };

  const filteredAndSortedConversations = useMemo(() => {
    const filtered = conversations.filter(conv => {
      if (filter === 'all') return true;
      if (filter === 'dms') return conv.type === 'dm';
      if (filter === 'groups') return conv.type === 'group';
      return true;
    });

    return [...filtered].sort((a, b) => {
      return getLastMessageTimestamp(b) - getLastMessageTimestamp(a);
    });
  }, [conversations, filter]);

  return (
    <aside
      className="w-full h-full bg-white flex flex-col flex-shrink-0 border-r border-gray-200"
    >
      <img
        src="/rendezvous.svg"
        alt={t('common.logoAlt')}
        className="mx-auto h-12 w-auto my-2"
      />
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold text-2xl text-gray-900 mb-4">
          {t('sidebar.title')}
        </h2>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {t('sidebar.filters.all')}
          </button>
          <button
            onClick={() => setFilter('dms')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'dms'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {t('sidebar.filters.dms')}
          </button>
          <button
            onClick={() => setFilter('groups')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'groups'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {t('sidebar.filters.groups')}
          </button>
        </div>
        <UserSearch onSelectUser={onStartConversation} />

      </div>

      <div className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredAndSortedConversations.map(conv => (
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
                      ? t('status.online')
                      : `${t('status.offlinePrefix')}: ${formatLastSeen(conv.userData.lastSeen, t)}`
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
                  {conv.lastMessage ? formatMessageTimestamp(conv.lastMessage.createdAt, t) : ''}
                </span>
              </div>

              {currentUser && (
                <LastMessagePreview
                  lastMessage={conv.lastMessage}
                  currentUser={currentUser}
                  isSelected={selectedId === conv.id}
                />
              )}
            </div>

          </button>
        ))}
      </div>

      <div className="p-3 space-y-2">
        <button
          onClick={onCreateGroup}
          className="w-full p-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-semibold text-white text-base"
        >
          <PlusIcon className="w-5 h-5" />
          <span>{t('sidebar.createGroup')}</span>
        </button>

        <div className="flex items-center justify-between px-2 py-1 text-xs text-gray-500">
          <span>{t('sidebar.language')}</span>
          <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => void i18n.changeLanguage('en')}
              className={`px-2 py-0.5 font-semibold transition-colors ${
                currentLang === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => void i18n.changeLanguage('es')}
              className={`px-2 py-0.5 font-semibold transition-colors ${
                currentLang === 'es'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              ES
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-gray-200 mt-auto">
        {currentUser && (
          <button
            onClick={onEditProfile}
            className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title={t('sidebar.editProfile')}
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
                    : (currentUser.email?.charAt(0).toUpperCase() ?? 'U')}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {currentUser.displayName || t('common.user')}
              </p>
              <p
                className="text-xs text-gray-500 truncate"
                title={currentUser.email ?? undefined}
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