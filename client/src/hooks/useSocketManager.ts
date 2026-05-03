import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { initSocket, type TypedClientSocket } from '../lib/socket';
import { cryptoService, type RequestPassphraseFn } from '../lib/cryptoService';

/**
 * Manages the Socket.IO connection lifecycle and E2EE key initialization for the authenticated user.
 */
export const useSocketManager = (
  currentUser: User | null,
  requestPassphrase: RequestPassphraseFn
): TypedClientSocket | null => {
  const [socket, setSocket] = useState<TypedClientSocket | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setSocket((prev) => {
        if (prev) prev.disconnect();
        return null;
      });
      return;
    }

    let socketInstance: TypedClientSocket | null = null;
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

    void connect();

    return () => {
      isCancelled = true;
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [currentUser, requestPassphrase]);

  return socket;
};
