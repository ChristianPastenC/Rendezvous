// src/components/groups/MembersList.jsx
import React from 'react';

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

const MembersList = ({
  members,
  onCallMember,
  currentUserId,
  onAddMemberClick,
  isOwner
}) => {
  return (
    <aside className="w-64 bg-gray-800 p-4 border-l border-gray-900 flex-shrink-0 flex flex-col">
      <h2 className="font-bold text-lg text-white mb-4">
        Miembros ({members.length})
      </h2>

      <div className="space-y-2 flex-1 overflow-y-auto">
        {members.map(member => (
          <div
            key={member.uid}
            className="flex items-center justify-between p-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                {member.photoURL ? (
                  <img
                    src={member.photoURL}
                    alt={member.displayName}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
                    {member.displayName?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}

                <span
                  className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-gray-800 ${member.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  title={
                    member.status === 'online'
                      ? 'Conectado'
                      : `Últ. vez: ${formatLastSeen(member.lastSeen)}`
                  }
                />
              </div>

              <span className="text-gray-200 text-sm truncate">
                {member.displayName}
              </span>
            </div>

            {member.uid !== currentUserId && (
              <button
                onClick={() => onCallMember(member)}
                className="p-1 hover:bg-gray-600 rounded"
                title="Llamar"
              >
                <svg
                  className="w-5 h-5 text-green-400"
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
          </div>
        ))}
      </div>

      {isOwner && (
        <button
          onClick={onAddMemberClick}
          className="mt-4 p-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold w-full transition-colors"
        >
          Añadir Miembro
        </button>
      )}
    </aside>
  );
};

export default MembersList;