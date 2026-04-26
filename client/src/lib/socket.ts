import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@rendezvous/shared';
import { auth } from './firebase';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export type TypedClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const initSocket = async (): Promise<TypedClientSocket | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  const token = await user.getIdToken();

  const socket: TypedClientSocket = io(SERVER_URL, {
    auth: {
      token,
    },
  });

  return socket;
};
