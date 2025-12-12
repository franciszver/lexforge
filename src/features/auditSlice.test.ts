import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import auditReducer, {
    logAuditEvent,
    fetchAuditLogs,
    setFilters,
    clearFilters,
    clearLogs,
    clearError,
    type AuditLogEntry,
    type AuditEventType,
    type AuditAction,
} from './auditSlice';

// Mock Amplify data client
const mockAuditLogCreate = vi.fn();
const mockAuditLogList = vi.fn();
const mockAuditLogListByUserId = vi.fn();
const mockAuditLogListByEventType = vi.fn();
const mockAuditLogListByResourceId = vi.fn();

vi.mock('aws-amplify/data', () => ({
    generateClient: () => ({
        models: {
            AuditLog: {
                create: mockAuditLogCreate,
                list: mockAuditLogList,
                listAuditLogByUserIdAndTimestamp: mockAuditLogListByUserId,
                listAuditLogByEventTypeAndTimestamp: mockAuditLogListByEventType,
                listAuditLogByResourceIdAndTimestamp: mockAuditLogListByResourceId,
            },
        },
    }),
}));

// Helper to create a store for testing
const setupStore = (initialState = {}) => {
    return configureStore({
        reducer: {
            audit: auditReducer,
        },
        preloadedState: {
            audit: {
                logs: [],
                loading: false,
                loadingMore: false,
                error: null,
                nextToken: null,
                filters: {},
                pendingEvents: [],
                ...initialState,
            },
        },
    });
};

// Sample audit log entry
const sampleAuditEntry: AuditLogEntry = {
    id: 'audit-1',
    timestamp: '2024-01-15T10:00:00Z',
    userId: 'user-123',
    userEmail: 'test@example.com',
    eventType: 'DOCUMENT_CREATE',
    action: 'create',
    resourceType: 'draft',
    resourceId: 'doc-456',
    metadata: { title: 'Test Document' },
    hash: 'abc123',
    previousHash: 'GENESIS',
};

