import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  syncAuthSchema,
  updateProfileSchema,
  saveKeysSchema,
  createGroupSchema,
  addGroupMemberSchema,
  sendMessageSchema,
  validateBody,
} from '../validation.js';

describe('validation schemas', () => {
  it('validates syncAuthSchema', () => {
    expect(syncAuthSchema.safeParse({ token: 'abc' }).success).toBe(true);
    expect(syncAuthSchema.safeParse({ token: '' }).success).toBe(false);
  });

  it('validates updateProfileSchema and trims displayName', () => {
    const parsed = updateProfileSchema.parse({ displayName: '  Alice  ', photoURL: null });
    expect(parsed.displayName).toBe('Alice');
    expect(updateProfileSchema.safeParse({ displayName: '   ' }).success).toBe(false);
    expect(
      updateProfileSchema.safeParse({ displayName: 'Alice', photoURL: 'not-a-url' }).success
    ).toBe(false);
  });

  it('validates saveKeysSchema', () => {
    expect(
      saveKeysSchema.safeParse({ publicKey: 'pub', wrappedPrivateKey: 'priv' }).success
    ).toBe(true);
    expect(saveKeysSchema.safeParse({ publicKey: '', wrappedPrivateKey: 'priv' }).success).toBe(
      false
    );
  });

  it('validates createGroupSchema with default memberIds', () => {
    const parsed = createGroupSchema.parse({ name: '  Engineering  ' });
    expect(parsed).toEqual({ name: 'Engineering', memberIds: [] });
    expect(createGroupSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('validates addGroupMemberSchema', () => {
    expect(addGroupMemberSchema.safeParse({ userIdToAdd: 'uid-123' }).success).toBe(true);
    expect(addGroupMemberSchema.safeParse({ userIdToAdd: '' }).success).toBe(false);
  });

  it('validates sendMessageSchema and rejects empty encryptedPayload', () => {
    expect(
      sendMessageSchema.safeParse({
        conversationId: 'conv-1',
        isDirectMessage: true,
        groupId: null,
        encryptedPayload: { uid1: 'cipher1' },
      }).success
    ).toBe(true);

    expect(
      sendMessageSchema.safeParse({
        conversationId: 'conv-1',
        isDirectMessage: true,
        encryptedPayload: {},
      }).success
    ).toBe(false);
  });

  describe('validateBody middleware', () => {
    it('calls next() and replaces req.body with parsed data when valid', () => {
      const req = { body: { name: '  Team  ' } } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      validateBody(createGroupSchema)(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(req.body).toEqual({ name: 'Team', memberIds: [] });
    });

    it('returns 400 with error message when invalid', () => {
      const req = { body: { name: '' } } as Request;
      const json = vi.fn();
      const status = vi.fn().mockReturnValue({ json });
      const res = { status, json } as unknown as Response;
      const next = vi.fn() as NextFunction;

      validateBody(createGroupSchema)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ error: 'Group name is required.' });
    });
  });
});
