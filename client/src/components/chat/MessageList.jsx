import {
  useRef,
  useEffect,
  memo,
  useMemo,
  useState
} from "react";
import { cryptoService } from "../../lib/cryptoService";
import { FileIcon } from "../../assets/Icons";
import UserAvatar from "../user/UserAvatar";


const MessageItem = memo(({ msg, currentUserUid }) => {
  const isSender = msg.authorId === currentUserUid;

  const content = useMemo(() => {
    const encryptedDataForUser = msg.encryptedPayload?.[currentUserUid];

    if (!encryptedDataForUser) {
      return (
        <p className="text-sm font-normal text-gray-500 dark:text-gray-400 italic">
          [No tienes permiso para ver este mensaje]
        </p>
      );
    }

    const decryptedString = cryptoService.decrypt(encryptedDataForUser);
    if (!decryptedString) {
      return (
        <p className="text-sm font-normal text-red-500 dark:text-red-400 italic">
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
              className="mt-1"
            >
              <img
                src={messageObject.fileUrl}
                alt={messageObject.content || 'Imagen adjunta'}
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
                  : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white' // Color más claro
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
          [Mensaje corrupto]
        </p>
      );
    }
  }, [msg, currentUserUid, isSender]);

  return (
    <div className={`flex items-start gap-2.5 ${isSender ? 'self-end flex-row-reverse' : 'self-start'}`}>
      <div className="flex-shrink-0">
        <UserAvatar
          photoURL={msg.authorInfo?.photoURL}
          displayName={msg.authorInfo?.displayName}
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