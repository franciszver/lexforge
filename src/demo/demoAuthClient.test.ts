import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const authLogin = vi.fn();
const authRegister = vi.fn();
const authMe = vi.fn();
const authLogout = vi.fn();
const authGetStoredAuth = vi.fn();

vi.mock('../api/authClient', () => ({
    login: (...args: unknown[]) => authLogin(...args),
    register: (...args: unknown[]) => authRegister(...args),
    me: (...args: unknown[]) => authMe(...args),
    logout: (...args: unknown[]) => authLogout(...args),
    getStoredAuth: (...args: unknown[]) => authGetStoredAuth(...args),
}));

describe('demoAuthClient', () => {
    beforeEach(() => {
        vi.resetModules();
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
        });

        it('makes no real server auth calls', async () => {
            const auth = await import('./demoAuthClient');
            await auth.signIn({ username: 'demo@lexforge.app', password: 'x' });
            await auth.fetchAuthSession();
            await auth.signOut();
            expect(authLogin).not.toHaveBeenCalled();
            expect(authMe).not.toHaveBeenCalled();
            expect(authLogout).not.toHaveBeenCalled();
        });
    });

    describe('demo mode OFF (delegates to the server-backed authClient)', () => {
        beforeEach(() => {
            vi.stubEnv('VITE_DEMO_MODE', '');
            authLogin.mockReset();
            authRegister.mockReset();
            authMe.mockReset();
            authLogout.mockReset();
            authGetStoredAuth.mockReset();
        });

        it('signIn delegates to authClient.login and reports DONE on success', async () => {
            authLogin.mockResolvedValue({
                user: { id: 'u1', email: 'real@example.com', name: null, role: 'user' },
                accessToken: 'a',
                refreshToken: 'r',
            });
            const auth = await import('./demoAuthClient');

            const result = await auth.signIn({ username: 'real@example.com', password: 'secret' });

            expect(authLogin).toHaveBeenCalledWith('real@example.com', 'secret');
            expect(result.isSignedIn).toBe(true);
        });

        it('signIn propagates the authClient error on failure', async () => {
            authLogin.mockRejectedValue(new Error('Invalid credentials'));
            const auth = await import('./demoAuthClient');

            await expect(auth.signIn({ username: 'real@example.com', password: 'wrong' })).rejects.toThrow(
                'Invalid credentials'
            );
        });

        it('signUp delegates to authClient.register and reports auto-signed-in DONE (no email verification in v1)', async () => {
            authRegister.mockResolvedValue({
                user: { id: 'u2', email: 'new@example.com', name: null, role: 'user' },
                accessToken: 'a',
                refreshToken: 'r',
            });
            const auth = await import('./demoAuthClient');

            const result = await auth.signUp({
                username: 'new@example.com',
                password: 'secret123',
                options: { userAttributes: { email: 'new@example.com' } },
            });

            expect(authRegister).toHaveBeenCalledWith('new@example.com', 'secret123', undefined);
            expect(result.isSignUpComplete).toBe(true);
            expect(result.nextStep.signUpStep).toBe('DONE');
        });

        it('getCurrentUser delegates to authClient.me and maps the shape', async () => {
            authMe.mockResolvedValue({ id: 'u1', email: 'real@example.com', name: 'Real', role: 'user' });
            const auth = await import('./demoAuthClient');

            const user = await auth.getCurrentUser();

            expect(authMe).toHaveBeenCalled();
            expect(user.userId).toBe('u1');
            expect(user.signInDetails?.loginId).toBe('real@example.com');
        });

        it('getCurrentUser propagates rejection when not authenticated', async () => {
            authMe.mockRejectedValue(new Error('Not authenticated'));
            const auth = await import('./demoAuthClient');

            await expect(auth.getCurrentUser()).rejects.toThrow();
        });

        it("fetchAuthSession resolves groups from the stored user's role", async () => {
            authGetStoredAuth.mockReturnValue({
                accessToken: 'a',
                refreshToken: 'r',
                user: { id: 'u1', email: 'admin@example.com', name: null, role: 'admin' },
            });
            const auth = await import('./demoAuthClient');

            const session = await auth.fetchAuthSession();

            expect(session.groups).toEqual(['admin']);
        });

        it('fetchAuthSession resolves no admin group for a non-admin user', async () => {
            authGetStoredAuth.mockReturnValue({
                accessToken: 'a',
                refreshToken: 'r',
                user: { id: 'u1', email: 'user@example.com', name: null, role: 'user' },
            });
            const auth = await import('./demoAuthClient');

            const session = await auth.fetchAuthSession();

            expect(session.groups).toEqual([]);
        });

        it('signOut delegates to authClient.logout', async () => {
            authLogout.mockResolvedValue(undefined);
            const auth = await import('./demoAuthClient');

            await auth.signOut();

            expect(authLogout).toHaveBeenCalled();
        });

        it('confirmSignUp is a no-op success (no email verification in v1)', async () => {
            const auth = await import('./demoAuthClient');
            const result = await auth.confirmSignUp({ username: 'new@example.com', confirmationCode: '000000' });
            expect(result.isSignUpComplete).toBe(true);
        });

        it('resendSignUpCode is a no-op success (no email verification in v1)', async () => {
            const auth = await import('./demoAuthClient');
            const result = await auth.resendSignUpCode({ username: 'new@example.com' });
            expect(result.destination).toBe('new@example.com');
        });

        it('resetPassword and confirmResetPassword are no-op successes (no email verification in v1)', async () => {
            const auth = await import('./demoAuthClient');
            const resetResult = await auth.resetPassword({ username: 'new@example.com' });
            expect(resetResult.nextStep).toBeDefined();
            await expect(
                auth.confirmResetPassword({ username: 'new@example.com', confirmationCode: '000000', newPassword: 'x' })
            ).resolves.toBeUndefined();
        });
    });
});
