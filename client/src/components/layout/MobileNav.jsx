// src/components/layout/MobileNav.jsx
import { PlusIcon, SettingIcon, ChatIcon, SearchIcon } from '../../assets/Icons';

const MobileNav = ({ onShowSearch, onCreateGroup, onEditProfile }) => {
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
        title="Chats"
      >
        <ICONS.Chat className="w-6 h-6" />
        <span className="text-xs font-medium">Chats</span>
      </button>

      <button
        onClick={onShowSearch}
        className="flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 p-2 transition-colors"
        title="Buscar"
      >
        <ICONS.Search className="w-6 h-6" />
        <span className="text-xs font-medium">Buscar</span>
      </button>

      <button
        onClick={onCreateGroup}
        className="flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 p-2 transition-colors"
        title="Crear Grupo"
      >
        <ICONS.Plus className="w-6 h-6" />
        <span className="text-xs font-medium">Grupo</span>
      </button>

      <button
        onClick={onEditProfile}
        className="flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 p-2 transition-colors"
        title="Perfil"
      >
        <ICONS.Settings className="w-6 h-6" />
        <span className="text-xs font-medium">Perfil</span>
      </button>
    </nav>
  );
};

export default MobileNav;