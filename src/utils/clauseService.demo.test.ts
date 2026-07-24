import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Regression test for an empty Clause Library list in demo mode.
 *
 * Repro: open the fixture document (docType "Demand Letter") -> click
 * "Clauses". Category counts show correctly (getCategories doesn't filter
 * by documentType), but the "All Clauses" tab and every per-category list
 * come back empty. ClauseBrowser.tsx calls searchClauses with
 * `documentType: currentDocument?.docType`, and searchClauses (clauseService.ts)
 * client-side-filters out any clause whose `documentTypes` array doesn't
 * include that value. None of the fixture clauses' `documentTypes` included
 * "Demand Letter" (the demo document's actual docType), so every clause was
 * filtered out — for every category and for "All".
 */
describe('clauseService in demo mode — Clause Library list path', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('returns clauses for the demo document\'s docType with no category filter (the "All Clauses" tab)', async () => {
        vi.stubEnv('VITE_DEMO_MODE', '1');
        vi.resetModules();
        const { searchClauses } = await import('./clauseService');
        const { DEMO_DOCUMENT } = await import('../demo/fixtures');
        const metadata = JSON.parse(DEMO_DOCUMENT.metadata) as { docType: string };

        const results = await searchClauses({ documentType: metadata.docType });

        expect(results.length).toBeGreaterThan(0);
    });

    it('returns clauses for a specific category filtered by the demo document\'s docType', async () => {
        vi.stubEnv('VITE_DEMO_MODE', '1');
        vi.resetModules();
        const { searchClauses } = await import('./clauseService');
        const { DEMO_DOCUMENT } = await import('../demo/fixtures');
        const metadata = JSON.parse(DEMO_DOCUMENT.metadata) as { docType: string };

        const results = await searchClauses({ category: 'Confidentiality', documentType: metadata.docType });

        expect(results.length).toBeGreaterThan(0);
        expect(results.every(c => c.category === 'Confidentiality')).toBe(true);
    });
});
