/**
 * Presence Service
 * Manages real-time presence tracking for document collaboration.
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type {
    UserPresence,
    PresenceStatus,
    CursorPosition,
    SelectionRange,
    DocumentSyncState,
} from './presenceTypes';
import { PRESENCE_CONFIG, getUserColor } from './presenceTypes';

// Valid presence statuses for validation
const VALID_STATUSES: PresenceStatus[] = ['viewing', 'editing', 'idle', 'disconnected'];

/**
 * Validate and normalize presence status
 */
function validateStatus(status: unknown): PresenceStatus {
    if (typeof status === 'string' && VALID_STATUSES.includes(status as PresenceStatus)) {
        return status as PresenceStatus;
    }
    return 'viewing'; // Default fallback
}
import { v4 as uuidv4 } from 'uuid';

// Lazy client initialization
let _client: ReturnType<typeof generateClient<Schema>> | null = null;
function getClient() {
    if (!_client) {
        _client = generateClient<Schema>();
    }
    return _client;
}

// ============================================
// Presence State Management
// ============================================

interface PresenceServiceState {
    currentPresenceId: string | null;
    documentId: string | null;
    heartbeatInterval: ReturnType<typeof setInterval> | null;
    cleanupInterval: ReturnType<typeof setInterval> | null;
    sessionId: string;
    subscribers: Set<(presences: UserPresence[]) => void>;
    syncSubscribers: Set<(state: DocumentSyncState) => void>;
    // AppSync subscription for real-time updates
    presenceSubscription: { unsubscribe: () => void } | null;
}

const state: PresenceServiceState = {
    currentPresenceId: null,
    documentId: null,
    heartbeatInterval: null,
    cleanupInterval: null,
    sessionId: uuidv4(),
    subscribers: new Set(),
    syncSubscribers: new Set(),
    presenceSubscription: null,
};

// ============================================
// Presence Operations
// ============================================

/**
 * Join a document as a viewer/editor
 */
