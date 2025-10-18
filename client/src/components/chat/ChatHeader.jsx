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
  isGroup = false
}) => {
  return (
    <header className="p-4 bg-gray-800 shadow-lg border-b border-gray-700 flex justify-between items-center">
      <div className="flex items-center space-x-3">
        {isGroup ? (
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
        ) : photoURL ? (
          <img
            src={photoURL}
            alt={name}
            className="w-10 h-10 rounded-full flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div>
          <h2 className="font-bold text-lg leading-tight">{name}</h2>
          {!isGroup && status !== undefined && (
            <p className="text-xs text-gray-400">
              {status === 'online' ? (
                <span className="text-green-400">Conectado</span>
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
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        </button>
      )}
    </header>
  );
};

export default ChatHeader;