// src/hooks/useSocketManager.js
import { useState, useEffect } from 'react';
import { initSocket } from '../lib/socket';
import { cryptoService } from '../lib/cryptoService';

export const useSocketManager = (currentUser) => {
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
          alert('Error de Seguridad\n\n' + error.message +
            '\n\nPor favor, recarga la página e intenta nuevamente.');
        }
      }
    };

    connect();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [currentUser]);

  return socket;
};