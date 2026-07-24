import { describe, expect, it, beforeEach } from 'vitest';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import {
  createShareLink,
  findShareLinkByToken,
  listShareLinksByDocument,
  incrementShareLinkAccess,
  revokeShareLink,
} from './shareLinkRepository.js';

describe('shareLinkRepository', () => {
  let prisma;

  beforeEach(() => {
    prisma = createFakePrismaClient();
  });

  it('creates a share link that is active with accessCount 0', async () => {
    const link = await createShareLink(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      token: 'tok-1',
      passcode: 'ABC123',
      accessLevel: 'view',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    expect(link.isActive).toBe(true);
    expect(link.accessCount).toBe(0);
  });

  it('finds a share link by token', async () => {
    await createShareLink(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      token: 'tok-1',
      passcode: 'ABC123',
      accessLevel: 'view',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    const found = await findShareLinkByToken(prisma, 'tok-1');
    expect(found.documentId).toBe('doc-1');
  });

  it('lists only active share links for a document', async () => {
    const link = await createShareLink(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      token: 'tok-1',
      passcode: 'ABC123',
      accessLevel: 'view',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });
    await createShareLink(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      token: 'tok-2',
      passcode: 'DEF456',
      accessLevel: 'view',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });
    await revokeShareLink(prisma, link.id, 'owner-1');

    const list = await listShareLinksByDocument(prisma, 'doc-1');
    expect(list).toHaveLength(1);
    expect(list[0].token).toBe('tok-2');
  });

  it('increments access count and sets lastAccessedAt', async () => {
    const link = await createShareLink(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      token: 'tok-1',
      passcode: 'ABC123',
      accessLevel: 'view',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    const updated = await incrementShareLinkAccess(prisma, link.id);
    expect(updated.accessCount).toBe(1);
    expect(updated.lastAccessedAt).toBeInstanceOf(Date);
  });

  it('revokes a share link', async () => {
    const link = await createShareLink(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      token: 'tok-1',
      passcode: 'ABC123',
      accessLevel: 'view',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    const revoked = await revokeShareLink(prisma, link.id, 'owner-1');
    expect(revoked.isActive).toBe(false);
    expect(revoked.revokedBy).toBe('owner-1');
  });
});
