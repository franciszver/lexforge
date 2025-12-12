import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

// ============================================
// Types
// ============================================

export type AuditEventType =
    | 'AUTH_LOGIN'
    | 'AUTH_LOGOUT'
    | 'AUTH_SIGNUP'
    | 'AUTH_PASSWORD_RESET'
    | 'DOCUMENT_CREATE'
    | 'DOCUMENT_READ'
    | 'DOCUMENT_UPDATE'
    | 'DOCUMENT_DELETE'
    | 'DOCUMENT_EXPORT'
    | 'DOCUMENT_SHARE'
    | 'DOCUMENT_DUPLICATE'
    | 'AI_SUGGESTION_GENERATED'
    | 'AI_SUGGESTION_ACCEPTED'
    | 'AI_SUGGESTION_REJECTED'
    | 'AI_FEEDBACK_SUBMITTED'
    | 'TEMPLATE_CREATE'
    | 'TEMPLATE_UPDATE'
    | 'TEMPLATE_DELETE'
    | 'SNAPSHOT_CREATE'
    | 'SNAPSHOT_RESTORE'
    | 'ADMIN_ACCESS';

export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'share' | 'generate' | 'accept' | 'reject' | 'login' | 'logout';

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    userId: string;
    userEmail?: string;
    eventType: AuditEventType;
    action: AuditAction;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    previousHash?: string;
    hash?: string;
}

export interface AuditLogFilter {
    userId?: string;
    eventType?: AuditEventType;
    resourceId?: string;
    startDate?: string;
    endDate?: string;
}

interface AuditState {
    logs: AuditLogEntry[];
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
    nextToken: string | null;
    filters: AuditLogFilter;
    // Track pending audit events for retry
    pendingEvents: Array<{
        eventType: AuditEventType;
        action: AuditAction;
        resourceType?: string;
        resourceId?: string;
        metadata?: Record<string, unknown>;
    }>;
}

const initialState: AuditState = {
    logs: [],
    loading: false,
    loadingMore: false,
    error: null,
    nextToken: null,
    filters: {},
    pendingEvents: [],
};

// ============================================
// Lazy Client Initialization
// ============================================

let _client: ReturnType<typeof generateClient<Schema>> | null = null;
function getClient() {
    if (!_client) {
        _client = generateClient<Schema>();
    }
    return _client;
}

// ============================================
// Async Thunks
// ============================================

/**
 * Compute SHA-256 hash for audit entry integrity
 */
async function computeHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get the previous hash for chain integrity
 */
async function getPreviousHash(client: ReturnType<typeof getClient>, userId: string): Promise<string> {
    try {
        // Query the most recent audit log for this user
        const result = await client.models.AuditLog.listAuditLogByUserIdAndTimestamp(
            { userId },
            { sortDirection: 'DESC', limit: 1 }
        );
        
        if (result.data && result.data.length > 0 && result.data[0].hash) {
            return result.data[0].hash;
        }
        return 'GENESIS';
    } catch {
        return 'GENESIS';
    }
}

/**
 * Log an audit event by creating an AuditLog entry directly
 * Hash chaining is computed client-side for simplicity
 */
export const logAuditEvent = createAsyncThunk(
    'audit/logEvent',
    async (
        {
            eventType,
            action,
            resourceType,
            resourceId,
            metadata,
        }: {
            eventType: AuditEventType;
            action: AuditAction;
            resourceType?: string;
            resourceId?: string;
            metadata?: Record<string, unknown>;
        },
        { rejectWithValue }
    ) => {
        try {
            const client = getClient();
            const timestamp = new Date().toISOString();
            
            // Get user ID from current session (will be set by owner auth)
            // For now, use a placeholder - Amplify will set the actual owner
            const userId = 'current-user'; // Owner auth handles this
            
            // Get previous hash for chain integrity
            const previousHash = await getPreviousHash(client, userId);
            
            // Compute hash of this entry
            const hashInput = JSON.stringify({
                timestamp,
                userId,
                eventType,
                action,
                resourceType,
                resourceId,
                metadata,
                previousHash,
            });
            const hash = await computeHash(hashInput);
            
            // Create the audit log entry using the model
            const { data, errors } = await client.models.AuditLog.create({
                timestamp,
                userId,
                eventType,
                action,
                resourceType,
                resourceId,
                metadata: metadata ? JSON.stringify(metadata) : undefined,
                previousHash,
                hash,
            });

            if (errors) {
                console.error('Audit log errors:', errors);
                return rejectWithValue('Failed to log audit event');
            }

            console.log('Audit event logged:', eventType, action, resourceId);
            
            // Map the response to our interface
            const entry: AuditLogEntry = {
                id: data!.id,
                timestamp: data!.timestamp,
                userId: data!.userId,
                userEmail: data!.userEmail || undefined,
                eventType: data!.eventType as AuditEventType,
                action: data!.action as AuditAction,
                resourceType: data!.resourceType || undefined,
                resourceId: data!.resourceId || undefined,
                metadata: data!.metadata ? JSON.parse(data!.metadata as string) : undefined,
                previousHash: data!.previousHash || undefined,
                hash: data!.hash || undefined,
            };
            
            return entry;
        } catch (error) {
            console.error('Error logging audit event:', error);
            return rejectWithValue('Failed to log audit event');
        }
    }
);

