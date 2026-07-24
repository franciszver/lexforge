import { Router } from 'express';
import { randomUUID, randomBytes } from 'node:crypto';
import { asyncHandler } from './asyncHandler.js';
import { withNotFound } from './helpers.js';
import {
  createShareLink,
  findShareLinkByToken,
  listShareLinksByDocument,
  incrementShareLinkAccess,
  revokeShareLink,
  getShareLinkById,
} from '../repositories/shareLinkRepository.js';
import { requireDraftOwner } from './ownership.js';

// Cryptographically strong, unguessable passcode (64 bits of entropy) —
// Math.random() is not a CSPRNG and must never gate access to a document.
function generatePasscode() {
  return randomBytes(8).toString('hex').toUpperCase();
}

export function createShareLinksRouter({ prisma }) {
  const router = Router();

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { documentId, accessLevel = 'view', expiryHours = 72 } = req.body || {};
      if (!documentId) return res.status(400).json({ error: 'documentId is required' });
      const draft = await requireDraftOwner(prisma, documentId, req.user.id);
      const link = await createShareLink(prisma, {
        documentId,
        documentOwnerId: draft.userId,
        token: randomUUID(),
        passcode: generatePasscode(),
        accessLevel,
        expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
      });
      res.status(201).json(link);
    })
  );

  // Not owner-gated: this is how a person who received a share link/passcode
  // looks it up (they aren't the document owner).
  router.get(
    '/token/:token',
    asyncHandler(async (req, res) => {
      const link = await findShareLinkByToken(prisma, req.params.token);
      if (!link) return res.status(404).json({ error: 'Share link not found' });
      res.json(link);
    })
  );

  router.get(
    '/document/:documentId',
    asyncHandler(async (req, res) => {
      await requireDraftOwner(prisma, req.params.documentId, req.user.id);
      res.json(await listShareLinksByDocument(prisma, req.params.documentId));
    })
  );

  // Not owner-gated: incrementing access count happens when a shared viewer
  // opens the link, not the document owner.
  router.post(
    '/:id/access',
    asyncHandler(async (req, res) => {
      const updated = await withNotFound(incrementShareLinkAccess(prisma, req.params.id));
      if (!updated) return res.status(404).json({ error: 'Share link not found' });
      res.json(updated);
    })
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const link = await getShareLinkById(prisma, req.params.id);
      if (!link) return res.status(404).json({ error: 'Share link not found' });
      await requireDraftOwner(prisma, link.documentId, req.user.id);
      await revokeShareLink(prisma, req.params.id, req.user.id);
      res.status(204).send();
    })
  );

  return router;
}
