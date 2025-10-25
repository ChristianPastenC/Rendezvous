import { cryptoService } from "../../lib/cryptoService";
import { FileIcon, ImageIcon } from "../../assets/Icons";

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
          <span className={`text-xs truncate ${textColor} items-center block`}>
            {prefix}
            <ImageIcon className="w-4 h-4 mr-1 inline-block flex-shrink-0" />
            Imagen
          </span>
        );
      case 'file':
        return (
          <span className={`text-xs truncate ${textColor} items-center block`}>
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