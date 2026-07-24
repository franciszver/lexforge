// Repository for the Draft aggregate (a user's document).

import { pick } from './pick.js';

// Client-writable fields for updates. Excludes id and userId (ownership must
// not be reassignable via the body) and createdAt/updatedAt.
const WRITABLE_FIELDS = ['title', 'content', 'metadata', 'intakeData', 'status'];

export async function createDraft(prisma, { userId, title, content, metadata, intakeData, status }) {
  return prisma.draft.create({
    data: {
      userId,
      title: title ?? null,
      content: content ?? null,
      metadata: metadata ?? null,
      intakeData: intakeData ?? null,
      status: status ?? 'draft',
    },
  });
}

export async function getDraft(prisma, id) {
  return prisma.draft.findUnique({ where: { id } });
}

export async function updateDraft(prisma, id, data) {
  return prisma.draft.update({ where: { id }, data: pick(data, WRITABLE_FIELDS) });
}

export async function deleteDraft(prisma, id) {
  return prisma.draft.delete({ where: { id } });
}

export async function listDraftsByUser(prisma, userId) {
  return prisma.draft.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
}
