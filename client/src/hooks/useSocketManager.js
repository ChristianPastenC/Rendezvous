// src/hooks/useSocketManager.js
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { initSocket } from '../lib/socket';
import { cryptoService } from '../lib/cryptoService';

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
    const connect = async () => {
      try {
        socketInstance = await initSocket();
        if (socketInstance) {
          setSocket(socketInstance);

          const { publicKey } = await cryptoService.generateAndStoreKeys();
          socketInstance.emit('security:register-public-key', { publicKey });
        }
      } catch (error) {
        console.error('Error al inicializar el socket o registrar la clave:', error);

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