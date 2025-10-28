import {
  useRef,
  useEffect,
  memo,
  useMemo
} from "react";
import { useTranslation } from "react-i18next";
import { cryptoService } from "../../lib/cryptoService";
import { EmptyStateIcon, FileIcon } from "../../assets/Icons";
import UserAvatar from "../user/UserAvatar";

const MessageContent = memo(({ msg, currentUserUid, isSender, t }) => {
  return useMemo(() => {
    const encryptedDataForUser = msg.encryptedPayload?.[currentUserUid];

    if (!encryptedDataForUser) {
      return (
        <p className="text-sm font-normal text-gray-500 dark:text-gray-400 italic">
          {t('messages.noPermission')}
        </p>
      );
    }

    const decryptedString = cryptoService.decrypt(encryptedDataForUser);
    if (!decryptedString) {
      return (
        <p className="text-sm font-normal text-red-500 dark:text-red-400 italic">
          {t('messages.decryptionError')}
        </p>
      );
    }

    try {
      const messageObject = JSON.parse(decryptedString);
      switch (messageObject.type) {
        case 'image':
          return (
            <a
              href={messageObject.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1"
            >
              <img
                src={messageObject.fileUrl}
                alt={messageObject.content || t('messages.imageAlt')}
                className="rounded-lg max-w-full max-h-64 object-cover"
              />
            </a>
          );
        case 'file':
          return (
            <a
              href={messageObject.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-1.5 inline-flex items-center p-2 rounded-lg 
                ${isSender
                  ? 'bg-blue-700 hover:bg-blue-800 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white'
                }`}
            >
              <FileIcon className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="truncate" title={messageObject.content}>
                {messageObject.content}
              </span>
            </a>
          );
        default:
          return (
            <p className={`text-sm font-normal leading-normal break-words
              ${isSender ? 'text-white' : 'text-gray-900 dark:text-white'}`
            }>
              {messageObject.content}
            </p>
          );
      }
    } catch (e) {
      return (
        <p className="text-sm font-normal text-red-500 dark:text-red-400 italic">
          {t('messages.corrupt')}
        </p>
      );
    }
  }, [msg.encryptedPayload, currentUserUid, isSender, t]);
});

const MessageGroup = memo(({ messages, currentUserUid, showAvatar, authorInfo, isSender, t }) => {
  const displayName = isSender ? t('messages.you') : (authorInfo?.displayName || t('messages.user'));

  return (
    <div className={`flex items-start gap-2.5 ${isSender ? 'self-end flex-row-reverse' : 'self-start'}`}>
      <div className="flex-shrink-0" style={{ width: '40px' }}>
        {showAvatar && (
          <UserAvatar
            photoURL={authorInfo?.photoURL}
            displayName={authorInfo?.displayName}
          />
        )}
      </div>
      <div className="flex flex-col gap-1 w-full max-w-xs sm:max-w-sm md:max-w-md">
        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            className={`flex flex-col leading-1.5 p-4
              ${isSender
                ? 'bg-blue-600 rounded-s-xl rounded-ee-xl'
                : 'bg-gray-100 dark:bg-gray-700 rounded-e-xl rounded-es-xl'
              }`}
          >
            {idx === 0 && (
              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                <span className={`text-sm font-semibold 
                  ${isSender ? 'text-white' : 'text-gray-900 dark:text-white'}`
                }>
                  {displayName}
                </span>
                <span className={`text-sm font-normal 
                  ${isSender ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`
                }>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
            <MessageContent
              msg={msg}
              currentUserUid={currentUserUid}
              isSender={isSender}
              t={t}
            />
            {idx > 0 && (
              <span className={`text-xs font-normal mt-1 
                ${isSender ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`
              }>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

const MessageList = ({ messages, currentUserUid }) => {
  const { t } = useTranslation();
  const messagesEndRef = useRef(null);

  const groupedMessages = useMemo(() => {
    if (!messages.length) return [];

    const groups = [];
    let currentGroup = {
      authorId: messages[0].authorId,
      authorInfo: messages[0].authorInfo,
      messages: [messages[0]]
    };

    for (let i = 1; i < messages.length; i++) {
      const msg = messages[i];
      const timeDiff = new Date(msg.createdAt) - new Date(currentGroup.messages[currentGroup.messages.length - 1].createdAt);

      if (msg.authorId === currentGroup.authorId && timeDiff < 120000) {
        currentGroup.messages.push(msg);
      } else {
        groups.push(currentGroup);
        currentGroup = {
          authorId: msg.authorId,
          authorInfo: msg.authorInfo,
          messages: [msg]
        };
      }
    }
    groups.push(currentGroup);

    return groups;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col
        scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
    >
      {messages.length > 0 ? (
        <>
          {groupedMessages.map((group, idx) => {
            const showAvatar = idx === groupedMessages.length - 1 ||
              groupedMessages[idx + 1]?.authorId !== group.authorId;
            const isSender = group.authorId === currentUserUid;

            return (
              <MessageGroup
                key={`${group.authorId}-${group.messages[0].id}`}
                messages={group.messages}
                currentUserUid={currentUserUid}
                showAvatar={showAvatar}
                authorInfo={group.authorInfo}
                isSender={isSender}
                t={t}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center h-full p-6 text-center">
          <EmptyStateIcon
            className="w-16 h-16 text-gray-300"
          />
          <h3 className="mt-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
            {t('messages.empty.title')}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('messages.empty.subtitle')}
          </p>
        </div>
      )}
    </div>
  );
};

export default MessageList;