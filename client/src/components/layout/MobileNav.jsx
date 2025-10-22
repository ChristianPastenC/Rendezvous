// src/components/layout/MobileNav.jsx
import { PlusIcon, SettingIcon } from '../../assets/Icons';

const MobileNav = ({ onShowSearch, onCreateGroup, onEditProfile }) => {
  const ICONS = {
    Chat:
      (({ className }) => (
        <svg
          className={className}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      )),
    Search:
      (({ className }) => (
        <svg
          className={className}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      )),
    Plus: PlusIcon,
    Settings: SettingIcon,
  };

  return (
    <nav
      // Fondo blanco limpio con un borde superior sutil
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-10"
    >
      {/* Botón Activo (Chats) - Usa el color azul primario */}
      <button
        className="flex flex-col items-center justify-center text-blue-600 p-2"
        title="Chats"
      >
        <ICONS.Chat className="w-6 h-6" />
        <span className="text-xs font-medium">Chats</span>
      </button>

      {/* Botones Inactivos */}
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