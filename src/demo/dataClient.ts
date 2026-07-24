/**
 * Demo Data Client
 *
 * `getDataClient()` is a drop-in replacement for `generateClient<Schema>()`.
 * When demo mode is off it just returns the real Amplify Data client. When
 * demo mode is on it returns an in-memory mock that implements the same
 * `.models.<Model>.list/get/create/update/delete` (+ `onCreate/onUpdate/onDelete`
 * no-op subscriptions) shape used across the app's services, seeded from
 * bundled fixtures. Mutations persist for the lifetime of the page load only.
 */
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { v4 as uuidv4 } from 'uuid';
import { isDemoMode } from './demoConfig';
import {
    DEMO_USER,
    DEMO_DOCUMENT,
    DEMO_CLAUSES,
    DEMO_CITATIONS,
    DEMO_AUDIT_LOGS,
    DEMO_ARGUMENT_OUTLINE,
    DEMO_COUNTER_ARGUMENTS,
    DEMO_COHERENCE_ANALYSIS,
} from './fixtures';

// ============================================
// Generic in-memory "table" backing each model
// ============================================

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

function matchesFilter(row: Row, filter?: ListParams['filter']): boolean {
    if (!filter) return true;
    return Object.entries(filter).every(([key, cond]) => {
        if (!cond || typeof cond !== 'object') return true;
        if ('eq' in cond) return row[key] === cond.eq;
        if ('ne' in cond) return row[key] !== cond.ne;
        return true;
    });
}

function makeModel(seed: Row[], idField = 'id') {
    const table = new Map<string, Row>();
    seed.forEach((row) => table.set(String(row[idField]), { ...row }));

    function list(params: ListParams = {}) {
        let data = Array.from(table.values()).filter((r) => matchesFilter(r, params.filter));
        if (params.limit) data = data.slice(0, params.limit);
        return Promise.resolve({ data, errors: null, nextToken: undefined });
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
            owner: DEMO_USER.email,
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

    // Real-time subscriptions are simulated as no-ops: single-user demo,
    // nothing else ever writes to this table, so there is nothing to push.
    function noopSubscription() {
        return { subscribe: () => ({ unsubscribe() {} }) };
    }

    // Backing implementation for named secondary-index list methods, e.g.
    // `listCitationByTypeAndTitle`. Filters by the given key fields (exact
    // match) and optionally sorts by `sortField`.
    function byIndex(keyFields: string[], sortField?: string) {
        return (key: Row, opts: IndexParams = {}) => {
            let data = Array.from(table.values()).filter((r) =>
                keyFields.every((f) => r[f] === key[f])
            );
            if (sortField) {
                data = [...data].sort((a, b) => {
                    const av = String(a[sortField] ?? '');
                    const bv = String(b[sortField] ?? '');
                    return av < bv ? -1 : av > bv ? 1 : 0;
                });
                if (opts.sortDirection === 'DESC') data.reverse();
            }
            if (opts.limit) data = data.slice(0, opts.limit);
            return Promise.resolve({ data, errors: null, nextToken: undefined });
        };
    }

    return { list, get, create, update, delete: del, onCreate: noopSubscription, onUpdate: noopSubscription, onDelete: noopSubscription, byIndex };
}

// ============================================
// Seeded models
// ============================================

function buildDemoClient() {
    const clause = makeModel(DEMO_CLAUSES);
    const userClauseFavorite = makeModel([]);
    const citation = makeModel(DEMO_CITATIONS);
    const userCitationFavorite = makeModel([]);
    const draft = makeModel([DEMO_DOCUMENT]);
    const auditLog = makeModel(DEMO_AUDIT_LOGS);
    const documentPresence = makeModel([]);
    const documentSyncState = makeModel([], 'documentId');
    const documentCollaborator = makeModel([]);
    const shareLink = makeModel([]);

    return {
        models: {
            Clause: clause,
            UserClauseFavorite: userClauseFavorite,
            Citation: {
                ...citation,
                listCitationByTypeAndTitle: citation.byIndex(['type'], 'title'),
                listCitationByJurisdictionAndType: citation.byIndex(['jurisdiction'], 'type'),
                listCitationByCategoryAndTitle: citation.byIndex(['category'], 'title'),
            },
            UserCitationFavorite: userCitationFavorite,
            Draft: draft,
            AuditLog: {
                ...auditLog,
                listAuditLogByUserIdAndTimestamp: auditLog.byIndex(['userId'], 'timestamp'),
                listAuditLogByEventTypeAndTimestamp: auditLog.byIndex(['eventType'], 'timestamp'),
                listAuditLogByResourceIdAndTimestamp: auditLog.byIndex(['resourceId'], 'timestamp'),
            },
            DocumentPresence: documentPresence,
            DocumentSyncState: documentSyncState,
            DocumentCollaborator: documentCollaborator,
            ShareLink: shareLink,
        },
        queries: {
            generateArguments: (args: { mode: string }) => {
                switch (args.mode) {
                    case 'generate':
                    case 'strengthen':
                        return Promise.resolve({ data: { success: true, outline: DEMO_ARGUMENT_OUTLINE }, errors: null });
                    case 'counter':
                        return Promise.resolve({ data: { success: true, counterArguments: DEMO_COUNTER_ARGUMENTS }, errors: null });
                    case 'analyze':
                        return Promise.resolve({ data: { success: true, analysis: DEMO_COHERENCE_ANALYSIS }, errors: null });
                    default:
                        return Promise.resolve({ data: { success: false, error: 'Unknown mode' }, errors: null });
                }
            },
        },
    };
}

// Demo client is a singleton so mutations persist across calls within the
// same page load (not across reloads — that's not required).
let demoClientInstance: ReturnType<typeof buildDemoClient> | null = null;
function getDemoClient() {
    if (!demoClientInstance) demoClientInstance = buildDemoClient();
    return demoClientInstance;
}

let realClient: ReturnType<typeof generateClient<Schema>> | null = null;

/**
 * Returns the Amplify Data client to use. In demo mode this is an in-memory
 * fixture-backed mock and `generateClient` (and therefore AWS) is never
 * called. Otherwise it's the real Amplify Data client.
 */
export function getDataClient(): ReturnType<typeof generateClient<Schema>> {
    if (isDemoMode) {
        return getDemoClient() as unknown as ReturnType<typeof generateClient<Schema>>;
    }
    if (!realClient) {
        realClient = generateClient<Schema>();
    }
    return realClient;
}
