import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { createDraftsRouter } from './drafts.js';
import { createClausesRouter } from './clauses.js';
import { createCitationsRouter } from './citations.js';
import { createAuditRouter } from './audit.js';
import { createTemplatesRouter } from './templates.js';
import { createCollaboratorsRouter } from './collaborators.js';
import { createShareLinksRouter } from './shareLinks.js';

// All data routes require a valid access token. Mounted at the app root by
// createApp so each resource lives at its own top-level path (/drafts,
// /clauses, ...) alongside /auth.
export function createDataRouter({ prisma }) {
  const router = Router();
  router.use(requireAuth);
  router.use('/drafts', createDraftsRouter({ prisma }));
  router.use('/clauses', createClausesRouter({ prisma }));
  router.use('/citations', createCitationsRouter({ prisma }));
  router.use('/audit', createAuditRouter({ prisma }));
  router.use('/templates', createTemplatesRouter({ prisma }));
  router.use('/collaborators', createCollaboratorsRouter({ prisma }));
  router.use('/share-links', createShareLinksRouter({ prisma }));
  return router;
}
