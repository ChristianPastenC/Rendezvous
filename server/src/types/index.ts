import type { Request } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@rendezvous/shared';

export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
}

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  user: DecodedIdToken;
}

export type UserSocketMap = Record<string, string>;
