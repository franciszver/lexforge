/**
 * API Data Client
 *
 * Non-demo counterpart to the in-memory mock in `src/demo/dataClient.ts`.
 * Implements the exact same `.models.<Model>.list/get/create/update/delete`
 * (+ `.queries.<name>`) method surface and `{ data, errors }` return shapes,
 * but backed by REST calls to the Express/Prisma server (see
 * `server/src/routes/*.js`) instead of an in-memory fixture table.
 *
 * DocumentPresence/DocumentSyncState stay in-memory no-ops here too —
 * realtime sync is P3.6. `queries.generateArguments`/`askAI` are unchanged:
 * they proxy straight through to the demo proxy client (P3.5 moves AI
 * server-side).
 */
import { v4 as uuidv4 } from 'uuid';
import { authenticatedRequest, AuthApiError } from './authClient';
import { generateArgumentsResult, getSuggestionsResult } from '../demo/proxyClient';

type Row = Record<string, unknown>;

interface ListParams {
    filter?: Record<string, { eq?: unknown; ne?: unknown }>;
    limit?: number;
    nextToken?: string;
}

interface IndexParams {
    sortDirection?: 'ASC' | 'DESC';
    limit?: number;
    nextToken?: string;
}

function apiError(err: unknown): { message: string }[] {
    return [{ message: err instanceof Error ? err.message : 'Request failed' }];
}

function qs(params: Record<string, unknown>): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
    if (!entries.length) return '';
    return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

function extractEq(filter: ListParams['filter'], field: string): unknown {
    const cond = filter?.[field];
    return cond && typeof cond === 'object' && 'eq' in cond ? cond.eq : undefined;
}

function applyEqFilters(rows: Row[], filter: ListParams['filter'], fields: string[]): Row[] {
    let data = rows;
    for (const field of fields) {
        const value = extractEq(filter, field);
        if (value !== undefined) data = data.filter((r) => r[field] === value);
    }
    return data;
}

// ============================================
// Generic CRUD (get/create/update/delete) over a REST resource at basePath.
// `list` is always defined per-model below since each resource's query
// params differ.
// ============================================

