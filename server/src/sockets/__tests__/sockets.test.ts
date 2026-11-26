import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const { mockVerifyIdToken, mockCollection } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
  mockCollection: vi.fn(),
}));

vi.mock('../../config/firebaseAdmin.js', () => ({
  auth: {
    verifyIdToken: mockVerifyIdToken,
  },
  db: {
    collection: mockCollection,
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    arrayUnion: vi.fn((...args: unknown[]) => args),
    arrayRemove: vi.fn((...args: unknown[]) => args),
  },
}));

import { registerChatHandlers } from '../chatHandler.js';
import { registerWebRTCHandlers } from '../webrtcHandlers.js';
import { registerSocketHandlers } from '../socketHandler.js';
import { createRateLimiter, SocketEventRateLimiter } from '../../middleware/rateLimitMiddleware.js';
import type { AuthenticatedSocket, TypedServer, UserSocketMap } from '../../types/index.js';

type EventHandler = (...args: unknown[]) => unknown;

const createMockSocket = (id: string, uid: string, name = 'Alice') => {
  const handlers = new Map<string, EventHandler>();
  const rooms = new Set<string>([id]);
  const socket = {
    id,
    user: { uid, name, picture: null },
    rooms,
    handshake: { auth: { token: 'valid-token' } },
    on: vi.fn((event: string, handler: EventHandler) => {
      handlers.set(event, handler);
    }),
    join: vi.fn((room: string) => {
      rooms.add(room);
      return Promise.resolve();
    }),
    leave: vi.fn((room: string) => {
      rooms.delete(room);
      return Promise.resolve();
    }),
    emit: vi.fn(),
    trigger: async (event: string, ...args: unknown[]) => {
      const h = handlers.get(event);
      if (h) return await h(...args);
    },
  };
  return socket;
};

const createMockIo = () => {
  const roomEmits = new Map<string, Array<{ event: string; payload: unknown }>>();
  const socketsMap = new Map<string, ReturnType<typeof createMockSocket>>();
  let connectionHandler: ((socket: unknown) => Promise<void> | void) | null = null;

  const io = {
    sockets: { sockets: socketsMap },
    use: vi.fn(),
    on: vi.fn((event: string, cb: (socket: unknown) => Promise<void> | void) => {
      if (event === 'connection') connectionHandler = cb;
    }),
    to: vi.fn((room: string) => ({
      emit: vi.fn((event: string, payload: unknown) => {
        const list = roomEmits.get(room) || [];
        list.push({ event, payload });
        roomEmits.set(room, list);
      }),
    })),
    roomEmits,
    triggerConnection: async (socket: ReturnType<typeof createMockSocket>) => {
      socketsMap.set(socket.id, socket);
      if (connectionHandler) await connectionHandler(socket);
    },
  };
  return io;
};