describe('Audit Slice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initial State', () => {
        it('should return the initial state', () => {
            const store = setupStore();
            const state = store.getState().audit;

            expect(state.logs).toEqual([]);
            expect(state.loading).toBe(false);
            expect(state.loadingMore).toBe(false);
            expect(state.error).toBeNull();
            expect(state.nextToken).toBeNull();
            expect(state.filters).toEqual({});
            expect(state.pendingEvents).toEqual([]);
        });
    });

    describe('Synchronous Reducers', () => {
        it('should handle setFilters', () => {
            const store = setupStore();
            
            store.dispatch(setFilters({
                userId: 'user-123',
                eventType: 'DOCUMENT_CREATE',
            }));

            const state = store.getState().audit;
            expect(state.filters.userId).toBe('user-123');
            expect(state.filters.eventType).toBe('DOCUMENT_CREATE');
        });

        it('should handle clearFilters', () => {
            const store = setupStore({
                filters: { userId: 'user-123', eventType: 'DOCUMENT_CREATE' },
            });

            store.dispatch(clearFilters());

            const state = store.getState().audit;
            expect(state.filters).toEqual({});
        });

        it('should handle clearLogs', () => {
            const store = setupStore({
                logs: [sampleAuditEntry],
                nextToken: 'token-123',
            });

            store.dispatch(clearLogs());

            const state = store.getState().audit;
            expect(state.logs).toEqual([]);
            expect(state.nextToken).toBeNull();
        });

        it('should handle clearError', () => {
            const store = setupStore({
                error: 'Some error',
            });

            store.dispatch(clearError());

            const state = store.getState().audit;
            expect(state.error).toBeNull();
        });
    });

    describe('logAuditEvent Thunk', () => {
        it('should successfully log an audit event', async () => {
            // Mock getting previous hash (no previous entries)
            mockAuditLogListByUserId.mockResolvedValueOnce({
                data: [],
                errors: null,
            });
            
            // Mock creating the audit entry
            mockAuditLogCreate.mockResolvedValueOnce({
                data: {
                    id: 'audit-1',
                    timestamp: '2024-01-15T10:00:00Z',
                    userId: 'current-user',
                    eventType: 'DOCUMENT_CREATE',
                    action: 'create',
                    resourceType: 'draft',
                    resourceId: 'doc-456',
                    metadata: '{"title":"Test Document"}',
                    previousHash: 'GENESIS',
                    hash: 'abc123',
                },
                errors: null,
            });

            const store = setupStore();

            await store.dispatch(logAuditEvent({
                eventType: 'DOCUMENT_CREATE',
                action: 'create',
                resourceType: 'draft',
                resourceId: 'doc-456',
                metadata: { title: 'Test Document' },
            }));

            expect(mockAuditLogCreate).toHaveBeenCalled();
            const createCall = mockAuditLogCreate.mock.calls[0][0];
            expect(createCall.eventType).toBe('DOCUMENT_CREATE');
            expect(createCall.action).toBe('create');
            expect(createCall.resourceType).toBe('draft');
            expect(createCall.resourceId).toBe('doc-456');

            const state = store.getState().audit;
            expect(state.logs).toHaveLength(1);
            expect(state.logs[0].id).toBe('audit-1');
        });

        it('should handle errors gracefully without failing', async () => {
            // Mock getting previous hash
            mockAuditLogListByUserId.mockResolvedValueOnce({
                data: [],
                errors: null,
            });
            
            // Mock create failure
            mockAuditLogCreate.mockResolvedValueOnce({
                data: null,
                errors: [{ message: 'Failed to log' }],
            });

            const store = setupStore();

            const result = await store.dispatch(logAuditEvent({
                eventType: 'DOCUMENT_CREATE',
                action: 'create',
            }));

            // Should reject but not crash
            expect(result.meta.requestStatus).toBe('rejected');
            
            // State should not have error displayed (fire-and-forget)
            const state = store.getState().audit;
            expect(state.logs).toHaveLength(0);
        });
        
        it('should use previous hash from existing entries', async () => {
            // Mock getting previous hash (has existing entry)
            mockAuditLogListByUserId.mockResolvedValueOnce({
                data: [{ hash: 'previous-hash-123' }],
                errors: null,
            });
            
            // Mock creating the audit entry
            mockAuditLogCreate.mockResolvedValueOnce({
                data: {
                    id: 'audit-2',
                    timestamp: '2024-01-15T11:00:00Z',
                    userId: 'current-user',
                    eventType: 'DOCUMENT_UPDATE',
                    action: 'update',
                    previousHash: 'previous-hash-123',
                    hash: 'new-hash-456',
                },
                errors: null,
            });

            const store = setupStore();

            await store.dispatch(logAuditEvent({
                eventType: 'DOCUMENT_UPDATE',
                action: 'update',
            }));

            const createCall = mockAuditLogCreate.mock.calls[0][0];
            expect(createCall.previousHash).toBe('previous-hash-123');
        });
    });

    describe('fetchAuditLogs Thunk', () => {
        it('should fetch audit logs without filters', async () => {
            mockAuditLogList.mockResolvedValueOnce({
                data: [sampleAuditEntry],
                errors: null,
                nextToken: null,
            });

            const store = setupStore();

            await store.dispatch(fetchAuditLogs({ limit: 50 }));

            expect(mockAuditLogList).toHaveBeenCalledWith({
                limit: 50,
                nextToken: undefined,
            });

            const state = store.getState().audit;
            expect(state.logs).toHaveLength(1);
            expect(state.loading).toBe(false);
        });

        it('should fetch audit logs filtered by userId', async () => {
            mockAuditLogListByUserId.mockResolvedValueOnce({
                data: [sampleAuditEntry],
                errors: null,
                nextToken: null,
            });

            const store = setupStore();

            await store.dispatch(fetchAuditLogs({
                filters: { userId: 'user-123' },
                limit: 50,
            }));

            expect(mockAuditLogListByUserId).toHaveBeenCalledWith(
                { userId: 'user-123' },
                {
                    sortDirection: 'DESC',
                    limit: 50,
                    nextToken: undefined,
                }
            );
        });

        it('should fetch audit logs filtered by eventType', async () => {
            mockAuditLogListByEventType.mockResolvedValueOnce({
                data: [sampleAuditEntry],
                errors: null,
                nextToken: null,
            });

            const store = setupStore();

            await store.dispatch(fetchAuditLogs({
                filters: { eventType: 'DOCUMENT_CREATE' },
                limit: 50,
            }));

            expect(mockAuditLogListByEventType).toHaveBeenCalledWith(
                { eventType: 'DOCUMENT_CREATE' },
                {
                    sortDirection: 'DESC',
                    limit: 50,
                    nextToken: undefined,
                }
            );
        });

        it('should fetch audit logs filtered by resourceId', async () => {
            mockAuditLogListByResourceId.mockResolvedValueOnce({
                data: [sampleAuditEntry],
                errors: null,
                nextToken: null,
            });

            const store = setupStore();

            await store.dispatch(fetchAuditLogs({
                filters: { resourceId: 'doc-456' },
                limit: 50,
            }));

            expect(mockAuditLogListByResourceId).toHaveBeenCalledWith(
                { resourceId: 'doc-456' },
                {
                    sortDirection: 'DESC',
                    limit: 50,
                    nextToken: undefined,
                }
            );
        });

        it('should handle pagination (load more)', async () => {
            const existingEntry: AuditLogEntry = {
                ...sampleAuditEntry,
                id: 'audit-0',
            };
            const newEntry: AuditLogEntry = {
                ...sampleAuditEntry,
                id: 'audit-2',
            };

            mockAuditLogList.mockResolvedValueOnce({
                data: [newEntry],
                errors: null,
                nextToken: null,
            });

            const store = setupStore({
                logs: [existingEntry],
            });

            await store.dispatch(fetchAuditLogs({
                limit: 50,
                nextToken: 'next-token-123',
            }));

            const state = store.getState().audit;
            expect(state.logs).toHaveLength(2);
            expect(state.logs[0].id).toBe('audit-0');
            expect(state.logs[1].id).toBe('audit-2');
        });

        it('should filter by date range client-side', async () => {
            const oldEntry: AuditLogEntry = {
                ...sampleAuditEntry,
                id: 'audit-old',
                timestamp: '2024-01-01T00:00:00Z',
            };
            const newEntry: AuditLogEntry = {
                ...sampleAuditEntry,
                id: 'audit-new',
                timestamp: '2024-01-20T00:00:00Z',
            };

            mockAuditLogList.mockResolvedValueOnce({
                data: [oldEntry, newEntry],
                errors: null,
                nextToken: null,
            });

            const store = setupStore();

            await store.dispatch(fetchAuditLogs({
                filters: {
                    startDate: '2024-01-10T00:00:00Z',
                    endDate: '2024-01-25T00:00:00Z',
                },
                limit: 50,
            }));

            const state = store.getState().audit;
            expect(state.logs).toHaveLength(1);
            expect(state.logs[0].id).toBe('audit-new');
        });

        it('should handle fetch errors', async () => {
            mockAuditLogList.mockResolvedValueOnce({
                data: null,
                errors: [{ message: 'Access denied' }],
                nextToken: null,
            });

            const store = setupStore();

            await store.dispatch(fetchAuditLogs({ limit: 50 }));

            const state = store.getState().audit;
            expect(state.error).toBe('Failed to fetch audit logs');
            expect(state.loading).toBe(false);
        });
    });

    describe('Loading States', () => {
        it('should set loading true when fetching logs', () => {
            mockAuditLogList.mockImplementation(() => new Promise(() => {})); // Never resolves

            const store = setupStore();
            store.dispatch(fetchAuditLogs({ limit: 50 }));

            const state = store.getState().audit;
            expect(state.loading).toBe(true);
            expect(state.loadingMore).toBe(false);
        });

        it('should set loadingMore true when paginating', () => {
            mockAuditLogList.mockImplementation(() => new Promise(() => {}));

            const store = setupStore();
            store.dispatch(fetchAuditLogs({ limit: 50, nextToken: 'token' }));

            const state = store.getState().audit;
            expect(state.loading).toBe(false);
            expect(state.loadingMore).toBe(true);
        });
    });
});

