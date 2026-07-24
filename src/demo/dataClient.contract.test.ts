import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Contract test: the demo data client must expose every member the app
 * actually calls on the real Amplify Data client.
 *
 * Inventory derived by grepping src/ for every access pattern:
 *   \.queries\.\w+   \.mutations\.\w+   \.models\.\w+\.\w+
 *
 * Excluded, with justification (see PR notes / final report):
 *  - Schema models never referenced anywhere in src/: UserProfile,
 *    AnalyticsEvent, Comment, DocumentVersion, YjsDocumentState. No UI path
 *    reaches them for any user, demo or real.
 *  - TemplateVersion + Template's `listTemplateVersionByTemplateIdAndVersion`
 *    GSI: only referenced from src/utils/templateVersioning.ts, which has
 *    zero callers anywhere in the app (verified: none of its exported
 *    functions are imported by any other file). Template's plain CRUD
 *    (list/create/update/delete) IS covered below because Admin.tsx calls
 *    it directly and the admin route is reachable by the demo user.
 */
const MODEL_METHODS: Record<string, string[]> = {
    Clause: ['list', 'get', 'create', 'update', 'delete'],
    UserClauseFavorite: ['list', 'create', 'delete'],
    Citation: [
        'list', 'get', 'create', 'update', 'delete',
        'listCitationByTypeAndTitle', 'listCitationByJurisdictionAndType', 'listCitationByCategoryAndTitle',
    ],
    UserCitationFavorite: ['list', 'create', 'delete'],
    Draft: ['list', 'get', 'create', 'update', 'delete'],
    AuditLog: [
        'list', 'create',
        'listAuditLogByUserIdAndTimestamp', 'listAuditLogByEventTypeAndTimestamp', 'listAuditLogByResourceIdAndTimestamp',
    ],
    DocumentPresence: ['list', 'create', 'update', 'delete', 'onCreate', 'onUpdate', 'onDelete'],
    DocumentSyncState: ['get', 'create', 'update'],
    DocumentCollaborator: ['list', 'create', 'update'],
    ShareLink: ['list', 'create', 'update'],
    Template: ['list', 'create', 'update', 'delete'],
};

const QUERY_METHODS = ['generateArguments', 'askAI'];

describe('demo data client contract', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_DEMO_MODE', '1');
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('exposes every models.<Model>.<method> the app calls', async () => {
        const { getDataClient } = await import('./dataClient');
        const client = getDataClient() as unknown as {
            models: Record<string, Record<string, unknown>>;
        };

        for (const [model, methods] of Object.entries(MODEL_METHODS)) {
            for (const method of methods) {
                const fn = client.models[model]?.[method];
                expect(typeof fn, `models.${model}.${method} should be callable`).toBe('function');
            }
        }
    });

    it('exposes every queries.<name> the app calls', async () => {
        const { getDataClient } = await import('./dataClient');
        const client = getDataClient() as unknown as {
            queries: Record<string, unknown>;
        };

        for (const method of QUERY_METHODS) {
            const fn = client.queries[method];
            expect(typeof fn, `queries.${method} should be callable`).toBe('function');
        }
    });
});
