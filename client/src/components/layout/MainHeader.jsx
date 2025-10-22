import React from 'react';
import { formatLastSeen } from '../../utils/lastSeen';
import { BackIcon, CallIcon, MembersIcon } from '../../assets/Icons';

const MainHeader = ({
  selectedConversation,
  onClearSelectedConversation,
  inCall,
  callTarget,
  onCallClick,
  onMembersClick,
}) => {
  return (
    <header className="p-4 bg-gray-800 shadow-lg border-b border-gray-700 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <button
          onClick={onClearSelectedConversation}
          className="md:hidden p-1 rounded-full text-white hover:bg-gray-700"
          title="Atrás"
        >
          <BackIcon className="w-6 h-6" />
        </button>
        {selectedConversation ? (
          <>
            {selectedConversation.type === 'group' ? (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
                {selectedConversation.name.charAt(0).toUpperCase()}
              </div>
            ) : selectedConversation.photoURL ? (
                <img
                  src={selectedConversation.photoURL}
                  alt={selectedConversation.name}
                  className="w-10 h-10 rounded-full flex-shrink-0"
                />
            ) : (
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
                {selectedConversation.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="font-bold text-lg leading-tight">
                {selectedConversation.name}
              </h2>
              {selectedConversation.type === 'dm' && selectedConversation.userData && (
                <p className="text-xs text-gray-400">
                  {selectedConversation.userData.status === 'online' ? (
                    <span className="text-green-400">
                      Conectado
                    </span>)
                    : (`Últ. vez ${formatLastSeen(selectedConversation.userData.lastSeen)}`)
                  }
                </p>
              )}
            </div>
          </>
        ) : (
          <h2 className="font-bold text-lg text-gray-400">
            Selecciona una conversación
          </h2>
        )}
      </div>
      {selectedConversation && callTarget && (
        <button
          onClick={onCallClick}
          disabled={inCall}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold"
        >
          <CallIcon className="w-6 h-6" />
        </button>
      )}
      {selectedConversation?.type === 'group' && (
        <button
          onClick={onMembersClick}
          className="md:hidden px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          title="Ver Miembros"
        >
          <MembersIcon className="w-5 h-5 text-white" />
        </button>
      )}
    </header>
  );
};

export default MainHeader;