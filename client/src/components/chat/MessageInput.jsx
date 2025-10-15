import React, { useState, useRef } from 'react';
import { storage, auth } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import ImagePreviewModal from './ImagePreviewModal';
import { cryptoService } from '../../lib/cryptoService';

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

const MessageInput = ({ socket, isDirectMessage, conversationId, groupId, members }) => {
  const { currentUser } = useAuth();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState(null);
  const fileInputRef = useRef(null);

  const encryptAndSendMessage = async (messageObject) => {
    if (!members || members.length === 0) {
      return alert("No hay miembros en esta conversación para enviar un mensaje.");
    }

    setSending(true);
    try {
      const selfKey = cryptoService.getPublicKey();
      const allMemberUids = Array.from(new Set(members.map(m => m.uid).concat(currentUser.uid)));

      const recipientKeyPromises = allMemberUids.map(async (uid) => {
        try {
          if (uid === currentUser.uid) return { uid, key: selfKey };
          const key = await cryptoService.fetchPublicKey(uid);
          return { uid, key };
        } catch (e) {
          return null;
        }
      });

      const recipientPublicKeys = (await Promise.all(recipientKeyPromises)).filter(r => r && r.key);

      if (recipientPublicKeys.length === 0) {
        throw new Error("No se encontraron claves públicas válidas para los destinatarios.");
      }

      const messageString = JSON.stringify(messageObject);
      const encryptedPayload = {};

      for (const recipient of recipientPublicKeys) {
        const encrypted = cryptoService.encrypt(messageString, recipient.key);
        if (encrypted) {
          encryptedPayload[recipient.uid] = encrypted;
        }
      }

      if (Object.keys(encryptedPayload).length > 0) {
        socket.emit('sendMessage', { conversationId, isDirectMessage, groupId, encryptedPayload });
      } else {
        throw new Error("El payload cifrado está vacío.");
      }

    } catch (error) {
      console.error("Error al cifrar o enviar el mensaje:", error);
      alert("No se pudo enviar el mensaje cifrado.");
    } finally {
      setSending(false);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() || sending) return;
    encryptAndSendMessage({ type: 'text', content: content.trim() });
    setContent('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return alert(`El archivo es demasiado grande (Máx: ${MAX_FILE_SIZE_MB} MB).`);
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return alert('Tipo de archivo no permitido.');
    }
    const previewUrl = URL.createObjectURL(file);
    setPreviewData({ file, url: previewUrl });
    e.target.value = null;
  };

  const handleConfirmUpload = (file) => {
    setPreviewData(null);
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
        alert("Error al subir el archivo.");
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          encryptAndSendMessage({
            type: file.type.startsWith('image/') ? 'image' : 'file',
            fileUrl: downloadURL,
            content: file.name,
            fileType: file.type,
          });
          setSending(false);
          setUploadProgress(0);
        });
      }
    );
  };

  return (
    <>
      <div className="p-4 bg-gray-800 border-t border-gray-900">
        <form onSubmit={handleTextSubmit} className="flex items-center space-x-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={ALLOWED_FILE_TYPES.join(',')} />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full" title="Adjuntar archivo">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.415a6 6 0 108.486 8.486L20.5 13"></path></svg>
          </button>
          <input type="text" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Escribe un mensaje cifrado..." disabled={sending} className="flex-1 px-4 py-3 bg-gray-700 rounded-lg text-white" />
          <button type="submit" disabled={!content.trim() || sending} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold disabled:opacity-50">
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
        onClose={() => setPreviewData(null)}
        onConfirm={handleConfirmUpload}
      />
    </>
  );
};

export default MessageInput;