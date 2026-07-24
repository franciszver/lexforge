import { describe, expect, it, beforeEach } from 'vitest';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import {
  createDraft,
  getDraft,
  updateDraft,
  deleteDraft,
  listDraftsByUser,
} from './draftRepository.js';

describe('draftRepository', () => {
  let prisma;

  beforeEach(() => {
    prisma = createFakePrismaClient();
  });

  it('creates a draft owned by a user', async () => {
    const draft = await createDraft(prisma, {
      userId: 'user-1',
      title: 'Demand Letter',
      content: '<p>hi</p>',
      metadata: { jurisdiction: 'Georgia' },
      intakeData: { clientGoal: 'settle' },
      status: 'draft',
    });

    expect(draft.id).toBeDefined();
    expect(draft.userId).toBe('user-1');
    expect(draft.metadata).toEqual({ jurisdiction: 'Georgia' });
  });

  it('gets a draft by id', async () => {
    const created = await createDraft(prisma, { userId: 'user-1', title: 'T' });
    const found = await getDraft(prisma, created.id);
    expect(found.title).toBe('T');
  });

  it('returns null for a missing draft', async () => {
    const found = await getDraft(prisma, 'nonexistent');
    expect(found).toBeNull();
  });

  it('updates a draft', async () => {
    const created = await createDraft(prisma, { userId: 'user-1', title: 'Old' });
    const updated = await updateDraft(prisma, created.id, { title: 'New' });
    expect(updated.title).toBe('New');
  });

  it('deletes a draft', async () => {
    const created = await createDraft(prisma, { userId: 'user-1', title: 'Gone' });
    await deleteDraft(prisma, created.id);
    const found = await getDraft(prisma, created.id);
    expect(found).toBeNull();
  });

  it('lists drafts for a user only, most recently updated first', async () => {
    const a = await createDraft(prisma, { userId: 'user-1', title: 'A' });
    await createDraft(prisma, { userId: 'user-2', title: 'Other user' });
    const c = await createDraft(prisma, { userId: 'user-1', title: 'C' });

    await updateDraft(prisma, a.id, { title: 'A updated' });

    const drafts = await listDraftsByUser(prisma, 'user-1');
    expect(drafts).toHaveLength(2);
    expect(drafts.every((d) => d.userId === 'user-1')).toBe(true);
    expect(drafts[0].id).toBe(a.id); // most recently updated
    expect(drafts[1].id).toBe(c.id);
  });
});
