import http from 'node:http';
import { Duplex } from 'node:stream';
import type { Express } from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  Timestamp: {
    fromDate: vi.fn((d: Date) => d),
  },
}));

import { createApp } from '../../app.js';

interface TestResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

class MockSocket extends Duplex {
  override _read(): void {}
  override _write(
    _chunk: unknown,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    callback();
  }
}

/**
 * Dispatches an in-memory HTTP request directly through an Express app
 * without opening a TCP listener (works in sandboxed environments).
 */
const invokeApp = (
  app: Express,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  }
): Promise<TestResponse> => {
  return new Promise((resolve, reject) => {
    const socket = new MockSocket();
    const req = new http.IncomingMessage(socket as unknown as import('node:net').Socket);
    req.method = options.method;
    req.url = options.url;
    req.headers = {};

    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        req.headers[k.toLowerCase()] = v;
      }
    }

    let rawBody = '';
    if (options.body !== undefined) {
      rawBody = JSON.stringify(options.body);
      req.headers['content-type'] = req.headers['content-type'] || 'application/json';
      req.headers['content-length'] = String(Buffer.byteLength(rawBody));
    }

    const res = new http.ServerResponse(req);
    res.assignSocket(socket as unknown as import('node:net').Socket);

    const chunks: Buffer[] = [];
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);

    res.write = ((chunk: unknown, encoding?: unknown, cb?: unknown) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      return origWrite(chunk as never, encoding as never, cb as never);
    }) as typeof res.write;

    res.end = ((chunk?: unknown, encoding?: unknown, cb?: unknown) => {
      if (chunk && typeof chunk !== 'function') {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      const result = origEnd(chunk as never, encoding as never, cb as never);
      const raw = Buffer.concat(chunks).toString('utf8');
      let parsedBody: unknown = raw;
      try {
        parsedBody = raw ? JSON.parse(raw) : {};
      } catch {
        // leave as string
      }

      const rawHeaders = res.getHeaders();
      const normalizedHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawHeaders)) {
        if (v !== undefined) {
          normalizedHeaders[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v);
        }
      }

      resolve({
        status: res.statusCode,
        headers: normalizedHeaders,
        body: parsedBody,
      });
      return result;
    }) as typeof res.end;

    try {
      (app as unknown as (req: http.IncomingMessage, res: http.ServerResponse) => void)(req, res);
      if (rawBody) {
        req.push(rawBody);
      }
      req.push(null);
    } catch (err) {
      reject(err);
    }
  });
};

describe('Server REST API integration tests', () => {
  const { app } = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /health returns 200 ok with diagnostics and X-Request-Id', async () => {
    const res = await invokeApp(app, { method: 'GET', url: '/health' });
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeTruthy();
    expect(res.body).toMatchObject({
      status: 'ok',
      firestore: 'connected',
      activeUsers: 0,
    });
  });

  it('rejects unauthenticated requests to protected routes with 403', async () => {
    const res = await invokeApp(app, { method: 'GET', url: '/api/groups' });
    expect(res.status).toBe(403);
    expect((res.body as { error: string }).error).toContain('Missing bearer token');
  });

  it('rejects invalid bearer tokens with 401', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid token'));
    const res = await invokeApp(app, {
      method: 'GET',
      url: '/api/groups',
      headers: { Authorization: 'Bearer bad-token' },
    });

    expect(res.status).toBe(401);
    expect((res.body as { error: string }).error).toBe('Invalid or expired token.');
  });

  it('GET /api/groups returns groups for authenticated user', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1', email: 'a@b.com' });
    mockCollection.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [
            { id: 'group-1', data: () => ({ name: 'Core Team', members: ['user-1'] }) },
          ],
        }),
      }),
    });

    const res = await invokeApp(app, {
      method: 'GET',
      url: '/api/groups',
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 'group-1', name: 'Core Team', members: ['user-1'] },
    ]);
  });

  it('POST /api/groups returns 400 when Zod validation fails', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1' });

    const res = await invokeApp(app, {
      method: 'POST',
      url: '/api/groups',
      headers: { Authorization: 'Bearer valid-token' },
      body: { name: '   ' },
    });

    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toBe('Group name is required.');
  });

  it('GET /api/dms/:conversationId/messages returns 403 for non-participants', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'outsider-uid' });

    const res = await invokeApp(app, {
      method: 'GET',
      url: '/api/dms/user-1_user-2/messages',
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(res.status).toBe(403);
    expect((res.body as { error: string }).error).toContain('permission');
  });

  it('GET /api/dms/:conversationId/messages paginates messages and sets X-Has-More', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1' });

    const mockDocs = [
      { id: 'msg-3', data: () => ({ text: 'third', timestamp: '2026-01-03T00:00:00Z' }) },
      { id: 'msg-2', data: () => ({ text: 'second', timestamp: '2026-01-02T00:00:00Z' }) },
      { id: 'msg-1', data: () => ({ text: 'first', timestamp: '2026-01-01T00:00:00Z' }) },
    ];

    const queryChain = {
      orderBy: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: mockDocs }),
    };

    mockCollection.mockReturnValueOnce({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue(queryChain),
      }),
    });

    const res = await invokeApp(app, {
      method: 'GET',
      url: '/api/dms/user-1_user-2/messages?limit=2',
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(res.status).toBe(200);
    expect(res.headers['x-has-more']).toBe('true');
    expect(res.body).toMatchObject([
      { id: 'msg-2', text: 'second', timestamp: '2026-01-02T00:00:00Z' },
      { id: 'msg-3', text: 'third', timestamp: '2026-01-03T00:00:00Z' },
    ]);
  });
});
