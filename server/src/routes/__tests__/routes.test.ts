import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

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

describe('Server REST API integration tests', () => {
  const { app } = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /health returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('rejects unauthenticated requests to protected routes with 403', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Missing bearer token');
  });

  it('rejects invalid bearer tokens with 401', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid token'));
    const res = await request(app)
      .get('/api/groups')
      .set('Authorization', 'Bearer bad-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token.');
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

    const res = await request(app)
      .get('/api/groups')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 'group-1', name: 'Core Team', members: ['user-1'] },
    ]);
  });

  it('POST /api/groups returns 400 when Zod validation fails', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1' });

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Group name is required.');
  });

  it('GET /api/dms/:conversationId/messages returns 403 for non-participants', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'outsider-uid' });

    const res = await request(app)
      .get('/api/dms/user-1_user-2/messages')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('permission');
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

    const res = await request(app)
      .get('/api/dms/user-1_user-2/messages?limit=2')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.headers['x-has-more']).toBe('true');
    expect(res.body).toMatchObject([
      { id: 'msg-2', text: 'second', timestamp: '2026-01-02T00:00:00Z' },
      { id: 'msg-3', text: 'third', timestamp: '2026-01-03T00:00:00Z' },
    ]);
  });
});
