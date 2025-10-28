// src/hooks/useSocketManager.js
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { initSocket } from '../lib/socket';
import { cryptoService } from '../lib/cryptoService';

/**
 * Custom hook to manage the Socket.IO connection lifecycle for an authenticated user.
 * It initializes the socket, handles cryptographic key registration, and manages disconnection.
 * @param {object | null} currentUser - The authenticated Firebase user object. If null, any existing socket connection is disconnected.
 * @returns {import('socket.io-client').Socket | null} The initialized and connected Socket.IO client instance, or null if not connected or if the user is not authenticated.
 */
export const useSocketManager = (currentUser) => {
  const { t } = useTranslation();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    let socketInstance;
    /**
     * Asynchronously initializes the socket connection.
     * It calls `initSocket` to get a socket instance, then generates cryptographic keys
     * and emits an event to register the public key with the server.
     * Handles errors, including security phrase prompts.
     * @async
     */
    const connect = async () => {
      try {
        socketInstance = await initSocket();
        if (socketInstance) {
          setSocket(socketInstance);

          const { publicKey } = await cryptoService.generateAndStoreKeys();
          socketInstance.emit('security:register-public-key', { publicKey });
        }
      } catch (error) {
        if (error.message.includes('frase de seguridad')) {
          alert(
            t('hooks.useSocketManager.securityAlert.title') + '\n\n' +
            error.message + '\n\n' +
            t('hooks.useSocketManager.securityAlert.instruction')
          );
        }
      }
    };

    connect();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [currentUser, t]);

  return socket;
};