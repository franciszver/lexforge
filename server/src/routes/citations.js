import { Router } from 'express';
import { asyncHandler } from './asyncHandler.js';
import { withNotFound } from './helpers.js';
import {
  createCitation,
  getCitation,
  updateCitation,
  deleteCitation,
  searchCitations,
  incrementCitationUsage,
  addCitationFavorite,
  removeCitationFavorite,
  listCitationFavoritesByUser,
} from '../repositories/citationRepository.js';

export function createCitationsRouter({ prisma }) {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { type, jurisdiction, category, isVerified } = req.query;
      res.json(
        await searchCitations(prisma, {
          type,
          jurisdiction,
          category,
          isVerified: isVerified === undefined ? undefined : isVerified === 'true',
        })
      );
    })
  );

  router.get(
    '/favorites/mine',
    asyncHandler(async (req, res) => {
      res.json(await listCitationFavoritesByUser(prisma, req.user.id));
    })
  );

  router.post(
    '/favorites',
    asyncHandler(async (req, res) => {
      const { citationId, notes } = req.body || {};
      if (!citationId) return res.status(400).json({ error: 'citationId is required' });
      res.status(201).json(await addCitationFavorite(prisma, req.user.id, citationId, notes));
    })
  );

  router.delete(
    '/favorites/:id',
    asyncHandler(async (req, res) => {
      const removed = await withNotFound(removeCitationFavorite(prisma, req.params.id));
      if (!removed) return res.status(404).json({ error: 'Favorite not found' });
      res.status(204).send();
    })
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { title, citation, type } = req.body || {};
      if (!title || !citation || !type) {
        return res.status(400).json({ error: 'title, citation, and type are required' });
      }
      res.status(201).json(await createCitation(prisma, req.body));
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const citation = await getCitation(prisma, req.params.id);
      if (!citation) return res.status(404).json({ error: 'Citation not found' });
      res.json(citation);
    })
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const existing = await getCitation(prisma, req.params.id);
      if (!existing) return res.status(404).json({ error: 'Citation not found' });
      res.json(await updateCitation(prisma, req.params.id, req.body || {}));
    })
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const existing = await getCitation(prisma, req.params.id);
      if (!existing) return res.status(404).json({ error: 'Citation not found' });
      await deleteCitation(prisma, req.params.id);
      res.status(204).send();
    })
  );

  router.post(
    '/:id/usage',
    asyncHandler(async (req, res) => {
      const existing = await getCitation(prisma, req.params.id);
      if (!existing) return res.status(404).json({ error: 'Citation not found' });
      res.json(await incrementCitationUsage(prisma, req.params.id));
    })
  );

  return router;
}
