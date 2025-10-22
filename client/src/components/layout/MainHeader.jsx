// src/components/layout/MainHeader.jsx
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
    <header className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onClearSelectedConversation}
          className="md:hidden p-2 rounded-full text-gray-600 hover:bg-gray-100"
          title="Atrás"
        >
          <BackIcon className="w-6 h-6" />
        </button>

        {selectedConversation ? (
          <>
            <div className="flex-shrink-0">
              {selectedConversation.type === 'group' ? (
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg text-white">
                  {selectedConversation.name.charAt(0).toUpperCase()}
                </div>
              ) : selectedConversation.photoURL ? (
                <img
                  src={selectedConversation.photoURL}
                  alt={selectedConversation.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center font-bold text-lg flex-shrink-0 text-white">
                  {selectedConversation.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="font-bold text-lg leading-tight text-gray-900 truncate">
                {selectedConversation.name}
              </h2>
              {selectedConversation.type === 'dm' && selectedConversation.userData && (
                <p className="text-xs text-gray-500">
                  {selectedConversation.userData.status === 'online' ? (
                    <span className="text-green-600 font-medium">
                      Conectado
                    </span>)
                    : (`Últ. vez ${formatLastSeen(selectedConversation.userData.lastSeen)}`)
                  }
                </p>
              )}
            </div>
          </>
        ) : (
          <h2 className="font-bold text-lg text-gray-500">
            Selecciona una conversación
          </h2>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {selectedConversation && callTarget && (
          <button
            onClick={onCallClick}
            disabled={inCall}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
            title="Llamar"
          >
            <CallIcon className="w-6 h-6 text-green-600" />
          </button>
        )}

        {selectedConversation?.type === 'group' && (
          <button
            onClick={onMembersClick}
            className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Ver Miembros"
          >
            <MembersIcon className="w-5 h-5 text-blue-600" />
          </button>
        )}
      </div>
    </header>
  );
};

export default MainHeader;