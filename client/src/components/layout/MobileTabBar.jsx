// src/components/layout/MobileTabBar.jsx
import React from 'react';
import { useNavigate } from 'react-router';

const ChatIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);
const AddIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ProfileIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const MobileTabBar = ({ onCreateGroup, onEditProfile, activeTab }) => {
  const navigate = useNavigate();

  const getTabStyle = (tabName) => {
    const isTabActive = (activeTab === 'chat' && tabName === 'home') || activeTab === tabName;

    return isTabActive
      ? 'text-blue-500'
      : 'text-gray-500 hover:text-blue-500';
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-40">
      <ul className="flex justify-around items-center h-16">

        <li>
          <button
            onClick={() => navigate('/')}
            className={`flex flex-col items-center p-2 rounded-lg ${getTabStyle('home')}`}
          >
            <ChatIcon />
            <span className="text-xs font-medium">Chats</span>
          </button>
        </li>

        <li>
          <button
            onClick={onCreateGroup}
            className={`flex flex-col items-center p-2 rounded-lg ${getTabStyle('create')}`} // Este tab nunca está "activo"
          >
            <AddIcon />
            <span className="text-xs font-medium">Grupo</span>
          </button>
        </li>

        <li>
          <button
            onClick={onEditProfile}
            className={`flex flex-col items-center p-2 rounded-lg ${getTabStyle('profile')}`}
          >
            <ProfileIcon />
            <span className="text-xs font-medium">Perfil</span>
          </button>
        </li>

      </ul>
    </nav>
  );
};

export default MobileTabBar;