import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Contract + behavior tests for apiDataClient, the non-demo counterpart to
 * the in-memory mock in src/demo/dataClient.ts. Method-surface inventory
 * mirrors src/demo/dataClient.contract.test.ts's MODEL_METHODS/QUERY_METHODS
 * (what the app's services actually call).
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

function jsonResponse(status: number, body: unknown) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    };
}

describe('apiDataClient', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
        localStorage.clear();
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    const fetchMock = () => fetch as unknown as ReturnType<typeof vi.fn>;

    async function loggedInClient() {
        fetchMock().mockResolvedValueOnce(
            jsonResponse(200, {
                user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'user' },
                accessToken: 'access-1',
                refreshToken: 'refresh-1',
            })
        );
        const { login } = await import('./authClient');
        await login('a@b.com', 'password123');
        const { createApiDataClient } = await import('./apiDataClient');
        return createApiDataClient();
    }

    describe('method surface', () => {
        it('exposes every models.<Model>.<method> the app calls', async () => {
            const { createApiDataClient } = await import('./apiDataClient');
            const client = createApiDataClient() as unknown as {
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
            const { createApiDataClient } = await import('./apiDataClient');
            const client = createApiDataClient() as unknown as { queries: Record<string, unknown> };

            for (const method of QUERY_METHODS) {
                const fn = client.queries[method];
                expect(typeof fn, `queries.${method} should be callable`).toBe('function');
            }
        });
    });

    describe('Draft.create', () => {
        it('POSTs to /drafts with the access token as a Bearer header', async () => {
            const client = await loggedInClient();
            fetchMock().mockResolvedValueOnce(jsonResponse(201, { id: 'd1', title: 'My Draft' }));

            const result = await client.models.Draft.create({ title: 'My Draft' });

            expect(result.errors).toBeNull();
            expect(result.data).toEqual({ id: 'd1', title: 'My Draft' });

            const [url, options] = fetchMock().mock.calls.at(-1) as [string, RequestInit];
            expect(url).toBe('http://localhost:3001/drafts');
            expect(options.method).toBe('POST');
            expect((options.headers as Record<string, string>).Authorization).toBe('Bearer access-1');
            expect(JSON.parse(options.body as string)).toEqual({ title: 'My Draft' });
        });
    });

    describe('401 handling', () => {
        it('refreshes the access token once and retries on a 401', async () => {
            const client = await loggedInClient();
            fetchMock()
                .mockResolvedValueOnce(jsonResponse(401, { error: 'Unauthorized' })) // Draft.list -> 401
                .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'access-2', refreshToken: 'refresh-2' })) // refresh
                .mockResolvedValueOnce(jsonResponse(200, [{ id: 'd1' }])); // retried Draft.list

            const result = await client.models.Draft.list();

            expect(result.errors).toBeNull();
            expect(result.data).toEqual([{ id: 'd1' }]);
            expect(fetchMock()).toHaveBeenCalledTimes(4); // login + list(401) + refresh + list(retry)

            const [, retryOptions] = fetchMock().mock.calls.at(-1) as [string, RequestInit];
            expect((retryOptions.headers as Record<string, string>).Authorization).toBe('Bearer access-2');
        });

        it('returns a data:null/errors result (not a throw) when refresh also fails', async () => {
            const client = await loggedInClient();
            fetchMock()
                .mockResolvedValueOnce(jsonResponse(401, { error: 'Unauthorized' })) // Draft.list -> 401
                .mockResolvedValueOnce(jsonResponse(401, { error: 'Invalid refresh token' })); // refresh fails

            const result = await client.models.Draft.list();

            expect(result.data).toEqual([]);
            expect(result.errors).toEqual([{ message: 'Not authenticated' }]);
        });
    });

    describe('queries', () => {
        it('generateArguments proxies through to the demo proxy client behavior', async () => {
            const { createApiDataClient } = await import('./apiDataClient');
            const client = createApiDataClient();

            const { data } = await client.queries.generateArguments({
                mode: 'generate',
                facts: JSON.stringify(['fact']),
                legalPrinciples: JSON.stringify(['principle']),
                jurisdiction: 'California',
                documentType: 'Demand Letter',
                desiredOutcome: 'Settlement',
                clientPosition: 'plaintiff',
            });

            const result = data as { success: boolean; outline?: unknown };
            expect(result.success).toBe(true);
        });
    });
});
