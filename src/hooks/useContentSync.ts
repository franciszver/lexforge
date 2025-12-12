/**
 * useContentSync Hook
 * Manages content synchronization with conflict detection.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from 'lodash-es';
import type { DocumentSyncState } from '../utils/presenceTypes';
import { PRESENCE_CONFIG } from '../utils/presenceTypes';
import {
    getDocumentSyncState,
    initializeSyncState,
    updateSyncState,
    checkForConflicts,
    subscribeToSyncState,
} from '../utils/presenceService';

// ============================================
// Types
// ============================================

interface UseContentSyncOptions {
    documentId: string;
    userId: string;
    onConflict?: (localVersion: number, serverState: DocumentSyncState) => void;
    onSyncComplete?: (state: DocumentSyncState) => void;
    debounceMs?: number;
}

interface UseContentSyncReturn {
    localVersion: number;
    serverVersion: number;
    isSyncing: boolean;
    hasConflict: boolean;
    serverState: DocumentSyncState | null;
    
    // Actions
    syncContent: (content: string) => Promise<boolean>;
    forceSave: (content: string) => Promise<boolean>;
    refreshServerState: () => Promise<void>;
    resolveConflict: (resolution: 'keep-local' | 'take-server') => void;
    
    // Content hash utility
    computeHash: (content: string) => Promise<string>;
}

// ============================================
// Hash Utility
// ============================================

async function computeContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================
// Hook
// ============================================

export function useContentSync({
    documentId,
    userId,
    onConflict,
    onSyncComplete,
    debounceMs = PRESENCE_CONFIG.SYNC_DEBOUNCE,
}: UseContentSyncOptions): UseContentSyncReturn {
    const [localVersion, setLocalVersion] = useState(0);
    const [serverVersion, setServerVersion] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [hasConflict, setHasConflict] = useState(false);
    const [serverState, setServerState] = useState<DocumentSyncState | null>(null);
    
    const lastSyncedHashRef = useRef<string>('');
    const pendingContentRef = useRef<string | null>(null);
    
    // Track local version in a ref to avoid stale closures in subscription
    const localVersionRef = useRef(localVersion);
    useEffect(() => {
        localVersionRef.current = localVersion;
    }, [localVersion]);
    
    // Initialize sync state on mount
    useEffect(() => {
        // Skip if no documentId or userId
        if (!documentId || !userId) return;
        
        let mounted = true;
        
        const initSync = async () => {
            const state = await getDocumentSyncState(documentId);
            
            if (!mounted) return;
            
            if (state) {
                setServerVersion(state.version);
                setLocalVersion(state.version);
                setServerState(state);
                if (state.contentHash) {
                    lastSyncedHashRef.current = state.contentHash;
                }
            } else {
                // Initialize new sync state
                const newState = await initializeSyncState(documentId, userId);
                if (newState && mounted) {
                    setServerVersion(newState.version);
                    setLocalVersion(newState.version);
                    setServerState(newState);
                }
            }
        };
        
        initSync();
        
        // Subscribe to sync state updates (use ref to avoid recreation)
        const unsubscribe = subscribeToSyncState((state) => {
            if (mounted) {
                setServerVersion(state.version);
                setServerState(state);
                
                // Check if this is a conflict using ref to get current value
                if (state.version > localVersionRef.current && state.lastModifiedBy !== userId) {
                    setHasConflict(true);
                    onConflict?.(localVersionRef.current, state);
                }
            }
        });
        
        return () => {
            mounted = false;
            unsubscribe();
        };
    }, [documentId, userId, onConflict]); // Removed localVersion from deps
    
    // Sync content to server
    const doSync = useCallback(async (content: string, force: boolean = false): Promise<boolean> => {
        if (!documentId || !userId) return false;
        
        setIsSyncing(true);
        
        try {
            const contentHash = await computeContentHash(content);
            
            // Skip if content hasn't changed (unless forced)
            if (!force && contentHash === lastSyncedHashRef.current) {
                setIsSyncing(false);
                return true;
            }
            
            // Check for conflicts (unless forced)
            if (!force) {
                const { hasConflict: conflict, serverState: state } = await checkForConflicts(documentId, localVersion);
                
                if (conflict && state) {
                    setHasConflict(true);
                    setServerState(state);
                    setServerVersion(state.version);
                    onConflict?.(localVersion, state);
                    setIsSyncing(false);
                    return false;
                }
            }
            
            // Update sync state
            const newState = await updateSyncState(documentId, userId, contentHash);
            
            if (newState) {
                setLocalVersion(newState.version);
                setServerVersion(newState.version);
                setServerState(newState);
                lastSyncedHashRef.current = contentHash;
                setHasConflict(false);
                onSyncComplete?.(newState);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error syncing content:', error);
            return false;
        } finally {
            setIsSyncing(false);
        }
    }, [documentId, userId, localVersion, onConflict, onSyncComplete]);
    
    // Debounced sync
    const debouncedSyncRef = useRef(
        debounce(async (content: string) => {
            await doSync(content);
        }, debounceMs)
    );
    
    // Update debounced function when dependencies change
    useEffect(() => {
        debouncedSyncRef.current = debounce(async (content: string) => {
            await doSync(content);
        }, debounceMs);
        
        return () => {
            debouncedSyncRef.current.cancel();
        };
    }, [doSync, debounceMs]);
    
    // Public sync function (debounced)
    const syncContent = useCallback(async (content: string): Promise<boolean> => {
        pendingContentRef.current = content;
        debouncedSyncRef.current(content);
        return true; // Return immediately, actual sync is debounced
    }, []);
    
    // Force save (immediate, no conflict check)
    const forceSave = useCallback(async (content: string): Promise<boolean> => {
        debouncedSyncRef.current.cancel();
        return doSync(content, true);
    }, [doSync]);
    
    // Refresh server state
    const refreshServerState = useCallback(async (): Promise<void> => {
        const state = await getDocumentSyncState(documentId);
        if (state) {
            setServerVersion(state.version);
            setServerState(state);
        }
    }, [documentId]);
    
    // Resolve conflict
    const resolveConflict = useCallback((resolution: 'keep-local' | 'take-server') => {
        if (resolution === 'keep-local') {
            // Force save local content
            if (pendingContentRef.current) {
                forceSave(pendingContentRef.current);
            }
        } else {
            // Accept server version
            if (serverState) {
                setLocalVersion(serverState.version);
            }
        }
        setHasConflict(false);
    }, [serverState, forceSave]);
    
    return {
        localVersion,
        serverVersion,
        isSyncing,
        hasConflict,
        serverState,
        syncContent,
        forceSave,
        refreshServerState,
        resolveConflict,
        computeHash: computeContentHash,
    };
}

export default useContentSync;

