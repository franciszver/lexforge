// Repository for the ShareLink aggregate (passcode-protected document
// share links, mirroring src/utils/collaborationService.ts).

import { pick } from './pick.js';

// Client-writable fields (see prisma/schema.prisma ShareLink model).
// Excludes id, lastAccessedAt/lastAccessedBy (set only by
// incrementShareLinkAccess), and revokedAt/revokedBy (set only by
// revokeShareLink).
const WRITABLE_FIELDS = [
  'documentId',
  'documentOwnerId',
  'token',
  'passcode',
  'accessLevel',
  'expiresAt',
  'accessCount',
  'isActive',
];

export async function createShareLink(prisma, data) {
  return prisma.shareLink.create({
    data: {
      ...pick(data, WRITABLE_FIELDS),
      accessCount: data.accessCount ?? 0,
      isActive: data.isActive ?? true,
    },
  });
}

export async function findShareLinkByToken(prisma, token) {
  return prisma.shareLink.findFirst({ where: { token } });
}

export async function getShareLinkById(prisma, id) {
  return prisma.shareLink.findUnique({ where: { id } });
}

export async function listShareLinksByDocument(prisma, documentId) {
  return prisma.shareLink.findMany({ where: { documentId, isActive: true } });
}

export async function incrementShareLinkAccess(prisma, id) {
  const link = await prisma.shareLink.findUnique({ where: { id } });
  return prisma.shareLink.update({
    where: { id },
    data: {
      accessCount: (link?.accessCount ?? 0) + 1,
      lastAccessedAt: new Date(),
    },
  });
}

export async function revokeShareLink(prisma, id, revokedBy) {
  return prisma.shareLink.update({
    where: { id },
    data: { isActive: false, revokedAt: new Date(), revokedBy },
  });
}
