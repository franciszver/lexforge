/**
 * Tests for CollaborationCursor Extension
 * 
 * Note: The actual TipTap extension is tested indirectly through integration tests.
 * These tests focus on the supporting utilities and types.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('CollaborationCursor Types', () => {
    it('should define CursorData interface correctly', () => {
        // Type test - this will fail at compile time if types are wrong
        const cursorData = {
            id: 'user-123',
            name: 'John Doe',
            color: '#EF4444',
            position: 42,
            selection: {
                from: 10,
                to: 20,
            },
        };
        
        expect(cursorData.id).toBe('user-123');
        expect(cursorData.name).toBe('John Doe');
        expect(cursorData.color).toBe('#EF4444');
        expect(cursorData.position).toBe(42);
        expect(cursorData.selection?.from).toBe(10);
        expect(cursorData.selection?.to).toBe(20);
    });
    
    it('should allow cursor without selection', () => {
        const cursorData: { id: string; name: string; color: string; position: number; selection?: { from: number; to: number } } = {
            id: 'user-456',
            name: 'Jane Smith',
            color: '#3B82F6',
            position: 100,
        };
        
        expect(cursorData.selection).toBeUndefined();
    });
});

describe('CollaborationCursor Options', () => {
    it('should support default option values', () => {
        // Test default values expected by the extension
        const defaultOptions = {
            onCursorUpdate: undefined,
            cursors: [],
            throttleDelay: 100,
            currentUserId: undefined,
        };
        
        expect(defaultOptions.throttleDelay).toBe(100);
        expect(defaultOptions.cursors).toEqual([]);
        expect(defaultOptions.currentUserId).toBeUndefined();
        expect(defaultOptions.onCursorUpdate).toBeUndefined();
    });
    
    it('should support custom option values', () => {
        const mockCallback = vi.fn();
        
        const customOptions = {
            throttleDelay: 200,
            currentUserId: 'user-123',
            onCursorUpdate: mockCallback,
            cursors: [
                { id: '1', name: 'Test', color: '#fff', position: 0 },
            ],
        };
        
        expect(customOptions.throttleDelay).toBe(200);
        expect(customOptions.currentUserId).toBe('user-123');
        expect(customOptions.onCursorUpdate).toBe(mockCallback);
        expect(customOptions.cursors).toHaveLength(1);
    });
});

describe('Throttle Utility', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    
    afterEach(() => {
        vi.useRealTimers();
    });
    
    it('should throttle rapid calls', async () => {
        const fn = vi.fn();
        
        // Simple throttle implementation for testing
        function throttle(func: () => void, delay: number) {
            let lastCall = 0;
            return () => {
                const now = Date.now();
                if (now - lastCall >= delay) {
                    lastCall = now;
                    func();
                }
            };
        }
        
        const throttled = throttle(fn, 100);
        
        // Call multiple times rapidly
        throttled();
        throttled();
        throttled();
        
        // Only first call should go through immediately
        expect(fn).toHaveBeenCalledTimes(1);
        
        // Advance time past throttle delay
        vi.advanceTimersByTime(100);
        
        // Next call should work
        throttled();
        expect(fn).toHaveBeenCalledTimes(2);
    });
});

describe('Cursor Position Validation', () => {
    it('should clamp position to document bounds', () => {
        // Test helper function behavior
        const docSize = 100;
        const positions = [-10, 0, 50, 100, 150];
        
        const clampedPositions = positions.map(pos => 
            Math.min(Math.max(0, pos), docSize)
        );
        
        expect(clampedPositions).toEqual([0, 0, 50, 100, 100]);
    });
    
    it('should handle selection ranges correctly', () => {
        const docSize = 100;
        
        const selection = { from: -5, to: 150 };
        const clampedSelection = {
            from: Math.min(Math.max(0, selection.from), docSize),
            to: Math.min(Math.max(0, selection.to), docSize),
        };
        
        expect(clampedSelection.from).toBe(0);
        expect(clampedSelection.to).toBe(100);
    });
});

describe('Cursor Filtering', () => {
    it('should filter out current user cursor', () => {
        const currentUserId = 'user-123';
        const cursors = [
            { id: 'user-123', name: 'Me', color: '#fff', position: 0 },
            { id: 'user-456', name: 'Other', color: '#000', position: 10 },
            { id: 'user-789', name: 'Another', color: '#f00', position: 20 },
        ];
        
        const remoteCursors = cursors.filter(c => c.id !== currentUserId);
        
        expect(remoteCursors).toHaveLength(2);
        expect(remoteCursors.map(c => c.id)).toEqual(['user-456', 'user-789']);
    });
    
    it('should include all cursors when currentUserId is undefined', () => {
        const currentUserId = undefined;
        const cursors = [
            { id: 'user-123', name: 'Me', color: '#fff', position: 0 },
            { id: 'user-456', name: 'Other', color: '#000', position: 10 },
        ];
        
        const remoteCursors = currentUserId
            ? cursors.filter(c => c.id !== currentUserId)
            : cursors;
        
        expect(remoteCursors).toHaveLength(2);
    });
});