describe('Audit Event Types', () => {
    it('should support all expected event types', () => {
        const eventTypes: AuditEventType[] = [
            'AUTH_LOGIN',
            'AUTH_LOGOUT',
            'AUTH_SIGNUP',
            'AUTH_PASSWORD_RESET',
            'DOCUMENT_CREATE',
            'DOCUMENT_READ',
            'DOCUMENT_UPDATE',
            'DOCUMENT_DELETE',
            'DOCUMENT_EXPORT',
            'DOCUMENT_SHARE',
            'DOCUMENT_DUPLICATE',
            'AI_SUGGESTION_GENERATED',
            'AI_SUGGESTION_ACCEPTED',
            'AI_SUGGESTION_REJECTED',
            'AI_FEEDBACK_SUBMITTED',
            'TEMPLATE_CREATE',
            'TEMPLATE_UPDATE',
            'TEMPLATE_DELETE',
            'SNAPSHOT_CREATE',
            'SNAPSHOT_RESTORE',
            'ADMIN_ACCESS',
        ];

        // This is a compile-time check - if any type is invalid, TypeScript will error
        eventTypes.forEach((type) => {
            expect(typeof type).toBe('string');
        });
    });

    it('should support all expected action types', () => {
        const actionTypes: AuditAction[] = [
            'create',
            'read',
            'update',
            'delete',
            'export',
            'share',
            'generate',
            'accept',
            'reject',
            'login',
            'logout',
        ];

        actionTypes.forEach((action) => {
            expect(typeof action).toBe('string');
        });
    });
});