/**
 * Fetch audit logs with optional filters (Admin only)
 */
export const fetchAuditLogs = createAsyncThunk(
    'audit/fetchLogs',
    async (
        {
            filters,
            limit = 50,
            nextToken,
        }: {
            filters?: AuditLogFilter;
            limit?: number;
            nextToken?: string | null;
        },
        { rejectWithValue }
    ) => {
        try {
            const client = getClient();
            
            // Build filter based on provided criteria
            let result;
            
            if (filters?.userId) {
                // Query by userId using GSI
                result = await client.models.AuditLog.listAuditLogByUserIdAndTimestamp(
                    { userId: filters.userId },
                    {
                        sortDirection: 'DESC',
                        limit,
                        nextToken: nextToken || undefined,
                    }
                );
            } else if (filters?.eventType) {
                // Query by eventType using GSI
                result = await client.models.AuditLog.listAuditLogByEventTypeAndTimestamp(
                    { eventType: filters.eventType },
                    {
                        sortDirection: 'DESC',
                        limit,
                        nextToken: nextToken || undefined,
                    }
                );
            } else if (filters?.resourceId) {
                // Query by resourceId using GSI
                result = await client.models.AuditLog.listAuditLogByResourceIdAndTimestamp(
                    { resourceId: filters.resourceId },
                    {
                        sortDirection: 'DESC',
                        limit,
                        nextToken: nextToken || undefined,
                    }
                );
            } else {
                // Default: list all (with pagination)
                result = await client.models.AuditLog.list({
                    limit,
                    nextToken: nextToken || undefined,
                });
            }

            if (result.errors) {
                console.error('Error fetching audit logs:', result.errors);
                return rejectWithValue('Failed to fetch audit logs');
            }

            // Filter by date range client-side if needed
            let logs = (result.data || []) as AuditLogEntry[];
            
            if (filters?.startDate || filters?.endDate) {
                logs = logs.filter((log) => {
                    const logDate = new Date(log.timestamp);
                    if (filters.startDate && logDate < new Date(filters.startDate)) {
                        return false;
                    }
                    if (filters.endDate && logDate > new Date(filters.endDate)) {
                        return false;
                    }
                    return true;
                });
            }

            return {
                logs,
                nextToken: result.nextToken || null,
                isLoadMore: !!nextToken,
            };
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            return rejectWithValue('Failed to fetch audit logs');
        }
    }
);

// ============================================
// Slice
// ============================================

const auditSlice = createSlice({
    name: 'audit',
    initialState,
    reducers: {
        setFilters: (state, action: PayloadAction<AuditLogFilter>) => {
            state.filters = action.payload;
        },
        clearFilters: (state) => {
            state.filters = {};
        },
        clearLogs: (state) => {
            state.logs = [];
            state.nextToken = null;
        },
        clearError: (state) => {
            state.error = null;
        },
        // Add a pending event for retry
        addPendingEvent: (state, action: PayloadAction<AuditState['pendingEvents'][0]>) => {
            state.pendingEvents.push(action.payload);
        },
        // Remove a pending event after successful retry
        removePendingEvent: (state, action: PayloadAction<number>) => {
            state.pendingEvents.splice(action.payload, 1);
        },
    },
    extraReducers: (builder) => {
        // logAuditEvent
        builder
            .addCase(logAuditEvent.pending, () => {
                // Don't show loading state for audit logging
            })
            .addCase(logAuditEvent.fulfilled, (state, action) => {
                if (action.payload) {
                    // Optionally add to local logs cache
                    state.logs.unshift(action.payload);
                }
            })
            .addCase(logAuditEvent.rejected, (state, action) => {
                // Queue for retry if needed
                console.warn('Audit event logging failed:', action.payload);
            });

        // fetchAuditLogs
        builder
            .addCase(fetchAuditLogs.pending, (state, action) => {
                if (action.meta.arg.nextToken) {
                    state.loadingMore = true;
                } else {
                    state.loading = true;
                }
                state.error = null;
            })
            .addCase(fetchAuditLogs.fulfilled, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                
                if (action.payload.isLoadMore) {
                    // Append to existing logs
                    state.logs = [...state.logs, ...action.payload.logs];
                } else {
                    // Replace logs
                    state.logs = action.payload.logs;
                }
                
                state.nextToken = action.payload.nextToken;
            })
            .addCase(fetchAuditLogs.rejected, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                state.error = action.payload as string;
            });
    },
});

export const {
    setFilters,
    clearFilters,
    clearLogs,
    clearError,
    addPendingEvent,
    removePendingEvent,
} = auditSlice.actions;

export default auditSlice.reducer;