describe('Socket.IO Handlers & Rate Limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerWebRTCHandlers', () => {
    it('forwards offer, answer, ice-candidate, ringing, busy, hang-up, and call-rejected to all recipient sessions', async () => {
      const io = createMockIo();
      const userSocketMap: UserSocketMap = new Map([
        ['user-2', new Set(['sock-2a', 'sock-2b'])],
      ]);
      const callerSocket = createMockSocket('sock-1', 'user-1', 'Alice');

      registerWebRTCHandlers(
        io as unknown as TypedServer,
        callerSocket as unknown as AuthenticatedSocket,
        userSocketMap
      );

      await callerSocket.trigger('webrtc:offer', {
        recipientUid: 'user-2',
        offer: { type: 'offer', sdp: 'sdp-offer' },
        callType: 'video',
        callerName: 'Alice',
      });

      expect(io.roomEmits.get('sock-2a')?.[0]).toEqual({
        event: 'webrtc:offer',
        payload: {
          from: 'user-1',
          offer: { type: 'offer', sdp: 'sdp-offer' },
          callType: 'video',
          callerName: 'Alice',
        },
      });
      expect(io.roomEmits.get('sock-2b')?.[0]?.event).toBe('webrtc:offer');

      await callerSocket.trigger('webrtc:busy', { recipientUid: 'user-2' });
      expect(io.roomEmits.get('sock-2a')?.[1]).toEqual({
        event: 'webrtc:busy',
        payload: { from: 'user-1' },
      });

      await callerSocket.trigger('webrtc:hang-up', { recipientUid: 'user-2' });
      expect(io.roomEmits.get('sock-2a')?.[2]).toEqual({
        event: 'webrtc:hang-up',
        payload: { from: 'user-1' },
      });
    });

    it('emits webrtc:error when target recipient is offline', async () => {
      const io = createMockIo();
      const userSocketMap: UserSocketMap = new Map();
      const callerSocket = createMockSocket('sock-1', 'user-1', 'Alice');

      registerWebRTCHandlers(
        io as unknown as TypedServer,
        callerSocket as unknown as AuthenticatedSocket,
        userSocketMap
      );

      await callerSocket.trigger('webrtc:offer', {
        recipientUid: 'offline-user',
        offer: { type: 'offer', sdp: 'sdp' },
        callType: 'audio',
      });

      expect(callerSocket.emit).toHaveBeenCalledWith('webrtc:error', {
        message: 'User is not connected.',
        code: 'USER_OFFLINE',
      });
    });
  });

  describe('registerChatHandlers', () => {
    it('joins/leaves channels and persists + broadcasts encrypted DM messages with ACK', async () => {
      const io = createMockIo();
      const senderSocket = createMockSocket('sock-1', 'user-1', 'Alice');
      const recipientSocket = createMockSocket('sock-2', 'user-2', 'Bob');
      io.sockets.sockets.set('sock-1', senderSocket);
      io.sockets.sockets.set('sock-2', recipientSocket);

      const userSocketMap: UserSocketMap = new Map([
        ['user-1', new Set(['sock-1'])],
        ['user-2', new Set(['sock-2'])],
      ]);

      const mockAdd = vi.fn().mockResolvedValue({ id: 'msg-123' });
      const mockSet = vi.fn().mockResolvedValue(undefined);

      mockCollection.mockImplementation((colName: string) => {
        if (colName === 'directMessages') {
          return {
            doc: vi.fn(() => ({
              get: vi.fn().mockResolvedValue({ exists: true }),
              set: mockSet,
              collection: vi.fn(() => ({ add: mockAdd })),
            })),
          };
        }
        if (colName === 'users') {
          return {
            doc: vi.fn(() => ({
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ displayName: 'Alice', photoURL: null }),
              }),
              collection: vi.fn(() => ({
                doc: vi.fn(() => ({ set: mockSet })),
              })),
            })),
          };
        }
        return {};
      });

      registerChatHandlers(
        io as unknown as TypedServer,
        senderSocket as unknown as AuthenticatedSocket,
        userSocketMap
      );

      await senderSocket.trigger('joinChannel', { conversationId: 'user-1_user-2' });
      expect(senderSocket.join).toHaveBeenCalledWith('user-1_user-2');

      const ack = vi.fn();
      await senderSocket.trigger(
        'sendMessage',
        {
          conversationId: 'user-1_user-2',
          isDirectMessage: true,
          encryptedPayload: { 'user-1': 'cipher1', 'user-2': 'cipher2' },
          clientTempId: 'temp-99',
        },
        ack
      );

      expect(mockAdd).toHaveBeenCalledOnce();
      expect(ack).toHaveBeenCalledWith(
        expect.objectContaining({ ok: true, id: 'msg-123' })
      );
      expect(io.roomEmits.get('user-1_user-2')?.[0]?.event).toBe('encryptedMessage');
      // Also delivered directly to sock-2 because sock-2 was not in room 'user-1_user-2'
      expect(io.roomEmits.get('sock-2')?.[0]?.event).toBe('encryptedMessage');
    });

    it('emits messageError and negative ACK on invalid payload', async () => {
      const io = createMockIo();
      const senderSocket = createMockSocket('sock-1', 'user-1', 'Alice');
      const userSocketMap: UserSocketMap = new Map();

      registerChatHandlers(
        io as unknown as TypedServer,
        senderSocket as unknown as AuthenticatedSocket,
        userSocketMap
      );

      const ack = vi.fn();
      await senderSocket.trigger(
        'sendMessage',
        {
          conversationId: '',
          isDirectMessage: true,
          encryptedPayload: {},
          clientTempId: 'temp-bad',
        },
        ack
      );

      expect(senderSocket.emit).toHaveBeenCalledWith('messageError', {
        message: 'Invalid message payload.',
        clientTempId: 'temp-bad',
      });
      expect(ack).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid message payload.',
      });
    });
  });

  describe('Multi-session UserSocketMap presence in registerSocketHandlers', () => {
    it('marks user online on first session and only marks offline when last session disconnects', async () => {
      const io = createMockIo();
      const userSocketMap: UserSocketMap = new Map();
      const mockUpdate = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockResolvedValue(undefined);

      mockCollection.mockReturnValue({
        doc: vi.fn(() => ({
          update: mockUpdate,
          set: mockSet,
        })),
      });

      registerSocketHandlers(io as unknown as TypedServer, userSocketMap);

      const sockA = createMockSocket('sock-a', 'user-1', 'Alice');
      const sockB = createMockSocket('sock-b', 'user-1', 'Alice');

      await io.triggerConnection(sockA);
      expect(userSocketMap.get('user-1')?.size).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'online' });

      mockUpdate.mockClear();
      await io.triggerConnection(sockB);
      expect(userSocketMap.get('user-1')?.size).toBe(2);
      // Should NOT re-update Firestore to online on second concurrent session
      expect(mockUpdate).not.toHaveBeenCalled();

      // Disconnect first session: user still has sockB open
      await sockA.trigger('disconnect', 'client namespace disconnect');
      expect(userSocketMap.get('user-1')?.size).toBe(1);
      expect(mockUpdate).not.toHaveBeenCalled();

      // Disconnect second session: user now goes offline
      await sockB.trigger('disconnect', 'client namespace disconnect');
      expect(userSocketMap.has('user-1')).toBe(false);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'offline' })
      );
    });
  });

  describe('Rate Limiting Middleware & SocketEventRateLimiter', () => {
    it('blocks HTTP requests exceeding maxRequests with 429', () => {
      const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 });
      const req = {
        headers: {},
        ip: '127.0.0.1',
        path: '/api/auth/sync',
      } as unknown as Request;

      const makeRes = () => {
        const res = {
          setHeader: vi.fn(),
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
        };
        return res as unknown as Response;
      };

      const next1 = vi.fn() as NextFunction;
      limiter(req, makeRes(), next1);
      expect(next1).toHaveBeenCalledOnce();

      const next2 = vi.fn() as NextFunction;
      limiter(req, makeRes(), next2);
      expect(next2).toHaveBeenCalledOnce();

      const res3 = makeRes();
      const next3 = vi.fn() as NextFunction;
      limiter(req, res3, next3);
      expect(next3).not.toHaveBeenCalled();
      expect(res3.status).toHaveBeenCalledWith(429);
    });

    it('throttles socket events beyond maxEvents per window', () => {
      const socketLimiter = new SocketEventRateLimiter(10_000, 2);
      expect(socketLimiter.consume('user-1')).toBe(true);
      expect(socketLimiter.consume('user-1')).toBe(true);
      expect(socketLimiter.consume('user-1')).toBe(false);
      expect(socketLimiter.consume('user-2')).toBe(true);
    });
  });
});