function crudModel(basePath: string) {
    return {
        async get({ id }: Row) {
            try {
                return { data: await authenticatedRequest<Row>(`${basePath}/${id}`), errors: null };
            } catch (err) {
                return { data: null, errors: apiError(err) };
            }
        },
        async create(fields: Row) {
            try {
                const data = await authenticatedRequest<Row>(basePath, { method: 'POST', body: JSON.stringify(fields) });
                return { data, errors: null };
            } catch (err) {
                return { data: null, errors: apiError(err) };
            }
        },
        async update(fields: Row) {
            const { id, ...rest } = fields;
            try {
                const data = await authenticatedRequest<Row>(`${basePath}/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(rest),
                });
                return { data, errors: null };
            } catch (err) {
                return { data: null, errors: apiError(err) };
            }
        },
        async delete({ id }: Row) {
            try {
                await authenticatedRequest<void>(`${basePath}/${id}`, { method: 'DELETE' });
                return { data: { id }, errors: null };
            } catch (err) {
                return { data: null, errors: apiError(err) };
            }
        },
    };
}

// ============================================
// In-memory no-op models (DocumentPresence, DocumentSyncState) — identical
// behavior to the demo mock's makeModel, since realtime sync is P3.6.
// ============================================

function makeInMemoryModel(idField = 'id') {
    const table = new Map<string, Row>();

    function list(_params: ListParams = {}) {
        return Promise.resolve({ data: Array.from(table.values()), errors: null, nextToken: undefined });
    }

    function get(key: Row) {
        const id = String(key[idField]);
        return Promise.resolve({ data: table.get(id) ?? null, errors: null });
    }

    function create(fields: Row) {
        const now = new Date().toISOString();
        const id = (fields[idField] as string | undefined) ?? uuidv4();
        const row: Row = {
            ...fields,
            [idField]: id,
            createdAt: (fields.createdAt as string | undefined) ?? now,
            updatedAt: now,
        };
        table.set(String(id), row);
        return Promise.resolve({ data: row, errors: null });
    }

    function update(fields: Row) {
        const id = String(fields[idField]);
        const existing = table.get(id) ?? {};
        const merged: Row = { ...existing, ...fields, updatedAt: new Date().toISOString() };
        table.set(id, merged);
        return Promise.resolve({ data: merged, errors: null });
    }

    function del(key: Row) {
        const id = String(key[idField]);
        table.delete(id);
        return Promise.resolve({ data: { [idField]: id }, errors: null });
    }

    function noopSubscription() {
        return { subscribe: () => ({ unsubscribe() {} }) };
    }

    return { list, get, create, update, delete: del, onCreate: noopSubscription, onUpdate: noopSubscription, onDelete: noopSubscription };
}

// ============================================
// Draft
// ============================================

const Draft = {
    ...crudModel('/drafts'),
    async list(_params: ListParams = {}) {
        try {
            return { data: await authenticatedRequest<Row[]>('/drafts'), errors: null, nextToken: undefined };
        } catch (err) {
            return { data: [], errors: apiError(err), nextToken: undefined };
        }
    },
};

// ============================================
// Clause + UserClauseFavorite
// ============================================

const Clause = {
    ...crudModel('/clauses'),
    async list(params: ListParams = {}) {
        const category = extractEq(params.filter, 'category') as string | undefined;
        const jurisdiction = extractEq(params.filter, 'jurisdiction') as string | undefined;
        try {
            const data = await authenticatedRequest<Row[]>(`/clauses${qs({ category, jurisdiction })}`);
            return { data, errors: null, nextToken: undefined };
        } catch (err) {
            return { data: [], errors: apiError(err), nextToken: undefined };
        }
    },
};

function favoriteModel(basePath: string, idField: string) {
    return {
        async list(params: ListParams = {}) {
            const filterId = extractEq(params.filter, idField) as string | undefined;
            try {
                const all = await authenticatedRequest<Row[]>(`${basePath}/mine`);
                const data = filterId ? all.filter((r) => r[idField] === filterId) : all;
                return { data, errors: null, nextToken: undefined };
            } catch (err) {
                return { data: [], errors: apiError(err), nextToken: undefined };
            }
        },
        async create(fields: Row) {
            try {
                const data = await authenticatedRequest<Row>(basePath, { method: 'POST', body: JSON.stringify(fields) });
                return { data, errors: null };
            } catch (err) {
                return { data: null, errors: apiError(err) };
            }
        },
        async delete({ id }: Row) {
            try {
                await authenticatedRequest<void>(`${basePath}/${id}`, { method: 'DELETE' });
                return { data: { id }, errors: null };
            } catch (err) {
                return { data: null, errors: apiError(err) };
            }
        },
    };
}

const UserClauseFavorite = favoriteModel('/clauses/favorites', 'clauseId');

// ============================================
// Citation + UserCitationFavorite
// ============================================

async function citationByIndex(field: 'type' | 'jurisdiction' | 'category', key: Row) {
    try {
        const data = await authenticatedRequest<Row[]>(`/citations${qs({ [field]: key[field] })}`);
        return { data, errors: null, nextToken: undefined };
    } catch (err) {
        return { data: [], errors: apiError(err), nextToken: undefined };
    }
}

const Citation = {
    ...crudModel('/citations'),
    async list(_params: ListParams = {}) {
        try {
            return { data: await authenticatedRequest<Row[]>('/citations'), errors: null, nextToken: undefined };
        } catch (err) {
            return { data: [], errors: apiError(err), nextToken: undefined };
        }
    },
    listCitationByTypeAndTitle: (key: Row) => citationByIndex('type', key),
    listCitationByJurisdictionAndType: (key: Row) => citationByIndex('jurisdiction', key),
    listCitationByCategoryAndTitle: (key: Row) => citationByIndex('category', key),
};

const UserCitationFavorite = favoriteModel('/citations/favorites', 'citationId');

// ============================================
// AuditLog
// ============================================

async function auditList(path: string, opts: IndexParams = {}) {
    try {
        const data = await authenticatedRequest<Row[]>(`${path}${qs({ limit: opts.limit })}`);
        return { data, errors: null, nextToken: undefined };
    } catch (err) {
        return { data: [], errors: apiError(err), nextToken: undefined };
    }
}

const AuditLog = {
    list: (params: ListParams = {}) => auditList('/audit', params),
    async create(fields: Row) {
        try {
            const data = await authenticatedRequest<Row>('/audit', { method: 'POST', body: JSON.stringify(fields) });
            return { data, errors: null };
        } catch (err) {
            return { data: null, errors: apiError(err) };
        }
    },
    listAuditLogByUserIdAndTimestamp: (_key: Row, opts: IndexParams = {}) => auditList('/audit/mine', opts),
    listAuditLogByEventTypeAndTimestamp: (key: Row, opts: IndexParams = {}) =>
        auditList(`/audit/by-event/${key.eventType}`, opts),
    listAuditLogByResourceIdAndTimestamp: (key: Row, opts: IndexParams = {}) =>
        auditList(`/audit/by-resource/${key.resourceId}`, opts),
};

// ============================================
// Template
// ============================================

const Template = {
    ...crudModel('/templates'),
    async list(params: ListParams = {}) {
        const category = extractEq(params.filter, 'category') as string | undefined;
        try {
            const data = await authenticatedRequest<Row[]>(`/templates${qs({ category })}`);
            return { data, errors: null, nextToken: undefined };
        } catch (err) {
            return { data: [], errors: apiError(err), nextToken: undefined };
        }
    },
};

// ============================================
// DocumentCollaborator
// ============================================

async function listCollaborators(params: ListParams = {}) {
    const filter = params.filter;
    try {
        const inviteToken = extractEq(filter, 'inviteToken') as string | undefined;
        if (inviteToken) {
            try {
                const item = await authenticatedRequest<Row>(`/collaborators/token/${inviteToken}`);
                return { data: [item], errors: null, nextToken: undefined };
            } catch (err) {
                if (err instanceof AuthApiError && err.status === 404) {
                    return { data: [], errors: null, nextToken: undefined };
                }
                throw err;
            }
        }

        const documentId = extractEq(filter, 'documentId') as string | undefined;
        if (documentId) {
            const all = await authenticatedRequest<Row[]>(`/collaborators/document/${documentId}`);
            const data = applyEqFilters(all, filter, ['collaboratorEmail', 'collaboratorUserId', 'status']);
            return { data, errors: null, nextToken: undefined };
        }

        const mine = await authenticatedRequest<Row[]>('/collaborators/mine');
        const data = applyEqFilters(mine, filter, ['status']);
        return { data, errors: null, nextToken: undefined };
    } catch (err) {
        return { data: [], errors: apiError(err), nextToken: undefined };
    }
}

async function createCollaborator(fields: Row) {
    try {
        const data = await authenticatedRequest<Row>('/collaborators', {
            method: 'POST',
            body: JSON.stringify({
                documentId: fields.documentId,
                collaboratorEmail: fields.collaboratorEmail,
                role: fields.role,
                invitedByName: fields.invitedByName,
            }),
        });
        return { data, errors: null };
    } catch (err) {
        return { data: null, errors: apiError(err) };
    }
}

async function updateCollaborator(fields: Row) {
    try {
        if (fields.status === 'accepted') {
            // Authorization is the invite token, not the database id — see
            // POST /collaborators/accept/:token. collaborationService.ts
            // passes the original inviteToken through for this reason.
            const token = fields.inviteToken as string | undefined;
            if (!token) return { data: null, errors: apiError(new Error('Missing invite token')) };
            const data = await authenticatedRequest<Row>(`/collaborators/accept/${token}`, { method: 'POST' });
            return { data, errors: null };
        }
        if (fields.status === 'revoked') {
            await authenticatedRequest<void>(`/collaborators/${fields.id}`, { method: 'DELETE' });
            return { data: { ...fields }, errors: null };
        }
        const data = await authenticatedRequest<Row>(`/collaborators/${fields.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ role: fields.role }),
        });
        return { data, errors: null };
    } catch (err) {
        return { data: null, errors: apiError(err) };
    }
}

