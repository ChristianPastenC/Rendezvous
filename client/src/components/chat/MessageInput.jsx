import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cryptoService } from '../../lib/cryptoService';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import FilePreviewModal from './FilePreviewModal';
import EmojiPicker from 'emoji-picker-react';

const MAX_FILE_SIZE_MB = 5;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'
];

const ALLOWED_DOC_TYPES = [
  'application/pdf', 'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
];

const ALLOWED_DEV_TYPES = [
  'text/html', 'text/css', 'text/javascript', 'application/javascript',
  'application/json', 'application/xml', 'text/xml', 'application/x-sh',
  'application/x-python-code', 'text/x-python', 'text/x-java-source',
  'text/x-c', 'text/x-c++', 'text/x-csharp', 'text/x-php',
  'text/x-ruby', 'text/x-go', 'text/x-rust', 'text/x-typescript',
  'application/typescript', 'text/markdown', 'text/x-yaml', 'application/x-yaml'
];

const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES, ...ALLOWED_DEV_TYPES];

const isFileTypeAllowed = (file) => {
  if (ALL_ALLOWED_TYPES.includes(file.type)) return true;
  const fileName = file.name.toLowerCase();
  const devExtensions = [
    '.html', '.htm', '.css', '.js', '.jsx', '.ts', '.tsx',
    '.json', '.xml', '.sh', '.bash', '.py', '.java', '.c',
    '.cpp', '.cs', '.php', '.rb', '.go', '.rs', '.yaml',
    '.yml', '.md', '.txt', '.sql', '.env', '.gitignore',
    '.vue', '.svelte', '.scss', '.sass', '.less'
  ];
  return devExtensions.some(ext => fileName.endsWith(ext));
};

const MessageInput = ({ socket, isDirectMessage, conversationId, groupId, members }) => {
  const { currentUser } = useAuth();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const attachMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const encryptAndSendMessage = async (messageObject) => {
    setSending(true);
    try {
      const selfKey = cryptoService.getPublicKey();
      const allMembers = [...members, { uid: currentUser.uid, publicKey: selfKey }];
      const uniqueMembers = Array.from(new Map(allMembers.map(item => [item.uid, item])).values());
      const encryptedPayload = {};
      for (const member of uniqueMembers) {
        const publicKey = member.publicKey || await cryptoService.fetchPublicKey(member.uid);
        if (publicKey) {
          const encrypted = cryptoService.encrypt(JSON.stringify(messageObject), publicKey);
          if (encrypted) encryptedPayload[member.uid] = encrypted;
        }
      }
      if (Object.keys(encryptedPayload).length > 0) {
        socket.emit('sendMessage', { conversationId, isDirectMessage, groupId, encryptedPayload });
      } else {
        throw new Error("El payload cifrado está vacío.");
      }
    } catch (error) {
      console.error("Error al cifrar o enviar el mensaje:", error);
      alert("Error: No se pudo enviar el mensaje cifrado.");
    } finally {
      setSending(false);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() || sending) return;
    encryptAndSendMessage({ type: 'text', content: content.trim() });
    setContent('');
    setShowEmojiPicker(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`El archivo es demasiado grande (Máx: ${MAX_FILE_SIZE_MB} MB).`);
      e.target.value = '';
      return;
    }

    if (!isFileTypeAllowed(file)) {
      alert('Tipo de archivo no permitido.');
      e.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreviewData({ file, url: previewUrl });
    e.target.value = '';
  };

  const handleConfirmUpload = (file) => {
    setPreviewData(null);
    const storageRef = ref(storage, `uploads/${currentUser.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    setSending(true);
    uploadTask.on('state_changed',
      (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
      (error) => {
        console.error("Error al subir archivo:", error);
        setSending(false);
        setUploadProgress(0);
        alert("Error al subir el archivo.");
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          encryptAndSendMessage({
            type: file.type.startsWith('image/') ? 'image' : 'file',
            fileUrl: downloadURL,
            content: file.name
          });
          setSending(false);
          setUploadProgress(0);
        });
      }
    );
  };

  const onEmojiClick = (emojiObject) => {
    setContent(prevInput => prevInput + emojiObject.emoji);
  };

  const handleAttachClick = (type) => {
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
  };

  return (
    <>
      <div className="relative p-3 sm:p-4 bg-white border-t border-gray-200">
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-full mb-2 left-0 sm:left-auto z-10">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme="light"
              emojiStyle="native"
              width="280px"
              height="350px"
            />
          </div>
        )}

        {showAttachMenu && (
          <div ref={attachMenuRef} className="absolute bottom-full mb-2 left-0 sm:left-12 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10 w-56">
            <button
              onClick={() => handleAttachClick('image')}
              className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 010-2.828L14 8" />
              </svg>
              Enviar Imagen
            </button>
            <button
              onClick={() => handleAttachClick('document')}
              className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-t border-gray-100 text-sm"
            >
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Enviar Documento
            </button>
            <button
              onClick={() => handleAttachClick('code')}
              className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-t border-gray-100 text-sm"
            >
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Enviar Código
            </button>
          </div>
        )}

        <form onSubmit={handleTextSubmit} className="flex items-center space-x-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            disabled={sending}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex-shrink-0"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="w-full bg-gray-50 text-gray-800 p-2 sm:p-3 pr-10 sm:pr-12 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              disabled={sending}
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 sm:p-2 rounded-full hover:bg-gray-200"
              title="Añadir emoji"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          <button
            type="submit"
            disabled={!content.trim() || sending}
            className="p-2 sm:p-3 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-50 text-white flex-shrink-0"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
      <FilePreviewModal previewData={previewData} onClose={() => setPreviewData(null)} onConfirm={handleConfirmUpload} />
    </>
  );
};

export default MessageInput;