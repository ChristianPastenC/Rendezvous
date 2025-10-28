// client/src/components/chat/LastMessagePreview.jsx
import { cryptoService } from "../../lib/cryptoService";
import { FileIcon, ImageIcon } from "../../assets/Icons";
import { useTranslation } from 'react-i18next';

const LastMessagePreview = ({ lastMessage, currentUser, isSelected }) => {
  const { t } = useTranslation();

  if (!lastMessage) {
    return null;
  }

  const isSender = lastMessage.authorId === currentUser.uid;
  const prefix = isSender ? t('messages.preview.youPrefix') : '';

  const encryptedDataForUser = lastMessage.encryptedPayload?.[currentUser.uid];
  if (!encryptedDataForUser) {
    return <span className="text-xs italic truncate block">...</span>;
  }

  const decryptedString = cryptoService.decrypt(encryptedDataForUser);
  if (!decryptedString) {
    return <span className="text-xs italic truncate block">{t('messages.preview.decryptionError')}</span>;
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
            {t('messages.preview.image')}
          </span>
        );
      case 'file':
        return (
          <span className={`text-xs truncate ${textColor} items-center block`}>
            {prefix}
            <FileIcon className="w-4 h-4 mr-1 inline-block flex-shrink-0" />
            {messageObject.content || t('messages.preview.file')}
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
    return <span className={`text-xs italic truncate ${textColor} block`}>{t()('messages.preview.corrupt')}</span>;
  }
};
export default LastMessagePreview;