const DocumentCollaborator = {
    list: listCollaborators,
    create: createCollaborator,
    update: updateCollaborator,
};

// ============================================
// ShareLink
// ============================================

async function listShareLinks(params: ListParams = {}) {
    const filter = params.filter;
    try {
        const token = extractEq(filter, 'token') as string | undefined;
        if (token) {
            try {
                const item = await authenticatedRequest<Row>(`/share-links/token/${token}`);
                return { data: [item], errors: null, nextToken: undefined };
            } catch (err) {
                if (err instanceof AuthApiError && err.status === 404) {
                    return { data: [], errors: null, nextToken: undefined };
                }
                throw err;
            }
        }

        const documentId = extractEq(filter, 'documentId') as string | undefined;
        if (documentId) {
            const data = await authenticatedRequest<Row[]>(`/share-links/document/${documentId}`);
            return { data, errors: null, nextToken: undefined };
        }

        return { data: [], errors: null, nextToken: undefined };
    } catch (err) {
        return { data: [], errors: apiError(err), nextToken: undefined };
    }
}

async function createShareLink(fields: Row) {
    // The server generates its own cryptographically strong token/passcode;
    // any token/passcode/accessCount the caller passed is ignored.
    let expiryHours: number | undefined;
    if (typeof fields.expiresAt === 'string') {
        const ms = new Date(fields.expiresAt).getTime() - Date.now();
        expiryHours = Math.max(1, Math.round(ms / (60 * 60 * 1000)));
    }
    try {
        const data = await authenticatedRequest<Row>('/share-links', {
            method: 'POST',
            body: JSON.stringify({ documentId: fields.documentId, accessLevel: fields.accessLevel, expiryHours }),
        });
        return { data, errors: null };
    } catch (err) {
        return { data: null, errors: apiError(err) };
    }
}

