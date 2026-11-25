import {
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  memo,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { EncryptedMessage, MessageAuthorInfo } from '@rendezvous/shared';
import { useDecryptedMessage } from '../../hooks/useDecryptedMessage';
import { EmptyStateIcon, FileIcon } from '../../assets/Icons';
import UserAvatar from '../user/UserAvatar';

interface MessageContentProps {
  msg: EncryptedMessage;
  currentUserUid?: string;
  isSender: boolean;
  t: TFunction;
}

const MessageContent = memo(({ msg, currentUserUid, isSender, t }: MessageContentProps) => {
  const encryptedDataForUser = currentUserUid ? msg.encryptedPayload?.[currentUserUid] : undefined;
  const {
    decryptedText,
    isDecrypting,
    hasDecryptionError,
    retryDecryption,
  } = useDecryptedMessage(encryptedDataForUser);

  if (!encryptedDataForUser) {
    return (
      <p className="text-sm font-normal text-gray-500 dark:text-gray-400 italic">
        {t('messages.noPermission')}
      </p>
    );
  }

  if (isDecrypting) {
    return <p className="text-sm font-normal text-gray-400 italic">...</p>;
  }

  if (!decryptedText || hasDecryptionError) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <p
          className={`text-sm font-normal italic ${
            isSender ? 'text-amber-100' : 'text-red-500 dark:text-red-400'
          }`}
        >
          {t('messages.decryptionError')}
        </p>
        <button
          type="button"
          onClick={retryDecryption}
          className={`text-xs underline font-medium ${
            isSender ? 'text-white hover:text-blue-100' : 'text-blue-600 hover:text-blue-700'
          }`}
        >
          {t('messages.retryDecrypt', 'Retry decrypt')}
        </button>
      </div>
    );
  }

  try {
    const messageObject = JSON.parse(decryptedText) as {
      type?: string;
      content?: string;
      fileUrl?: string;
    };
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
              ${
                isSender
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
          <p
            className={`text-sm sm:text-base font-normal leading-relaxed break-words
            ${isSender ? 'text-white' : 'text-gray-900 dark:text-white'}`}
          >
            {messageObject.content}
          </p>
        );
    }
  } catch {
    return (
      <p className="text-sm font-normal text-red-500 dark:text-red-400 italic">
        {t('messages.corrupt')}
      </p>
    );
  }
});

interface MessageGroupProps {
  messages: EncryptedMessage[];
  currentUserUid?: string;
  showAvatar: boolean;
  authorInfo: MessageAuthorInfo;
  isSender: boolean;
  firstUnreadMessageId?: string | null;
  onRetrySend?: (msg: EncryptedMessage) => void;
  t: TFunction;
}

