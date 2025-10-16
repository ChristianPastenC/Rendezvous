import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cryptoService } from '../../lib/cryptoService';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import ImagePreviewModal from './ImagePreviewModal';
import EmojiPicker from 'emoji-picker-react';

const MessageInput = ({ socket, isDirectMessage, conversationId, groupId, members }) => {
  const { currentUser } = useAuth();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

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
    const MAX_FILE_SIZE_MB = 5;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return alert(`El archivo es muy grande (Máx: ${MAX_FILE_SIZE_MB} MB).`);
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
          encryptAndSendMessage({ type: file.type.startsWith('image/') ? 'image' : 'file', fileUrl: downloadURL, content: file.name });
          setSending(false);
          setUploadProgress(0);
        });
      }
    );
  };

  const onEmojiClick = (emojiObject) => {
    setContent(prevInput => prevInput + emojiObject.emoji);
  };

  return (
    <>
      <div className="relative p-4 bg-gray-800 border-t border-gray-900">
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-full mb-2">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme="dark"
              emojiStyle="native"
              pickerStyle={{ width: '100%', boxShadow: 'none' }}
            />
          </div>
        )}
        <form onSubmit={handleTextSubmit} className="flex items-center space-x-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
          </button>
          <div className="relative flex-1">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="w-full bg-gray-700 text-white p-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              disabled={sending}
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-600"
              title="Añadir emoji"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
          </div>
          <button
            type="submit"
            disabled={!content.trim() || sending}
            className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </form>
      </div>
      <ImagePreviewModal previewData={previewData} onClose={() => setPreviewData(null)} onConfirm={handleConfirmUpload} />
    </>
  );
};

export default MessageInput;