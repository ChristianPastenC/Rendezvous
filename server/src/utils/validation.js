const { z } = require('zod');

const syncAuthSchema = z.object({
  token: z.string().min(1, 'Firebase ID token is required.'),
});

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name cannot be empty.').max(100),
  photoURL: z.string().url('Invalid photo URL.').nullable().optional(),
});

const saveKeysSchema = z.object({
  publicKey: z.string().min(1, 'publicKey is required.'),
  wrappedPrivateKey: z.string().min(1, 'wrappedPrivateKey is required.'),
});

const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required.').max(100),
  memberIds: z.array(z.string().min(1)).optional().default([]),
});

const addGroupMemberSchema = z.object({
  userIdToAdd: z.string().min(1, 'User ID to add is required.'),
});

const sendMessageSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required.'),
  isDirectMessage: z.boolean(),
  groupId: z.string().min(1).nullable().optional(),
  encryptedPayload: z.record(z.string(), z.string().min(1)).refine(
    (obj) => Object.keys(obj).length > 0,
    'Encrypted payload cannot be empty.'
  ),
});

/**
 * Validates request body against a Zod schema and sends 400 on failure.
 */
const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return res.status(400).json({ error: firstIssue?.message || 'Invalid request payload.' });
  }
  req.body = result.data;
  next();
};

module.exports = {
  syncAuthSchema,
  updateProfileSchema,
  saveKeysSchema,
  createGroupSchema,
  addGroupMemberSchema,
  sendMessageSchema,
  validateBody,
};