async function updateShareLink(fields: Row) {
    try {
        if (fields.isActive === false) {
            await authenticatedRequest<void>(`/share-links/${fields.id}`, { method: 'DELETE' });
            return { data: { ...fields }, errors: null };
        }
        // Any other update is treated as "record an access" (verifyShareLink
        // bumping accessCount/lastAccessedAt) — the server computes both.
        const data = await authenticatedRequest<Row>(`/share-links/${fields.id}/access`, { method: 'POST' });
        return { data, errors: null };
    } catch (err) {
        return { data: null, errors: apiError(err) };
    }
}

const ShareLink = {
    list: listShareLinks,
    create: createShareLink,
    update: updateShareLink,
};

// ============================================
// Client
// ============================================

export function createApiDataClient() {
    return {
        models: {
            Clause,
            UserClauseFavorite,
            Citation,
            UserCitationFavorite,
            Draft,
            AuditLog,
            DocumentPresence: makeInMemoryModel(),
            DocumentSyncState: makeInMemoryModel('documentId'),
            DocumentCollaborator,
            ShareLink,
            Template,
        },
        queries: {
            generateArguments: async (args: { mode: string; [key: string]: unknown }) => {
                const data = await generateArgumentsResult(args);
                return { data, errors: null };
            },
            askAI: async (args: { text?: string; context?: unknown }) => {
                const data = await getSuggestionsResult(args);
                return { data, errors: null };
            },
        },
    };
}
