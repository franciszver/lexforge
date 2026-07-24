import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { asyncHandler } from './asyncHandler.js';
import {
  inviteCollaborator,
  findCollaboratorByToken,
  acceptCollaboratorInvite,
  listCollaboratorsByDocument,
  listCollaboratorsByUserId,
  listPendingCollaboratorsByEmail,
  updateCollaboratorRole,
  revokeCollaborator,
  getCollaboratorById,
} from '../repositories/collaboratorRepository.js';
import { requireDraftOwner } from './ownership.js';

const VALID_ROLES = ['viewer', 'editor', 'admin'];

export function createCollaboratorsRouter({ prisma }) {
  const router = Router();

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { documentId, collaboratorEmail, role, invitedByName } = req.body || {};
      if (!documentId || !collaboratorEmail || !role) {
        return res.status(400).json({ error: 'documentId, collaboratorEmail, and role are required' });
      }
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: `role must be one of ${VALID_ROLES.join(', ')}` });
      }
      const draft = await requireDraftOwner(prisma, documentId, req.user.id);
      const invite = await inviteCollaborator(prisma, {
        documentId,
        documentOwnerId: draft.userId,
        collaboratorEmail,
        role,
        invitedBy: req.user.id,
        invitedByName,
        inviteToken: randomUUID(),
        inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      res.status(201).json(invite);
    })
  );

  router.get(
    '/token/:token',
    asyncHandler(async (req, res) => {
      const invite = await findCollaboratorByToken(prisma, req.params.token);
      if (!invite) return res.status(404).json({ error: 'Invitation not found' });
      res.json(invite);
    })
  );

  // Authorization here is the token itself (a high-entropy, single-use
  // secret) plus a defense-in-depth check that the accepting user is the
  // one who was invited. A database id is NOT sufficient authorization —
  // ids are sequential/guessable relative to a token and must never accept
  // someone else's invitation. Every rejection reason collapses to the same
  // generic 404 so a caller can't distinguish "wrong token" from "expired"
  // from "not your invite".
  router.post(
    '/accept/:token',
    asyncHandler(async (req, res) => {
      const invite = await findCollaboratorByToken(prisma, req.params.token);
      const expired = invite && invite.inviteExpiresAt && new Date(invite.inviteExpiresAt) < new Date();
      const emailMismatch =
        invite && invite.collaboratorEmail.toLowerCase() !== (req.user.email || '').toLowerCase();

      if (!invite || invite.status !== 'pending' || expired || emailMismatch) {
        return res.status(404).json({ error: 'Invalid or expired invitation' });
      }

      res.json(await acceptCollaboratorInvite(prisma, invite.id, req.user.id));
    })
  );

  router.get(
    '/document/:documentId',
    asyncHandler(async (req, res) => {
      await requireDraftOwner(prisma, req.params.documentId, req.user.id);
      res.json(await listCollaboratorsByDocument(prisma, req.params.documentId));
    })
  );

  router.get(
    '/mine',
    asyncHandler(async (req, res) => {
      const [byUserId, byEmail] = await Promise.all([
        listCollaboratorsByUserId(prisma, req.user.id),
        listPendingCollaboratorsByEmail(prisma, req.user.email),
      ]);
      const seen = new Set();
      const combined = [...byUserId, ...byEmail].filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
      res.json(combined);
    })
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const { role } = req.body || {};
      if (!role || !VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: `role must be one of ${VALID_ROLES.join(', ')}` });
      }
      const collaborator = await getCollaboratorById(prisma, req.params.id);
      if (!collaborator) return res.status(404).json({ error: 'Collaborator not found' });
      await requireDraftOwner(prisma, collaborator.documentId, req.user.id);
      res.json(await updateCollaboratorRole(prisma, req.params.id, role));
    })
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const collaborator = await getCollaboratorById(prisma, req.params.id);
      if (!collaborator) return res.status(404).json({ error: 'Collaborator not found' });
      await requireDraftOwner(prisma, collaborator.documentId, req.user.id);
      await revokeCollaborator(prisma, req.params.id);
      res.status(204).send();
    })
  );

  return router;
}
