// client/src/components/chat/MessageList.jsx
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

/**
 * Renders the decrypted content of a single message.
 * It handles different message types like text, image, and file.
 * @param {object} props - The component props.
 * @param {object} props.msg - The message object.
 * @param {string} props.currentUserUid - The UID of the current user.
 * @param {boolean} props.isSender - True if the current user is the sender of the message.
 * @param {function} props.t - The translation function.
 * @returns {JSX.Element} The rendered message content.
 */
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
              className="mt-1 block"
            >
              <img
                src={messageObject.fileUrl}
                alt={messageObject.content || t('messages.imageAlt')}
                className="rounded-lg w-full max-w-[280px] sm:max-w-sm h-auto max-h-48 sm:max-h-64 object-cover"
              />
            </a>
          );
        case 'file':
          return (
            <a
              href={messageObject.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-1 flex items-center gap-2 p-2 sm:p-3 rounded-lg min-w-0
                ${isSender
                  ? 'bg-blue-700 hover:bg-blue-800 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
            >
              <FileIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate text-sm sm:text-base" title={messageObject.content}>
                {messageObject.content}
              </span>
            </a>
          );
        default:
          return (
            <p className={`text-sm sm:text-base font-normal leading-relaxed break-words
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

/**
 * Renders a group of consecutive messages from the same author.
 * @param {object} props - The component props.
 * @param {Array<object>} props.messages - An array of message objects in the group.
 * @param {string} props.currentUserUid - The UID of the current user.
 * @param {boolean} props.showAvatar - True if the author's avatar should be displayed.
 * @param {object} props.authorInfo - Information about the message author (displayName, photoURL).
 * @param {boolean} props.isSender - True if the current user is the author of the messages in the group.
 * @param {function} props.t - The translation function.
 * @returns {JSX.Element} The rendered message group.
 */
const MessageGroup = memo(({ messages, currentUserUid, showAvatar, authorInfo, isSender, t }) => {
  const displayName = isSender ? t('messages.you') : (authorInfo?.displayName || t('messages.user'));

  return (
    <div className={`flex items-start gap-2 sm:gap-2.5 ${isSender ? 'self-end flex-row-reverse' : 'self-start'}`}>
      <div className="flex-shrink-0 w-8 sm:w-10">
        {showAvatar && (
          <UserAvatar
            photoURL={authorInfo?.photoURL}
            displayName={authorInfo?.displayName}
          />
        )}
      </div>
      <div className={`flex flex-col gap-1 max-w-[calc(85vw-3rem)] sm:max-w-[calc(75vw-3.5rem)] lg:max-w-[calc(65vw-3.5rem)] ${isSender ? 'items-end' : 'items-start'}`}>
        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            className={`flex flex-col leading-1.5 p-3 sm:p-4 min-w-0 w-fit max-w-full
              ${isSender
                ? 'bg-blue-600 rounded-s-xl rounded-ee-xl'
                : 'bg-gray-100 dark:bg-gray-700 rounded-e-xl rounded-es-xl'
              }`}
          >
            {idx === 0 && (
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs sm:text-sm font-semibold truncate
                  ${isSender ? 'text-white' : 'text-gray-900 dark:text-white'}`
                }>
                  {displayName}
                </span>
                <span className={`text-xs sm:text-sm font-normal flex-shrink-0
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
    <div className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-2 sm:space-y-3 flex flex-col
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