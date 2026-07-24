// Repository for the ShareLink aggregate (passcode-protected document
// share links, mirroring src/utils/collaborationService.ts).

export async function createShareLink(prisma, data) {
  return prisma.shareLink.create({
    data: {
      ...data,
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
