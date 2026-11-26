import { useTranslation } from 'react-i18next';
import type { ConversationItem, UserProfile } from '@rendezvous/shared';
import { formatLastSeen } from '../../utils/lastSeen';
import { BackIcon, CallIcon, MembersIcon } from '../../assets/Icons';
import UserAvatar from '../user/UserAvatar';

interface MainHeaderProps {
  selectedConversation: ConversationItem | null;
  onClearSelectedConversation: () => void;
  inCall: boolean;
  callTarget: UserProfile | null | undefined;
  onCallClick: () => void;
  onMembersClick: () => void;
  onSafetyVerifyClick?: () => void;
}

const MainHeader = ({
  selectedConversation,
  onClearSelectedConversation,
  inCall,
  callTarget,
  onCallClick,
  onMembersClick,
  onSafetyVerifyClick,
}: MainHeaderProps) => {
  const { t } = useTranslation();

  return (
    <header className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onClearSelectedConversation}
          className="md:hidden p-2 rounded-full text-gray-600 hover:bg-gray-100"
          title={t('common.back')}
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
              ) : (
                <UserAvatar
                  photoURL={selectedConversation.photoURL}
                  displayName={selectedConversation.name}
                  size="lg"
                />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="font-bold text-lg leading-tight text-gray-900 truncate">
                {selectedConversation.name}
              </h2>
              {selectedConversation.type === 'dm' && selectedConversation.userData && (
                <p className="text-xs text-gray-500">
                  {selectedConversation.userData.status === 'online' ? (
                    <span className="text-green-600 font-medium">{t('status.online')}</span>
                  ) : (
                    `${t('status.offlinePrefix')} ${formatLastSeen(
                      selectedConversation.userData.lastSeen,
                      t
                    )}`
                  )}
                </p>
              )}
            </div>
          </>
        ) : (
          <h2 className="font-bold text-lg text-gray-500">{t('header.prompt')}</h2>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {selectedConversation && onSafetyVerifyClick && (
          <button
            type="button"
            onClick={onSafetyVerifyClick}
            className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-medium transition-colors"
            title={t('security.verification.buttonTitle', 'Verify E2EE safety fingerprint')}
          >
            {t('security.verification.badge', 'E2EE Verify')}
          </button>
        )}

        {selectedConversation?.type !== 'group' && callTarget && (
          <button
            onClick={onCallClick}
            disabled={inCall}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
            title={t('common.call')}
          >
            <CallIcon className="w-6 h-6 text-green-600" />
          </button>
        )}

        {selectedConversation?.type === 'group' && (
          <button
            onClick={onMembersClick}
            className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
            title={t('header.viewMembers')}
          >
            <MembersIcon className="w-5 h-5 text-blue-600" />
          </button>
        )}
      </div>
    </header>
  );
};

export default MainHeader;
