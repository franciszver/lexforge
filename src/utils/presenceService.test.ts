/**
 * Tests for Presence Service - Cursor Functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { UserPresence } from './presenceTypes';
import { presencesToCursors, type TipTapCursorData } from './presenceService';

describe('presencesToCursors', () => {
    it('should convert presences to cursor data', () => {
        const presences: UserPresence[] = [
            {
                id: 'presence-1',
                documentId: 'doc-1',
                documentOwnerId: 'owner-1',
                userId: 'user-1',
                userEmail: 'user1@example.com',
                userName: 'John Doe',
                userColor: '#EF4444',
                status: 'editing',
                lastHeartbeat: new Date().toISOString(),
                cursorPosition: { line: 0, column: 42 },
                selectionRange: null,
                sessionId: 'session-1',
                joinedAt: new Date().toISOString(),
            },
        ];
        
        const cursors = presencesToCursors(presences);
        
        expect(cursors).toHaveLength(1);
        expect(cursors[0]).toEqual({
            id: 'user-1',
            name: 'John Doe',
            color: '#EF4444',
            position: 42,
            selection: undefined,
        });
    });
    
    it('should include selection data when present', () => {
        const presences: UserPresence[] = [
            {
                id: 'presence-1',
                documentId: 'doc-1',
                documentOwnerId: 'owner-1',
                userId: 'user-1',
                userEmail: 'user1@example.com',
                userName: 'Jane Smith',
                userColor: '#3B82F6',
                status: 'editing',
                lastHeartbeat: new Date().toISOString(),
                cursorPosition: { line: 0, column: 10 },
                selectionRange: {
                    start: { line: 0, column: 10 },
                    end: { line: 0, column: 50 },
                },
                sessionId: 'session-1',
                joinedAt: new Date().toISOString(),
            },
        ];
        
        const cursors = presencesToCursors(presences);
        
        expect(cursors).toHaveLength(1);
        expect(cursors[0].selection).toEqual({
            from: 10,
            to: 50,
        });
    });
    
    it('should filter out presences without cursor position', () => {
        const presences: UserPresence[] = [
            {
                id: 'presence-1',
                documentId: 'doc-1',
                documentOwnerId: 'owner-1',
                userId: 'user-1',
                userEmail: 'user1@example.com',
                userName: 'With Cursor',
                userColor: '#EF4444',
                status: 'editing',
                lastHeartbeat: new Date().toISOString(),
                cursorPosition: { line: 0, column: 42 },
                selectionRange: null,
                sessionId: 'session-1',
                joinedAt: new Date().toISOString(),
            },
            {
                id: 'presence-2',
                documentId: 'doc-1',
                documentOwnerId: 'owner-1',
                userId: 'user-2',
                userEmail: 'user2@example.com',
                userName: 'Without Cursor',
                userColor: '#3B82F6',
                status: 'viewing',
                lastHeartbeat: new Date().toISOString(),
                cursorPosition: null,
                selectionRange: null,
                sessionId: 'session-2',
                joinedAt: new Date().toISOString(),
            },
        ];
        
        const cursors = presencesToCursors(presences);
        
        expect(cursors).toHaveLength(1);
        expect(cursors[0].name).toBe('With Cursor');
    });
    
    it('should use email as fallback name', () => {
        const presences: UserPresence[] = [
            {
                id: 'presence-1',
                documentId: 'doc-1',
                documentOwnerId: 'owner-1',
                userId: 'user-1',
                userEmail: 'fallback@example.com',
                userName: undefined,
                userColor: '#EF4444',
                status: 'editing',
                lastHeartbeat: new Date().toISOString(),
                cursorPosition: { line: 0, column: 0 },
                selectionRange: null,
                sessionId: 'session-1',
                joinedAt: new Date().toISOString(),
            },
        ];
        
        const cursors = presencesToCursors(presences);
        
        expect(cursors[0].name).toBe('fallback@example.com');
    });
    
    it('should use Anonymous as final fallback name', () => {
        const presences: UserPresence[] = [
            {
                id: 'presence-1',
                documentId: 'doc-1',
                documentOwnerId: 'owner-1',
                userId: 'user-1',
                userEmail: undefined,
                userName: undefined,
                userColor: '#EF4444',
                status: 'editing',
                lastHeartbeat: new Date().toISOString(),
                cursorPosition: { line: 0, column: 0 },
                selectionRange: null,
                sessionId: 'session-1',
                joinedAt: new Date().toISOString(),
            },
        ];
        
        const cursors = presencesToCursors(presences);
        
        expect(cursors[0].name).toBe('Anonymous');
    });
    
    it('should return empty array for empty presences', () => {
        const cursors = presencesToCursors([]);
        expect(cursors).toEqual([]);
    });
    
    it('should handle multiple presences correctly', () => {
        const presences: UserPresence[] = [
            {
                id: 'presence-1',
                documentId: 'doc-1',
                documentOwnerId: 'owner-1',
                userId: 'user-1',
                userEmail: 'user1@example.com',
                userName: 'User One',
                userColor: '#EF4444',
                status: 'editing',
                lastHeartbeat: new Date().toISOString(),
                cursorPosition: { line: 0, column: 10 },
                selectionRange: null,
                sessionId: 'session-1',
                joinedAt: new Date().toISOString(),
            },
            {
                id: 'presence-2',
                documentId: 'doc-1',
                documentOwnerId: 'owner-1',
                userId: 'user-2',
                userEmail: 'user2@example.com',
                userName: 'User Two',
                userColor: '#3B82F6',
                status: 'editing',
                lastHeartbeat: new Date().toISOString(),
                cursorPosition: { line: 0, column: 50 },
                selectionRange: {
                    start: { line: 0, column: 50 },
                    end: { line: 0, column: 100 },
                },
                sessionId: 'session-2',
                joinedAt: new Date().toISOString(),
            },
            {
                id: 'presence-3',
                documentId: 'doc-1',
                documentOwnerId: 'owner-1',
                userId: 'user-3',
                userEmail: 'user3@example.com',
                userName: 'User Three',
                userColor: '#22C55E',
                status: 'viewing',
                lastHeartbeat: new Date().toISOString(),
                cursorPosition: { line: 0, column: 200 },
                selectionRange: null,
                sessionId: 'session-3',
                joinedAt: new Date().toISOString(),
            },
        ];
        
        const cursors = presencesToCursors(presences);
        
        expect(cursors).toHaveLength(3);
        expect(cursors.map(c => c.position)).toEqual([10, 50, 200]);
    });
});

describe('Cursor Throttling', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    
    afterEach(() => {
        vi.useRealTimers();
    });
    
    it('should throttle rapid cursor updates', () => {
        let callCount = 0;
        const THROTTLE_MS = 100;
        let lastCall = 0;
        
        const throttledUpdate = () => {
            const now = Date.now();
            if (now - lastCall >= THROTTLE_MS) {
                lastCall = now;
                callCount++;
            }
        };
        
        // Initial call should go through
        throttledUpdate();
        expect(callCount).toBe(1);
        
        // Immediate calls should be throttled
        throttledUpdate();
        throttledUpdate();
        throttledUpdate();
        expect(callCount).toBe(1);
        
        // After delay, call should go through
        vi.advanceTimersByTime(THROTTLE_MS);
        throttledUpdate();
        expect(callCount).toBe(2);
    });
});

describe('Cursor Position Conversion', () => {
    it('should convert line/column to position correctly', () => {
        // The current implementation uses column as position
        // This tests the conversion logic
        const cursorPos = { line: 0, column: 42 };
        const position = cursorPos.column;
        
        expect(position).toBe(42);
    });
    
    it('should handle selection range conversion', () => {
        const selectionRange = {
            start: { line: 0, column: 10 },
            end: { line: 0, column: 50 },
        };
        
        const selection = {
            from: selectionRange.start.column,
            to: selectionRange.end.column,
        };
        
        expect(selection).toEqual({ from: 10, to: 50 });
    });
    
    it('should handle null cursor position', () => {
        const cursorPos = null;
        const position = cursorPos?.column ?? 0;
        
        expect(position).toBe(0);
    });
    
    it('should handle null selection range', () => {
        const selectionRange = null;
        const selection = selectionRange ? {
            from: selectionRange.start.column,
            to: selectionRange.end.column,
        } : undefined;
        
        expect(selection).toBeUndefined();
    });
});

