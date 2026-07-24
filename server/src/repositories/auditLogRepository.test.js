import { describe, expect, it, beforeEach } from 'vitest';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import {
  createAuditLog,
  listAuditLogsByUser,
  listAuditLogsByEventType,
  listAuditLogsByResource,
  listAuditLogs,
} from './auditLogRepository.js';

async function seedAuditLogs(prisma) {
  await createAuditLog(prisma, {
    timestamp: new Date('2026-01-01'),
    userId: 'user-1',
    eventType: 'DOCUMENT_CREATE',
    action: 'create',
    resourceId: 'draft-1',
  });
  await createAuditLog(prisma, {
    timestamp: new Date('2026-01-02'),
    userId: 'user-1',
    eventType: 'DOCUMENT_UPDATE',
    action: 'update',
    resourceId: 'draft-1',
  });
  await createAuditLog(prisma, {
    timestamp: new Date('2026-01-03'),
    userId: 'user-2',
    eventType: 'AUTH_LOGIN',
    action: 'login',
    resourceId: 'draft-2',
  });
}

describe('auditLogRepository', () => {
  let prisma;

  beforeEach(() => {
    prisma = createFakePrismaClient();
  });

  it('creates an audit log entry', async () => {
    const entry = await createAuditLog(prisma, {
      userId: 'user-1',
      eventType: 'AUTH_LOGIN',
      action: 'login',
    });
    expect(entry.id).toBeDefined();
    expect(entry.eventType).toBe('AUTH_LOGIN');
  });

  it('lists audit logs by userId, most recent first', async () => {
    await seedAuditLogs(prisma);

    const logs = await listAuditLogsByUser(prisma, 'user-1');
    expect(logs).toHaveLength(2);
    expect(logs[0].eventType).toBe('DOCUMENT_UPDATE');
    expect(logs[1].eventType).toBe('DOCUMENT_CREATE');
  });

  it('lists audit logs by eventType', async () => {
    await seedAuditLogs(prisma);

    const logs = await listAuditLogsByEventType(prisma, 'AUTH_LOGIN');
    expect(logs).toHaveLength(1);
    expect(logs[0].userId).toBe('user-2');
  });

  it('lists audit logs by resourceId, most recent first', async () => {
    await seedAuditLogs(prisma);

    const logs = await listAuditLogsByResource(prisma, 'draft-1');
    expect(logs).toHaveLength(2);
    expect(logs[0].eventType).toBe('DOCUMENT_UPDATE');
  });

  it('lists all audit logs, most recent first, when unfiltered', async () => {
    await seedAuditLogs(prisma);

    const logs = await listAuditLogs(prisma);
    expect(logs).toHaveLength(3);
    expect(logs[0].eventType).toBe('AUTH_LOGIN');
  });

  it('respects a limit', async () => {
    await seedAuditLogs(prisma);

    const logs = await listAuditLogs(prisma, { limit: 1 });
    expect(logs).toHaveLength(1);
  });

  it('does not allow hash/previousHash to be set via create (integrity field mass assignment)', async () => {
    const entry = await createAuditLog(prisma, {
      userId: 'user-1',
      eventType: 'AUTH_LOGIN',
      action: 'login',
      resourceId: 'draft-1',
      metadata: { foo: 'bar' },
      hash: 'forged-hash',
      previousHash: 'forged-previous-hash',
    });

    expect(entry.eventType).toBe('AUTH_LOGIN');
    expect(entry.action).toBe('login');
    expect(entry.resourceId).toBe('draft-1');
    expect(entry.metadata).toEqual({ foo: 'bar' });
    expect(entry.hash).toBeUndefined();
    expect(entry.previousHash).toBeUndefined();
  });
});
