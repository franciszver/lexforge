import { Router } from 'express';
import { asyncHandler } from './asyncHandler.js';
import {
  createDraft,
  getDraft,
  updateDraft,
  deleteDraft,
  listDraftsByUser,
} from '../repositories/draftRepository.js';

export function createDraftsRouter({ prisma }) {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      res.json(await listDraftsByUser(prisma, req.user.id));
    })
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { title, content, metadata, intakeData, status } = req.body || {};
      const draft = await createDraft(prisma, {
        userId: req.user.id,
        title,
        content,
        metadata,
        intakeData,
        status,
      });
      res.status(201).json(draft);
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const draft = await getDraft(prisma, req.params.id);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });
      if (draft.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      res.json(draft);
    })
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const draft = await getDraft(prisma, req.params.id);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });
      if (draft.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      res.json(await updateDraft(prisma, req.params.id, req.body || {}));
    })
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const draft = await getDraft(prisma, req.params.id);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });
      if (draft.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      await deleteDraft(prisma, req.params.id);
      res.status(204).send();
    })
  );

  return router;
}
