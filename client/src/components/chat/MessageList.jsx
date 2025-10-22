import {
  useRef,
  useEffect,
  memo,
  useMemo,
  useState
} from "react";
import { cryptoService } from "../../lib/cryptoService";
import { FileIcon } from "../../assets/Icons";

const Avatar = ({ photoURL, displayName, isSender }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [photoURL]);

  const showFallback = !photoURL || imgError;

  if (showFallback) {
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white
        ${isSender ? 'bg-indigo-400' : 'bg-blue-600'}
      `}>
        {displayName?.charAt(0).toUpperCase() || '?'}
      </div>
    );
  }

  return (
    <img
      src={photoURL}
      alt={displayName || 'Avatar'}
      className="w-8 h-8 rounded-full"
      loading="lazy"
      onError={() => setImgError(true)}
    />
  );
};

const MessageItem = memo(({ msg, currentUserUid }) => {
  const isSender = msg.authorId === currentUserUid;

  const content = useMemo(() => {
    const encryptedDataForUser = msg.encryptedPayload?.[currentUserUid];

    if (!encryptedDataForUser) {
      return (
        <p className="text-sm font-normal py-2.5 text-gray-500 dark:text-gray-400 italic">
          [No tienes permiso para ver este mensaje]
        </p>
      );
    }

    const decryptedString = cryptoService.decrypt(encryptedDataForUser);
    if (!decryptedString) {
      return (
        <p className="text-sm font-normal py-2.5 text-red-500 dark:text-red-400 italic">
          [Error al descifrar]
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
              className="py-2.5"
            >
              <img
                src={messageObject.fileUrl}
                alt={messageObject.content}
                className="rounded-lg max-w-full max-h-64"
              />
            </a>
          );
        case 'file':
          return (
            <a
              href={messageObject.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-2 inline-flex items-center p-2 rounded-lg 
                ${isSender
                  ? 'bg-blue-700 hover:bg-blue-800 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white'
                }`}
            >
              <FileIcon className="w-5 h-5 mr-2" />
              {messageObject.content}
            </a>
          );
        default:
          return (
            <p className={`text-sm font-normal py-2.5 
              ${isSender ? 'text-white' : 'text-gray-900 dark:text-white'}`
            }>
              {messageObject.content}
            </p>
          );
      }
    } catch (e) {
      return (
        <p className="text-sm font-normal py-2.5 text-red-500 dark:text-red-400 italic">
          [Mensaje corrupto]
        </p>
      );
    }
  }, [msg, currentUserUid, isSender]);

  return (
    <div className={`flex items-start gap-2.5 ${isSender ? 'self-end flex-row-reverse' : 'self-start'}`}>
      <div className="flex-shrink-0">
        <Avatar
          photoURL={msg.authorInfo?.photoURL}
          displayName={msg.authorInfo?.displayName}
          isSender={isSender}
        />
      </div>
      <div className={`flex flex-col w-full max-w-xs sm:max-w-sm md:max-w-md leading-1.5 p-4
        ${isSender
          ? 'bg-blue-600 rounded-s-xl rounded-ee-xl'
          : 'bg-gray-100 dark:bg-gray-700 rounded-e-xl rounded-es-xl'
        }`}
      >
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className={`text-sm font-semibold 
            ${isSender ? 'text-white' : 'text-gray-900 dark:text-white'}`
            }>
            {msg.authorInfo?.displayName || 'Usuario'}
          </span>
          <span className={`text-sm font-normal 
            ${isSender ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`
          }>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {content}
      </div>
    </div>
  );
});

const MessageList = ({ messages, currentUserUid }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col">
      {messages.map(msg => (
        <MessageItem
          key={msg.id}
          msg={msg}
          currentUserUid={currentUserUid}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
export default MessageList;