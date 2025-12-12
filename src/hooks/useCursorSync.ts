/**
 * useCursorSync Hook
 * 
 * Manages real-time cursor synchronization between collaborators.
 * Integrates with the presence service and TipTap editor.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import type { UserPresence } from '../utils/presenceTypes';
import {
    updateCursorThrottled,
    presencesToCursors,
    subscribeToPresences,
    getCurrentSessionId,
} from '../utils/presenceService';
import { updateCollaborationCursors, type CursorData } from '../extensions/CollaborationCursor';

// ============================================
// Types
// ============================================

interface UseCursorSyncOptions {
    /**
     * TipTap editor instance
     */
    editor: Editor | null;
    
    /**
     * Current user ID
     */
    userId: string;
    
    /**
     * Whether cursor sync is enabled
     */
    enabled?: boolean;
}

interface UseCursorSyncReturn {
    /**
     * Remote cursors data
     */
    remoteCursors: CursorData[];
    
    /**
     * Whether cursor sync is active
     */
    isActive: boolean;
    
    /**
     * Manually trigger cursor update
     */
    updateLocalCursor: (position: number, selection?: { from: number; to: number }) => void;
}

// ============================================
// Hook Implementation
// ============================================

export function useCursorSync({
    editor,
    userId,
    enabled = true,
}: UseCursorSyncOptions): UseCursorSyncReturn {
    const [remoteCursors, setRemoteCursors] = useState<CursorData[]>([]);
    const [isActive, setIsActive] = useState(false);
    const currentSessionId = useRef<string>(getCurrentSessionId());
    
    // Update local cursor position
    const updateLocalCursor = useCallback((
        position: number,
        selection?: { from: number; to: number }
    ) => {
        if (!enabled) return;
        updateCursorThrottled(position, selection);
    }, [enabled]);
    
    // Handle presence updates
    const handlePresenceUpdate = useCallback((presences: UserPresence[]) => {
        // Filter out current session and convert to cursor data
        const otherPresences = presences.filter(
            p => p.sessionId !== currentSessionId.current
        );
        const cursors = presencesToCursors(otherPresences);
        setRemoteCursors(cursors);
        
        // Update TipTap decorations
        if (editor && !editor.isDestroyed) {
            updateCollaborationCursors(editor, cursors);
        }
    }, [editor]);
    
    // Subscribe to presence updates
    useEffect(() => {
        if (!enabled) {
            setIsActive(false);
            return;
        }
        
        setIsActive(true);
        
        // Subscribe to presence updates
        const unsubscribe = subscribeToPresences(handlePresenceUpdate);
        
        return () => {
            unsubscribe();
            setIsActive(false);
        };
    }, [enabled, handlePresenceUpdate]);
    
    // Set up editor selection listener
    useEffect(() => {
        if (!editor || !enabled) return;
        
        // Check if editor has the on/off methods (may not be available in tests)
        if (typeof editor.on !== 'function') return;
        
        const handleSelectionUpdate = () => {
            const { from, to } = editor.state.selection;
            const selection = from !== to ? { from, to } : undefined;
            updateLocalCursor(from, selection);
        };
        
        // Listen for selection changes
        editor.on('selectionUpdate', handleSelectionUpdate);
        
        return () => {
            if (typeof editor.off === 'function') {
                editor.off('selectionUpdate', handleSelectionUpdate);
            }
        };
    }, [editor, enabled, updateLocalCursor]);
    
    return {
        remoteCursors,
        isActive,
        updateLocalCursor,
    };
}

export default useCursorSync;

