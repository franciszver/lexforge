import { describe, expect, it, beforeEach } from 'vitest';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import {
  createCitation,
  getCitation,
  updateCitation,
  deleteCitation,
  searchCitations,
  incrementCitationUsage,
  addCitationFavorite,
  removeCitationFavorite,
  listCitationFavoritesByUser,
  listCitationFavoritesWithCitations,
} from './citationRepository.js';

async function seedCitations(prisma) {
  const caseLaw = await createCitation(prisma, {
    title: 'Robinson v. Harveston Freight Co.',
    citation: '312 Ga. App. 118 (2019)',
    type: 'case',
    jurisdiction: 'Georgia',
    category: 'Tort Law',
  });
  const statute = await createCitation(prisma, {
    title: 'O.C.G.A. § 51-3-1',
    citation: 'O.C.G.A. § 51-3-1',
    type: 'statute',
    jurisdiction: 'Georgia',
    category: 'Premises Liability',
  });
  const federalCase = await createCitation(prisma, {
    title: 'Brown v. Board of Education',
    citation: '347 U.S. 483 (1954)',
    type: 'case',
    jurisdiction: 'Federal',
    category: 'Constitutional Law',
  });
  return { caseLaw, statute, federalCase };
}

describe('citationRepository', () => {
  let prisma;

  beforeEach(() => {
    prisma = createFakePrismaClient();
  });

  it('creates a citation with usageCount defaulted to 0', async () => {
    const citation = await createCitation(prisma, {
      title: 'Hadley v. Baxendale',
      citation: '9 Ex. 341 (1854)',
      type: 'case',
    });
    expect(citation.id).toBeDefined();
    expect(citation.usageCount).toBe(0);
  });

  it('gets, updates, and deletes a citation', async () => {
    const created = await createCitation(prisma, { title: 'X', citation: 'x', type: 'case' });

    expect((await getCitation(prisma, created.id)).title).toBe('X');

    const updated = await updateCitation(prisma, created.id, { title: 'Y' });
    expect(updated.title).toBe('Y');

    await deleteCitation(prisma, created.id);
    expect(await getCitation(prisma, created.id)).toBeNull();
  });

  it('searches citations by type', async () => {
    await seedCitations(prisma);

    const results = await searchCitations(prisma, { type: 'case' });
    expect(results).toHaveLength(2);
    expect(results.every((c) => c.type === 'case')).toBe(true);
  });

  it('searches citations by jurisdiction', async () => {
    await seedCitations(prisma);

    const results = await searchCitations(prisma, { jurisdiction: 'Georgia' });
    expect(results).toHaveLength(2);
  });

  it('searches citations by category', async () => {
    await seedCitations(prisma);

    const results = await searchCitations(prisma, { category: 'Tort Law' });
    expect(results).toHaveLength(1);
  });

  it('increments usage count and sets lastUsedAt', async () => {
    const created = await createCitation(prisma, { title: 'X', citation: 'x', type: 'case' });
    const updated = await incrementCitationUsage(prisma, created.id);
    expect(updated.usageCount).toBe(1);
    expect(updated.lastUsedAt).toBeInstanceOf(Date);
  });

  describe('favorites', () => {
    it('adds, lists, and removes a favorite', async () => {
      const citation = await createCitation(prisma, { title: 'X', citation: 'x', type: 'case' });

      const favorite = await addCitationFavorite(prisma, 'user-1', citation.id, 'note');
      expect(favorite.citationId).toBe(citation.id);

      const list = await listCitationFavoritesByUser(prisma, 'user-1');
      expect(list).toHaveLength(1);

      await removeCitationFavorite(prisma, favorite.id);
      expect(await listCitationFavoritesByUser(prisma, 'user-1')).toHaveLength(0);
    });

    it('joins favorites with their citation records', async () => {
      const citation = await createCitation(prisma, { title: 'X', citation: 'x', type: 'case' });
      await addCitationFavorite(prisma, 'user-1', citation.id);

      const results = await listCitationFavoritesWithCitations(prisma, 'user-1');
      expect(results).toHaveLength(1);
      expect(results[0].citation.title).toBe('X');
      expect(results[0].favoriteId).toBeDefined();
    });
  });
});
