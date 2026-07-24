// Repository for the Clause aggregate, including each user's favorites
// (UserClauseFavorite).

import { pick } from './pick.js';

// Client-writable content fields (see prisma/schema.prisma Clause model).
// Excludes id, usageCount/lastUsedAt (managed by incrementClauseUsage),
// isPublished (trust flag), createdAt/updatedAt.
const WRITABLE_FIELDS = [
  'title',
  'content',
  'description',
  'category',
  'subcategory',
  'tags',
  'jurisdiction',
  'documentTypes',
  'variations',
  'author',
  'isFavorite',
  'notes',
  'placeholders',
];

export async function createClause(prisma, data) {
  return prisma.clause.create({
    data: {
      ...pick(data, WRITABLE_FIELDS),
      usageCount: 0,
      isPublished: true,
    },
  });
}

export async function getClause(prisma, id) {
  return prisma.clause.findUnique({ where: { id } });
}

export async function updateClause(prisma, id, data) {
  return prisma.clause.update({ where: { id }, data: pick(data, WRITABLE_FIELDS) });
}

export async function deleteClause(prisma, id) {
  return prisma.clause.delete({ where: { id } });
}

/**
 * Search published clauses, optionally narrowed by category/jurisdiction.
 * Mirrors src/utils/clauseService.ts#searchClauses's server-side filter
 * (client-side query/tag/documentType filtering stays in the service layer).
 */
export async function searchClauses(prisma, { category, jurisdiction, isPublished = true } = {}) {
  const where = { isPublished };
  if (category) where.category = category;
  if (jurisdiction) where.jurisdiction = jurisdiction;
  return prisma.clause.findMany({ where });
}

export async function incrementClauseUsage(prisma, id) {
  const clause = await prisma.clause.findUnique({ where: { id } });
  return prisma.clause.update({
    where: { id },
    data: {
      usageCount: (clause?.usageCount ?? 0) + 1,
      lastUsedAt: new Date(),
    },
  });
}

export async function getClauseCategoryCounts(prisma) {
  const clauses = await prisma.clause.findMany({ where: { isPublished: true } });
  const counts = new Map();
  for (const clause of clauses) {
    counts.set(clause.category, (counts.get(clause.category) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}

// ============================================
// Favorites
// ============================================

export async function addClauseFavorite(prisma, userId, clauseId, notes) {
  return prisma.userClauseFavorite.create({
    data: { userId, clauseId, notes: notes ?? null },
  });
}

export async function removeClauseFavorite(prisma, id, userId) {
  const { count } = await prisma.userClauseFavorite.deleteMany({ where: { id, userId } });
  return count > 0;
}

export async function findClauseFavorite(prisma, userId, clauseId) {
  return prisma.userClauseFavorite.findFirst({ where: { userId, clauseId } });
}

export async function listClauseFavoritesByUser(prisma, userId) {
  return prisma.userClauseFavorite.findMany({ where: { userId } });
}

export async function listClauseFavoritesWithClauses(prisma, userId) {
  const favorites = await listClauseFavoritesByUser(prisma, userId);
  const results = [];
  for (const favorite of favorites) {
    const clause = await getClause(prisma, favorite.clauseId);
    if (clause) {
      results.push({ clause, favoriteId: favorite.id });
    }
  }
  return results;
}
