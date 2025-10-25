import { cryptoService } from "../../lib/cryptoService";
import { FileIcon } from "../../assets/Icons";

const LastMessagePreview = ({ lastMessage, currentUser, isSelected }) => {
  if (!lastMessage) {
    return null;
  }

  const isSender = lastMessage.authorId === currentUser.uid;
  const prefix = isSender ? 'Tú: ' : '';

  const encryptedDataForUser = lastMessage.encryptedPayload?.[currentUser.uid];
  if (!encryptedDataForUser) {
    return <span className="text-xs italic truncate block">...</span>;
  }

  const decryptedString = cryptoService.decrypt(encryptedDataForUser);
  if (!decryptedString) {
    return <span className="text-xs italic truncate block">[Error al descifrar]</span>;
  }

  try {
    const messageObject = JSON.parse(decryptedString);
    const textColor = isSelected ? 'text-blue-100' : 'text-gray-500';

    switch (messageObject.type) {
      case 'image':
        return (
          <span className={`text-xs truncate ${textColor} flex items-center block`}>
            {prefix}
            <svg className="w-4 h-4 mr-1 inline-block flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 00-2.828 0L6 14m6-6l.01.01" /></svg>
            Imagen
          </span>
        );
      case 'file':
        return (
          <span className={`text-xs truncate ${textColor} flex items-center block`}>
            {prefix}
            <FileIcon className="w-4 h-4 mr-1 inline-block flex-shrink-0" />
            {messageObject.content || 'Archivo'}
          </span>
        );
      default:
        return (
          <span className={`text-xs truncate ${textColor} block`}>
            {prefix}
            {messageObject.content}
          </span>
        );
    }
  } catch (e) {
    return <span className={`text-xs italic truncate ${textColor} block`}>[Mensaje corrupto]</span>;
  }
};
export default LastMessagePreview;