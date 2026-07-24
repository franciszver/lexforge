import { describe, it, expect, vi, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

/**
 * Regression test for "Generate Suggestions does nothing" in demo mode.
 *
 * Repro: Suggestions panel -> "Generate Suggestions" -> console:
 *   TypeError: getClient$5(...).queries.askAI is not a function (2 args)
 *
 * Root cause: suggestionsSlice.ts built its own Amplify client via
 * `generateClient<Schema>()` directly instead of going through the demo
 * data-client seam, so it never picked up the demo mock at all — it hit
 * a real (non-functional, in the demo build) Amplify client.
 */
describe('generateSuggestions thunk in demo mode', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('resolves with clearly-labeled demo suggestions via the askAI query', async () => {
        vi.stubEnv('VITE_DEMO_MODE', '1');
        vi.resetModules();

        vi.doMock('../utils/audit', () => ({
            auditAI: { suggestionsGenerated: vi.fn() },
        }));

        const suggestionsReducer = (await import('./suggestionsSlice')).default;
        const { generateSuggestions } = await import('./suggestionsSlice');

        const store = configureStore({ reducer: { suggestions: suggestionsReducer } });

        const action = await store.dispatch(
            generateSuggestions({
                documentId: 'demo-doc-1',
                content: '<p>Some draft content</p>',
                context: { jurisdiction: 'Georgia', docType: 'Demand Letter' },
            })
        );

        expect(action.type).toBe('suggestions/generate/fulfilled');
        const state = store.getState().suggestions;
        expect(state.suggestions.length).toBeGreaterThan(0);
        expect(state.suggestions.every(s => s.text.includes('[DEMO MODE]') || s.title.includes('[DEMO MODE]'))).toBe(true);
    });
});
