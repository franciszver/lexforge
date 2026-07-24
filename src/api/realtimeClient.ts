/**
 * Realtime Client
 *
 * Thin wrapper around a Socket.IO connection to the Express server's
 * realtime presence layer (`server/src/realtime.js`). Non-demo counterpart
 * to the severed AppSync presence subscriptions — see presenceService.ts.
 *
 * The server is authoritative for identity (derived from the JWT) and for
 * document access (owner/accepted collaborator only); this client just
 * relays events, it does not validate or enrich them.
 */
import { io, type Socket } from 'socket.io-client';
import type { CursorPosition, SelectionRange } from '../utils/presenceTypes';

export interface RosterEntry {
    sessionId: string;
    userId: string;
    userEmail?: string;
    status?: string;
}

export interface RemoteCursorEvent {
    sessionId: string;
    userId: string;
    cursorPosition: CursorPosition | null;
    selectionRange: SelectionRange | null;
}

export interface RealtimeClient {
    joinDocument(documentId: string, userName?: string, userEmail?: string): void;
    leaveDocument(): void;
    sendCursor(documentId: string, cursorPosition: CursorPosition | null, selectionRange: SelectionRange | null): void;
    sendStatus(documentId: string, status: string): void;
    onPresenceUpdate(callback: (roster: RosterEntry[]) => void): () => void;
    onCursor(callback: (event: RemoteCursorEvent) => void): () => void;
    disconnect(): void;
}

/**
 * Connect to the realtime server. Uses socket.io's default reconnection
 * behavior. Call `disconnect()` (or `leaveDocument()`) to tear the
 * connection down.
 */
export function connect(apiUrl: string, accessToken: string): RealtimeClient {
    const socket: Socket = io(apiUrl, {
        auth: { token: accessToken },
    });

    function joinDocument(documentId: string, userName?: string, userEmail?: string): void {
        socket.emit('presence:join', { documentId, userName, userEmail });
    }

    function leaveDocument(): void {
        socket.disconnect();
    }

    function sendCursor(
        documentId: string,
        cursorPosition: CursorPosition | null,
        selectionRange: SelectionRange | null
    ): void {
        socket.emit('presence:cursor', { documentId, cursorPosition, selectionRange });
    }

    function sendStatus(documentId: string, status: string): void {
        socket.emit('presence:status', { documentId, status });
    }

    function onPresenceUpdate(callback: (roster: RosterEntry[]) => void): () => void {
        socket.on('presence:update', callback);
        return () => {
            socket.off('presence:update', callback);
        };
    }

    function onCursor(callback: (event: RemoteCursorEvent) => void): () => void {
        socket.on('presence:cursor', callback);
        return () => {
            socket.off('presence:cursor', callback);
        };
    }

    function disconnect(): void {
        socket.disconnect();
    }

    return {
        joinDocument,
        leaveDocument,
        sendCursor,
        sendStatus,
        onPresenceUpdate,
        onCursor,
        disconnect,
    };
}