const MessageGroup = memo(
  ({
    messages,
    currentUserUid,
    showAvatar,
    authorInfo,
    isSender,
    firstUnreadMessageId,
    onRetrySend,
    t,
  }: MessageGroupProps) => {
    const displayName = isSender
      ? t('messages.you')
      : authorInfo?.displayName || t('messages.user');

    return (
      <div
        className={`flex items-start gap-2 sm:gap-2.5 ${
          isSender ? 'self-end flex-row-reverse' : 'self-start'
        }`}
      >
        <div className="flex-shrink-0 w-8 sm:w-10">
          {showAvatar && (
            <UserAvatar photoURL={authorInfo?.photoURL} displayName={authorInfo?.displayName} />
          )}
        </div>
        <div
          className={`flex flex-col gap-1 max-w-[calc(85vw-3rem)] sm:max-w-[calc(75vw-3.5rem)] lg:max-w-[calc(65vw-3.5rem)] ${
            isSender ? 'items-end' : 'items-start'
          }`}
        >
          {messages.map((msg, idx) => (
            <div key={msg.id} className="flex flex-col max-w-full">
              {firstUnreadMessageId && msg.id === firstUnreadMessageId && (
                <div
                  role="separator"
                  className="my-2 flex items-center gap-2 text-xs font-semibold text-blue-600"
                >
                  <span className="h-px flex-1 bg-blue-200" />
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 border border-blue-200">
                    {t('messages.unreadSeparator', 'Unread messages')}
                  </span>
                  <span className="h-px flex-1 bg-blue-200" />
                </div>
              )}
              <div
                className={`flex flex-col leading-1.5 p-3 sm:p-4 min-w-0 w-fit max-w-full
                  ${
                    isSender
                      ? msg.status === 'failed'
                        ? 'bg-red-600 rounded-s-xl rounded-ee-xl'
                        : 'bg-blue-600 rounded-s-xl rounded-ee-xl'
                      : 'bg-gray-100 dark:bg-gray-700 rounded-e-xl rounded-es-xl'
                  }`}
              >
                {idx === 0 && (
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-xs sm:text-sm font-semibold truncate
                      ${isSender ? 'text-white' : 'text-gray-900 dark:text-white'}`}
                    >
                      {displayName}
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-normal flex-shrink-0
                      ${isSender ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
                  <span
                    className={`text-xs font-normal mt-1 
                    ${isSender ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
                {isSender && msg.status === 'sending' && (
                  <span className="text-[11px] text-blue-200 mt-1 italic">
                    {t('messages.status.sending', 'Sending...')}
                  </span>
                )}
                {isSender && msg.status === 'failed' && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-white">
                    <span>{t('messages.status.failed', 'Failed to send')}</span>
                    {onRetrySend && (
                      <button
                        type="button"
                        onClick={() => onRetrySend(msg)}
                        className="underline font-semibold hover:text-red-100"
                      >
                        {t('messages.status.retry', 'Retry')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

interface MessageListProps {
  messages: EncryptedMessage[];
  currentUserUid?: string;
  hasMoreMessages?: boolean;
  isLoadingOlder?: boolean;
  lastReadTimestamp?: string | null;
  onLoadOlder?: () => void;
  onRetrySend?: (msg: EncryptedMessage) => void;
}

interface GroupedMessages {
  authorId: string;
  authorInfo: MessageAuthorInfo;
  messages: EncryptedMessage[];
}

const MessageList = ({
  messages,
  currentUserUid,
  hasMoreMessages = false,
  isLoadingOlder = false,
  lastReadTimestamp = null,
  onLoadOlder,
  onRetrySend,
}: MessageListProps) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const firstMessageIdRef = useRef<string | null>(null);
  const scrollSnapshotRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  const firstUnreadMessageId = useMemo((): string | null => {
    if (!lastReadTimestamp || !messages.length) return null;
    const lastReadMs = new Date(lastReadTimestamp).getTime();
    if (Number.isNaN(lastReadMs)) return null;
    const unread = messages.find(
      (m) => m.authorId !== currentUserUid && new Date(m.createdAt).getTime() > lastReadMs
    );
    return unread ? unread.id : null;
  }, [messages, lastReadTimestamp, currentUserUid]);

  const groupedMessages = useMemo((): GroupedMessages[] => {
    if (!messages.length) return [];

    const firstMsg = messages[0]!;
    const groups: GroupedMessages[] = [];
    let currentGroup: GroupedMessages = {
      authorId: firstMsg.authorId,
      authorInfo: firstMsg.authorInfo,
      messages: [firstMsg],
    };

    for (let i = 1; i < messages.length; i++) {
      const msg = messages[i]!;
      const lastInGroup = currentGroup.messages[currentGroup.messages.length - 1]!;
      const timeDiff =
        new Date(msg.createdAt).getTime() - new Date(lastInGroup.createdAt).getTime();

      if (msg.authorId === currentGroup.authorId && timeDiff < 120000) {
        currentGroup.messages.push(msg);
      } else {
        groups.push(currentGroup);
        currentGroup = {
          authorId: msg.authorId,
          authorInfo: msg.authorInfo,
          messages: [msg],
        };
      }
    }
    groups.push(currentGroup);

    return groups;
  }, [messages]);

  const handleLoadOlderClick = () => {
    if (!onLoadOlder) return;
    if (containerRef.current) {
      scrollSnapshotRef.current = {
        scrollHeight: containerRef.current.scrollHeight,
        scrollTop: containerRef.current.scrollTop,
      };
    }
    onLoadOlder();
  };

  useLayoutEffect(() => {
    const snapshot = scrollSnapshotRef.current;
    const container = containerRef.current;
    const currentFirstId = messages[0]?.id ?? null;

    if (snapshot && container && currentFirstId !== firstMessageIdRef.current) {
      const heightDelta = container.scrollHeight - snapshot.scrollHeight;
      container.scrollTop = snapshot.scrollTop + Math.max(0, heightDelta);
      scrollSnapshotRef.current = null;
    }
    firstMessageIdRef.current = currentFirstId;
  }, [messages]);

  useEffect(() => {
    const latestId = messages.length > 0 ? (messages[messages.length - 1]?.id ?? null) : null;
    if (latestId && latestId !== lastMessageIdRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    lastMessageIdRef.current = latestId;
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 p-2 sm:p-4 overflow-y-auto space-y-2 sm:space-y-3 flex flex-col
        scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
    >
      {messages.length > 0 ? (
        <>
          {hasMoreMessages && onLoadOlder && (
            <div className="flex justify-center py-2">
              <button
                type="button"
                onClick={handleLoadOlderClick}
                disabled={isLoadingOlder}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors disabled:opacity-50"
              >
                {isLoadingOlder ? t('messages.loadingOlder') : t('messages.loadOlder')}
              </button>
            </div>
          )}
          {groupedMessages.map((group, idx) => {
            const showAvatar =
              idx === groupedMessages.length - 1 ||
              groupedMessages[idx + 1]?.authorId !== group.authorId;
            const isSender = group.authorId === currentUserUid;

            return (
              <MessageGroup
                key={`${group.authorId}-${group.messages[0]!.id}`}
                messages={group.messages}
                currentUserUid={currentUserUid}
                showAvatar={showAvatar}
                authorInfo={group.authorInfo}
                isSender={isSender}
                firstUnreadMessageId={firstUnreadMessageId}
                onRetrySend={onRetrySend}
                t={t}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center h-full p-6 text-center">
          <EmptyStateIcon className="w-16 h-16 text-gray-300" />
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
