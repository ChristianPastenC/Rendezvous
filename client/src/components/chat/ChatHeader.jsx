// src/components/chat/ChatHeader.jsx

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

export const ChatHeader = ({
  name,
  photoURL,
  status,
  lastSeen,
  onCall,
  inCall,
  isGroup = false,
  onMenuClick
}) => {
  return (
    <header className="p-3 sm:p-4 bg-white shadow-sm border-b border-gray-200 flex justify-between items-center">
      <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {isGroup ? (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500 flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0 text-white">
            {name.charAt(0).toUpperCase()}
          </div>
        ) : photoURL ? (
          <img
            src={photoURL}
            alt={name}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 object-cover"
          />
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500 flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0 text-white">
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base sm:text-lg leading-tight text-gray-800 truncate">{name}</h2>
          {!isGroup && status !== undefined && (
            <p className="text-xs text-gray-600 truncate">
              {status === 'online' ? (
                <span className="text-green-600">Conectado</span>
              ) : (
                `Últ. vez ${formatLastSeen(lastSeen)}`
              )}
            </p>
          )}
        </div>
      </div>

      {onCall && (
        <button
          onClick={onCall}
          disabled={inCall}
          className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 rounded-lg font-semibold transition-colors text-white flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
      )}
    </header>
  );
};

export default ChatHeader;