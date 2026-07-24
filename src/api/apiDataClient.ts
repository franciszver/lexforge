/**
 * API Data Client
 *
 * Non-demo counterpart to the in-memory mock in `src/demo/dataClient.ts`.
 * Implements the exact same `.models.<Model>.list/get/create/update/delete`
 * (+ `.queries.<name>`) method surface and `{ data, errors }` return shapes,
 * but backed by REST calls to the Express/Prisma server (see
 * `server/src/routes/*.js`) instead of an in-memory fixture table.
 *
 * Row types below mirror server/prisma/schema.prisma (JSON columns are
 * stringified JSON on the wire, matching how every *Service.ts already
 * reads/writes them) and are the single place this surface is typed —
 * every consumer (documentSlice, clauseService, citationService,
 * collaborationService, auditSlice, presenceService, Admin.tsx, ...)
 * infers its field types from these instead of casting ad hoc.
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
type MaybeErrors = { message: string }[] | null;

interface ApiResult<T> {
    data: T | null;
    errors: MaybeErrors;
}

interface ApiListResult<T> {
    data: T[];
    errors: MaybeErrors;
    nextToken: string | undefined;
}

interface ListParams {
    filter?: Record<string, unknown>;
    limit?: number;
    nextToken?: string;
}

interface IndexParams {
    sortDirection?: 'ASC' | 'DESC';
    limit?: number;
    nextToken?: string;
}

// ============================================
// Row types (server/prisma/schema.prisma). JSON columns (metadata, tags,
// cursorPosition, ...) are stringified JSON, not parsed objects.
// ============================================

// Every row interface below carries a `[key: string]: unknown` index
// signature so it (a) satisfies the `T extends Row` constraints used by the
// generic helpers further down and (b) can be cast to/from
// `Record<string, unknown>` the way several *Service.ts callers already do,
// without those callers needing their own casts.
//
// Fields backed by a Prisma `Json` column (metadata, tags, cursorPosition,
// ...) are typed `unknown`, not `string`: Prisma stores whatever JSON value
// the client sent — some callers pre-stringify with JSON.stringify(...),
// others (e.g. Admin.tsx's `defaultMetadata: {}`) send a raw object — and
// every reader already goes through parseJsonField(value: unknown) or an
// equivalent typeof check, never assumes a string.

export interface DraftRow {
    id: string;
    userId: string;
    owner?: string | null; // never sent by the server; some callers read it as a legacy fallback
    title?: string | null;
    content?: string | null;
    metadata?: unknown;
    intakeData?: unknown;
    status?: string | null;
    createdAt: string;
    updatedAt: string;
    [key: string]: unknown;
}

export interface ClauseRow {
    id: string;
    title: string;
    content: string;
    description?: string | null;
    category: string;
    subcategory?: string | null;
    tags?: unknown;
    jurisdiction?: string | null;
    documentTypes?: unknown;
    usageCount: number;
    lastUsedAt?: string | null;
    variations?: unknown;
    author?: string | null;
    isPublished: boolean;
    isFavorite: boolean;
    notes?: string | null;
    placeholders?: unknown;
    createdAt: string;
    updatedAt: string;
    [key: string]: unknown;
}

export interface UserClauseFavoriteRow {
    id: string;
    userId: string;
    clauseId: string;
    notes?: string | null;
    createdAt: string;
    [key: string]: unknown;
}

export interface CitationRow {
    id: string;
    title: string;
    citation: string;
    type: string;
    court?: string | null;
    year?: number | null;
    volume?: string | null;
    reporter?: string | null;
    page?: string | null;
    pinpoint?: string | null;
    jurisdiction?: string | null;
    codeTitle?: string | null;
    section?: string | null;
    subdivision?: string | null;
    shortForm?: string | null;
    parenthetical?: string | null;
    url?: string | null;
    category?: string | null;
    tags?: unknown;
    usageCount: number;
    lastUsedAt?: string | null;
    notes?: string | null;
    isVerified: boolean;
    createdBy?: string | null;
    createdAt: string;
    updatedAt: string;
    [key: string]: unknown;
}

export interface UserCitationFavoriteRow {
    id: string;
    userId: string;
    citationId: string;
    notes?: string | null;
    createdAt: string;
    [key: string]: unknown;
}

export interface AuditLogRow {
    id: string;
    timestamp: string;
    userId: string;
    userEmail?: string | null;
    eventType: string;
    action: string;
    resourceType?: string | null;
    resourceId?: string | null;
    metadata?: unknown;
    ipAddress?: string | null;
    userAgent?: string | null;
    sessionId?: string | null;
    previousHash?: string | null;
    hash?: string | null;
    [key: string]: unknown;
}

export interface TemplateRow {
    id: string;
    category: string;
    name?: string | null;
    skeletonContent?: string | null;
    defaultMetadata?: unknown;
    placeholders?: unknown;
    sections?: unknown;
    variables?: unknown;
    version: number;
    isPublished: boolean;
    publishedAt?: string | null;
    parentTemplateId?: string | null;
    createdAt: string;
    updatedAt: string;
    [key: string]: unknown;
}

export interface DocumentCollaboratorRow {
    id: string;
    documentId: string;
    documentOwnerId: string;
    collaboratorUserId?: string | null;
    collaboratorEmail: string;
    role: string;
    invitedBy: string;
    invitedByName?: string | null;
    invitedAt: string;
    status: string;
    acceptedAt?: string | null;
    inviteToken?: string | null;
    inviteExpiresAt?: string | null;
    [key: string]: unknown;
}

export interface ShareLinkRow {
    id: string;
    documentId: string;
    documentOwnerId: string;
    token: string;
    passcode: string;
    accessLevel: string;
    expiresAt: string;
    accessCount: number;
    lastAccessedAt?: string | null;
    lastAccessedBy?: string | null;
    isActive: boolean;
    revokedAt?: string | null;
    revokedBy?: string | null;
    createdAt: string;
    [key: string]: unknown;
}

// Ephemeral, in-memory only (never sent over the wire) — see
// makeInMemoryModel below. cursorPosition/selectionRange are stored as
// whatever presenceService passes (sometimes a raw object, sometimes an
// already-JSON.stringify'd string), so they stay `unknown` here; callers
// already read them through parseJsonField(value: unknown).
export interface DocumentPresenceRow {
    id: string;
    documentId: string;
    documentOwnerId: string;
    userId: string;
    userEmail?: string | null;
    userName?: string | null;
    userColor?: string | null;
    status: string;
    lastHeartbeat: string;
    cursorPosition?: unknown;
    selectionRange?: unknown;
    sessionId?: string | null;
    joinedAt: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface DocumentSyncStateRow {
    documentId: string;
    version: number;
    lastModifiedBy?: string | null;
    lastModifiedAt: string;
    contentHash?: string | null;
    lockedBy?: string | null;
    lockExpiresAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

// ============================================
// Helpers
// ============================================

function apiError(err: unknown): { message: string }[] {
    return [{ message: err instanceof Error ? err.message : 'Request failed' }];
}

function qs(params: Record<string, unknown>): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
    if (!entries.length) return '';
    return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

function extractEq(filter: Record<string, unknown> | undefined, field: string): unknown {
    const cond = filter?.[field];
    if (cond && typeof cond === 'object' && 'eq' in cond) {
        return (cond as { eq?: unknown }).eq;
    }
    return undefined;
}

function applyEqFilters<T extends Row>(rows: T[], filter: Record<string, unknown> | undefined, fields: string[]): T[] {
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

function crudModel<T extends { id: string }>(basePath: string) {
    return {
        async get(key: { id: string }): Promise<ApiResult<T>> {
            try {
                return { data: await authenticatedRequest<T>(`${basePath}/${key.id}`), errors: null };
            } catch (err) {
                return { data: null, errors: apiError(err) };
            }
        },
        async create(fields: Partial<T>): Promise<ApiResult<T>> {
            try {
                const data = await authenticatedRequest<T>(basePath, { method: 'POST', body: JSON.stringify(fields) });
                return { data, errors: null };
            } catch (err) {
                return { data: null, errors: apiError(err) };
            }
        },
        async update(fields: Partial<T> & { id: string }): Promise<ApiResult<T>> {
            const { id, ...rest } = fields;
            try {
                const data = await authenticatedRequest<T>(`${basePath}/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(rest),
                });
                return { data, errors: null };
            } catch (err) {
                return { data: null, errors: apiError(err) };
            }
        },
        async delete(key: { id: string }): Promise<ApiResult<{ id: string }>> {
            try {
                await authenticatedRequest<void>(`${basePath}/${key.id}`, { method: 'DELETE' });
                return { data: { id: key.id }, errors: null };
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

function makeInMemoryModel<T extends Row>(idField = 'id') {
    const table = new Map<string, T>();

    function list(_params: ListParams = {}): Promise<ApiListResult<T>> {
        return Promise.resolve({ data: Array.from(table.values()), errors: null, nextToken: undefined });
    }

    function get(key: Row): Promise<ApiResult<T>> {
        const id = String(key[idField]);
        return Promise.resolve({ data: table.get(id) ?? null, errors: null });
    }

    function create(fields: Partial<T> & Row): Promise<ApiResult<T>> {
        const now = new Date().toISOString();
        const id = (fields[idField] as string | undefined) ?? uuidv4();
        const row = {
            ...fields,
            [idField]: id,
            createdAt: (fields.createdAt as string | undefined) ?? now,
            updatedAt: now,
        } as unknown as T;
        table.set(String(id), row);
        return Promise.resolve({ data: row, errors: null });
    }

    function update(fields: Partial<T> & Row): Promise<ApiResult<T>> {
        const id = String(fields[idField]);
        const existing = table.get(id) ?? ({} as T);
        const merged = { ...existing, ...fields, updatedAt: new Date().toISOString() } as unknown as T;
        table.set(id, merged);
        return Promise.resolve({ data: merged, errors: null });
    }

    function del(key: Row): Promise<ApiResult<{ id: string }>> {
        const id = String(key[idField]);
        table.delete(id);
        return Promise.resolve({ data: { id }, errors: null });
    }

    function subscription(_params: ListParams = {}) {
        return {
            subscribe(_handlers: { next: (data: T) => void; error?: (err: unknown) => void }) {
                return { unsubscribe() {} };
            },
        };
    }

    return { list, get, create, update, delete: del, onCreate: subscription, onUpdate: subscription, onDelete: subscription };
}

// ============================================
// Draft
// ============================================

const Draft = {
    ...crudModel<DraftRow>('/drafts'),
    async list(_params: ListParams = {}): Promise<ApiListResult<DraftRow>> {
        try {
            return { data: await authenticatedRequest<DraftRow[]>('/drafts'), errors: null, nextToken: undefined };
        } catch (err) {
            return { data: [], errors: apiError(err), nextToken: undefined };
        }
    },
};

// ============================================
// Clause + UserClauseFavorite
// ============================================

const Clause = {
    ...crudModel<ClauseRow>('/clauses'),
    async list(params: ListParams = {}): Promise<ApiListResult<ClauseRow>> {
        const category = extractEq(params.filter, 'category') as string | undefined;
        const jurisdiction = extractEq(params.filter, 'jurisdiction') as string | undefined;
        try {
            const data = await authenticatedRequest<ClauseRow[]>(`/clauses${qs({ category, jurisdiction })}`);
            return { data, errors: null, nextToken: undefined };
        } catch (err) {
            return { data: [], errors: apiError(err), nextToken: undefined };
        }
    },
};

function favoriteModel<T extends { id: string }>(basePath: string, idField: string) {
    return {
        async list(params: ListParams = {}): Promise<ApiListResult<T>> {
            const filterId = extractEq(params.filter, idField) as string | undefined;
            try {
                const all = await authenticatedRequest<T[]>(`${basePath}/mine`);
                const data = filterId ? all.filter((r) => (r as Row)[idField] === filterId) : all;
                return { data, errors: null, nextToken: undefined };
            } catch (err) {
                return { data: [], errors: apiError(err), nextToken: undefined };
            }
        },
        async create(fields: Partial<T>): Promise<ApiResult<T>> {
            try {
                const data = await authenticatedRequest<T>(basePath, { method: 'POST', body: JSON.stringify(fields) });
                return { data, errors: null };
            } catch (err) {
                return { data: null, errors: apiError(err) };
            }
        },
        async delete(key: { id: string }): Promise<ApiResult<{ id: string }>> {
            try {
                await authenticatedRequest<void>(`${basePath}/${key.id}`, { method: 'DELETE' });
                return { data: { id: key.id }, errors: null };
            } catch (err) {
                return { data: null, errors: apiError(err) };
            }
        },
    };
}

const UserClauseFavorite = favoriteModel<UserClauseFavoriteRow>('/clauses/favorites', 'clauseId');

// ============================================
// Citation + UserCitationFavorite
// ============================================

async function citationByIndex(
    field: 'type' | 'jurisdiction' | 'category',
    key: Row
): Promise<ApiListResult<CitationRow>> {
    try {
        const data = await authenticatedRequest<CitationRow[]>(`/citations${qs({ [field]: key[field] })}`);
        return { data, errors: null, nextToken: undefined };
    } catch (err) {
        return { data: [], errors: apiError(err), nextToken: undefined };
    }
}

const Citation = {
    ...crudModel<CitationRow>('/citations'),
    async list(_params: ListParams = {}): Promise<ApiListResult<CitationRow>> {
        try {
            return { data: await authenticatedRequest<CitationRow[]>('/citations'), errors: null, nextToken: undefined };
        } catch (err) {
            return { data: [], errors: apiError(err), nextToken: undefined };
        }
    },
    listCitationByTypeAndTitle: (key: Row, _opts?: IndexParams) => citationByIndex('type', key),
    listCitationByJurisdictionAndType: (key: Row, _opts?: IndexParams) => citationByIndex('jurisdiction', key),
    listCitationByCategoryAndTitle: (key: Row, _opts?: IndexParams) => citationByIndex('category', key),
};

const UserCitationFavorite = favoriteModel<UserCitationFavoriteRow>('/citations/favorites', 'citationId');

// ============================================
// AuditLog
// ============================================

async function auditList(path: string, opts: IndexParams = {}): Promise<ApiListResult<AuditLogRow>> {
    try {
        const data = await authenticatedRequest<AuditLogRow[]>(`${path}${qs({ limit: opts.limit })}`);
        return { data, errors: null, nextToken: undefined };
    } catch (err) {
        return { data: [], errors: apiError(err), nextToken: undefined };
    }
}

const AuditLog = {
    list: (params: ListParams = {}) => auditList('/audit', params),
    async create(fields: Partial<AuditLogRow>): Promise<ApiResult<AuditLogRow>> {
        try {
            const data = await authenticatedRequest<AuditLogRow>('/audit', { method: 'POST', body: JSON.stringify(fields) });
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
    ...crudModel<TemplateRow>('/templates'),
    async list(params: ListParams = {}): Promise<ApiListResult<TemplateRow>> {
        const category = extractEq(params.filter, 'category') as string | undefined;
        try {
            const data = await authenticatedRequest<TemplateRow[]>(`/templates${qs({ category })}`);
            return { data, errors: null, nextToken: undefined };
        } catch (err) {
            return { data: [], errors: apiError(err), nextToken: undefined };
        }
    },
};

// ============================================
// DocumentCollaborator
// ============================================

async function listCollaborators(params: ListParams = {}): Promise<ApiListResult<DocumentCollaboratorRow>> {
    const filter = params.filter;
    try {
        const inviteToken = extractEq(filter, 'inviteToken') as string | undefined;
        if (inviteToken) {
            try {
                const item = await authenticatedRequest<DocumentCollaboratorRow>(`/collaborators/token/${inviteToken}`);
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
            const all = await authenticatedRequest<DocumentCollaboratorRow[]>(`/collaborators/document/${documentId}`);
            const data = applyEqFilters(all, filter, ['collaboratorEmail', 'collaboratorUserId', 'status']);
            return { data, errors: null, nextToken: undefined };
        }

        const mine = await authenticatedRequest<DocumentCollaboratorRow[]>('/collaborators/mine');
        const data = applyEqFilters(mine, filter, ['status']);
        return { data, errors: null, nextToken: undefined };
    } catch (err) {
        return { data: [], errors: apiError(err), nextToken: undefined };
    }
}

async function createCollaborator(fields: Row): Promise<ApiResult<DocumentCollaboratorRow>> {
    try {
        const data = await authenticatedRequest<DocumentCollaboratorRow>('/collaborators', {
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

async function updateCollaborator(fields: Row): Promise<ApiResult<DocumentCollaboratorRow>> {
    try {
        if (fields.status === 'accepted') {
            // Authorization is the invite token, not the database id — see
            // POST /collaborators/accept/:token. collaborationService.ts
            // passes the original inviteToken through for this reason.
            const token = fields.inviteToken as string | undefined;
            if (!token) return { data: null, errors: apiError(new Error('Missing invite token')) };
            const data = await authenticatedRequest<DocumentCollaboratorRow>(`/collaborators/accept/${token}`, {
                method: 'POST',
            });
            return { data, errors: null };
        }
        if (fields.status === 'revoked') {
            await authenticatedRequest<void>(`/collaborators/${fields.id}`, { method: 'DELETE' });
            return { data: fields as unknown as DocumentCollaboratorRow, errors: null };
        }
        const data = await authenticatedRequest<DocumentCollaboratorRow>(`/collaborators/${fields.id}`, {
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

async function listShareLinks(params: ListParams = {}): Promise<ApiListResult<ShareLinkRow>> {
    const filter = params.filter;
    try {
        const token = extractEq(filter, 'token') as string | undefined;
        if (token) {
            try {
                const item = await authenticatedRequest<ShareLinkRow>(`/share-links/token/${token}`);
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
            const data = await authenticatedRequest<ShareLinkRow[]>(`/share-links/document/${documentId}`);
            return { data, errors: null, nextToken: undefined };
        }

        return { data: [], errors: null, nextToken: undefined };
    } catch (err) {
        return { data: [], errors: apiError(err), nextToken: undefined };
    }
}

async function createShareLink(fields: Row): Promise<ApiResult<ShareLinkRow>> {
    // The server generates its own cryptographically strong token/passcode;
    // any token/passcode/accessCount the caller passed is ignored.
    let expiryHours: number | undefined;
    if (typeof fields.expiresAt === 'string') {
        const ms = new Date(fields.expiresAt).getTime() - Date.now();
        expiryHours = Math.max(1, Math.round(ms / (60 * 60 * 1000)));
    }
    try {
        const data = await authenticatedRequest<ShareLinkRow>('/share-links', {
            method: 'POST',
            body: JSON.stringify({ documentId: fields.documentId, accessLevel: fields.accessLevel, expiryHours }),
        });
        return { data, errors: null };
    } catch (err) {
        return { data: null, errors: apiError(err) };
    }
}

async function updateShareLink(fields: Row): Promise<ApiResult<ShareLinkRow>> {
    try {
        if (fields.isActive === false) {
            await authenticatedRequest<void>(`/share-links/${fields.id}`, { method: 'DELETE' });
            return { data: fields as unknown as ShareLinkRow, errors: null };
        }
        // Any other update is treated as "record an access" (verifyShareLink
        // bumping accessCount/lastAccessedAt) — the server computes both.
        const data = await authenticatedRequest<ShareLinkRow>(`/share-links/${fields.id}/access`, { method: 'POST' });
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
            DocumentPresence: makeInMemoryModel<DocumentPresenceRow>(),
            DocumentSyncState: makeInMemoryModel<DocumentSyncStateRow>('documentId'),
            DocumentCollaborator,
            ShareLink,
            Template,
        },
        queries: {
            generateArguments: async (
                args: { mode: string; [key: string]: unknown }
            ): Promise<{ data: Awaited<ReturnType<typeof generateArgumentsResult>>; errors: MaybeErrors }> => {
                const data = await generateArgumentsResult(args);
                return { data, errors: null };
            },
            askAI: async (
                args: { text?: string; context?: unknown }
            ): Promise<{ data: Awaited<ReturnType<typeof getSuggestionsResult>>; errors: MaybeErrors }> => {
                const data = await getSuggestionsResult(args);
                return { data, errors: null };
            },
        },
    };
}
