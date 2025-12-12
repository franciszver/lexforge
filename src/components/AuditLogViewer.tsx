import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
    fetchAuditLogs,
    setFilters,
    clearFilters,
    clearLogs,
    type AuditLogEntry,
    type AuditEventType,
    type AuditLogFilter,
} from '../features/auditSlice';
import {
    Search,
    Filter,
    X,
    ChevronDown,
    ChevronUp,
    Calendar,
    User,
    Activity,
    FileText,
    AlertCircle,
    RefreshCw,
    Eye,
    Hash,
    Clock,
    Sparkles,
    Shield,
    LogIn,
    Copy,
    CheckCircle,
} from 'lucide-react';

// ============================================
// Event Type Configuration
// ============================================

const EVENT_TYPE_CONFIG: Record<AuditEventType, { label: string; icon: typeof Activity; color: string }> = {
    AUTH_LOGIN: { label: 'Login', icon: LogIn, color: 'text-green-600 bg-green-100' },
    AUTH_LOGOUT: { label: 'Logout', icon: LogIn, color: 'text-slate-600 bg-slate-100' },
    AUTH_SIGNUP: { label: 'Sign Up', icon: User, color: 'text-blue-600 bg-blue-100' },
    AUTH_PASSWORD_RESET: { label: 'Password Reset', icon: Shield, color: 'text-amber-600 bg-amber-100' },
    DOCUMENT_CREATE: { label: 'Document Created', icon: FileText, color: 'text-primary-600 bg-primary-100' },
    DOCUMENT_READ: { label: 'Document Opened', icon: Eye, color: 'text-slate-600 bg-slate-100' },
    DOCUMENT_UPDATE: { label: 'Document Updated', icon: FileText, color: 'text-blue-600 bg-blue-100' },
    DOCUMENT_DELETE: { label: 'Document Deleted', icon: FileText, color: 'text-red-600 bg-red-100' },
    DOCUMENT_EXPORT: { label: 'Document Exported', icon: FileText, color: 'text-purple-600 bg-purple-100' },
    DOCUMENT_SHARE: { label: 'Document Shared', icon: FileText, color: 'text-cyan-600 bg-cyan-100' },
    DOCUMENT_DUPLICATE: { label: 'Document Duplicated', icon: Copy, color: 'text-indigo-600 bg-indigo-100' },
    AI_SUGGESTION_GENERATED: { label: 'AI Suggestions', icon: Sparkles, color: 'text-violet-600 bg-violet-100' },
    AI_SUGGESTION_ACCEPTED: { label: 'Suggestion Accepted', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    AI_SUGGESTION_REJECTED: { label: 'Suggestion Rejected', icon: X, color: 'text-red-600 bg-red-100' },
    AI_FEEDBACK_SUBMITTED: { label: 'AI Feedback', icon: Sparkles, color: 'text-amber-600 bg-amber-100' },
    TEMPLATE_CREATE: { label: 'Template Created', icon: FileText, color: 'text-teal-600 bg-teal-100' },
    TEMPLATE_UPDATE: { label: 'Template Updated', icon: FileText, color: 'text-teal-600 bg-teal-100' },
    TEMPLATE_DELETE: { label: 'Template Deleted', icon: FileText, color: 'text-red-600 bg-red-100' },
    SNAPSHOT_CREATE: { label: 'Snapshot Created', icon: Clock, color: 'text-blue-600 bg-blue-100' },
    SNAPSHOT_RESTORE: { label: 'Snapshot Restored', icon: Clock, color: 'text-amber-600 bg-amber-100' },
    ADMIN_ACCESS: { label: 'Admin Access', icon: Shield, color: 'text-purple-600 bg-purple-100' },
};

const EVENT_TYPE_OPTIONS: { value: AuditEventType | ''; label: string }[] = [
    { value: '', label: 'All Events' },
    { value: 'AUTH_LOGIN', label: 'Login' },
    { value: 'AUTH_LOGOUT', label: 'Logout' },
    { value: 'AUTH_SIGNUP', label: 'Sign Up' },
    { value: 'AUTH_PASSWORD_RESET', label: 'Password Reset' },
    { value: 'DOCUMENT_CREATE', label: 'Document Created' },
    { value: 'DOCUMENT_READ', label: 'Document Opened' },
    { value: 'DOCUMENT_UPDATE', label: 'Document Updated' },
    { value: 'DOCUMENT_DELETE', label: 'Document Deleted' },
    { value: 'DOCUMENT_EXPORT', label: 'Document Exported' },
    { value: 'DOCUMENT_SHARE', label: 'Document Shared' },
    { value: 'DOCUMENT_DUPLICATE', label: 'Document Duplicated' },
    { value: 'AI_SUGGESTION_GENERATED', label: 'AI Suggestions' },
    { value: 'AI_SUGGESTION_ACCEPTED', label: 'Suggestion Accepted' },
    { value: 'AI_SUGGESTION_REJECTED', label: 'Suggestion Rejected' },
    { value: 'AI_FEEDBACK_SUBMITTED', label: 'AI Feedback' },
    { value: 'TEMPLATE_CREATE', label: 'Template Created' },
    { value: 'TEMPLATE_UPDATE', label: 'Template Updated' },
    { value: 'TEMPLATE_DELETE', label: 'Template Deleted' },
    { value: 'SNAPSHOT_CREATE', label: 'Snapshot Created' },
    { value: 'SNAPSHOT_RESTORE', label: 'Snapshot Restored' },
    { value: 'ADMIN_ACCESS', label: 'Admin Access' },
];

// ============================================
// Helper Functions
// ============================================

function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDetailedTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
    });
}

