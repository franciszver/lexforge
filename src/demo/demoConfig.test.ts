import { describe, it, expect, vi, afterEach } from 'vitest';

describe('demoConfig', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('is false when VITE_DEMO_MODE is unset', async () => {
        vi.stubEnv('VITE_DEMO_MODE', '');
        vi.resetModules();
        const { isDemoMode } = await import('./demoConfig');
        expect(isDemoMode).toBe(false);
    });

    it('is true when VITE_DEMO_MODE=1', async () => {
        vi.stubEnv('VITE_DEMO_MODE', '1');
        vi.resetModules();
        const { isDemoMode } = await import('./demoConfig');
        expect(isDemoMode).toBe(true);
    });

    it('is false for any other value', async () => {
        vi.stubEnv('VITE_DEMO_MODE', 'true');
        vi.resetModules();
        const { isDemoMode } = await import('./demoConfig');
        expect(isDemoMode).toBe(false);
    });
});
