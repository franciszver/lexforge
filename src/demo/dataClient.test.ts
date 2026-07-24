import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const REAL_CLIENT_MARKER = { __real: true };
const generateClientMock = vi.fn(() => REAL_CLIENT_MARKER);

vi.mock('aws-amplify/data', () => ({
    generateClient: () => generateClientMock(),
}));

describe('dataClient', () => {
    beforeEach(() => {
        vi.resetModules();
        generateClientMock.mockClear();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('flag OFF', () => {
        beforeEach(() => {
            vi.stubEnv('VITE_DEMO_MODE', '');
        });

        it('selects the real Amplify data client', async () => {
            const { getDataClient } = await import('./dataClient');
            const client = getDataClient();
            expect(client).toBe(REAL_CLIENT_MARKER);
            expect(generateClientMock).toHaveBeenCalled();
        });
    });

    describe('demo mode ON', () => {
        beforeEach(() => {
            vi.stubEnv('VITE_DEMO_MODE', '1');
        });

        it('never calls the real Amplify client factory', async () => {
            const { getDataClient } = await import('./dataClient');
            getDataClient();
            expect(generateClientMock).not.toHaveBeenCalled();
        });

        it('loads a non-empty clause library fixture', async () => {
            const { getDataClient } = await import('./dataClient');
            const client = getDataClient();
            const result = await client.models.Clause.list();
            expect(result.data.length).toBeGreaterThanOrEqual(8);
        });

        it('loads the bundled sample document', async () => {
            const { getDataClient } = await import('./dataClient');
            const { DEMO_DOCUMENT_ID } = await import('./fixtures');
            const client = getDataClient();
            const result = await client.models.Draft.get({ id: DEMO_DOCUMENT_ID });
            expect(result.data).toBeTruthy();
            expect(result.data?.content).toBeTruthy();
        });

        it('mutates data in-memory: create then read back', async () => {
            const { getDataClient } = await import('./dataClient');
            const client = getDataClient();
            const created = await client.models.Citation.create({
                title: 'Test v. Case',
                citation: '1 F.3d 1 (2020)',
                type: 'case',
                tags: JSON.stringify(['test']),
                usageCount: 0,
            });
            expect(created.data?.id).toBeTruthy();

            const fetched = await client.models.Citation.get({ id: created.data!.id });
            expect(fetched.data?.title).toBe('Test v. Case');
        });

        it('mutates data in-memory: update is reflected on subsequent get', async () => {
            const { getDataClient } = await import('./dataClient');
            const client = getDataClient();
            const list = await client.models.Clause.list();
            const first = list.data[0];

            await client.models.Clause.update({ id: first.id, usageCount: 999 });
            const fetched = await client.models.Clause.get({ id: first.id });
            expect(fetched.data?.usageCount).toBe(999);
        });

        it('returns a clearly-labeled canned response for AI argument generation', async () => {
            const { getDataClient } = await import('./dataClient');
            const client = getDataClient();
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
            expect(JSON.stringify(result.outline)).toMatch(/demo/i);
        });
    });
});
