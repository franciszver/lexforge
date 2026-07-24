// Repository for the DocumentCollaborator aggregate (document sharing with
// role-based access, mirroring src/utils/collaborationService.ts).

export async function inviteCollaborator(prisma, data) {
  return prisma.documentCollaborator.create({
    data: {
      ...data,
      collaboratorEmail: data.collaboratorEmail.toLowerCase(),
      status: 'pending',
      invitedAt: data.invitedAt ?? new Date(),
    },
  });
}

export async function findActiveCollaboratorByEmail(prisma, documentId, email) {
  return prisma.documentCollaborator.findFirst({
    where: {
      documentId,
      collaboratorEmail: email.toLowerCase(),
      status: { not: 'revoked' },
    },
  });
}

export async function findCollaboratorByToken(prisma, inviteToken) {
  return prisma.documentCollaborator.findFirst({ where: { inviteToken } });
}

export async function acceptCollaboratorInvite(prisma, id, userId) {
  return prisma.documentCollaborator.update({
    where: { id },
    data: {
      collaboratorUserId: userId,
      status: 'accepted',
      acceptedAt: new Date(),
      inviteToken: null,
    },
  });
}

export async function listCollaboratorsByDocument(prisma, documentId) {
  return prisma.documentCollaborator.findMany({
    where: { documentId, status: { not: 'revoked' } },
  });
}

export async function listCollaboratorsByUserId(prisma, userId) {
  return prisma.documentCollaborator.findMany({
    where: { collaboratorUserId: userId, status: 'accepted' },
  });
}

export async function listPendingCollaboratorsByEmail(prisma, email) {
  return prisma.documentCollaborator.findMany({
    where: { collaboratorEmail: email.toLowerCase(), status: 'pending' },
  });
}

export async function updateCollaboratorRole(prisma, id, role) {
  return prisma.documentCollaborator.update({ where: { id }, data: { role } });
}

export async function revokeCollaborator(prisma, id) {
  return prisma.documentCollaborator.update({ where: { id }, data: { status: 'revoked' } });
}
