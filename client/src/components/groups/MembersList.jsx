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
  isOwner,
  isOpen,
  onClose
}) => {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 xl:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed xl:static inset-y-0 right-0 z-50
        w-64 sm:w-72 bg-white p-4 border-l border-gray-200 flex-shrink-0 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'}
      `}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-gray-800">
            Miembros ({members.length})
          </h2>
          <button
            onClick={onClose}
            className="xl:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto">
          {members.map(member => (
            <div
              key={member.uid}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  {member.photoURL ? (
                    <img
                      src={member.photoURL}
                      alt={member.displayName}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm text-white">
                      {member.displayName?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}

                  <span
                    className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${member.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    title={
                      member.status === 'online'
                        ? 'Conectado'
                        : `Últ. vez: ${formatLastSeen(member.lastSeen)}`
                    }
                  />
                </div>

                <span className="text-gray-700 text-sm truncate">
                  {member.displayName}
                </span>
              </div>

              {member.uid !== currentUserId && (
                <button
                  onClick={() => onCallMember(member)}
                  className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
                  title="Llamar"
                >
                  <svg
                    className="w-5 h-5 text-green-500"
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
            className="mt-4 p-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold w-full transition-colors text-white text-sm sm:text-base"
          >
            Añadir Miembro
          </button>
        )}
      </aside>
    </>
  );
};

export default MembersList;