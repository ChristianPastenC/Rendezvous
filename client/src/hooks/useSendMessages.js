import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { cryptoService } from '../lib/cryptoService';
import { storage } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export const useSendMessage = (socket, isDirectMessage, conversationId, groupId, members) => {
  const { currentUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const encryptAndSendMessage = useCallback(async (messageObject) => {
    setSending(true);
    try {
      let memberKeys;
      let backendConversationId = conversationId;

      if (isDirectMessage) {
        const otherUser = members.find(m => m.uid !== currentUser.uid);
        if (!otherUser) throw new Error("No se pudo encontrar al otro usuario en el DM.");

        backendConversationId = [currentUser.uid, otherUser.uid].sort().join('_');

        const selfKey = cryptoService.getPublicKey();
        memberKeys = [{ uid: currentUser.uid, publicKey: selfKey }];

        const otherUserKey = await cryptoService.fetchPublicKey(otherUser.uid);
        if (otherUserKey) memberKeys.push({ uid: otherUser.uid, publicKey: otherUserKey });
      } else {
        memberKeys = await cryptoService.fetchPublicKeysForGroup(groupId);
      }

      const encryptedPayload = {};
      for (const member of memberKeys) {
        const encrypted = cryptoService.encrypt(JSON.stringify(messageObject), member.publicKey);
        if (encrypted) encryptedPayload[member.uid] = encrypted;
      }

      if (Object.keys(encryptedPayload).length > 0) {
        socket.emit('sendMessage', {
          conversationId: backendConversationId,
          isDirectMessage,
          groupId,
          encryptedPayload
        });
        return true;
      } else {
        throw new Error("El payload cifrado está vacío.");
      }
    } catch (error) {
      console.error("Error al cifrar o enviar el mensaje:", error);
      alert("Error: No se pudo enviar el mensaje cifrado.");
      return false;
    } finally {
      setSending(false);
    }
  }, [socket, isDirectMessage, conversationId, groupId, members, currentUser.uid]);

  const sendTextMessage = useCallback(async (content) => {
    if (!content.trim() || sending) return false;

    const success = await encryptAndSendMessage({
      type: 'text',
      content: content.trim()
    });

    return success;
  }, [sending, encryptAndSendMessage]);

  const sendFileMessage = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `uploads/${currentUser.uid}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      setSending(true);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Error al subir archivo:", error);
          setSending(false);
          setUploadProgress(0);
          alert("Error al subir el archivo.");
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            const messageObject = {
              type: file.type.startsWith('image/') ? 'image' : 'file',
              fileUrl: downloadURL,
              content: file.name
            };

            await encryptAndSendMessage(messageObject);
            setUploadProgress(0);
            resolve(downloadURL);
          } catch (error) {
            console.error("Error al enviar mensaje con archivo:", error);
            setSending(false);
            setUploadProgress(0);
            reject(error);
          }
        }
      );
    });
  }, [currentUser.uid, encryptAndSendMessage]);

  const cancelSending = useCallback(() => {
    setSending(false);
    setUploadProgress(0);
  }, []);

  return {
    sending,
    uploadProgress,
    sendTextMessage,
    sendFileMessage,
    encryptAndSendMessage,
    cancelSending
  };
};