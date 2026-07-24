// Repository for the AuditLog aggregate.

import { pick } from './pick.js';

// Client-writable fields (see prisma/schema.prisma AuditLog model). Excludes
// id and the previousHash/hash integrity fields, which must never be
// settable by the caller.
const WRITABLE_FIELDS = [
  'userId',
  'userEmail',
  'eventType',
  'action',
  'resourceType',
  'resourceId',
  'metadata',
  'ipAddress',
  'userAgent',
  'sessionId',
  'timestamp',
];

export async function createAuditLog(prisma, data) {
  return prisma.auditLog.create({
    data: {
      ...pick(data, WRITABLE_FIELDS),
      timestamp: data.timestamp ?? new Date(),
    },
  });
}

export async function listAuditLogsByUser(prisma, userId, { limit } = {}) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

export async function listAuditLogsByEventType(prisma, eventType, { limit } = {}) {
  return prisma.auditLog.findMany({
    where: { eventType },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

export async function listAuditLogsByResource(prisma, resourceId, { limit } = {}) {
  return prisma.auditLog.findMany({
    where: { resourceId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

export async function listAuditLogs(prisma, { limit } = {}) {
  return prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}