function truncateId(id: string, length: number = 8): string {
    if (id.length <= length) return id;
    return `${id.slice(0, length)}...`;
}

// ============================================
// Components
// ============================================

interface EventDetailModalProps {
    log: AuditLogEntry;
    onClose: () => void;
}

function EventDetailModal({ log, onClose }: EventDetailModalProps) {
    const config = EVENT_TYPE_CONFIG[log.eventType] || {
        label: log.eventType,
        icon: Activity,
        color: 'text-slate-600 bg-slate-100',
    };
    const Icon = config.icon;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">{config.label}</h2>
                                <p className="text-sm text-slate-500">{formatDetailedTimestamp(log.timestamp)}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Event ID</label>
                            <p className="text-sm font-mono text-slate-700 mt-1">{log.id}</p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Action</label>
                            <p className="text-sm text-slate-700 mt-1 capitalize">{log.action}</p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">User ID</label>
                            <p className="text-sm font-mono text-slate-700 mt-1">{log.userId}</p>
                        </div>
                        {log.userEmail && (
                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">User Email</label>
                                <p className="text-sm text-slate-700 mt-1">{log.userEmail}</p>
                            </div>
                        )}
                    </div>

                    {/* Resource Info */}
                    {(log.resourceType || log.resourceId) && (
                        <div className="border-t border-slate-100 pt-4">
                            <h3 className="text-sm font-medium text-slate-900 mb-3">Resource Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {log.resourceType && (
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Resource Type</label>
                                        <p className="text-sm text-slate-700 mt-1 capitalize">{log.resourceType}</p>
                                    </div>
                                )}
                                {log.resourceId && (
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Resource ID</label>
                                        <p className="text-sm font-mono text-slate-700 mt-1">{log.resourceId}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Metadata */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="border-t border-slate-100 pt-4">
                            <h3 className="text-sm font-medium text-slate-900 mb-3">Event Metadata</h3>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap overflow-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Client Info */}
                    {(log.ipAddress || log.userAgent || log.sessionId) && (
                        <div className="border-t border-slate-100 pt-4">
                            <h3 className="text-sm font-medium text-slate-900 mb-3">Client Information</h3>
                            <div className="space-y-2">
                                {log.ipAddress && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-slate-500 w-24">IP Address:</span>
                                        <span className="font-mono text-slate-700">{log.ipAddress}</span>
                                    </div>
                                )}
                                {log.sessionId && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-slate-500 w-24">Session ID:</span>
                                        <span className="font-mono text-slate-700">{truncateId(log.sessionId, 16)}</span>
                                    </div>
                                )}
                                {log.userAgent && (
                                    <div className="text-sm">
                                        <span className="text-slate-500">User Agent:</span>
                                        <p className="font-mono text-slate-700 text-xs mt-1 break-all">{log.userAgent}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Integrity Info */}
                    {(log.previousHash || log.hash) && (
                        <div className="border-t border-slate-100 pt-4">
                            <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
                                <Hash className="w-4 h-4" />
                                Chain Integrity
                            </h3>
                            <div className="space-y-2">
                                {log.previousHash && (
                                    <div className="text-sm">
                                        <span className="text-slate-500">Previous Hash:</span>
                                        <p className="font-mono text-slate-700 text-xs mt-1 break-all">
                                            {log.previousHash === 'GENESIS' ? (
                                                <span className="text-green-600">GENESIS (First entry)</span>
                                            ) : (
                                                log.previousHash
                                            )}
                                        </p>
                                    </div>
                                )}
                                {log.hash && (
                                    <div className="text-sm">
                                        <span className="text-slate-500">Entry Hash:</span>
                                        <p className="font-mono text-slate-700 text-xs mt-1 break-all">{log.hash}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200">
                    <button onClick={onClose} className="btn-secondary w-full">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

interface AuditLogViewerProps {
    initialFilters?: AuditLogFilter;
    compact?: boolean;
}

/**
 * AuditLogViewer Component
 * Displays audit logs with filtering, pagination, and detail view.
 * Admin-only component for monitoring user activity.
 */
export function AuditLogViewer({ initialFilters, compact = false }: AuditLogViewerProps) {
    const dispatch = useAppDispatch();
    const { logs, loading, loadingMore, error, nextToken, filters } = useAppSelector((state) => state.audit);
    
    // Local filter state before applying
    const [localFilters, setLocalFilters] = useState<AuditLogFilter>(initialFilters || {});
    const [showFilters, setShowFilters] = useState(!compact);
    const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

    // Load logs on mount and when filters change
    useEffect(() => {
        dispatch(clearLogs());
        dispatch(fetchAuditLogs({ filters, limit: compact ? 10 : 50 }));
    }, [dispatch, filters, compact]);

    // Apply initial filters
    useEffect(() => {
        if (initialFilters) {
            dispatch(setFilters(initialFilters));
        }
    }, [dispatch, initialFilters]);

    const handleApplyFilters = useCallback(() => {
        dispatch(setFilters(localFilters));
    }, [dispatch, localFilters]);

    const handleClearFilters = useCallback(() => {
        setLocalFilters({});
        dispatch(clearFilters());
    }, [dispatch]);

    const handleRefresh = useCallback(() => {
        dispatch(clearLogs());
        dispatch(fetchAuditLogs({ filters, limit: compact ? 10 : 50 }));
    }, [dispatch, filters, compact]);

    const handleLoadMore = useCallback(() => {
        if (nextToken && !loadingMore) {
            dispatch(fetchAuditLogs({ filters, limit: 50, nextToken }));
        }
    }, [dispatch, filters, nextToken, loadingMore]);

    const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary-600" />
                    <h2 className="text-lg font-semibold text-slate-900">Audit Logs</h2>
                    {hasActiveFilters && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                            Filtered
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!compact && (
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`btn-ghost btn-sm ${showFilters ? 'bg-slate-100' : ''}`}
                        >
                            <Filter className="w-4 h-4 mr-1" />
                            Filters
                            {showFilters ? (
                                <ChevronUp className="w-4 h-4 ml-1" />
                            ) : (
                                <ChevronDown className="w-4 h-4 ml-1" />
                            )}
                        </button>
                    )}
                    <button onClick={handleRefresh} className="btn-ghost btn-sm" disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && !compact && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* User ID Filter */}
                        <div>
                            <label className="label flex items-center gap-1">
                                <User className="w-3 h-3" />
                                User ID
                            </label>
                            <input
                                type="text"
                                value={localFilters.userId || ''}
                                onChange={(e) => setLocalFilters({ ...localFilters, userId: e.target.value || undefined })}
                                className="input"
                                placeholder="Filter by user ID..."
                            />
                        </div>

                        {/* Event Type Filter */}
                        <div>
                            <label className="label flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                Event Type
                            </label>
                            <select
                                value={localFilters.eventType || ''}
                                onChange={(e) => setLocalFilters({
                                    ...localFilters,
                                    eventType: (e.target.value || undefined) as AuditEventType | undefined,
                                })}
                                className="input"
                            >
                                {EVENT_TYPE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Start Date Filter */}
                        <div>
                            <label className="label flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Start Date
                            </label>
                            <input
                                type="datetime-local"
                                value={localFilters.startDate?.slice(0, 16) || ''}
                                onChange={(e) => setLocalFilters({
                                    ...localFilters,
                                    startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                                })}
                                className="input"
                            />
                        </div>

                        {/* End Date Filter */}
                        <div>
                            <label className="label flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                End Date
                            </label>
                            <input
                                type="datetime-local"
                                value={localFilters.endDate?.slice(0, 16) || ''}
                                onChange={(e) => setLocalFilters({
                                    ...localFilters,
                                    endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                                })}
                                className="input"
                            />
                        </div>
                    </div>

                    {/* Resource ID Filter */}
                    <div>
                        <label className="label flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Resource ID
                        </label>
                        <input
                            type="text"
                            value={localFilters.resourceId || ''}
                            onChange={(e) => setLocalFilters({ ...localFilters, resourceId: e.target.value || undefined })}
                            className="input"
                            placeholder="Filter by document/resource ID..."
                        />
                    </div>

                    {/* Filter Actions */}
                    <div className="flex items-center gap-2 pt-2">
                        <button onClick={handleApplyFilters} className="btn-primary btn-sm">
                            <Search className="w-4 h-4 mr-1" />
                            Apply Filters
                        </button>
                        {hasActiveFilters && (
                            <button onClick={handleClearFilters} className="btn-ghost btn-sm">
                                <X className="w-4 h-4 mr-1" />
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-red-800">Error loading audit logs</p>
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                    <button onClick={handleRefresh} className="ml-auto btn-ghost btn-sm text-red-600">
                        Retry
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading && !loadingMore && (
                <div className="text-center py-8">
                    <span className="spinner w-6 h-6 text-primary-600" />
                    <p className="text-sm text-slate-500 mt-2">Loading audit logs...</p>
                </div>
            )}

            {/* Results Table */}
            {!loading && logs.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                    <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No audit logs found</p>
                    {hasActiveFilters && (
                        <button onClick={handleClearFilters} className="btn-ghost btn-sm mt-2">
                            Clear filters
                        </button>
                    )}
                </div>
            ) : !loading && (
                <div className="space-y-2">
                    {logs.map((log) => {
                        const config = EVENT_TYPE_CONFIG[log.eventType] || {
                            label: log.eventType,
                            icon: Activity,
                            color: 'text-slate-600 bg-slate-100',
                        };
                        const Icon = config.icon;

                        return (
                            <div
                                key={log.id}
                                onClick={() => setSelectedLog(log)}
                                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group"
                            >
                                {/* Icon */}
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-slate-900">{config.label}</span>
                                        {log.resourceId && (
                                            <span className="text-xs font-mono text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                                                {truncateId(log.resourceId)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                        <span className="font-mono">{truncateId(log.userId, 12)}</span>
                                        {log.resourceType && (
                                            <>
                                                <span>-</span>
                                                <span className="capitalize">{log.resourceType}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Timestamp */}
                                <div className="text-xs text-slate-500 flex-shrink-0">
                                    {formatTimestamp(log.timestamp)}
                                </div>

                                {/* View indicator */}
                                <Eye className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Load More */}
            {nextToken && !compact && (
                <div className="text-center pt-4">
                    <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="btn-secondary btn-sm"
                    >
                        {loadingMore ? (
                            <>
                                <span className="spinner mr-2" />
                                Loading...
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                Load More
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Log count */}
            {!loading && logs.length > 0 && (
                <p className="text-xs text-slate-400 text-center">
                    Showing {logs.length} event{logs.length !== 1 ? 's' : ''}
                    {nextToken && ' (more available)'}
                </p>
            )}

            {/* Event Detail Modal */}
            {selectedLog && (
                <EventDetailModal
                    log={selectedLog}
                    onClose={() => setSelectedLog(null)}
                />
            )}
        </div>
    );
}

export default AuditLogViewer;

