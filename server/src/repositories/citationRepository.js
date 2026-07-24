// Repository for the Citation aggregate, including each user's favorites
// (UserCitationFavorite).

import { pick } from './pick.js';

// Client-writable content fields (see prisma/schema.prisma Citation model).
// Excludes id, usageCount/lastUsedAt (managed by incrementCitationUsage),
// isVerified (trust flag), createdBy (identity field), createdAt/updatedAt.
const WRITABLE_FIELDS = [
  'title',
  'citation',
  'type',
  'court',
  'year',
  'volume',
  'reporter',
  'page',
  'pinpoint',
  'jurisdiction',
  'codeTitle',
  'section',
  'subdivision',
  'shortForm',
  'parenthetical',
  'url',
  'category',
  'tags',
  'notes',
];

export async function createCitation(prisma, data) {
  return prisma.citation.create({
    data: {
      ...pick(data, WRITABLE_FIELDS),
      usageCount: 0,
      isVerified: false,
    },
  });
}

export async function getCitation(prisma, id) {
  return prisma.citation.findUnique({ where: { id } });
}

export async function updateCitation(prisma, id, data) {
  return prisma.citation.update({ where: { id }, data: pick(data, WRITABLE_FIELDS) });
}

export async function deleteCitation(prisma, id) {
  return prisma.citation.delete({ where: { id } });
}

/**
 * Search citations by a single indexed field, mirroring the GSI-backed
 * queries in src/utils/citationService.ts#searchCitations (type,
 * jurisdiction, or category). Client-side text search/sort stays in the
 * service layer.
 */
export async function searchCitations(prisma, { type, jurisdiction, category, isVerified } = {}) {
  const where = {};
  if (type) where.type = type;
  if (jurisdiction) where.jurisdiction = jurisdiction;
  if (category) where.category = category;
  if (isVerified !== undefined) where.isVerified = isVerified;
  return prisma.citation.findMany({ where });
}

export async function incrementCitationUsage(prisma, id) {
  const citation = await prisma.citation.findUnique({ where: { id } });
  return prisma.citation.update({
    where: { id },
    data: {
      usageCount: (citation?.usageCount ?? 0) + 1,
      lastUsedAt: new Date(),
    },
  });
}

// ============================================
// Favorites
// ============================================

export async function addCitationFavorite(prisma, userId, citationId, notes) {
  return prisma.userCitationFavorite.create({
    data: { userId, citationId, notes: notes ?? null },
  });
}

export async function removeCitationFavorite(prisma, id, userId) {
  const { count } = await prisma.userCitationFavorite.deleteMany({ where: { id, userId } });
  return count > 0;
}

export async function listCitationFavoritesByUser(prisma, userId) {
  return prisma.userCitationFavorite.findMany({ where: { userId } });
}

export async function listCitationFavoritesWithCitations(prisma, userId) {
  const favorites = await listCitationFavoritesByUser(prisma, userId);
  const results = [];
  for (const favorite of favorites) {
    const citation = await getCitation(prisma, favorite.citationId);
    if (citation) {
      results.push({ citation, favoriteId: favorite.id });
    }
  }
  return results;
}
