// src/lib/socket.js
import { io } from 'socket.io-client';
import { auth } from './firebase';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export const initSocket = async () => {
  const user = auth.currentUser;
  if (!user) return null;

  const token = await user.getIdToken();

  const socket = io(SERVER_URL, {
    auth: {
      token
    }
  });

  return socket;
};