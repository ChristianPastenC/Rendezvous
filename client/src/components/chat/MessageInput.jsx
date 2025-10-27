import { useState, useRef, useEffect, useCallback } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { EmojiIcon, PlusIcon, SendIcon, ImageIcon, DocumentIcon, CodeIcon} from '../../assets/Icons';
import { isFileTypeAllowed, ALLOWED_IMAGE_TYPES, ALLOWED_DOC_TYPES, ALLOWED_DEV_TYPES } from '../../utils/allowedFiles';
import { useSendMessage } from '../../hooks/useSendMessages';
import { useEmojiInput } from '../../hooks/useEmojiInput';
import FilePreviewModal from './FilePreviewModal';

const MAX_FILE_SIZE_MB = 5;

const AttachMenu = ({ onAttachClick, attachMenuRef }) => (
  <div ref={attachMenuRef} className="absolute bottom-full mb-2 bg-white rounded-lg shadow-lg overflow-hidden border border-gray-300">

    <button
      onClick={() => onAttachClick('image')}
      className="w-full text-left px-4 py-3 text-gray-900 hover:bg-gray-100 flex items-center gap-3"
    >
      <ImageIcon className="w-5 h-5 text-gray-500" />
      Enviar Imagen
    </button>

    <button
      onClick={() => onAttachClick('document')}
      className="w-full text-left px-4 py-3 text-gray-900 hover:bg-gray-100 flex items-center gap-3"
    >
      <DocumentIcon className="w-5 h-5 text-gray-500" />  
      Enviar Documento
    </button>

    <button
      onClick={() => onAttachClick('code')}
      className="w-full text-left px-4 py-3 text-gray-900 hover:bg-gray-100 flex items-center gap-3"
    >
      <CodeIcon className="w-5 h-5 text-gray-500" />      
      Enviar Código
    </button>
  </div>
);

const MessageInput = ({ socket, isDirectMessage, conversationId, groupId, members }) => {
  const { sending, uploadProgress, sendTextMessage, sendFileMessage } = useSendMessage(
    socket,
    isDirectMessage,
    conversationId,
    groupId,
    members
  );

  const {
    content,
    showEmojiPicker,
    inputRef,
    handleInputChange,
    handleEmojiClick,
    toggleEmojiPicker,
    closeEmojiPicker,
    handleSubmit
  } = useEmojiInput(async (finalContent) => {
    if (sending) return false;
    return await sendTextMessage(finalContent);
  });

  const [previewData, setPreviewData] = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const attachMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        closeEmojiPicker();
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeEmojiPicker]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`El archivo es demasiado grande (Máx: ${MAX_FILE_SIZE_MB} MB).`);
      e.target.value = '';
      return;
    }

    if (!isFileTypeAllowed(file)) {
      alert('Tipo de archivo no permitido. Se permiten imágenes, documentos y archivos de desarrollo.');
      e.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreviewData({ file, url: previewUrl });
    e.target.value = '';
  }, []);

  const handleConfirmUpload = useCallback(async (file) => {
    setPreviewData(null);

    try {
      await sendFileMessage(file);
    } catch (error) {
      console.error("Error en handleConfirmUpload:", error);
    }
  }, [sendFileMessage]);

  const handleAttachClick = useCallback((type) => {
    if (fileInputRef.current) {
      if (type === 'image') {
        fileInputRef.current.accept = ALLOWED_IMAGE_TYPES.join(',');
      } else if (type === 'document') {
        fileInputRef.current.accept = ALLOWED_DOC_TYPES.join(',');
      } else if (type === 'code') {
        fileInputRef.current.accept = ALLOWED_DEV_TYPES.join(',') + ',.html,.css,.js,.jsx,.ts,.tsx,.json,.xml,.py,.java,.c,.cpp,.php,.rb,.go,.rs,.md,.yaml,.yml,.sh,.sql';
      }
      fileInputRef.current.click();
    }
    setShowAttachMenu(false);
  }, []);

  return (
    <>
      <div className="relative p-4 bg-white border-t border-gray-300">
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-full mb-2 left-0 z-50">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme="light"
              emojiStyle="native"
              searchPlaceholder="Buscar emoji..."
              previewConfig={{ showPreview: false }}
            />
          </div>
        )}

        {showAttachMenu && (
          <AttachMenu
            onAttachClick={handleAttachClick}
            attachMenuRef={attachMenuRef}
          />
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
            title="Adjuntar archivo"
          >
            <PlusIcon className="w-6 h-6" />
          </button>

          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={content}
              onChange={handleInputChange}
              placeholder="Escribe un mensaje... (usa :) para emojis)"
              className="w-full bg-gray-100 text-gray-900 p-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            />
            <button
              type="button"
              onClick={toggleEmojiPicker}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-200 transition-colors"
              title="Añadir emoji"
            >
              <EmojiIcon className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <button
            type="submit"
            disabled={!content.trim() || sending}
            className="p-3 rounded-lg bg-[#3B82F6] text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            title="Enviar mensaje"
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
            <p className="text-xs text-gray-500 mt-1">Subiendo archivo: {Math.round(uploadProgress)}%</p>
          </div>
        )}
      </div>

      <FilePreviewModal
        previewData={previewData}
        onClose={() => setPreviewData(null)}
        onConfirm={handleConfirmUpload}
      />
    </>
  );
};

export default MessageInput;