import React, { useState, useRef } from 'react';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import ImagePreviewModal from './ImagePreviewModal';

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

const MessageInput = ({ socket, groupId, channelId, authorInfo }) => {
  const { currentUser } = useAuth();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      alert('Tipo de archivo no permitido. Por favor, selecciona una imagen (JPG, PNG, GIF).');
      e.target.value = null;
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`El archivo es demasiado grande. El límite es de ${MAX_FILE_SIZE_MB} MB.`);
      e.target.value = null;
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreviewData({ file, url: previewUrl });
    e.target.value = null;
  };

  const uploadFile = (file) => {
    if (!currentUser) return;
    const storageRef = ref(storage, `uploads/${currentUser.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    setSending(true);
    uploadTask.on('state_changed',
      (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
      (error) => {
        console.error("Error al subir el archivo:", error);
        setSending(false);
        setUploadProgress(0);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          socket.emit('sendMessage', {
            groupId, channelId, content: file.name,
            fileUrl: downloadURL, fileType: file.type, authorInfo,
          });
          setSending(false);
          setUploadProgress(0);
        });
      }
    );
  };

  const handleConfirmUpload = (file) => {
    setPreviewData(null);
    uploadFile(file);
  };

  const handleCancelPreview = () => {
    setPreviewData(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() || sending) return;
    socket.emit('sendMessage', { groupId, channelId, content: content.trim(), authorInfo });
    setContent('');
  };

  return (
    <>
      <div className="p-4 bg-gray-800 border-t border-gray-900">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept={ALLOWED_FILE_TYPES.join(',')}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            disabled={sending}
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors disabled:opacity-50"
            title="Adjuntar archivo"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.415a6 6 0 108.486 8.486L20.5 13"></path></svg>
          </button>
          <input
            type="text" value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe un mensaje..." disabled={sending}
            className="flex-1 px-4 py-3 bg-gray-700 rounded-lg text-white ..."
          />
          <button type="submit" disabled={!content.trim() || sending} className="px-6 py-3 bg-blue-600 ...">
            Enviar
          </button>
        </form>
        {sending && uploadProgress > 0 && (
          <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}
      </div>

      <ImagePreviewModal
        previewData={previewData}
        onClose={handleCancelPreview}
        onConfirm={handleConfirmUpload}
      />
    </>
  );
};

export default MessageInput;