// src/components/layout/MobileNav.jsx
import { useTranslation } from 'react-i18next';
import { PlusIcon, SettingIcon, ChatIcon, SearchIcon } from '../../assets/Icons';

const MobileNav = ({ onShowSearch, onCreateGroup, onEditProfile }) => {
  const { t } = useTranslation();

  const ICONS = {
    Chat:
      (({ className }) => (
        <ChatIcon className={className} />
      )),
    Search:
      (({ className }) => (
        <SearchIcon className={className} />
      )),
    Plus: PlusIcon,
    Settings: SettingIcon,
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-10"
    >
      <button
        className="flex flex-col items-center justify-center text-blue-600 p-2"
        title={t('layout.mobileNav.chats')}
      >
        <ICONS.Chat className="w-6 h-6" />
        <span className="text-xs font-medium">
          {t('layout.mobileNav.chats')}
        </span>
      </button>

      <button
        onClick={onShowSearch}
        className="flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 p-2 transition-colors"
        title={t('layout.mobileNav.search')}
      >
        <ICONS.Search className="w-6 h-6" />
        <span className="text-xs font-medium">
          {t('layout.mobileNav.search')}
        </span>
      </button>

      <button
        onClick={onCreateGroup}
        className="flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 p-2 transition-colors"
        title={t('layout.mobileNav.createGroupTitle')}
      >
        <ICONS.Plus className="w-6 h-6" />
        <span className="text-xs font-medium">
          {t('layout.mobileNav.createGroup')}
        </span>
      </button>

      <button
        onClick={onEditProfile}
        className="flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 p-2 transition-colors"
        title={t('layout.mobileNav.profile')}
      >
        <ICONS.Settings className="w-6 h-6" />
        <span className="text-xs font-medium">
          {t('layout.mobileNav.profile')}
        </span>
      </button>
    </nav>
  );
};

export default MobileNav;