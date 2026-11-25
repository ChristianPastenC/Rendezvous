import { useState, useRef, useEffect, useCallback, type ChangeEvent, type RefObject } from 'react';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import type { TFunction } from 'i18next';
import type { EncryptedMessage } from '@rendezvous/shared';
import { EmojiIcon, PlusIcon, SendIcon, ImageIcon, DocumentIcon, CodeIcon } from '../../assets/Icons';
import { isFileTypeAllowed, ALLOWED_IMAGE_TYPES, ALLOWED_DOC_TYPES, ALLOWED_TEXT_DATA_TYPES } from '../../utils/allowedFiles';
import { useSendMessage, type MessageMember } from '../../hooks/useSendMessages';
import { useEmojiInput } from '../../hooks/useEmojiInput';
import type { TypedClientSocket } from '../../lib/socket';
import FilePreviewModal, { type FilePreviewData } from './FilePreviewModal';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../context/NotificationContext';

const MAX_FILE_SIZE_MB = 5;

interface AttachMenuProps {
  t: TFunction;
  onAttachClick: (type: 'image' | 'document' | 'code') => void;
  attachMenuRef: RefObject<HTMLDivElement | null>;
}

const AttachMenu = ({ t, onAttachClick, attachMenuRef }: AttachMenuProps) => (
  <div
    ref={attachMenuRef}
    className="absolute bottom-full mb-2 bg-white rounded-lg shadow-lg overflow-hidden border border-gray-300"
  >
    <button
      onClick={() => onAttachClick('image')}
      className="w-full text-left px-4 py-3 text-gray-900 hover:bg-gray-100 flex items-center gap-3"
    >
      <ImageIcon className="w-5 h-5 text-gray-500" />
      {t('fileInput.attachMenu.image')}
    </button>

    <button
      onClick={() => onAttachClick('document')}
      className="w-full text-left px-4 py-3 text-gray-900 hover:bg-gray-100 flex items-center gap-3"
    >
      <DocumentIcon className="w-5 h-5 text-gray-500" />
      {t('fileInput.attachMenu.document')}
    </button>

    <button
      onClick={() => onAttachClick('code')}
      className="w-full text-left px-4 py-3 text-gray-900 hover:bg-gray-100 flex items-center gap-3"
    >
      <CodeIcon className="w-5 h-5 text-gray-500" />
      {t('fileInput.attachMenu.code')}
    </button>
  </div>
);

interface MessageInputProps {
  socket: TypedClientSocket | null;
  isDirectMessage: boolean;
  conversationId: string | null;
  groupId: string | null;
  members: MessageMember[];
  onOptimisticMessage?: (msg: EncryptedMessage) => void;
}

