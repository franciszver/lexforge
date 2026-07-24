import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useContentSync } from './useContentSync';

/**
 * Regression test for a silent infinite effect-refetch loop.
 *
 * Root cause: the "initialize sync state on mount" effect in useContentSync
 * depends on `onConflict` (useContentSync.ts). Editor.tsx passes `onConflict`
 * as an inline arrow function literal, so it gets a brand new identity on
 * every render. Any state update from inside the effect (setServerVersion /
 * setLocalVersion / setServerState) re-renders the consumer, which recreates
 * `onConflict`, which re-triggers the effect — forever. With a real,
 * network-latency-bound server client the loop still exists but each
 * iteration is slow enough to go unnoticed; with instantly-resolving demo
 * data it spins as fast as the microtask queue allows and pegs the main
 * thread.
 */

const getDocumentSyncStateMock = vi.fn();
const initializeSyncStateMock = vi.fn();
const updateSyncStateMock = vi.fn();
const checkForConflictsMock = vi.fn();
const subscribeToSyncStateMock = vi.fn((_callback: (state: unknown) => void) => () => {});

vi.mock('../utils/presenceService', () => ({
    getDocumentSyncState: (documentId: string) => getDocumentSyncStateMock(documentId),
    initializeSyncState: (documentId: string, userId: string, contentHash?: string) =>
        initializeSyncStateMock(documentId, userId, contentHash),
    updateSyncState: (documentId: string, userId: string, contentHash?: string) =>
        updateSyncStateMock(documentId, userId, contentHash),
    checkForConflicts: (documentId: string, localVersion: number) =>
        checkForConflictsMock(documentId, localVersion),
    subscribeToSyncState: (callback: (state: unknown) => void) => subscribeToSyncStateMock(callback),
}));

// Flush a bounded number of microtask/macrotask ticks. This intentionally
// does NOT wait for "settling" — with the buggy code there is no settling
// point, so a fixed number of ticks is what keeps this test finite either way.
async function flush(ticks = 30) {
    for (let i = 0; i < ticks; i++) {
        // eslint-disable-next-line no-await-in-loop
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    }
}

describe('useContentSync mount effect stability', () => {
    beforeEach(() => {
        getDocumentSyncStateMock.mockReset();
        initializeSyncStateMock.mockReset();
        updateSyncStateMock.mockReset();
        checkForConflictsMock.mockReset();
        subscribeToSyncStateMock.mockClear();

        // Resolves immediately with a valid state, exactly like the demo
        // in-memory data client does. Crucially — and matching the real
        // presenceService.getDocumentSyncState, which always builds a fresh
        // object literal from the DB read — every call returns a NEW object
        // with the SAME field values, so React can't bail out via
        // Object.is() on the returned reference. A slow/real network call
        // just makes the same loop slower — it doesn't prevent it.
        getDocumentSyncStateMock.mockImplementation(() =>
            Promise.resolve({
                documentId: 'demo-doc-1',
                version: 1,
                lastModifiedBy: 'demo-user-1',
                lastModifiedAt: '2026-07-20T09:30:00.000Z',
                contentHash: 'abc',
                lockedBy: null,
                lockExpiresAt: null,
            })
        );
    });

    it('does not refetch sync state on every render when the caller passes an inline onConflict callback', async () => {
        // Mirrors how Editor.tsx actually calls the hook: `onConflict` is a
        // fresh arrow function literal created on every render, not a
        // useCallback-memoized reference.
        renderHook(() =>
            useContentSync({
                documentId: 'demo-doc-1',
                userId: 'demo-user-1',
                onConflict: () => {},
            })
        );

        await flush(30);

        expect(getDocumentSyncStateMock.mock.calls.length).toBeLessThanOrEqual(2);
    });
});
