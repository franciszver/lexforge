import { Router } from 'express';
import { asyncHandler } from './asyncHandler.js';
import {
  createAuditLog,
  listAuditLogsByUser,
  listAuditLogsByEventType,
  listAuditLogsByResource,
  listAuditLogs,
} from '../repositories/auditLogRepository.js';
import { getDraft } from '../repositories/draftRepository.js';

function parseLimit(req) {
  return req.query.limit ? Number(req.query.limit) : undefined;
}

// Audit logs span every user; only admins may browse across users.
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

export function createAuditRouter({ prisma }) {
  const router = Router();

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { eventType, action } = req.body || {};
      if (!eventType || !action) {
        return res.status(400).json({ error: 'eventType and action are required' });
      }
      // userId always comes from the authenticated caller, never the body.
      const log = await createAuditLog(prisma, { ...req.body, userId: req.user.id });
      res.status(201).json(log);
    })
  );

  router.get(
    '/',
    requireAdmin,
    asyncHandler(async (req, res) => {
      res.json(await listAuditLogs(prisma, { limit: parseLimit(req) }));
    })
  );

  router.get(
    '/mine',
    asyncHandler(async (req, res) => {
      res.json(await listAuditLogsByUser(prisma, req.user.id, { limit: parseLimit(req) }));
    })
  );

  router.get(
    '/by-event/:eventType',
    requireAdmin,
    asyncHandler(async (req, res) => {
      res.json(await listAuditLogsByEventType(prisma, req.params.eventType, { limit: parseLimit(req) }));
    })
  );

  router.get(
    '/by-resource/:resourceId',
    asyncHandler(async (req, res) => {
      if (req.user.role !== 'admin') {
        const draft = await getDraft(prisma, req.params.resourceId);
        if (!draft || draft.userId !== req.user.id) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
      res.json(await listAuditLogsByResource(prisma, req.params.resourceId, { limit: parseLimit(req) }));
    })
  );

  return router;
}
