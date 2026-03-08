import type { Request, Response, NextFunction } from 'express';
import { z, type ZodSchema } from 'zod';

export const syncAuthSchema = z.object({
  token: z.string().min(1, 'Firebase ID token is required.'),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name cannot be empty.').max(100),
  photoURL: z.string().url('Invalid photo URL.').nullable().optional(),
});

export const saveKeysSchema = z.object({
  publicKey: z.string().min(1, 'publicKey is required.'),
  wrappedPrivateKey: z.string().min(1, 'wrappedPrivateKey is required.'),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required.').max(100),
  memberIds: z.array(z.string().min(1)).optional().default([]),
});

export const addGroupMemberSchema = z.object({
  userIdToAdd: z.string().min(1, 'User ID to add is required.'),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required.'),
  isDirectMessage: z.boolean(),
  groupId: z.string().min(1).nullable().optional(),
  encryptedPayload: z
    .record(z.string(), z.string().min(1))
    .refine((obj) => Object.keys(obj).length > 0, 'Encrypted payload cannot be empty.'),
});

/**
 * Validates request body against a Zod schema and sends 400 on failure.
 */
export const validateBody =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      res.status(400).json({ error: firstIssue?.message || 'Invalid request payload.' });
      return;
    }
    req.body = result.data;
    next();
  };
