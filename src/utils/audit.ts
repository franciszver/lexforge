/**
 * Audit Utility Functions
 * 
 * Provides easy-to-use functions for logging audit events throughout the application.
 * These functions wrap the auditSlice thunks for convenience.
 */

import { store } from '../store';
import { logAuditEvent, type AuditEventType, type AuditAction } from '../features/auditSlice';

// ============================================
// Types
// ============================================

interface AuditEventParams {
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
}

// ============================================
// Core Dispatch Function
// ============================================

/**
 * Dispatch an audit event to be logged
 * This is fire-and-forget - it won't block the calling operation
 * 
 * Note: We use setTimeout to defer the dispatch because audit functions
 * may be called from within Redux reducers (extraReducers), and dispatching
 * from inside a reducer is not allowed.
 */
export function dispatchAuditEvent(
    eventType: AuditEventType,
    action: AuditAction,
    params?: AuditEventParams
): void {
    // Defer dispatch to next tick to avoid "Reducers may not dispatch actions" error
    // This is safe because audit logging is fire-and-forget
    setTimeout(() => {
        store.dispatch(logAuditEvent({
            eventType,
            action,
            resourceType: params?.resourceType,
            resourceId: params?.resourceId,
            metadata: params?.metadata,
        }));
    }, 0);
}

// ============================================
// Document Events
// ============================================

export const auditDocument = {
    created: (documentId: string, metadata?: Record<string, unknown>) => {
        dispatchAuditEvent('DOCUMENT_CREATE', 'create', {
            resourceType: 'draft',
            resourceId: documentId,
            metadata,
        });
    },

    read: (documentId: string) => {
        dispatchAuditEvent('DOCUMENT_READ', 'read', {
            resourceType: 'draft',
            resourceId: documentId,
        });
    },

    updated: (documentId: string, metadata?: Record<string, unknown>) => {
        dispatchAuditEvent('DOCUMENT_UPDATE', 'update', {
            resourceType: 'draft',
            resourceId: documentId,
            metadata,
        });
    },

    deleted: (documentId: string) => {
        dispatchAuditEvent('DOCUMENT_DELETE', 'delete', {
            resourceType: 'draft',
            resourceId: documentId,
        });
    },

    exported: (documentId: string, format: string) => {
        dispatchAuditEvent('DOCUMENT_EXPORT', 'export', {
            resourceType: 'draft',
            resourceId: documentId,
            metadata: { format },
        });
    },

    shared: (documentId: string, shareType: string, sharedWith?: string) => {
        dispatchAuditEvent('DOCUMENT_SHARE', 'share', {
            resourceType: 'draft',
            resourceId: documentId,
            metadata: { shareType, sharedWith },
        });
    },

    duplicated: (originalId: string, newId: string) => {
        dispatchAuditEvent('DOCUMENT_DUPLICATE', 'create', {
            resourceType: 'draft',
            resourceId: newId,
            metadata: { duplicatedFrom: originalId },
        });
    },
};

// ============================================
// AI Events
// ============================================

export const auditAI = {
    suggestionsGenerated: (documentId: string, suggestionCount: number, context?: Record<string, unknown>) => {
        dispatchAuditEvent('AI_SUGGESTION_GENERATED', 'generate', {
            resourceType: 'ai_suggestion',
            resourceId: documentId,
            metadata: { suggestionCount, ...context },
        });
    },

    suggestionAccepted: (documentId: string, suggestionId: string, suggestionType?: string) => {
        dispatchAuditEvent('AI_SUGGESTION_ACCEPTED', 'accept', {
            resourceType: 'ai_suggestion',
            resourceId: suggestionId,
            metadata: { documentId, suggestionType },
        });
    },

    suggestionRejected: (documentId: string, suggestionId: string, suggestionType?: string) => {
        dispatchAuditEvent('AI_SUGGESTION_REJECTED', 'reject', {
            resourceType: 'ai_suggestion',
            resourceId: suggestionId,
            metadata: { documentId, suggestionType },
        });
    },

    feedbackSubmitted: (suggestionId: string, feedback: 'up' | 'down') => {
        dispatchAuditEvent('AI_FEEDBACK_SUBMITTED', 'create', {
            resourceType: 'ai_feedback',
            resourceId: suggestionId,
            metadata: { feedback },
        });
    },
};

// ============================================
// Auth Events
// ============================================

export const auditAuth = {
    login: (userId: string, email?: string) => {
        dispatchAuditEvent('AUTH_LOGIN', 'login', {
            resourceType: 'user',
            resourceId: userId,
            metadata: { email },
        });
    },

    logout: (userId: string) => {
        dispatchAuditEvent('AUTH_LOGOUT', 'logout', {
            resourceType: 'user',
            resourceId: userId,
        });
    },

    signup: (userId: string, email?: string) => {
        dispatchAuditEvent('AUTH_SIGNUP', 'create', {
            resourceType: 'user',
            resourceId: userId,
            metadata: { email },
        });
    },

    passwordReset: (email: string) => {
        dispatchAuditEvent('AUTH_PASSWORD_RESET', 'update', {
            resourceType: 'user',
            metadata: { email },
        });
    },
};

// ============================================
// Template Events
// ============================================

export const auditTemplate = {
    created: (templateId: string, templateName: string) => {
        dispatchAuditEvent('TEMPLATE_CREATE', 'create', {
            resourceType: 'template',
            resourceId: templateId,
            metadata: { templateName },
        });
    },

    updated: (templateId: string, templateName: string) => {
        dispatchAuditEvent('TEMPLATE_UPDATE', 'update', {
            resourceType: 'template',
            resourceId: templateId,
            metadata: { templateName },
        });
    },

    deleted: (templateId: string) => {
        dispatchAuditEvent('TEMPLATE_DELETE', 'delete', {
            resourceType: 'template',
            resourceId: templateId,
        });
    },
};

// ============================================
// Snapshot Events
// ============================================

export const auditSnapshot = {
    created: (documentId: string, snapshotId: string, isAutoSave: boolean) => {
        dispatchAuditEvent('SNAPSHOT_CREATE', 'create', {
            resourceType: 'snapshot',
            resourceId: snapshotId,
            metadata: { documentId, isAutoSave },
        });
    },

    restored: (documentId: string, snapshotId: string) => {
        dispatchAuditEvent('SNAPSHOT_RESTORE', 'update', {
            resourceType: 'snapshot',
            resourceId: snapshotId,
            metadata: { documentId },
        });
    },
};

// ============================================
// Admin Events
// ============================================

export const auditAdmin = {
    accessed: (section: string) => {
        dispatchAuditEvent('ADMIN_ACCESS', 'read', {
            resourceType: 'admin',
            metadata: { section },
        });
    },
};

