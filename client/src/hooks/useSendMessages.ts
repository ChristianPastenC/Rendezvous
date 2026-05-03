import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { DecryptedMessageContent } from '@rendezvous/shared';
import { useAuth } from '../context/AuthContext';
import { cryptoService } from '../lib/cryptoService';
import type { TypedClientSocket } from '../lib/socket';
import { storage } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export interface MessageMember {
  uid: string;
  publicKey?: string | null;
}

export const useSendMessage = (
  socket: TypedClientSocket | null,
  isDirectMessage: boolean,
  conversationId: string | null,
  groupId: string | null,
  members: MessageMember[]
) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const encryptAndSendMessage = useCallback(
    async (messageObject: DecryptedMessageContent): Promise<boolean> => {
      if (!currentUser || !socket) return false;
      setSending(true);
      try {
        let memberKeys: Array<{ uid: string; publicKey: string }>;
        let backendConversationId = conversationId;

        if (isDirectMessage) {
          const otherUser = members.find((m) => m.uid !== currentUser.uid);
          if (!otherUser) throw new Error('Could not find the other user in DM.');

          backendConversationId = [currentUser.uid, otherUser.uid].sort().join('_');

          const selfKey = cryptoService.getPublicKey();
          memberKeys = selfKey ? [{ uid: currentUser.uid, publicKey: selfKey }] : [];

          const otherUserKey = await cryptoService.fetchPublicKey(otherUser.uid);
          if (otherUserKey) memberKeys.push({ uid: otherUser.uid, publicKey: otherUserKey });
        } else {
          if (!groupId) throw new Error('Group ID is required.');
          memberKeys = await cryptoService.fetchPublicKeysForGroup(groupId);
        }

        const encryptedPayload: Record<string, string> = {};
        for (const member of memberKeys) {
          if (!member.publicKey) continue;
          const encrypted = await cryptoService.encrypt(
            JSON.stringify(messageObject),
            member.publicKey
          );
          if (encrypted) encryptedPayload[member.uid] = encrypted;
        }

        if (Object.keys(encryptedPayload).length > 0 && backendConversationId) {
          socket.emit('sendMessage', {
            conversationId: backendConversationId,
            isDirectMessage,
            groupId,
            encryptedPayload,
          });
          return true;
        }
        throw new Error('Encrypted payload is empty.');
      } catch {
        alert(t('hooks.useSendMessages.sendEncryptedError'));
        return false;
      } finally {
        setSending(false);
      }
    },
    [socket, isDirectMessage, conversationId, groupId, members, currentUser, t]
  );

  const sendTextMessage = useCallback(
    async (content: string): Promise<boolean> => {
      if (!content.trim() || sending) return false;

      return encryptAndSendMessage({
        type: 'text',
        content: content.trim(),
      });
    },
    [sending, encryptAndSendMessage]
  );

  const sendFileMessage = useCallback(
    (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!currentUser) {
          reject(new Error('User is not authenticated.'));
          return;
        }

        const storageRef = ref(storage, `uploads/${currentUser.uid}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        setSending(true);

        uploadTask.on(
          'state_changed',
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

              const messageObject: DecryptedMessageContent = {
                type: file.type.startsWith('image/') ? 'image' : 'file',
                fileUrl: downloadURL,
                content: file.name,
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
    },
    [currentUser, encryptAndSendMessage, t]
  );

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
    cancelSending,
  };
};
