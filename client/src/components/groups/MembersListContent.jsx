import { CallIcon } from "../../assets/Icons";

const MembersListContent = ({
  members,
  onCallMember,
  currentUserId,
  onAddMemberClick,
  isOwner,
}) => (
  <>
    <h2 className="font-bold text-lg text-white mb-4">
      Miembros ({members.length})
    </h2>
    <div className="space-y-2 flex-1 overflow-y-auto">
      {members.map((member) => (
        <div
          key={member.uid}
          className="flex items-center justify-between p-2 rounded-md hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              {member.photoURL
                ? (
                  <img
                    src={member.photoURL}
                    alt={member.displayName}
                    className="w-8 h-8 rounded-full"
                  />)
                : (
                  <div
                    className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm"
                  >
                    {member.displayName?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              <span
                className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-gray-800 
                  ${member.status === 'online'
                    ? 'bg-green-500'
                    : 'bg-gray-500'
                  }`
                }
                title={member.status === 'online'
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
              <CallIcon className="w-5 h-5 text-green-400" />
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
  </>
);
export default MembersListContent;