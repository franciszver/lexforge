import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Contract tests for the demo AI proxy client.
 *
 * When VITE_DEMO_PROXY_URL is set, demo-mode AI calls (askAI,
 * generateArguments) should hit `POST {proxyUrl}/api/generate` and map the
 * plain-text response back into the shapes argumentService.ts and
 * suggestionsSlice.ts already expect. On failure/timeout, or when the URL is
 * unset, the canned [DEMO MODE] fixtures are used instead — the demo must
 * never look broken.
 */
describe('proxyClient', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    describe('proxy URL unset', () => {
        it('getSuggestionsResult returns canned suggestions without calling fetch', async () => {
            const { getSuggestionsResult } = await import('./proxyClient');
            const result = await getSuggestionsResult({ text: 'draft text' });
            expect(fetch).not.toHaveBeenCalled();
            expect(result.suggestions.length).toBeGreaterThan(0);
            expect(result.suggestions.every((s) => s.text.includes('[DEMO MODE]') || s.title.includes('[DEMO MODE]'))).toBe(true);
        });

        it('generateArgumentsResult returns canned outline without calling fetch', async () => {
            const { generateArgumentsResult } = await import('./proxyClient');
            const result = await generateArgumentsResult({ mode: 'generate' });
            expect(fetch).not.toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(JSON.stringify(result.outline)).toMatch(/demo/i);
        });
    });

    describe('proxy URL set', () => {
        beforeEach(() => {
            vi.stubEnv('VITE_DEMO_PROXY_URL', 'http://localhost:3001');
        });

        it('askAI (getSuggestionsResult) posts kind "suggestion" and maps live text into the suggestions shape', async () => {
            (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => ({ text: 'Live suggestion text', model: 'some-model' }),
            });

            const { getSuggestionsResult } = await import('./proxyClient');
            const result = await getSuggestionsResult({ text: 'draft text', context: { jurisdiction: 'Georgia' } });

            expect(fetch).toHaveBeenCalledTimes(1);
            const [url, options] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
            expect(url).toBe('http://localhost:3001/api/generate');
            const body = JSON.parse(options.body);
            expect(body.kind).toBe('suggestion');
            expect(typeof body.prompt).toBe('string');

            expect(result.relevantClauses).toEqual([]);
            expect(result.suggestions).toHaveLength(1);
            expect(result.suggestions[0].text).toBe('Live suggestion text');
            expect(result.suggestions[0].text.includes('[DEMO MODE]')).toBe(false);
        });

        it('generateArguments mode "generate" posts kind "argument" and maps live text into the outline shape', async () => {
            (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => ({ text: 'Live argument outline text', model: 'some-model' }),
            });

            const { generateArgumentsResult } = await import('./proxyClient');
            const result = await generateArgumentsResult({ mode: 'generate', facts: JSON.stringify(['fact']) });

            expect(fetch).toHaveBeenCalledTimes(1);
            const [url, options] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
            expect(url).toBe('http://localhost:3001/api/generate');
            const body = JSON.parse(options.body);
            expect(body.kind).toBe('argument');

            expect(result.success).toBe(true);
            expect(result.outline).toBeTruthy();
            expect(JSON.stringify(result.outline)).toContain('Live argument outline text');
            expect(JSON.stringify(result.outline)).not.toContain('[DEMO MODE]');
            expect(Array.isArray(result.outline!.arguments)).toBe(true);
        });

        it('generateArguments mode "counter" maps live text into counterArguments shape', async () => {
            (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => ({ text: 'Live counter-argument text', model: 'some-model' }),
            });

            const { generateArgumentsResult } = await import('./proxyClient');
            const result = await generateArgumentsResult({ mode: 'counter', existingArgument: 'plaintiff was negligent' });

            expect(result.success).toBe(true);
            expect(result.counterArguments).toHaveLength(1);
            expect(result.counterArguments![0].text).toBe('Live counter-argument text');
        });

        it('generateArguments mode "analyze" maps live text into analysis shape', async () => {
            (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => ({ text: 'Live coherence analysis text', model: 'some-model' }),
            });

            const { generateArgumentsResult } = await import('./proxyClient');
            const result = await generateArgumentsResult({ mode: 'analyze', existingOutline: '{}' });

            expect(result.success).toBe(true);
            expect(result.analysis).toBeTruthy();
            expect(result.analysis!.suggestions).toContain('Live coherence analysis text');
        });

        it('URL with a trailing slash does not produce a double slash', async () => {
            vi.stubEnv('VITE_DEMO_PROXY_URL', 'http://localhost:3001/');
            (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: async () => ({ text: 'text', model: 'm' }),
            });

            const { getSuggestionsResult } = await import('./proxyClient');
            await getSuggestionsResult({ text: 'x' });

            const [url] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
            expect(url).toBe('http://localhost:3001/api/generate');
        });

        it('falls back to the canned response on a non-2xx proxy reply', async () => {
            (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: false,
                status: 502,
                json: async () => ({ error: 'Upstream is not configured.' }),
            });

            const { getSuggestionsResult } = await import('./proxyClient');
            const result = await getSuggestionsResult({ text: 'draft text' });

            expect(result.suggestions.length).toBeGreaterThan(0);
            expect(result.suggestions.every((s) => s.text.includes('[DEMO MODE]') || s.title.includes('[DEMO MODE]'))).toBe(true);
        });

        it('falls back to the canned response on a network error', async () => {
            (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network down'));

            const { generateArgumentsResult } = await import('./proxyClient');
            const result = await generateArgumentsResult({ mode: 'generate' });

            expect(result.success).toBe(true);
            expect(JSON.stringify(result.outline)).toMatch(/demo/i);
        });

        it('falls back to the canned response when the request times out after 65s', async () => {
            vi.useFakeTimers();
            (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
                (_url: string, options: { signal: AbortSignal }) =>
                    new Promise((_resolve, reject) => {
                        options.signal.addEventListener('abort', () => {
                            const err = new Error('The operation was aborted');
                            err.name = 'AbortError';
                            reject(err);
                        });
                    })
            );

            const { generateArgumentsResult } = await import('./proxyClient');
            const resultPromise = generateArgumentsResult({ mode: 'generate' });

            await vi.advanceTimersByTimeAsync(65_000);
            const result = await resultPromise;

            expect(result.success).toBe(true);
            expect(JSON.stringify(result.outline)).toMatch(/demo/i);
        });

        it('emits a "warming" status once a request exceeds 2.5s, and "done" on success', async () => {
            vi.useFakeTimers();
            let resolveFetch: (value: unknown) => void = () => {};
            (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
                () =>
                    new Promise((resolve) => {
                        resolveFetch = resolve;
                    })
            );

            const { getSuggestionsResult, onProxyStatus } = await import('./proxyClient');
            const statuses: string[] = [];
            const unsubscribe = onProxyStatus((status) => statuses.push(status));

            const resultPromise = getSuggestionsResult({ text: 'draft' });

            // Not warming yet before the threshold.
            await vi.advanceTimersByTimeAsync(2000);
            expect(statuses).not.toContain('warming');

            // Warming once past the threshold.
            await vi.advanceTimersByTimeAsync(600);
            expect(statuses).toContain('warming');

            resolveFetch({ ok: true, json: async () => ({ text: 'slow but live text', model: 'm' }) });
            await resultPromise;

            expect(statuses).toContain('done');
            unsubscribe();
        });

        it('emits an "error" status when the proxy call fails after warming', async () => {
            vi.useFakeTimers();
            let rejectFetch: (err: unknown) => void = () => {};
            (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
                () =>
                    new Promise((_resolve, reject) => {
                        rejectFetch = reject;
                    })
            );

            const { getSuggestionsResult, onProxyStatus } = await import('./proxyClient');
            const statuses: string[] = [];
            onProxyStatus((status) => statuses.push(status));

            const resultPromise = getSuggestionsResult({ text: 'draft' });
            await vi.advanceTimersByTimeAsync(3000);
            expect(statuses).toContain('warming');

            rejectFetch(new Error('boom'));
            await resultPromise;

            expect(statuses).toContain('error');
        });
    });
});
