import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Contract tests for the server-backed auth client. Every test stubs global
 * fetch (no real network) and vi.resetModules() between cases so each import
 * gets a fresh in-memory token store.
 */
describe('authClient', () => {
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
    const jsonResponse = (status: number, body: unknown) => ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    });

    describe('login', () => {
        it('POSTs credentials to /auth/login and stores the returned tokens', async () => {
            fetchMock().mockResolvedValueOnce(
                jsonResponse(200, {
                    user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'user' },
                    accessToken: 'access-1',
                    refreshToken: 'refresh-1',
                })
            );

            const { login } = await import('./authClient');
            const result = await login('a@b.com', 'password123');

            expect(fetchMock()).toHaveBeenCalledTimes(1);
            const [url, options] = fetchMock().mock.calls[0];
            expect(url).toBe('http://localhost:3001/auth/login');
            expect(options.method).toBe('POST');
            expect(JSON.parse(options.body)).toEqual({ email: 'a@b.com', password: 'password123' });

            expect(result.user.email).toBe('a@b.com');
            expect(localStorage.getItem('lexforge.auth')).toContain('access-1');
        });

        it('respects VITE_API_URL when set', async () => {
            vi.stubEnv('VITE_API_URL', 'https://api.example.com');
            fetchMock().mockResolvedValueOnce(
                jsonResponse(200, { user: { id: 'u1', email: 'a@b.com', name: null, role: 'user' }, accessToken: 'x', refreshToken: 'y' })
            );

            const { login } = await import('./authClient');
            await login('a@b.com', 'password123');

            const [url] = fetchMock().mock.calls[0];
            expect(url).toBe('https://api.example.com/auth/login');
        });

        it('throws the server error message on 401', async () => {
            fetchMock().mockResolvedValueOnce(jsonResponse(401, { error: 'Invalid credentials' }));

            const { login } = await import('./authClient');
            await expect(login('a@b.com', 'wrong')).rejects.toThrow('Invalid credentials');
        });
    });

    describe('register', () => {
        it('POSTs to /auth/register and stores tokens', async () => {
            fetchMock().mockResolvedValueOnce(
                jsonResponse(201, {
                    user: { id: 'u2', email: 'new@b.com', name: 'New', role: 'user' },
                    accessToken: 'access-2',
                    refreshToken: 'refresh-2',
                })
            );

            const { register } = await import('./authClient');
            const result = await register('new@b.com', 'password123', 'New');

            const [, options] = fetchMock().mock.calls[0];
            expect(JSON.parse(options.body)).toEqual({ email: 'new@b.com', password: 'password123', name: 'New' });
            expect(result.accessToken).toBe('access-2');
        });
    });

    describe('me (authenticated GET, auto-refresh once on 401)', () => {
        async function loggedIn() {
            fetchMock().mockResolvedValueOnce(
                jsonResponse(200, {
                    user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'user' },
                    accessToken: 'access-1',
                    refreshToken: 'refresh-1',
                })
            );
            const client = await import('./authClient');
            await client.login('a@b.com', 'password123');
            return client;
        }

        it('sends the stored access token as a Bearer header', async () => {
            const client = await loggedIn();
            fetchMock().mockResolvedValueOnce(jsonResponse(200, { id: 'u1', email: 'a@b.com', name: 'A', role: 'user' }));

            await client.me();

            const [, options] = fetchMock().mock.calls[1];
            expect(options.headers.Authorization).toBe('Bearer access-1');
        });

        it('on a 401, refreshes once and retries with the new access token', async () => {
            const client = await loggedIn();
            fetchMock()
                .mockResolvedValueOnce(jsonResponse(401, { error: 'Unauthorized' })) // me -> 401
                .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'access-2', refreshToken: 'refresh-2' })) // refresh
                .mockResolvedValueOnce(jsonResponse(200, { id: 'u1', email: 'a@b.com', name: 'A', role: 'user' })); // retried me

            const result = await client.me();

            expect(fetchMock()).toHaveBeenCalledTimes(4); // login + me(401) + refresh + me(retry)
            expect(result.email).toBe('a@b.com');
            const [refreshUrl] = fetchMock().mock.calls[2];
            expect(refreshUrl).toBe('http://localhost:3001/auth/refresh');
            const [, retryOptions] = fetchMock().mock.calls[3];
            expect(retryOptions.headers.Authorization).toBe('Bearer access-2');
        });

        it('propagates 401 when the refresh itself fails, and clears stored tokens', async () => {
            const client = await loggedIn();
            fetchMock()
                .mockResolvedValueOnce(jsonResponse(401, { error: 'Unauthorized' })) // me -> 401
                .mockResolvedValueOnce(jsonResponse(401, { error: 'Invalid refresh token' })); // refresh fails

            await expect(client.me()).rejects.toThrow();
            expect(localStorage.getItem('lexforge.auth')).toBeNull();
        });
    });

    describe('logout', () => {
        it('POSTs to /auth/logout with the access token and clears local storage', async () => {
            fetchMock().mockResolvedValueOnce(
                jsonResponse(200, {
                    user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'user' },
                    accessToken: 'access-1',
                    refreshToken: 'refresh-1',
                })
            );
            const client = await import('./authClient');
            await client.login('a@b.com', 'password123');

            fetchMock().mockResolvedValueOnce({ ok: true, status: 204, json: async () => undefined });
            await client.logout();

            const [url, options] = fetchMock().mock.calls[1];
            expect(url).toBe('http://localhost:3001/auth/logout');
            expect(options.headers.Authorization).toBe('Bearer access-1');
            expect(localStorage.getItem('lexforge.auth')).toBeNull();
        });
    });
});
