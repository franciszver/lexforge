import { Router } from 'express';
import { asyncHandler } from './asyncHandler.js';
import {
  createTemplate,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  listTemplates,
} from '../repositories/templateRepository.js';

export function createTemplatesRouter({ prisma }) {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { category } = req.query;
      res.json(await listTemplates(prisma, { category }));
    })
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { name, category } = req.body || {};
      if (!name || !category) return res.status(400).json({ error: 'name and category are required' });
      res.status(201).json(await createTemplate(prisma, req.body));
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const template = await getTemplate(prisma, req.params.id);
      if (!template) return res.status(404).json({ error: 'Template not found' });
      res.json(template);
    })
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const existing = await getTemplate(prisma, req.params.id);
      if (!existing) return res.status(404).json({ error: 'Template not found' });
      res.json(await updateTemplate(prisma, req.params.id, req.body || {}));
    })
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const existing = await getTemplate(prisma, req.params.id);
      if (!existing) return res.status(404).json({ error: 'Template not found' });
      await deleteTemplate(prisma, req.params.id);
      res.status(204).send();
    })
  );

  return router;
}
