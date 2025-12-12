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
    userId: _userId,
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
        console.log('[CursorSync] Received', presences.length, 'presences, current session:', currentSessionId.current);
        
        // Filter out current session and convert to cursor data
        const otherPresences = presences.filter(
            p => {
                const isCurrentSession = p.sessionId === currentSessionId.current;
                console.log('[CursorSync] Presence', p.userId, 'session:', p.sessionId, 'isCurrentSession:', isCurrentSession);
                return !isCurrentSession;
            }
        );
        
        console.log('[CursorSync] After filtering:', otherPresences.length, 'other presences');
        
        const cursors = presencesToCursors(otherPresences);
        setRemoteCursors(cursors);
        
        // Debug: Log cursors being sent to TipTap
        console.log('[CursorSync] Remote cursors to render:', cursors.length, cursors);
        
        // Update TipTap decorations
        if (editor && !editor.isDestroyed) {
            console.log('[CursorSync] Calling updateCollaborationCursors');
            updateCollaborationCursors(editor, cursors);
        } else {
            console.warn('[CursorSync] Editor not ready, cannot render cursors. Editor:', !!editor, 'isDestroyed:', editor?.isDestroyed);
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
        
        // Send initial cursor position when editor is ready
        // Small delay to ensure presence service is connected
        const initTimeout = setTimeout(() => {
            if (editor && !editor.isDestroyed) {
                handleSelectionUpdate();
                console.log('[CursorSync] Initial cursor position sent');
            }
        }, 500);
        
        // Listen for selection changes
        editor.on('selectionUpdate', handleSelectionUpdate);
        
        return () => {
            clearTimeout(initTimeout);
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

