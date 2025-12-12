/**
 * Presence Types
 * Types for real-time collaboration presence system.
 * 
 * ## RTC-2 & RTC-3 Compatibility
 * 
 * These types are designed to work with both:
 * - Current DynamoDB-based presence (RTC-2)
 * - Future Y.js awareness integration (RTC-3)
 * 
 * When Y.js is added, the awareness protocol will use similar
 * cursor/selection structures, allowing easy migration.
 */

// ============================================
// Presence Status
// ============================================

export type PresenceStatus = 'viewing' | 'editing' | 'idle' | 'disconnected';

// ============================================
// User Presence
// ============================================

export interface UserPresence {
    id: string;
    documentId: string;
    documentOwnerId: string;
    userId: string;
    userEmail?: string;
    userName?: string;
    userColor: string;
    status: PresenceStatus;
    lastHeartbeat: string;
    cursorPosition?: CursorPosition | null;
    selectionRange?: SelectionRange | null;
    sessionId?: string;
    joinedAt: string;
}

export interface CursorPosition {
    line: number;
    column: number;
}

export interface SelectionRange {
    start: CursorPosition;
    end: CursorPosition;
}

// ============================================
// Document Sync State
// ============================================

export interface DocumentSyncState {
    documentId: string;
    version: number;
    lastModifiedBy?: string;
    lastModifiedAt: string;
    contentHash?: string;
    lockedBy?: string | null;
    lockExpiresAt?: string | null;
}

// ============================================
// Presence Events
// ============================================

export interface PresenceJoinEvent {
    type: 'join';
    user: UserPresence;
}

export interface PresenceLeaveEvent {
    type: 'leave';
    userId: string;
    documentId: string;
}

export interface PresenceUpdateEvent {
    type: 'update';
    user: UserPresence;
}

export interface CursorMoveEvent {
    type: 'cursor';
    userId: string;
    documentId: string;
    position: CursorPosition | null;
    selection: SelectionRange | null;
}

export interface ContentSyncEvent {
    type: 'sync';
    documentId: string;
    version: number;
    content: string;
    modifiedBy: string;
}

export interface ConflictEvent {
    type: 'conflict';
    documentId: string;
    localVersion: number;
    serverVersion: number;
    serverContent: string;
    serverModifiedBy: string;
}

export type PresenceEvent = 
    | PresenceJoinEvent 
    | PresenceLeaveEvent 
    | PresenceUpdateEvent 
    | CursorMoveEvent
    | ContentSyncEvent
    | ConflictEvent;

// ============================================
// Presence Configuration
// ============================================

export const PRESENCE_CONFIG = {
    // How often to send heartbeats (ms)
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
    
    // How long before a user is considered disconnected (ms)
    PRESENCE_TIMEOUT: 60000, // 60 seconds
    
    // How often to check for stale presences (ms)
    CLEANUP_INTERVAL: 15000, // 15 seconds
    
    // Debounce time for cursor updates (ms)
    CURSOR_DEBOUNCE: 50,
    
    // Debounce time for content sync (ms)
    SYNC_DEBOUNCE: 1000, // 1 second
    
    // Lock expiration time (ms)
    LOCK_EXPIRATION: 300000, // 5 minutes
};

// ============================================
// User Colors
// ============================================

// Predefined colors for users (for cursors and avatars)
export const USER_COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#84CC16', // Lime
    '#22C55E', // Green
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#A855F7', // Purple
    '#EC4899', // Pink
];

/**
 * Get a deterministic color based on user ID
 */
export function getUserColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = ((hash << 5) - hash) + userId.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
    }
    const index = Math.abs(hash) % USER_COLORS.length;
    return USER_COLORS[index];
}

/**
 * Get user initials from name or email
 */
export function getUserInitials(name?: string, email?: string): string {
    if (name) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }
    if (email) {
        return email.substring(0, 2).toUpperCase();
    }
    return '??';
}

/**
 * Get display name for a user
 */
export function getDisplayName(name?: string, email?: string): string {
    if (name) return name;
    if (email) {
        const atIndex = email.indexOf('@');
        return atIndex > 0 ? email.substring(0, atIndex) : email;
    }
    return 'Anonymous';
}

// ============================================
// RTC-3: Y.js Awareness Types (Future)
// ============================================

/**
 * Y.js awareness state for a user
 * This will be used when Y.js is integrated in RTC-3
 */
export interface YjsAwarenessState {
    user: {
        id: string;
        name: string;
        email?: string;
        color: string;
    };
    cursor?: {
        anchor: number;  // Y.js relative position
        head: number;    // Y.js relative position
    };
    selection?: {
        anchor: number;
        head: number;
    };
}

/**
 * Comment types for RTC-3
 */
export interface CommentAnchor {
    from: number;  // ProseMirror position
    to: number;    // ProseMirror position
}

export type CommentStatus = 'active' | 'resolved' | 'deleted';

export interface CommentData {
    id: string;
    documentId: string;
    threadId?: string;
    parentCommentId?: string;
    authorId: string;
    authorName?: string;
    content: string;
    anchor?: CommentAnchor;
    anchorText?: string;
    status: CommentStatus;
    commentCreatedAt: string;  // Explicit timestamp for sorting
    createdAt: string;         // Auto-generated by DynamoDB
    editedAt?: string;
    resolvedBy?: string;
    resolvedAt?: string;
    replyCount: number;
}

/**
 * Document version types for RTC-3
 */
export type VersionChangeType = 
    | 'auto_save' 
    | 'manual_save' 
    | 'before_ai_edit' 
    | 'rollback' 
    | 'merge';

export interface DocumentVersionData {
    id: string;
    documentId: string;
    versionNumber: number;
    content: string;
    contentHash?: string;
    title?: string;
    metadata?: Record<string, unknown>;
    createdBy: string;
    createdByName?: string;
    changeType: VersionChangeType;
    changeDescription?: string;
    versionCreatedAt: string;  // Explicit timestamp for sorting
    createdAt: string;         // Auto-generated by DynamoDB
    contentLength?: number;
    wordCount?: number;
}

