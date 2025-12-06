// client/src/components/chat/LastMessagePreview.jsx
import { FileIcon, ImageIcon } from '../../assets/Icons';
import { useTranslation } from 'react-i18next';
import { useDecryptedMessage } from '../../hooks/useDecryptedMessage';

const LastMessagePreview = ({ lastMessage, currentUser, isSelected }) => {
  const { t } = useTranslation();
  const encryptedDataForUser = lastMessage?.encryptedPayload?.[currentUser.uid];
  const { decryptedText, isDecrypting } = useDecryptedMessage(encryptedDataForUser);

  if (!lastMessage) {
    return null;
  }

  const isSender = lastMessage.authorId === currentUser.uid;
  const prefix = isSender ? t('messages.preview.youPrefix') : '';
  const textColor = isSelected ? 'text-blue-100' : 'text-gray-500';

  if (!encryptedDataForUser || isDecrypting) {
    return <span className="text-xs italic truncate block">...</span>;
  }

  if (!decryptedText) {
    return (
      <span className="text-xs italic truncate block">
        {t('messages.preview.decryptionError')}
      </span>
    );
  }

  try {
    const messageObject = JSON.parse(decryptedText);

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
  } catch {
    return (
      <span className={`text-xs italic truncate ${textColor} block`}>
        {t('messages.preview.corrupt')}
      </span>
    );
  }
};

export default LastMessagePreview;
