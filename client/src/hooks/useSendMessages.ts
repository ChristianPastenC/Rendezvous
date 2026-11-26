import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { DecryptedMessageContent, EncryptedMessage } from '@rendezvous/shared';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { cryptoService } from '../lib/cryptoService';
import type { TypedClientSocket } from '../lib/socket';
import { storage } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export interface MessageMember {
  uid: string;
  displayName?: string;
  publicKey?: string | null;
}

export const useSendMessage = (
  socket: TypedClientSocket | null,
  isDirectMessage: boolean,
  conversationId: string | null,
  groupId: string | null,
  members: MessageMember[],
  onOptimisticMessage?: (msg: EncryptedMessage) => void
) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showToast } = useNotification();
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [missingKeyWarning, setMissingKeyWarning] = useState<string | null>(null);

  const dispatchSocketMessage = useCallback(
    (
      backendConversationId: string,
      encryptedPayload: Record<string, string>,
      clientTempId: string
    ): Promise<boolean> => {
      if (!socket || !currentUser) return Promise.resolve(false);

      const optimisticMsg: EncryptedMessage = {
        id: clientTempId,
        clientTempId,
        encryptedPayload,
        authorId: currentUser.uid,
        authorInfo: {
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'User',
          photoURL: currentUser.photoURL,
        },
        createdAt: new Date().toISOString(),
        conversationId: backendConversationId,
        groupId: isDirectMessage ? null : groupId ?? null,
        status: 'sending',
      };

      onOptimisticMessage?.(optimisticMsg);

      return new Promise<boolean>((resolve) => {
        let settled = false;
        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve(true);
        }, 5000);

        socket.emit(
          'sendMessage',
          {
            conversationId: backendConversationId,
            isDirectMessage,
            groupId,
            encryptedPayload,
            clientTempId,
          },
          (ack) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            if (ack && !ack.ok) {
              onOptimisticMessage?.({ ...optimisticMsg, status: 'failed' });
              showToast(ack.error || t('hooks.useSendMessages.sendEncryptedError'), 'error');
              resolve(false);
            } else {
              resolve(true);
            }
          }
        );
      });
    },
    [socket, currentUser, isDirectMessage, groupId, onOptimisticMessage, showToast, t]
  );

  const encryptAndSendMessage = useCallback(
    async (messageObject: DecryptedMessageContent, existingTempId?: string): Promise<boolean> => {
      if (!currentUser || !socket) return false;
      setSending(true);
      setMissingKeyWarning(null);

      const clientTempId =
        existingTempId || `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      try {
        let memberKeys: Array<{ uid: string; publicKey: string }> = [];
        let backendConversationId = conversationId;

        if (isDirectMessage) {
          const otherUser = members.find((m) => m.uid !== currentUser.uid);
          if (!otherUser) throw new Error('Could not find the other user in DM.');

          backendConversationId = [currentUser.uid, otherUser.uid].sort().join('_');

          const selfKey =
            cryptoService.getPublicKey() || (await cryptoService.fetchPublicKey(currentUser.uid));
          if (selfKey) {
            memberKeys.push({ uid: currentUser.uid, publicKey: selfKey });
          }

          let otherUserKey = await cryptoService.fetchPublicKey(otherUser.uid);
          if (!otherUserKey) {
            // Force refresh once in case recipient recently initialized or rotated their key
            otherUserKey = await cryptoService.fetchPublicKey(otherUser.uid, true);
          }

          if (otherUserKey) {
            memberKeys.push({ uid: otherUser.uid, publicKey: otherUserKey });
          } else {
            const warningText = t(
              'security.keys.recipientMissingWarning',
              "Recipient has not set up their encryption key yet. Ask them to sign in and unlock their passphrase."
            );
            setMissingKeyWarning(warningText);
            showToast(warningText, 'error');
            return false;
          }
        } else {
          if (!groupId) throw new Error('Group ID is required.');
          memberKeys = await cryptoService.fetchPublicKeysForGroup(groupId);
          if (memberKeys.length < members.length) {
            // Force refresh once to pick up newly registered group member keys
            memberKeys = await cryptoService.fetchPublicKeysForGroup(groupId, true);
          }
          const missingCount = Math.max(0, members.length - memberKeys.length);
          if (missingCount > 0) {
            setMissingKeyWarning(
              t(
                'security.keys.groupMissingWarning',
                `${missingCount} group member(s) have not published an E2EE public key yet and cannot decrypt this message.`
              )
            );
          }
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
          return await dispatchSocketMessage(backendConversationId, encryptedPayload, clientTempId);
        }
        throw new Error('Encrypted payload is empty.');
      } catch {
        showToast(t('hooks.useSendMessages.sendEncryptedError'), 'error');
        return false;
      } finally {
        setSending(false);
      }
    },
    [
      socket,
      isDirectMessage,
      conversationId,
      groupId,
      members,
      currentUser,
      t,
      showToast,
      dispatchSocketMessage,
    ]
  );

  const retryFailedMessage = useCallback(
    async (failedMsg: EncryptedMessage): Promise<boolean> => {
      if (!failedMsg.conversationId) return false;
      return dispatchSocketMessage(
        failedMsg.conversationId,
        failedMsg.encryptedPayload,
        failedMsg.clientTempId || failedMsg.id
      );
    },
    [dispatchSocketMessage]
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
            showToast(t('hooks.useSendMessages.uploadError'), 'error');
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
    [currentUser, encryptAndSendMessage, t, showToast]
  );

  const cancelSending = useCallback(() => {
    setSending(false);
    setUploadProgress(0);
  }, []);

  return {
    sending,
    uploadProgress,
    missingKeyWarning,
    clearMissingKeyWarning: () => setMissingKeyWarning(null),
    sendTextMessage,
    sendFileMessage,
    encryptAndSendMessage,
    retryFailedMessage,
    cancelSending,
  };
};
