// Shared ownership check for routes scoped to "your own drafts": drafts,
// collaborators (by their document), and share-links (by their document).
import { getDraft } from '../repositories/draftRepository.js';

export class OwnershipError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function requireDraftOwner(prisma, documentId, userId) {
  const draft = await getDraft(prisma, documentId);
  if (!draft) throw new OwnershipError(404, 'Draft not found');
  if (draft.userId !== userId) throw new OwnershipError(403, 'Forbidden');
  return draft;
}
