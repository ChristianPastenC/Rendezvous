// client/src/hooks/useSendMessages.js
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { cryptoService } from '../lib/cryptoService';
import { storage } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

/**
 * Custom hook for sending messages in a conversation.
 * It handles text and file messages, encryption, file uploads, and state management.
 * @param {import('socket.io-client').Socket | null} socket - The Socket.IO client instance.
 * @param {boolean} isDirectMessage - True if the conversation is a direct message.
 * @param {string | null} conversationId - The ID of the conversation (used for DMs).
 * @param {string | null} groupId - The ID of the group (used for group chats).
 * @param {any[]} members - An array of member objects in the conversation.
 * @returns {{
 *  sending: boolean,
 *  uploadProgress: number,
 *  sendTextMessage: (content: string) => Promise<boolean>,
 *  sendFileMessage: (file: File) => Promise<string>,
 *  encryptAndSendMessage: (messageObject: object) => Promise<boolean>,
 *  cancelSending: () => void
 * }} An object containing sending state and functions to send messages.
 */
export const useSendMessage = (socket, isDirectMessage, conversationId, groupId, members) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Encrypts a message object for each member of the conversation and emits it via the socket.
   * @param {object} messageObject - The message payload to be encrypted and sent.
   * @returns {Promise<boolean>} A promise that resolves to true on success, false on failure.
   */
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
      alert(t('hooks.useSendMessages.sendEncryptedError'));
      return false;
    } finally {
      setSending(false);
    }
  }, [socket, isDirectMessage, conversationId, groupId, members, currentUser.uid, t]);

  /**
   * Sends a text message.
   * @param {string} content - The text content of the message.
   * @returns {Promise<boolean>} A promise that resolves to true on success, false on failure.
   */
  const sendTextMessage = useCallback(async (content) => {
    if (!content.trim() || sending) return false;

    const success = await encryptAndSendMessage({
      type: 'text',
      content: content.trim()
    });

    return success;
  }, [sending, encryptAndSendMessage]);

  /**
   * Uploads a file to Firebase Storage and then sends a file message.
   * @param {File} file - The file to be uploaded and sent.
   * @returns {Promise<string>} A promise that resolves with the file's download URL on success, or rejects on error.
   */
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
          setSending(false);
          setUploadProgress(0);
          alert(t('hooks.useSendMessages.uploadError'));
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
            setSending(false);
            setUploadProgress(0);
            reject(error);
          }
        }
      );
    });
  }, [currentUser.uid, encryptAndSendMessage, t]);

  /**
   * Resets the sending state and upload progress.
   */
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