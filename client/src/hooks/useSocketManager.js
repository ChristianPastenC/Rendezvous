// src/hooks/useSocketManager.js
import { useState, useEffect } from 'react';
import { initSocket } from '../lib/socket';
import { cryptoService } from '../lib/cryptoService';

/**
 * Manages the Socket.IO connection lifecycle and E2EE key initialization for the authenticated user.
 * @param {object | null} currentUser - Authenticated Firebase user.
 * @param {function({ isNewUser: boolean, isRetry: boolean }): Promise<string|null>} requestPassphrase
 * @returns {import('socket.io-client').Socket | null}
 */
export const useSocketManager = (currentUser, requestPassphrase) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      setSocket((prev) => {
        if (prev) prev.disconnect();
        return null;
      });
      return;
    }

    let socketInstance;
    let isCancelled = false;

    const connect = async () => {
      try {
        socketInstance = await initSocket();
        if (socketInstance && !isCancelled) {
          setSocket(socketInstance);

          const { publicKey } = await cryptoService.generateAndStoreKeys(requestPassphrase);
          if (!isCancelled) {
            socketInstance.emit('security:register-public-key', { publicKey });
          }
        }
      } catch (error) {
        console.error('[SocketManager] Initialization error:', error);
      }
    };

    connect();

    return () => {
      isCancelled = true;
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [currentUser, requestPassphrase]);

  return socket;
};
