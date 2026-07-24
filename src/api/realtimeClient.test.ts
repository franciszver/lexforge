import { describe, it, expect, vi, beforeEach } from 'vitest';

interface Handler {
    (...args: unknown[]): void;
}

const mockSocket = {
    handlers: new Map<string, Set<Handler>>(),
    on(event: string, cb: Handler) {
        if (!this.handlers.has(event)) this.handlers.set(event, new Set());
        this.handlers.get(event)!.add(cb);
    },
    off(event: string, cb: Handler) {
        this.handlers.get(event)?.delete(cb);
    },
    emit: vi.fn(),
    disconnect: vi.fn(),
    trigger(event: string, ...args: unknown[]) {
        this.handlers.get(event)?.forEach((cb) => cb(...args));
    },
};

vi.mock('socket.io-client', () => ({
    io: vi.fn(() => mockSocket),
}));

import { io } from 'socket.io-client';
import { connect } from './realtimeClient';

describe('realtimeClient', () => {
    beforeEach(() => {
        mockSocket.handlers.clear();
        mockSocket.emit.mockClear();
        mockSocket.disconnect.mockClear();
        vi.mocked(io).mockClear();
    });

    it('connects with the access token in the handshake auth', () => {
        connect('http://localhost:3001', 'token-abc');
        expect(io).toHaveBeenCalledWith(
            'http://localhost:3001',
            expect.objectContaining({ auth: { token: 'token-abc' } })
        );
    });

    it('joinDocument emits presence:join', () => {
        const client = connect('http://localhost:3001', 'token-abc');
        client.joinDocument('doc-1', 'Alice', 'a@example.com');
        expect(mockSocket.emit).toHaveBeenCalledWith('presence:join', {
            documentId: 'doc-1',
            userName: 'Alice',
            userEmail: 'a@example.com',
        });
    });

    it('sendCursor emits presence:cursor', () => {
        const client = connect('http://localhost:3001', 'token-abc');
        client.sendCursor('doc-1', { line: 0, column: 5 }, null);
        expect(mockSocket.emit).toHaveBeenCalledWith('presence:cursor', {
            documentId: 'doc-1',
            cursorPosition: { line: 0, column: 5 },
            selectionRange: null,
        });
    });

    it('sendStatus emits presence:status', () => {
        const client = connect('http://localhost:3001', 'token-abc');
        client.sendStatus('doc-1', 'editing');
        expect(mockSocket.emit).toHaveBeenCalledWith('presence:status', {
            documentId: 'doc-1',
            status: 'editing',
        });
    });

    it('onPresenceUpdate delivers roster updates and unsubscribes cleanly', () => {
        const client = connect('http://localhost:3001', 'token-abc');
        const cb = vi.fn();
        const unsubscribe = client.onPresenceUpdate(cb);

        const roster = [{ sessionId: 's1', userId: 'u1' }];
        mockSocket.trigger('presence:update', roster);
        expect(cb).toHaveBeenCalledWith(roster);

        unsubscribe();
        cb.mockClear();
        mockSocket.trigger('presence:update', [{ sessionId: 's2', userId: 'u2' }]);
        expect(cb).not.toHaveBeenCalled();
    });

    it('onCursor delivers cursor events and unsubscribes cleanly', () => {
        const client = connect('http://localhost:3001', 'token-abc');
        const cb = vi.fn();
        const unsubscribe = client.onCursor(cb);

        const event = {
            sessionId: 's1',
            userId: 'u1',
            cursorPosition: { line: 0, column: 1 },
            selectionRange: null,
        };
        mockSocket.trigger('presence:cursor', event);
        expect(cb).toHaveBeenCalledWith(event);

        unsubscribe();
        cb.mockClear();
        mockSocket.trigger('presence:cursor', event);
        expect(cb).not.toHaveBeenCalled();
    });

    it('disconnect tears down the socket', () => {
        const client = connect('http://localhost:3001', 'token-abc');
        client.disconnect();
        expect(mockSocket.disconnect).toHaveBeenCalled();
    });
});
