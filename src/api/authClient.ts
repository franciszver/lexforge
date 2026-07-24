/**
 * Auth API Client
 *
 * Talks to the LexForge Express/Prisma server's /auth/* routes (see
 * server/src/auth/routes.js). Replaces the previous Cognito/Amplify auth
 * flow. Tokens are cached in memory for the life of the page and mirrored to
 * localStorage (key 'lexforge.auth') so a reload doesn't force a re-login.
 *
 * `me()` and `logout()` are authenticated requests: on a 401 (expired access
 * token) they transparently call `refresh()` once and retry the original
 * request with the new access token. If the refresh itself fails, stored
 * tokens are cleared and the 401 propagates to the caller.
 */

export interface AuthUser {
    id: string;
    email: string;
    name: string | null;
    role: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
    user: AuthUser;
}

interface StoredAuth extends AuthTokens {
    user: AuthUser;
}

export class AuthApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'AuthApiError';
        this.status = status;
    }
}

const STORAGE_KEY = 'lexforge.auth';

let memoryAuth: StoredAuth | null | undefined; // undefined = not loaded from storage yet

function loadFromStorage(): StoredAuth | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as StoredAuth) : null;
    } catch {
        return null;
    }
}

function persist(auth: StoredAuth | null): void {
    memoryAuth = auth;
    try {
        if (auth) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // localStorage unavailable (e.g. private browsing) — in-memory cache still works.
    }
}

function getAuth(): StoredAuth | null {
    if (memoryAuth === undefined) {
        memoryAuth = loadFromStorage();
    }
    return memoryAuth;
}

/** Current user + tokens as last stored, or null if signed out. */
export function getStoredAuth(): StoredAuth | null {
    return getAuth();
}

function getApiUrl(): string {
    const raw = import.meta.env.VITE_API_URL;
    return (raw ? raw : 'http://localhost:3001').replace(/\/+$/, '');
}

async function parseErrorMessage(res: Response): Promise<string> {
    try {
        const body = await res.json();
        if (body && typeof body.error === 'string') return body.error;
    } catch {
        // no/invalid JSON body — fall through to the generic message
    }
    return `Request failed with status ${res.status}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${getApiUrl()}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    if (!res.ok) {
        throw new AuthApiError(await parseErrorMessage(res), res.status);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

export async function register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
    });
    persist({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
    return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    persist({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
    return data;
}

export async function refresh(): Promise<AuthTokens> {
    const auth = getAuth();
    if (!auth?.refreshToken) {
        throw new AuthApiError('Not authenticated', 401);
    }
    const tokens = await request<AuthTokens>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });
    persist({ ...auth, ...tokens });
    return tokens;
}

/** Authenticated request with a single automatic refresh-and-retry on 401. */
async function authenticatedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const auth = getAuth();
    if (!auth?.accessToken) {
        throw new AuthApiError('Not authenticated', 401);
    }

    const send = (accessToken: string) =>
        fetch(`${getApiUrl()}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                ...(options.headers || {}),
            },
        });

    let res = await send(auth.accessToken);

    if (res.status === 401) {
        try {
            const tokens = await refresh();
            res = await send(tokens.accessToken);
        } catch {
            persist(null);
            throw new AuthApiError('Not authenticated', 401);
        }
    }

    if (!res.ok) {
        throw new AuthApiError(await parseErrorMessage(res), res.status);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

export async function me(): Promise<AuthUser> {
    const user = await authenticatedRequest<AuthUser>('/auth/me');
    const auth = getAuth();
    if (auth) persist({ ...auth, user });
    return user;
}

export async function logout(): Promise<void> {
    try {
        await authenticatedRequest<void>('/auth/logout', { method: 'POST' });
    } finally {
        persist(null);
    }
}
