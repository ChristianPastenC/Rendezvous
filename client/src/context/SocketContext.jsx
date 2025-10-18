// src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { initSocket } from '../lib/socket';
import { cryptoService } from '../lib/cryptoService';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket debe usarse dentro de SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    let socketInstance;

    const connect = async () => {
      try {
        socketInstance = await initSocket();
        if (socketInstance) {
          setSocket(socketInstance);
          setIsConnected(true);

          const { publicKey } = await cryptoService.generateAndStoreKeys();
          socketInstance.emit('security:register-public-key', { publicKey });

          socketInstance.on('disconnect', () => setIsConnected(false));
          socketInstance.on('connect', () => setIsConnected(true));
        }
      } catch (error) {
        console.error('Error conectando socket:', error);
      }
    };

    connect();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [currentUser]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};