const MessageInput = ({
  socket,
  isDirectMessage,
  conversationId,
  groupId,
  members,
  onOptimisticMessage,
}: MessageInputProps) => {
  const { t } = useTranslation();

  const {
    sending,
    uploadProgress,
    missingKeyWarning,
    clearMissingKeyWarning,
    sendTextMessage,
    sendFileMessage,
  } = useSendMessage(
    socket,
    isDirectMessage,
    conversationId,
    groupId,
    members,
    onOptimisticMessage
  );

  const {
    content,
    showEmojiPicker,
    inputRef,
    handleInputChange,
    handleEmojiClick,
    toggleEmojiPicker,
    closeEmojiPicker,
    handleSubmit,
  } = useEmojiInput(async (finalContent) => {
    if (sending) return false;
    return await sendTextMessage(finalContent);
  });

  const [previewData, setPreviewData] = useState<FilePreviewData | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const { showToast } = useNotification();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewData?.url && previewData.url.startsWith('blob:')) {
        URL.revokeObjectURL(previewData.url);
      }
    };
  }, [previewData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(target)) {
        closeEmojiPicker();
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(target)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeEmojiPicker]);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showToast(t('fileInput.error.fileSize', { size: MAX_FILE_SIZE_MB }), 'error');
        e.target.value = '';
        return;
      }

      if (!isFileTypeAllowed(file)) {
        showToast(t('fileInput.error.fileType'), 'error');
        e.target.value = '';
        return;
      }

      if (previewData?.url && previewData.url.startsWith('blob:')) {
        URL.revokeObjectURL(previewData.url);
      }

      const previewUrl = URL.createObjectURL(file);
      setPreviewData({ file, url: previewUrl });
      e.target.value = '';
    },
    [t, previewData, showToast]
  );

  const handleConfirmUpload = useCallback(
    async (file: File) => {
      try {
        await sendFileMessage(file);

        if (previewData?.url && previewData.url.startsWith('blob:')) {
          URL.revokeObjectURL(previewData.url);
        }
        setPreviewData(null);
      } catch (error) {
        console.error('Error in handleConfirmUpload:', error);
        showToast(
          t('fileInput.error.uploadFailed', 'Failed to upload file. Please try again.'),
          'error'
        );
      }
    },
    [sendFileMessage, previewData, t, showToast]
  );

  const handleClosePreview = useCallback(() => {
    if (previewData?.url && previewData.url.startsWith('blob:')) {
      URL.revokeObjectURL(previewData.url);
    }
    setPreviewData(null);
  }, [previewData]);

  const handleAttachClick = useCallback((type: 'image' | 'document' | 'code') => {
    if (fileInputRef.current) {
      if (type === 'image') {
        fileInputRef.current.accept = ALLOWED_IMAGE_TYPES.join(',');
      } else if (type === 'document') {
        fileInputRef.current.accept = ALLOWED_DOC_TYPES.join(',');
      } else if (type === 'code') {
        fileInputRef.current.accept =
          ALLOWED_TEXT_DATA_TYPES.join(',') +
          ',.css,.json,.xml,.py,.java,.c,.cpp,.cs,.rb,.go,.rs,.md,.yaml,.yml,.sql';
      }
      fileInputRef.current.click();
    }
    setShowAttachMenu(false);
  }, []);

  return (
    <>
      <div className="relative p-4 bg-white border-t border-gray-300">
        {missingKeyWarning && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span>{missingKeyWarning}</span>
            <button
              type="button"
              onClick={clearMissingKeyWarning}
              className="font-semibold text-amber-900 hover:underline"
            >
              {t('common.close', 'Close')}
            </button>
          </div>
        )}

        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-full mb-2 left-0 z-50">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme={Theme.LIGHT}
              emojiStyle={EmojiStyle.NATIVE}
              searchPlaceholder={t('fileInput.emoji.search')}
              previewConfig={{ showPreview: false }}
            />
          </div>
        )}

        {showAttachMenu && (
          <AttachMenu t={t} onAttachClick={handleAttachClick} attachMenuRef={attachMenuRef} />
        )}

        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            disabled={sending}
            className="p-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 transition-colors"
            title={t('fileInput.attachTitle')}
          >
            <PlusIcon className="w-6 h-6" />
          </button>

          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={content}
              onChange={handleInputChange}
              placeholder={t('fileInput.placeholder')}
              className="w-full bg-gray-100 text-gray-900 p-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            />
            <button
              type="button"
              onClick={toggleEmojiPicker}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-200 transition-colors"
              title={t('fileInput.emojiTitle')}
            >
              <EmojiIcon className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <button
            type="submit"
            disabled={!content.trim() || sending}
            className="p-3 rounded-lg bg-[#3B82F6] text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            title={t('fileInput.sendTitle')}
          >
            <SendIcon className="w-6 h-6" />
          </button>
        </form>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('fileInput.uploadProgress', { progress: Math.round(uploadProgress) })}
            </p>
          </div>
        )}
      </div>

      <FilePreviewModal
        previewData={previewData}
        onClose={handleClosePreview}
        onConfirm={handleConfirmUpload}
      />
    </>
  );
};

export default MessageInput;
