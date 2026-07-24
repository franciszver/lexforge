import { Router } from 'express';
import { asyncHandler } from './asyncHandler.js';
import {
  createClause,
  getClause,
  updateClause,
  deleteClause,
  searchClauses,
  incrementClauseUsage,
  getClauseCategoryCounts,
  addClauseFavorite,
  removeClauseFavorite,
  listClauseFavoritesByUser,
} from '../repositories/clauseRepository.js';

export function createClausesRouter({ prisma }) {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { category, jurisdiction } = req.query;
      res.json(await searchClauses(prisma, { category, jurisdiction }));
    })
  );

  router.get(
    '/categories',
    asyncHandler(async (req, res) => {
      res.json(await getClauseCategoryCounts(prisma));
    })
  );

  router.get(
    '/favorites/mine',
    asyncHandler(async (req, res) => {
      res.json(await listClauseFavoritesByUser(prisma, req.user.id));
    })
  );

  router.post(
    '/favorites',
    asyncHandler(async (req, res) => {
      const { clauseId, notes } = req.body || {};
      if (!clauseId) return res.status(400).json({ error: 'clauseId is required' });
      res.status(201).json(await addClauseFavorite(prisma, req.user.id, clauseId, notes));
    })
  );

  router.delete(
    '/favorites/:id',
    asyncHandler(async (req, res) => {
      const removed = await removeClauseFavorite(prisma, req.params.id, req.user.id);
      if (!removed) return res.status(404).json({ error: 'Favorite not found' });
      res.status(204).send();
    })
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { title, content, category } = req.body || {};
      if (!title || !content || !category) {
        return res.status(400).json({ error: 'title, content, and category are required' });
      }
      res.status(201).json(await createClause(prisma, req.body));
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const clause = await getClause(prisma, req.params.id);
      if (!clause) return res.status(404).json({ error: 'Clause not found' });
      res.json(clause);
    })
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const existing = await getClause(prisma, req.params.id);
      if (!existing) return res.status(404).json({ error: 'Clause not found' });
      res.json(await updateClause(prisma, req.params.id, req.body || {}));
    })
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const existing = await getClause(prisma, req.params.id);
      if (!existing) return res.status(404).json({ error: 'Clause not found' });
      await deleteClause(prisma, req.params.id);
      res.status(204).send();
    })
  );

  router.post(
    '/:id/usage',
    asyncHandler(async (req, res) => {
      const existing = await getClause(prisma, req.params.id);
      if (!existing) return res.status(404).json({ error: 'Clause not found' });
      res.json(await incrementClauseUsage(prisma, req.params.id));
    })
  );

  return router;
}