export async function joinDocument(
    documentId: string,
    documentOwnerId: string,
    userId: string,
    userEmail?: string,
    userName?: string
): Promise<UserPresence | null> {
    const client = getClient();
    
    try {
        // Check for existing presence from this user/session
        await leaveCurrentDocument();
        
        const now = new Date().toISOString();
        
        const presence: Omit<UserPresence, 'id'> = {
            documentId,
            documentOwnerId,
            userId,
            userEmail,
            userName,
            userColor: getUserColor(userId),
            status: 'viewing',
            lastHeartbeat: now,
            cursorPosition: null,
            selectionRange: null,
            sessionId: state.sessionId,
            joinedAt: now,
        };
        
        const result = await client.models.DocumentPresence.create({
            documentId: presence.documentId,
            documentOwnerId: presence.documentOwnerId,
            userId: presence.userId,
            userEmail: presence.userEmail,
            userName: presence.userName,
            userColor: presence.userColor,
            status: presence.status,
            lastHeartbeat: presence.lastHeartbeat,
            cursorPosition: presence.cursorPosition,
            selectionRange: presence.selectionRange,
            sessionId: presence.sessionId,
            joinedAt: presence.joinedAt,
        });
        
        if (result.data) {
            state.currentPresenceId = result.data.id;
            state.documentId = documentId;
            
            // Start heartbeat
            startHeartbeat();
            
            // Start cleanup of stale presences
            startCleanup(documentId);
            
            // Start AppSync subscription for real-time presence updates
            startPresenceSubscription(documentId);
            
            return {
                id: result.data.id,
                ...presence,
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error joining document:', error);
        return null;
    }
}

/**
 * Leave the current document
 */
export async function leaveCurrentDocument(): Promise<void> {
    if (!state.currentPresenceId) return;
    
    const client = getClient();
    
    try {
        await client.models.DocumentPresence.delete({
            id: state.currentPresenceId,
        });
    } catch (error) {
        console.error('Error leaving document:', error);
    } finally {
        stopHeartbeat();
        stopCleanup();
        stopPresenceSubscription();
        // Clean up status update timeout
        if (statusUpdateTimeout) {
            clearTimeout(statusUpdateTimeout);
            statusUpdateTimeout = null;
        }
        pendingStatusUpdate = null;
        state.currentPresenceId = null;
        state.documentId = null;
    }
}

// Throttle status updates to prevent rapid toggling
let lastStatusUpdate = 0;
let pendingStatusUpdate: PresenceStatus | null = null;
let statusUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
const STATUS_UPDATE_THROTTLE_MS = 2000; // Only update status every 2 seconds

/**
 * Update presence status (throttled to prevent rapid toggling)
 */
export async function updateStatus(status: PresenceStatus): Promise<void> {
    if (!state.currentPresenceId) return;
    
    const now = Date.now();
    const timeSinceLastUpdate = now - lastStatusUpdate;
    
    // Store the latest status
    pendingStatusUpdate = status;
    
    // Clear any pending update
    if (statusUpdateTimeout) {
        clearTimeout(statusUpdateTimeout);
        statusUpdateTimeout = null;
    }
    
    if (timeSinceLastUpdate >= STATUS_UPDATE_THROTTLE_MS) {
        // Enough time has passed, update immediately
        lastStatusUpdate = now;
        await doUpdateStatus(status);
        pendingStatusUpdate = null;
    } else {
        // Schedule update for remaining time
        statusUpdateTimeout = setTimeout(async () => {
            if (pendingStatusUpdate) {
                lastStatusUpdate = Date.now();
                await doUpdateStatus(pendingStatusUpdate);
                pendingStatusUpdate = null;
            }
            statusUpdateTimeout = null;
        }, STATUS_UPDATE_THROTTLE_MS - timeSinceLastUpdate);
    }
}

/**
 * Internal function to actually perform the status update
 */
async function doUpdateStatus(status: PresenceStatus): Promise<void> {
    if (!state.currentPresenceId) return;
    
    const client = getClient();
    
    try {
        await client.models.DocumentPresence.update({
            id: state.currentPresenceId,
            status,
            lastHeartbeat: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

/**
 * Update cursor position
 */
export async function updateCursor(
    position: CursorPosition | null,
    selection: SelectionRange | null
): Promise<void> {
    if (!state.currentPresenceId) return;
    
    const client = getClient();
    
    try {
        console.log('[Presence] Sending cursor update:', position);
        await client.models.DocumentPresence.update({
            id: state.currentPresenceId,
            cursorPosition: position,
            selectionRange: selection,
            lastHeartbeat: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error updating cursor:', error);
    }
}

// ============================================
// Throttled Cursor Updates
// ============================================

let cursorUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
let lastCursorUpdate = 0;
const CURSOR_THROTTLE_MS = 100; // 100ms throttle for cursor updates

/**
 * Throttled cursor position update
 * Call this frequently (e.g., on every selection change) - it will throttle automatically
 */
export function updateCursorThrottled(
    position: number,
    selection?: { from: number; to: number }
): void {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastCursorUpdate;
    
    // Convert position to CursorPosition format
    const cursorPos: CursorPosition = { line: 0, column: position };
    const selectionRange: SelectionRange | null = selection
        ? { start: { line: 0, column: selection.from }, end: { line: 0, column: selection.to } }
        : null;
    
    // Clear any pending update
    if (cursorUpdateTimeout) {
        clearTimeout(cursorUpdateTimeout);
        cursorUpdateTimeout = null;
    }
    
    if (timeSinceLastUpdate >= CURSOR_THROTTLE_MS) {
        // Enough time has passed, update immediately
        lastCursorUpdate = now;
        void updateCursor(cursorPos, selectionRange);
    } else {
        // Schedule update for remaining time
        cursorUpdateTimeout = setTimeout(() => {
            lastCursorUpdate = Date.now();
            cursorUpdateTimeout = null;
            void updateCursor(cursorPos, selectionRange);
        }, CURSOR_THROTTLE_MS - timeSinceLastUpdate);
    }
}

// ============================================
// Cursor Data Conversion
// ============================================

/**
 * Convert presences to cursor data for TipTap extension
 */
export interface TipTapCursorData {
    id: string;
    name: string;
    color: string;
    position: number;
    selection?: {
        from: number;
        to: number;
    };
}

export function presencesToCursors(presences: UserPresence[]): TipTapCursorData[] {
    return presences
        .filter(p => p.cursorPosition != null && p.cursorPosition !== undefined) // Only include presences with cursor data
        .map(p => {
            const cursorPos = p.cursorPosition as CursorPosition | null;
            const selRange = p.selectionRange as SelectionRange | null;
            
            // Log for debugging cursor sync
            console.log('[Presence] Cursor data for', p.userName || p.userEmail, ':', cursorPos);
            
            return {
                id: p.userId,
                name: p.userName || p.userEmail || 'Anonymous',
                color: p.userColor,
                position: cursorPos?.column ?? 0,
                selection: selRange ? {
                    from: selRange.start.column,
                    to: selRange.end.column,
                } : undefined,
            };
        });
}

/**
 * Get current session ID
 */
export function getCurrentSessionId(): string {
    return state.sessionId;
}

/**
 * Get all active presences for a document
 */
export async function getDocumentPresences(documentId: string): Promise<UserPresence[]> {
    const client = getClient();
    
    try {
        const result = await client.models.DocumentPresence.list({
            filter: {
                documentId: { eq: documentId },
            },
        });
        
        if (!result.data) return [];
        
        const cutoff = new Date(Date.now() - PRESENCE_CONFIG.PRESENCE_TIMEOUT).toISOString();
        
        // Filter out stale presences
        return result.data
            .filter(p => p.lastHeartbeat && p.lastHeartbeat > cutoff)
            .map(p => ({
                id: p.id,
                documentId: p.documentId,
                documentOwnerId: p.documentOwnerId,
                userId: p.userId,
                userEmail: p.userEmail ?? undefined,
                userName: p.userName ?? undefined,
                userColor: p.userColor ?? getUserColor(p.userId),
                status: validateStatus(p.status),
                lastHeartbeat: p.lastHeartbeat,
                cursorPosition: p.cursorPosition as CursorPosition | null,
                selectionRange: p.selectionRange as SelectionRange | null,
                sessionId: p.sessionId ?? undefined,
                joinedAt: p.joinedAt,
            }));
    } catch (error) {
        console.error('Error getting presences:', error);
        return [];
    }
}

// ============================================
// Heartbeat Management
// ============================================

function startHeartbeat(): void {
    stopHeartbeat();
    
    state.heartbeatInterval = setInterval(async () => {
        if (!state.currentPresenceId) return;
        
        const client = getClient();
        
        try {
            await client.models.DocumentPresence.update({
                id: state.currentPresenceId,
                lastHeartbeat: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Heartbeat failed:', error);
        }
    }, PRESENCE_CONFIG.HEARTBEAT_INTERVAL);
}

function stopHeartbeat(): void {
    if (state.heartbeatInterval) {
        clearInterval(state.heartbeatInterval);
        state.heartbeatInterval = null;
    }
}

// ============================================
// Cleanup Stale Presences
// ============================================

function startCleanup(documentId: string): void {
    stopCleanup();
    
    state.cleanupInterval = setInterval(async () => {
        await cleanupStalePresences(documentId);
        
        // Notify subscribers with updated presences
        const presences = await getDocumentPresences(documentId);
        state.subscribers.forEach(cb => cb(presences));
    }, PRESENCE_CONFIG.CLEANUP_INTERVAL);
}

function stopCleanup(): void {
    if (state.cleanupInterval) {
        clearInterval(state.cleanupInterval);
        state.cleanupInterval = null;
    }
}

// ============================================
// AppSync Real-Time Subscription
// ============================================

/**
 * Start AppSync subscription for real-time presence updates
 * This enables live cursor positions to be received instantly
 */
function startPresenceSubscription(documentId: string): void {
    stopPresenceSubscription();
    
    const client = getClient();
    const subscriptions: Array<{ unsubscribe: () => void }> = [];
    
    try {
        // Handler for presence changes
        // Note: Must be synchronous wrapper to handle async operations safely
        const handlePresenceChange = (data: unknown, eventType: string) => {
            // Use void to fire-and-forget the async operation
            // Errors are caught and logged internally
            void (async () => {
                try {
                    const presenceData = data as { 
                        sessionId?: string; 
                        userId?: string; 
                        status?: string;
                        cursorPosition?: unknown;
                        userName?: string;
                    } | null;
                    if (!presenceData) return;
                    
                    // Don't process our own updates
                    if (presenceData.sessionId === state.sessionId) return;
                    
                    // Verify we're still subscribed to the same document
                    if (state.documentId !== documentId) {
                        console.warn('[Presence] Received update for different document, ignoring');
                        return;
                    }
                    
                    // Enhanced logging for debugging
                    const cursorInfo = presenceData.cursorPosition 
                        ? `cursor: ${JSON.stringify(presenceData.cursorPosition)}`
                        : 'no cursor';
                    console.log(`[Presence] Real-time ${eventType}:`, presenceData.userName || presenceData.userId, presenceData.status, cursorInfo);
                    
                    // Fetch all presences and notify subscribers
                    const presences = await getDocumentPresences(documentId);
                    
                    // Double-check documentId hasn't changed during async operation
                    if (state.documentId === documentId) {
                        state.subscribers.forEach(cb => {
                            try {
                                cb(presences);
                            } catch (error) {
                                console.error('[Presence] Subscriber callback error:', error);
                            }
                        });
                    }
                } catch (error) {
                    console.error(`[Presence] Error handling ${eventType} event:`, error);
                }
            })();
        };
        
        // Subscribe to presence updates (cursor moves, status changes)
        const updateSub = client.models.DocumentPresence.onUpdate({
            filter: {
                documentId: { eq: documentId },
            },
        });
        
        subscriptions.push(updateSub.subscribe({
            next: (data) => handlePresenceChange(data, 'update'),
            error: (error) => {
                console.error('[Presence] Update subscription error:', error);
                // Attempt to restart subscription on error
                if (state.documentId === documentId) {
                    console.log('[Presence] Attempting to restart subscription...');
                    setTimeout(() => {
                        if (state.documentId === documentId) {
                            startPresenceSubscription(documentId);
                        }
                    }, 5000);
                }
            },
        }));
        
        // Subscribe to new users joining
        const createSub = client.models.DocumentPresence.onCreate({
            filter: {
                documentId: { eq: documentId },
            },
        });
        
        subscriptions.push(createSub.subscribe({
            next: (data) => handlePresenceChange(data, 'create'),
            error: (error) => {
                console.error('[Presence] Create subscription error:', error);
            },
        }));
        
        // Subscribe to users leaving
        const deleteSub = client.models.DocumentPresence.onDelete({
            filter: {
                documentId: { eq: documentId },
            },
        });
        
        subscriptions.push(deleteSub.subscribe({
            next: (data) => handlePresenceChange(data, 'delete'),
            error: (error) => {
                console.error('[Presence] Delete subscription error:', error);
            },
        }));
        
        // Store combined unsubscribe
        state.presenceSubscription = {
            unsubscribe: () => {
                subscriptions.forEach(sub => {
                    try {
                        sub.unsubscribe();
                    } catch (error) {
                        console.error('[Presence] Error unsubscribing:', error);
                    }
                });
            },
        };
        
        console.log('[Presence] Real-time subscriptions started for document:', documentId);
    } catch (error) {
        console.error('[Presence] Failed to start subscriptions:', error);
        // Clean up any subscriptions that were created before the error
        subscriptions.forEach(sub => {
            try {
                sub.unsubscribe();
            } catch (unsubError) {
                console.error('[Presence] Error cleaning up failed subscription:', unsubError);
            }
        });
        state.presenceSubscription = null;
    }
}

/**
 * Stop the presence subscription
 */
function stopPresenceSubscription(): void {
    if (state.presenceSubscription) {
        state.presenceSubscription.unsubscribe();
        state.presenceSubscription = null;
        console.log('[Presence] Real-time subscription stopped');
    }
}

async function cleanupStalePresences(documentId: string): Promise<void> {
    const client = getClient();
    
    try {
        const result = await client.models.DocumentPresence.list({
            filter: {
                documentId: { eq: documentId },
            },
        });
        
        if (!result.data) return;
        
        const cutoff = new Date(Date.now() - PRESENCE_CONFIG.PRESENCE_TIMEOUT).toISOString();
        
        // Delete stale presences (but not our own)
        for (const presence of result.data) {
            if (presence.lastHeartbeat && presence.lastHeartbeat < cutoff && presence.id !== state.currentPresenceId) {
                try {
                    await client.models.DocumentPresence.delete({ id: presence.id });
                } catch {
                    // Ignore deletion errors
                }
            }
        }
    } catch (error) {
        console.error('Error cleaning up presences:', error);
    }
}

// ============================================
// Subscription Management
// ============================================

/**
 * Subscribe to presence updates for a document
 */
export function subscribeToPresences(callback: (presences: UserPresence[]) => void): () => void {
    state.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
        state.subscribers.delete(callback);
    };
}

/**
 * Manually refresh presences
 */
export async function refreshPresences(): Promise<UserPresence[]> {
    if (!state.documentId) return [];
    
    const presences = await getDocumentPresences(state.documentId);
    state.subscribers.forEach(cb => cb(presences));
    return presences;
}

// ============================================
// Document Sync State
// ============================================

/**
 * Get or create sync state for a document
 */
export async function getDocumentSyncState(documentId: string): Promise<DocumentSyncState | null> {
    const client = getClient();
    
    try {
        const result = await client.models.DocumentSyncState.get({ documentId });
        
        if (result.data) {
            return {
                documentId: result.data.documentId,
                version: result.data.version,
                lastModifiedBy: result.data.lastModifiedBy ?? undefined,
                lastModifiedAt: result.data.lastModifiedAt,
                contentHash: result.data.contentHash ?? undefined,
                lockedBy: result.data.lockedBy ?? null,
                lockExpiresAt: result.data.lockExpiresAt ?? null,
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error getting sync state:', error);
        return null;
    }
}

/**
 * Initialize sync state for a document
 */
export async function initializeSyncState(
    documentId: string,
    userId: string,
    contentHash?: string
): Promise<DocumentSyncState | null> {
    const client = getClient();
    
    try {
        const now = new Date().toISOString();
        
        const result = await client.models.DocumentSyncState.create({
            documentId,
            version: 1,
            lastModifiedBy: userId,
            lastModifiedAt: now,
            contentHash,
            lockedBy: null,
            lockExpiresAt: null,
        });
        
        if (result.data) {
            return {
                documentId: result.data.documentId,
                version: result.data.version,
                lastModifiedBy: result.data.lastModifiedBy ?? undefined,
                lastModifiedAt: result.data.lastModifiedAt,
                contentHash: result.data.contentHash ?? undefined,
                lockedBy: result.data.lockedBy ?? null,
                lockExpiresAt: result.data.lockExpiresAt ?? null,
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error initializing sync state:', error);
        return null;
    }
}

/**
 * Update sync state (increment version)
 */
export async function updateSyncState(
    documentId: string,
    userId: string,
    contentHash?: string
): Promise<DocumentSyncState | null> {
    const client = getClient();
    
    try {
        // Get current state
        const current = await getDocumentSyncState(documentId);
        
        if (!current) {
            // Initialize if doesn't exist
            return initializeSyncState(documentId, userId, contentHash);
        }
        
        const now = new Date().toISOString();
        const newVersion = current.version + 1;
        
        const result = await client.models.DocumentSyncState.update({
            documentId,
            version: newVersion,
            lastModifiedBy: userId,
            lastModifiedAt: now,
            contentHash,
        });
        
        if (result.data) {
            const syncState: DocumentSyncState = {
                documentId: result.data.documentId,
                version: result.data.version,
                lastModifiedBy: result.data.lastModifiedBy ?? undefined,
                lastModifiedAt: result.data.lastModifiedAt,
                contentHash: result.data.contentHash ?? undefined,
                lockedBy: result.data.lockedBy ?? null,
                lockExpiresAt: result.data.lockExpiresAt ?? null,
            };
            
            // Notify sync subscribers
            state.syncSubscribers.forEach(cb => cb(syncState));
            
            return syncState;
        }
        
        return null;
    } catch (error) {
        console.error('Error updating sync state:', error);
        return null;
    }
}

/**
 * Check for conflicts before saving
 */
export async function checkForConflicts(
    documentId: string,
    localVersion: number
): Promise<{ hasConflict: boolean; serverState: DocumentSyncState | null }> {
    const serverState = await getDocumentSyncState(documentId);
    
    if (!serverState) {
        return { hasConflict: false, serverState: null };
    }
    
    const hasConflict = serverState.version > localVersion;
    
    return { hasConflict, serverState };
}

/**
 * Acquire edit lock for a document
 */
export async function acquireEditLock(
    documentId: string,
    userId: string
): Promise<boolean> {
    const client = getClient();
    
    try {
        const current = await getDocumentSyncState(documentId);
        
        if (!current) {
            // Initialize with lock
            const result = await initializeSyncState(documentId, userId);
            if (result) {
                await client.models.DocumentSyncState.update({
                    documentId,
                    lockedBy: userId,
                    lockExpiresAt: new Date(Date.now() + PRESENCE_CONFIG.LOCK_EXPIRATION).toISOString(),
                });
                return true;
            }
            return false;
        }
        
        // Check if already locked by someone else
        if (current.lockedBy && current.lockedBy !== userId) {
            const lockExpires = current.lockExpiresAt ? new Date(current.lockExpiresAt) : null;
            if (lockExpires && lockExpires > new Date()) {
                // Lock is still valid
                return false;
            }
        }
        
        // Acquire or refresh lock
        await client.models.DocumentSyncState.update({
            documentId,
            lockedBy: userId,
            lockExpiresAt: new Date(Date.now() + PRESENCE_CONFIG.LOCK_EXPIRATION).toISOString(),
        });
        
        return true;
    } catch (error) {
        console.error('Error acquiring lock:', error);
        return false;
    }
}

/**
 * Release edit lock for a document
 */
export async function releaseEditLock(
    documentId: string,
    userId: string
): Promise<boolean> {
    const client = getClient();
    
    try {
        const current = await getDocumentSyncState(documentId);
        
        if (!current || current.lockedBy !== userId) {
            return false;
        }
        
        await client.models.DocumentSyncState.update({
            documentId,
            lockedBy: null,
            lockExpiresAt: null,
        });
        
        return true;
    } catch (error) {
        console.error('Error releasing lock:', error);
        return false;
    }
}

/**
 * Subscribe to sync state updates
 */
export function subscribeToSyncState(callback: (state: DocumentSyncState) => void): () => void {
    state.syncSubscribers.add(callback);
    
    return () => {
        state.syncSubscribers.delete(callback);
    };
}

// ============================================
// Cleanup on Window Close
// ============================================

// Track if listeners are already added (for HMR safety)
let listenersAdded = false;

function setupWindowListeners(): void {
    if (typeof window === 'undefined' || listenersAdded) return;
    
    listenersAdded = true;
    
    // Note: beforeunload doesn't wait for async operations to complete.
    // The presence record may not be deleted immediately, but the cleanup
    // mechanism will remove stale presences after PRESENCE_TIMEOUT.
    window.addEventListener('beforeunload', () => {
        // Attempt to leave, but this may not complete before page closes
        leaveCurrentDocument();
    });
    
    window.addEventListener('visibilitychange', () => {
        if (!state.currentPresenceId) return;
        
        if (document.visibilityState === 'hidden') {
            updateStatus('idle');
        } else if (document.visibilityState === 'visible') {
            updateStatus('viewing');
        }
    });
}

// Initialize listeners
setupWindowListeners();

