import { describe, expect, it, beforeEach } from 'vitest';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import {
  createClause,
  getClause,
  updateClause,
  deleteClause,
  searchClauses,
  incrementClauseUsage,
  getClauseCategoryCounts,
  addClauseFavorite,
  removeClauseFavorite,
  findClauseFavorite,
  listClauseFavoritesByUser,
  listClauseFavoritesWithClauses,
} from './clauseRepository.js';

async function seedClauses(prisma) {
  const indemnification = await createClause(prisma, {
    title: 'Standard Indemnification',
    content: '<p>...</p>',
    category: 'Indemnification',
    jurisdiction: 'Federal',
    isPublished: true,
  });
  const confidentiality = await createClause(prisma, {
    title: 'Mutual Confidentiality',
    content: '<p>...</p>',
    category: 'Confidentiality',
    jurisdiction: 'Federal',
    isPublished: true,
  });
  const unpublished = await createClause(prisma, {
    title: 'Draft Clause',
    content: '<p>...</p>',
    category: 'Confidentiality',
    jurisdiction: 'California',
  });
  // isPublished is not a client-writable field (see trust-flag test below),
  // so flip it directly on the fake store to seed an unpublished fixture.
  await prisma.clause.update({ where: { id: unpublished.id }, data: { isPublished: false } });
  return { indemnification, confidentiality, unpublished };
}

describe('clauseRepository', () => {
  let prisma;

  beforeEach(() => {
    prisma = createFakePrismaClient();
  });

  it('creates a clause', async () => {
    const clause = await createClause(prisma, {
      title: 'Force Majeure',
      content: '<p>...</p>',
      category: 'Force Majeure',
    });
    expect(clause.id).toBeDefined();
    expect(clause.usageCount).toBe(0);
    expect(clause.isPublished).toBe(true);
  });

  it('gets, updates, and deletes a clause', async () => {
    const created = await createClause(prisma, { title: 'X', content: 'c', category: 'Notices' });

    const fetched = await getClause(prisma, created.id);
    expect(fetched.title).toBe('X');

    const updated = await updateClause(prisma, created.id, { title: 'Y' });
    expect(updated.title).toBe('Y');

    await deleteClause(prisma, created.id);
    expect(await getClause(prisma, created.id)).toBeNull();
  });

  it('does not allow isPublished to be set via update (trust flag mass assignment)', async () => {
    const created = await createClause(prisma, { title: 'X', content: 'c', category: 'Notices' });
    expect(created.isPublished).toBe(true);
    await prisma.clause.update({ where: { id: created.id }, data: { isPublished: false } });

    const updated = await updateClause(prisma, created.id, { isPublished: true });
    expect(updated.isPublished).toBe(false);
  });

  it('does not allow isPublished to be set via create (trust flag mass assignment)', async () => {
    const created = await createClause(prisma, {
      title: 'X',
      content: 'c',
      category: 'Notices',
      isPublished: false,
    });
    expect(created.isPublished).toBe(true);
  });

  it('searches published clauses by category', async () => {
    const { indemnification } = await seedClauses(prisma);

    const results = await searchClauses(prisma, { category: 'Indemnification' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(indemnification.id);
  });

  it('excludes unpublished clauses from search by default', async () => {
    await seedClauses(prisma);

    const results = await searchClauses(prisma, { category: 'Confidentiality' });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Mutual Confidentiality');
  });

  it('searches clauses by jurisdiction', async () => {
    await seedClauses(prisma);

    const results = await searchClauses(prisma, { jurisdiction: 'Federal' });
    expect(results.map((c) => c.category).sort()).toEqual(['Confidentiality', 'Indemnification']);
  });

  it('increments usage count and sets lastUsedAt', async () => {
    const created = await createClause(prisma, { title: 'X', content: 'c', category: 'Notices' });
    expect(created.usageCount).toBe(0);

    const updated = await incrementClauseUsage(prisma, created.id);
    expect(updated.usageCount).toBe(1);
    expect(updated.lastUsedAt).toBeInstanceOf(Date);
  });

  it('computes category counts for published clauses only', async () => {
    await seedClauses(prisma);

    const counts = await getClauseCategoryCounts(prisma);
    expect(counts).toEqual(
      expect.arrayContaining([
        { name: 'Indemnification', count: 1 },
        { name: 'Confidentiality', count: 1 },
      ])
    );
    expect(counts).toHaveLength(2); // unpublished clause's category not double counted / included
  });

  describe('favorites', () => {
    it('adds and finds a favorite for a user', async () => {
      const clause = await createClause(prisma, { title: 'X', content: 'c', category: 'Notices' });

      const favorite = await addClauseFavorite(prisma, 'user-1', clause.id, 'good one');
      expect(favorite.userId).toBe('user-1');
      expect(favorite.clauseId).toBe(clause.id);

      const found = await findClauseFavorite(prisma, 'user-1', clause.id);
      expect(found.id).toBe(favorite.id);
    });

    it('returns null when no favorite exists', async () => {
      const clause = await createClause(prisma, { title: 'X', content: 'c', category: 'Notices' });
      const found = await findClauseFavorite(prisma, 'user-1', clause.id);
      expect(found).toBeNull();
    });

    it('removes a favorite', async () => {
      const clause = await createClause(prisma, { title: 'X', content: 'c', category: 'Notices' });
      const favorite = await addClauseFavorite(prisma, 'user-1', clause.id);

      await removeClauseFavorite(prisma, favorite.id, 'user-1');

      expect(await findClauseFavorite(prisma, 'user-1', clause.id)).toBeNull();
    });

    it('does not remove a favorite owned by a different user (IDOR)', async () => {
      const clause = await createClause(prisma, { title: 'X', content: 'c', category: 'Notices' });
      const favorite = await addClauseFavorite(prisma, 'user-1', clause.id);

      const removed = await removeClauseFavorite(prisma, favorite.id, 'user-2');

      expect(removed).toBe(false);
      expect(await findClauseFavorite(prisma, 'user-1', clause.id)).not.toBeNull();
    });

    it('lists favorite ids for a user', async () => {
      const clauseA = await createClause(prisma, { title: 'A', content: 'c', category: 'Notices' });
      const clauseB = await createClause(prisma, { title: 'B', content: 'c', category: 'Notices' });
      await addClauseFavorite(prisma, 'user-1', clauseA.id);
      await addClauseFavorite(prisma, 'user-1', clauseB.id);
      await addClauseFavorite(prisma, 'user-2', clauseA.id);

      const favorites = await listClauseFavoritesByUser(prisma, 'user-1');
      expect(favorites).toHaveLength(2);
    });

    it('joins favorites with their clause records', async () => {
      const clauseA = await createClause(prisma, { title: 'A', content: 'c', category: 'Notices' });
      await addClauseFavorite(prisma, 'user-1', clauseA.id);

      const results = await listClauseFavoritesWithClauses(prisma, 'user-1');
      expect(results).toHaveLength(1);
      expect(results[0].clause.title).toBe('A');
      expect(results[0].favoriteId).toBeDefined();
    });
  });
});
