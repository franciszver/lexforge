/**
 * Tests for Presence Service - non-demo (Socket.IO realtime) path
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

interface FakeRosterEntry {
    sessionId: string;
    userId: string;
    userEmail?: string;
    status?: string;
}

interface FakeCursorEvent {
    sessionId: string;
    userId: string;
    cursorPosition: unknown;
    selectionRange: unknown;
}

let presenceCallback: ((roster: FakeRosterEntry[]) => void) | undefined;
let cursorCallback: ((event: FakeCursorEvent) => void) | undefined;

const mockClient = {
    joinDocument: vi.fn(),
    leaveDocument: vi.fn(),
    sendCursor: vi.fn(),
    sendStatus: vi.fn(),
    onPresenceUpdate: vi.fn((cb: (roster: FakeRosterEntry[]) => void) => {
        presenceCallback = cb;
        return () => {
            presenceCallback = undefined;
        };
    }),
    onCursor: vi.fn((cb: (event: FakeCursorEvent) => void) => {
        cursorCallback = cb;
        return () => {
            cursorCallback = undefined;
        };
    }),
    disconnect: vi.fn(),
};

vi.mock('../demo/demoConfig', () => ({ isDemoMode: false }));
vi.mock('../api/authClient', () => ({
    getStoredAuth: () => ({
        accessToken: 'token-123',
        refreshToken: 'refresh-123',
        user: { id: 'user-1', email: 'user1@example.com', name: 'User One', role: 'user' },
    }),
    getApiUrl: () => 'http://localhost:3001',
}));
vi.mock('../api/realtimeClient', () => ({
    connect: vi.fn(() => mockClient),
}));

import { connect } from '../api/realtimeClient';
import {
    joinDocument,
    leaveCurrentDocument,
    subscribeToPresences,
    updateCursorThrottled,
    updateStatus,
} from './presenceService';

describe('presenceService (non-demo, realtime)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        presenceCallback = undefined;
        cursorCallback = undefined;
        mockClient.joinDocument.mockClear();
        mockClient.sendCursor.mockClear();
        mockClient.sendStatus.mockClear();
        mockClient.disconnect.mockClear();
        vi.mocked(connect).mockClear();
    });

    afterEach(async () => {
        vi.useRealTimers();
        await leaveCurrentDocument();
    });

    it('connects to the realtime server and emits presence:join', async () => {
        await joinDocument('doc-1', 'owner-1', 'user-1', 'user1@example.com', 'User One');

        expect(connect).toHaveBeenCalledWith('http://localhost:3001', 'token-123');
        expect(mockClient.joinDocument).toHaveBeenCalledWith('doc-1', 'User One', 'user1@example.com');
    });

    it('fans out presence:update roster to subscribers', async () => {
        await joinDocument('doc-1', 'owner-1', 'user-1');

        const cb = vi.fn();
        subscribeToPresences(cb);

        presenceCallback?.([
            { sessionId: 's1', userId: 'user-1', userEmail: 'user1@example.com', status: 'viewing' },
            { sessionId: 's2', userId: 'user-2', userEmail: 'user2@example.com', status: 'editing' },
        ]);

        expect(cb).toHaveBeenCalledTimes(1);
        const presences = cb.mock.calls[0][0];
        expect(presences).toHaveLength(2);
        expect(presences.map((p: { userId: string }) => p.userId).sort()).toEqual(['user-1', 'user-2']);
    });

    it('throttles cursor updates and forwards them through sendCursor', async () => {
        await joinDocument('doc-1', 'owner-1', 'user-1');

        updateCursorThrottled(5);
        expect(mockClient.sendCursor).toHaveBeenCalledTimes(1);
        expect(mockClient.sendCursor).toHaveBeenCalledWith('doc-1', { line: 0, column: 5 }, null);

        updateCursorThrottled(10);
        updateCursorThrottled(15);
        expect(mockClient.sendCursor).toHaveBeenCalledTimes(1); // throttled

        vi.advanceTimersByTime(150);
        expect(mockClient.sendCursor).toHaveBeenCalledTimes(2);
        expect(mockClient.sendCursor).toHaveBeenLastCalledWith('doc-1', { line: 0, column: 15 }, null);
    });

    it('merges incoming presence:cursor events into subscriber updates', async () => {
        await joinDocument('doc-1', 'owner-1', 'user-1');

        presenceCallback?.([
            { sessionId: 's1', userId: 'user-1', userEmail: 'user1@example.com', status: 'viewing' },
            { sessionId: 's2', userId: 'user-2', userEmail: 'user2@example.com', status: 'editing' },
        ]);

        const cb = vi.fn();
        subscribeToPresences(cb);

        cursorCallback?.({
            sessionId: 's2',
            userId: 'user-2',
            cursorPosition: { line: 0, column: 7 },
            selectionRange: null,
        });

        expect(cb).toHaveBeenCalledTimes(1);
        const presences = cb.mock.calls[0][0];
        const remote = presences.find((p: { sessionId: string }) => p.sessionId === 's2');
        expect(remote.cursorPosition).toEqual({ line: 0, column: 7 });
    });

    it('forwards status updates through sendStatus', async () => {
        await joinDocument('doc-1', 'owner-1', 'user-1');

        await updateStatus('editing');
        expect(mockClient.sendStatus).toHaveBeenCalledWith('doc-1', 'editing');
    });

    it('disconnects the realtime client on leaveCurrentDocument (clean teardown)', async () => {
        await joinDocument('doc-1', 'owner-1', 'user-1');
        await leaveCurrentDocument();
        expect(mockClient.disconnect).toHaveBeenCalledTimes(1);
    });
});
