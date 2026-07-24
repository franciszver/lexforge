import { Router } from 'express';
import { asyncHandler } from './asyncHandler.js';
import {
  createAuditLog,
  listAuditLogsByUser,
  listAuditLogsByEventType,
  listAuditLogsByResource,
  listAuditLogs,
} from '../repositories/auditLogRepository.js';

function parseLimit(req) {
  return req.query.limit ? Number(req.query.limit) : undefined;
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
    asyncHandler(async (req, res) => {
      res.json(await listAuditLogsByEventType(prisma, req.params.eventType, { limit: parseLimit(req) }));
    })
  );

  router.get(
    '/by-resource/:resourceId',
    asyncHandler(async (req, res) => {
      res.json(await listAuditLogsByResource(prisma, req.params.resourceId, { limit: parseLimit(req) }));
    })
  );

  return router;
}
