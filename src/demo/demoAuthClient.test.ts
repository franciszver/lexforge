import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const realSignIn = vi.fn();
const realSignOut = vi.fn();
const realGetCurrentUser = vi.fn();
const realFetchAuthSession = vi.fn();

vi.mock('aws-amplify/auth', () => ({
    signIn: (...args: unknown[]) => realSignIn(...args),
    signUp: vi.fn(),
    confirmSignUp: vi.fn(),
    resendSignUpCode: vi.fn(),
    resetPassword: vi.fn(),
    confirmResetPassword: vi.fn(),
    signOut: (...args: unknown[]) => realSignOut(...args),
    getCurrentUser: (...args: unknown[]) => realGetCurrentUser(...args),
    fetchAuthSession: (...args: unknown[]) => realFetchAuthSession(...args),
}));

describe('demoAuthClient', () => {
    beforeEach(() => {
        vi.resetModules();
        realSignIn.mockReset();
        realSignOut.mockReset();
        realGetCurrentUser.mockReset();
        realFetchAuthSession.mockReset();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('demo mode ON', () => {
        beforeEach(() => {
            vi.stubEnv('VITE_DEMO_MODE', '1');
        });

        it('accepts any credentials and yields the demo user', async () => {
            const auth = await import('./demoAuthClient');
            const result = await auth.signIn({ username: 'anyone@example.com', password: 'wrong-password' });
            expect(result.isSignedIn).toBe(true);

            const user = await auth.getCurrentUser();
            expect(user.signInDetails?.loginId).toBe('demo@lexforge.app');
            expect(realSignIn).not.toHaveBeenCalled();
        });

        it('rejects getCurrentUser before sign-in', async () => {
            const auth = await import('./demoAuthClient');
            await expect(auth.getCurrentUser()).rejects.toThrow();
        });

        it('sign-out clears the demo session so getCurrentUser rejects again', async () => {
            const auth = await import('./demoAuthClient');
            await auth.signIn({ username: 'demo@lexforge.app', password: 'anything' });
            await expect(auth.getCurrentUser()).resolves.toBeTruthy();

            await auth.signOut();
            await expect(auth.getCurrentUser()).rejects.toThrow();
            expect(realSignOut).not.toHaveBeenCalled();
        });

        it('makes no real AWS auth calls', async () => {
            const auth = await import('./demoAuthClient');
            await auth.signIn({ username: 'demo@lexforge.app', password: 'x' });
            await auth.fetchAuthSession();
            await auth.signOut();
            expect(realSignIn).not.toHaveBeenCalled();
            expect(realFetchAuthSession).not.toHaveBeenCalled();
            expect(realSignOut).not.toHaveBeenCalled();
        });
    });

    describe('demo mode OFF', () => {
        beforeEach(() => {
            vi.stubEnv('VITE_DEMO_MODE', '');
        });

        it('delegates signIn to the real Amplify auth module', async () => {
            realSignIn.mockResolvedValue({ isSignedIn: true });
            const auth = await import('./demoAuthClient');
            await auth.signIn({ username: 'real@example.com', password: 'secret' });
            expect(realSignIn).toHaveBeenCalledWith({ username: 'real@example.com', password: 'secret' });
        });

        it('delegates getCurrentUser to the real Amplify auth module', async () => {
            realGetCurrentUser.mockResolvedValue({ userId: 'real-1', username: 'real@example.com' });
            const auth = await import('./demoAuthClient');
            await auth.getCurrentUser();
            expect(realGetCurrentUser).toHaveBeenCalled();
        });
    });
});
