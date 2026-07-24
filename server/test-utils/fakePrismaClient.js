// Hand-rolled, Map-backed stand-in for the surface of PrismaClient that the
// repository layer uses. No live DB is available in this environment, so
// repository tests are written against this fake instead of
// vitest-mock-extended (which would still need @prisma/client generated
// types to be meaningful here).
//
// Supports the subset of Prisma's query API the repositories rely on:
// create / findUnique / findFirst / findMany / update / delete / count,
// with `where` clauses of plain equality plus `{ not }` and `{ in }`
// operators, and `orderBy` / `take` on findMany.

import { randomUUID } from 'node:crypto';

function matchesWhere(record, where) {
  if (!where) return true;
  return Object.entries(where).every(([key, condition]) => {
    const actual = record[key];
    if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
      if ('not' in condition) return actual !== condition.not;
      if ('in' in condition) return condition.in.includes(actual);
      throw new Error(`Unsupported where operator on "${key}": ${JSON.stringify(condition)}`);
    }
    return actual === condition;
  });
}

function applyOrderBy(records, orderBy) {
  if (!orderBy) return records;
  const [[field, direction]] = Object.entries(orderBy);
  const sorted = [...records].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === bv) return 0;
    return av > bv ? 1 : -1;
  });
  return direction === 'desc' ? sorted.reverse() : sorted;
}

function createFakeModel() {
  const rows = new Map();

  return {
    _rows: rows,

    async create({ data }) {
      const now = new Date();
      const record = {
        id: data.id ?? randomUUID(),
        ...data,
        ...(('createdAt' in data) ? {} : { createdAt: now }),
        ...(('updatedAt' in data) ? {} : { updatedAt: now }),
      };
      rows.set(record.id, record);
      return { ...record };
    },

    async findUnique({ where }) {
      if (where.id !== undefined) {
        const record = rows.get(where.id);
        return record ? { ...record } : null;
      }
      // Support any single unique field lookup (e.g. email, token).
      for (const record of rows.values()) {
        if (matchesWhere(record, where)) return { ...record };
      }
      return null;
    },

    async findFirst({ where } = {}) {
      for (const record of rows.values()) {
        if (matchesWhere(record, where)) return { ...record };
      }
      return null;
    },

    async findMany({ where, orderBy, take } = {}) {
      let records = [...rows.values()].filter((r) => matchesWhere(r, where));
      records = applyOrderBy(records, orderBy);
      if (typeof take === 'number') records = records.slice(0, take);
      return records.map((r) => ({ ...r }));
    },

    async update({ where, data }) {
      const existing = where.id !== undefined ? rows.get(where.id) : undefined;
      if (!existing) {
        throw new Error(`Record not found for update: ${JSON.stringify(where)}`);
      }
      const updated = { ...existing, ...data, updatedAt: new Date() };
      rows.set(existing.id, updated);
      return { ...updated };
    },

    async delete({ where }) {
      const existing = where.id !== undefined ? rows.get(where.id) : undefined;
      if (!existing) {
        throw new Error(`Record not found for delete: ${JSON.stringify(where)}`);
      }
      rows.delete(existing.id);
      return { ...existing };
    },

    async count({ where } = {}) {
      return [...rows.values()].filter((r) => matchesWhere(r, where)).length;
    },
  };
}

export function createFakePrismaClient() {
  return {
    user: createFakeModel(),
    draft: createFakeModel(),
    clause: createFakeModel(),
    userClauseFavorite: createFakeModel(),
    citation: createFakeModel(),
    userCitationFavorite: createFakeModel(),
    auditLog: createFakeModel(),
    template: createFakeModel(),
    documentCollaborator: createFakeModel(),
    shareLink: createFakeModel(),
  };
}
