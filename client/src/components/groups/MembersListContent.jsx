import { useTranslation } from 'react-i18next'; // 1. Importar
import { CallIcon } from "../../assets/Icons";
import { formatLastSeen } from "../../utils/lastSeen"; // Asumimos que esta función ya usa `t` o devuelve un formato no textual
import UserAvatar from "../user/UserAvatar";

const MembersListContent = ({
  members,
  onCallMember,
  currentUserId,
  onAddMemberClick,
  isOwner,
}) => {
  const { t } = useTranslation();

  return <>
    <h2 className="font-bold text-lg text-gray-800 mb-4">
      {t('members.title')} ({members.length})
    </h2>
    <div className="space-y-2 flex-1 overflow-y-auto">
      {members.map((member) => (
        <div
          key={member.uid}
          className="flex items-center justify-between p-2 rounded-md transition-colors"
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <UserAvatar
                photoURL={member.photoURL}
                displayName={member.displayName}
              />
              <span
                className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white 
                  ${member.status === 'online'
                    ? 'bg-green-500'
                    : 'bg-gray-500'
                  }`
                }
                title={member.status === 'online'
                  ? t('status.online')
                  : `${t('status.offlinePrefix')}: ${formatLastSeen(member.lastSeen, t)}`
                }
              />
            </div>
            <span className="text-gray-600 text-sm truncate">
              {member.displayName}
            </span>
          </div>
          {member.uid !== currentUserId && (
            <button
              onClick={() => onCallMember(member)}
              className="p-2 hover:bg-gray-300 rounded-full transition-colors"
              title={t('common.call')}
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
        className="mt-4 p-2 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg font-semibold w-full transition-colors text-gray-100"
      >
        {t('members.addMember')}
      </button>
    )}
  </>;
};
export default MembersListContent;