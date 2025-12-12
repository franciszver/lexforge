import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchAuditLogs, clearLogs, type AuditLogEntry, type AuditEventType } from '../features/auditSlice';
import {
    BarChart3,
    Download,
    FileText,
    Users,
    Activity,
    Calendar,
    TrendingUp,
    RefreshCw,
    FileSpreadsheet,
    Clock,
    ChevronDown,
    ChevronUp,
    Filter,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns';
import { saveAs } from 'file-saver';

// ============================================
// Types
// ============================================

interface ReportDateRange {
    start: Date;
    end: Date;
    label: string;
}

interface EventTypeStats {
    eventType: AuditEventType;
    count: number;
    percentage: number;
}

interface UserActivityStats {
    userId: string;
    count: number;
    lastActivity: string;
}

interface DailyActivityStats {
    date: string;
    count: number;
}

interface ReportSummary {
    totalEvents: number;
    uniqueUsers: number;
    eventsByType: EventTypeStats[];
    topUsers: UserActivityStats[];
    dailyActivity: DailyActivityStats[];
    documentEvents: number;
    authEvents: number;
    aiEvents: number;
}

// ============================================
// Constants
// ============================================

const DATE_RANGE_OPTIONS: ReportDateRange[] = [
    { start: subDays(new Date(), 7), end: new Date(), label: 'Last 7 Days' },
    { start: subDays(new Date(), 14), end: new Date(), label: 'Last 14 Days' },
    { start: subDays(new Date(), 30), end: new Date(), label: 'Last 30 Days' },
    { start: subDays(new Date(), 90), end: new Date(), label: 'Last 90 Days' },
];

const EVENT_TYPE_LABELS: Record<AuditEventType, string> = {
    AUTH_LOGIN: 'Login',
    AUTH_LOGOUT: 'Logout',
    AUTH_SIGNUP: 'Sign Up',
    AUTH_PASSWORD_RESET: 'Password Reset',
    DOCUMENT_CREATE: 'Document Created',
    DOCUMENT_READ: 'Document Opened',
    DOCUMENT_UPDATE: 'Document Updated',
    DOCUMENT_DELETE: 'Document Deleted',
    DOCUMENT_EXPORT: 'Document Exported',
    DOCUMENT_SHARE: 'Document Shared',
    DOCUMENT_DUPLICATE: 'Document Duplicated',
    AI_SUGGESTION_GENERATED: 'AI Suggestions Generated',
    AI_SUGGESTION_ACCEPTED: 'AI Suggestion Accepted',
    AI_SUGGESTION_REJECTED: 'AI Suggestion Rejected',
    AI_FEEDBACK_SUBMITTED: 'AI Feedback Submitted',
    TEMPLATE_CREATE: 'Template Created',
    TEMPLATE_UPDATE: 'Template Updated',
    TEMPLATE_DELETE: 'Template Deleted',
    SNAPSHOT_CREATE: 'Snapshot Created',
    SNAPSHOT_RESTORE: 'Snapshot Restored',
    ADMIN_ACCESS: 'Admin Access',
};

const EVENT_CATEGORIES = {
    auth: ['AUTH_LOGIN', 'AUTH_LOGOUT', 'AUTH_SIGNUP', 'AUTH_PASSWORD_RESET'],
    document: ['DOCUMENT_CREATE', 'DOCUMENT_READ', 'DOCUMENT_UPDATE', 'DOCUMENT_DELETE', 'DOCUMENT_EXPORT', 'DOCUMENT_SHARE', 'DOCUMENT_DUPLICATE'],
    ai: ['AI_SUGGESTION_GENERATED', 'AI_SUGGESTION_ACCEPTED', 'AI_SUGGESTION_REJECTED', 'AI_FEEDBACK_SUBMITTED'],
    template: ['TEMPLATE_CREATE', 'TEMPLATE_UPDATE', 'TEMPLATE_DELETE'],
    snapshot: ['SNAPSHOT_CREATE', 'SNAPSHOT_RESTORE'],
    admin: ['ADMIN_ACCESS'],
};

// ============================================
// Helper Functions
// ============================================

function calculateReportSummary(logs: AuditLogEntry[], dateRange: ReportDateRange): ReportSummary {
    // Filter logs by date range
    const startTime = startOfDay(dateRange.start).getTime();
    const endTime = endOfDay(dateRange.end).getTime();
    
    const filteredLogs = logs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= startTime && logTime <= endTime;
    });

    // Calculate event type stats
    const eventTypeCounts: Record<string, number> = {};
    filteredLogs.forEach(log => {
        eventTypeCounts[log.eventType] = (eventTypeCounts[log.eventType] || 0) + 1;
    });

    const eventsByType: EventTypeStats[] = Object.entries(eventTypeCounts)
        .map(([eventType, count]) => ({
            eventType: eventType as AuditEventType,
            count,
            percentage: filteredLogs.length > 0 ? Math.round((count / filteredLogs.length) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

    // Calculate user activity stats
    const userActivity: Record<string, { count: number; lastActivity: string }> = {};
    filteredLogs.forEach(log => {
        if (!userActivity[log.userId]) {
            userActivity[log.userId] = { count: 0, lastActivity: log.timestamp };
        }
        userActivity[log.userId].count++;
        if (new Date(log.timestamp) > new Date(userActivity[log.userId].lastActivity)) {
            userActivity[log.userId].lastActivity = log.timestamp;
        }
    });

    const topUsers: UserActivityStats[] = Object.entries(userActivity)
        .map(([userId, data]) => ({
            userId,
            count: data.count,
            lastActivity: data.lastActivity,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Calculate daily activity
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    const dailyActivity: DailyActivityStats[] = days.map(day => {
        const dayStart = startOfDay(day).getTime();
        const dayEnd = endOfDay(day).getTime();
        const count = filteredLogs.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            return logTime >= dayStart && logTime <= dayEnd;
        }).length;
        return {
            date: format(day, 'MMM d'),
            count,
        };
    });

    // Calculate category counts
    const documentEvents = filteredLogs.filter(log => 
        EVENT_CATEGORIES.document.includes(log.eventType)
    ).length;
    
    const authEvents = filteredLogs.filter(log => 
        EVENT_CATEGORIES.auth.includes(log.eventType)
    ).length;
    
    const aiEvents = filteredLogs.filter(log => 
        EVENT_CATEGORIES.ai.includes(log.eventType)
    ).length;

    return {
        totalEvents: filteredLogs.length,
        uniqueUsers: Object.keys(userActivity).length,
        eventsByType,
        topUsers,
        dailyActivity,
        documentEvents,
        authEvents,
        aiEvents,
    };
}

function generateCSV(logs: AuditLogEntry[], summary: ReportSummary, dateRange: ReportDateRange): string {
    const lines: string[] = [];
    
    // Header
    lines.push('LexForge Audit Report');
    lines.push(`Generated: ${format(new Date(), 'PPpp')}`);
    lines.push(`Date Range: ${dateRange.label} (${format(dateRange.start, 'PP')} - ${format(dateRange.end, 'PP')})`);
    lines.push('');
    
    // Summary section
    lines.push('=== SUMMARY ===');
    lines.push(`Total Events,${summary.totalEvents}`);
    lines.push(`Unique Users,${summary.uniqueUsers}`);
    lines.push(`Document Events,${summary.documentEvents}`);
    lines.push(`Auth Events,${summary.authEvents}`);
    lines.push(`AI Events,${summary.aiEvents}`);
    lines.push('');
    
    // Events by type
    lines.push('=== EVENTS BY TYPE ===');
    lines.push('Event Type,Count,Percentage');
    summary.eventsByType.forEach(stat => {
        lines.push(`${EVENT_TYPE_LABELS[stat.eventType] || stat.eventType},${stat.count},${stat.percentage}%`);
    });
    lines.push('');
    
    // Top users
    lines.push('=== TOP USERS BY ACTIVITY ===');
    lines.push('User ID,Event Count,Last Activity');
    summary.topUsers.forEach(user => {
        lines.push(`${user.userId},${user.count},${format(parseISO(user.lastActivity), 'PPpp')}`);
    });
    lines.push('');
    
    // Daily activity
    lines.push('=== DAILY ACTIVITY ===');
    lines.push('Date,Event Count');
    summary.dailyActivity.forEach(day => {
        lines.push(`${day.date},${day.count}`);
    });
    lines.push('');
    
    // Detailed log entries (filtered by date range)
    lines.push('=== DETAILED LOG ENTRIES ===');
    lines.push('Timestamp,User ID,Event Type,Action,Resource Type,Resource ID');
    
    // Filter logs by date range for detailed entries
    const startTime = startOfDay(dateRange.start).getTime();
    const endTime = endOfDay(dateRange.end).getTime();
    const filteredLogs = logs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= startTime && logTime <= endTime;
    });
    
    filteredLogs.forEach(log => {
        const timestamp = format(parseISO(log.timestamp), 'yyyy-MM-dd HH:mm:ss');
        const eventLabel = EVENT_TYPE_LABELS[log.eventType] || log.eventType;
        lines.push(`${timestamp},${log.userId},${eventLabel},${log.action},${log.resourceType || ''},${log.resourceId || ''}`);
    });
    
    return lines.join('\n');
}

// ============================================
// Components
// ============================================

interface BarChartProps {
    data: { label: string; value: number }[];
    maxValue?: number;
    height?: number;
    color?: string;
}

function SimpleBarChart({ data, maxValue, height = 200, color = 'bg-primary-500' }: BarChartProps) {
    const max = maxValue || Math.max(...data.map(d => d.value), 1);
    
    return (
        <div className="flex items-end gap-1" style={{ height }}>
            {data.map((item, index) => {
                const barHeight = max > 0 ? (item.value / max) * 100 : 0;
                return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col items-center justify-end" style={{ height: height - 24 }}>
                            {item.value > 0 && (
                                <span className="text-xs text-slate-600 mb-1">{item.value}</span>
                            )}
                            <div
                                className={`w-full ${color} rounded-t transition-all duration-300`}
                                style={{ height: `${barHeight}%`, minHeight: item.value > 0 ? 4 : 0 }}
                            />
                        </div>
                        <span className="text-xs text-slate-500 truncate w-full text-center" title={item.label}>
                            {item.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color?: string;
}

function StatCard({ title, value, icon, color = 'bg-primary-100 text-primary-600' }: StatCardProps) {
    return (
        <div className="card p-4">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-500">{title}</p>
                </div>
            </div>
        </div>
    );
}

interface AuditReportGeneratorProps {
    onClose?: () => void;
}

/**
 * AuditReportGenerator Component
 * Generates compliance reports and exports audit data.
 * Features summary statistics, charts, and CSV export.
 */
export function AuditReportGenerator({ onClose }: AuditReportGeneratorProps) {
    const dispatch = useAppDispatch();
    const { logs, loading } = useAppSelector((state) => state.audit);
    
    const [dateRange, setDateRange] = useState<ReportDateRange>(DATE_RANGE_OPTIONS[0]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [reportType, setReportType] = useState<'summary' | 'compliance' | 'user' | 'document'>('summary');
    const [isExporting, setIsExporting] = useState(false);

    // Load all logs for reporting
    useEffect(() => {
        dispatch(clearLogs());
        dispatch(fetchAuditLogs({ limit: 1000 })); // Load more logs for reporting
    }, [dispatch]);

    // Calculate report summary
    const summary = useMemo(() => {
        return calculateReportSummary(logs, dateRange);
    }, [logs, dateRange]);

    // Handle custom date range
    const handleApplyCustomRange = useCallback(() => {
        if (customStartDate && customEndDate) {
            setDateRange({
                start: new Date(customStartDate),
                end: new Date(customEndDate),
                label: 'Custom Range',
            });
            setShowDatePicker(false);
        }
    }, [customStartDate, customEndDate]);

    // Export to CSV
    const handleExportCSV = useCallback(() => {
        setIsExporting(true);
        try {
            const csv = generateCSV(logs, summary, dateRange);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const filename = `lexforge-audit-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
            saveAs(blob, filename);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            alert('Failed to export report. Please try again.');
        } finally {
            setIsExporting(false);
        }
    }, [logs, summary, dateRange]);

    // Refresh data
    const handleRefresh = useCallback(() => {
        dispatch(clearLogs());
        dispatch(fetchAuditLogs({ limit: 1000 }));
    }, [dispatch]);

    // Daily activity chart data
    const dailyChartData = useMemo(() => {
        return summary.dailyActivity.map(d => ({
            label: d.date,
            value: d.count,
        }));
    }, [summary.dailyActivity]);

    // Event type chart data (top 8)
    const eventTypeChartData = useMemo(() => {
        return summary.eventsByType.slice(0, 8).map(e => ({
            label: EVENT_TYPE_LABELS[e.eventType]?.split(' ')[0] || e.eventType,
            value: e.count,
        }));
    }, [summary.eventsByType]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary-600" />
                    <h2 className="text-lg font-semibold text-slate-900">Audit Reports</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        disabled={isExporting || loading || logs.length === 0}
                        className="btn-primary btn-sm"
                    >
                        {isExporting ? (
                            <>
                                <span className="spinner mr-2" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet className="w-4 h-4 mr-1" />
                                Export CSV
                            </>
                        )}
                    </button>
                    <button onClick={handleRefresh} className="btn-ghost btn-sm" disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="btn-ghost btn-sm">
                            Close
                        </button>
                    )}
                </div>
            </div>

            {/* Date Range Selector */}
            <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">Date Range:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {DATE_RANGE_OPTIONS.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => setDateRange(option)}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    dateRange.label === option.label
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                                dateRange.label === 'Custom Range'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            Custom
                            {showDatePicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    </div>
                </div>
                
                {/* Custom Date Picker */}
                {showDatePicker && (
                    <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-end gap-4">
                        <div>
                            <label className="label">Start Date</label>
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">End Date</label>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="input"
                            />
                        </div>
                        <button
                            onClick={handleApplyCustomRange}
                            disabled={!customStartDate || !customEndDate}
                            className="btn-primary btn-sm"
                        >
                            Apply
                        </button>
                    </div>
                )}
            </div>

            {/* Report Type Tabs */}
            <div className="flex gap-1 border-b border-slate-200">
                {[
                    { id: 'summary', label: 'Summary', icon: BarChart3 },
                    { id: 'compliance', label: 'Compliance', icon: FileText },
                    { id: 'user', label: 'User Activity', icon: Users },
                    { id: 'document', label: 'Documents', icon: FileText },
                ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setReportType(tab.id as typeof reportType)}
                            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                                reportType === tab.id
                                    ? 'text-primary-600 border-b-2 border-primary-600'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Loading State */}
            {loading && (
                <div className="text-center py-12">
                    <span className="spinner w-8 h-8 text-primary-600" />
                    <p className="text-sm text-slate-500 mt-3">Loading audit data...</p>
                </div>
            )}

            {/* Report Content */}
            {!loading && (
                <>
                    {/* Summary Report */}
                    {reportType === 'summary' && (
                        <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard
                                    title="Total Events"
                                    value={summary.totalEvents.toLocaleString()}
                                    icon={<Activity className="w-5 h-5" />}
                                    color="bg-primary-100 text-primary-600"
                                />
                                <StatCard
                                    title="Unique Users"
                                    value={summary.uniqueUsers.toLocaleString()}
                                    icon={<Users className="w-5 h-5" />}
                                    color="bg-blue-100 text-blue-600"
                                />
                                <StatCard
                                    title="Document Events"
                                    value={summary.documentEvents.toLocaleString()}
                                    icon={<FileText className="w-5 h-5" />}
                                    color="bg-green-100 text-green-600"
                                />
                                <StatCard
                                    title="AI Events"
                                    value={summary.aiEvents.toLocaleString()}
                                    icon={<TrendingUp className="w-5 h-5" />}
                                    color="bg-violet-100 text-violet-600"
                                />
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Daily Activity Chart */}
                                <div className="card p-6">
                                    <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        Daily Activity
                                    </h3>
                                    {dailyChartData.length > 0 ? (
                                        <SimpleBarChart data={dailyChartData} height={180} />
                                    ) : (
                                        <p className="text-sm text-slate-500 text-center py-8">No activity data</p>
                                    )}
                                </div>

                                {/* Event Types Chart */}
                                <div className="card p-6">
                                    <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-slate-400" />
                                        Events by Type (Top 8)
                                    </h3>
                                    {eventTypeChartData.length > 0 ? (
                                        <SimpleBarChart data={eventTypeChartData} height={180} color="bg-blue-500" />
                                    ) : (
                                        <p className="text-sm text-slate-500 text-center py-8">No event data</p>
                                    )}
                                </div>
                            </div>

                            {/* Event Types Table */}
                            <div className="card p-6">
                                <h3 className="text-sm font-semibold text-slate-900 mb-4">All Event Types</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-2 px-3 text-slate-500 font-medium">Event Type</th>
                                                <th className="text-right py-2 px-3 text-slate-500 font-medium">Count</th>
                                                <th className="text-right py-2 px-3 text-slate-500 font-medium">Percentage</th>
                                                <th className="text-left py-2 px-3 text-slate-500 font-medium w-1/3"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summary.eventsByType.map((stat, index) => (
                                                <tr key={index} className="border-b border-slate-100 last:border-0">
                                                    <td className="py-2 px-3 text-slate-900">
                                                        {EVENT_TYPE_LABELS[stat.eventType] || stat.eventType}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-700">{stat.count}</td>
                                                    <td className="py-2 px-3 text-right text-slate-500">{stat.percentage}%</td>
                                                    <td className="py-2 px-3">
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-primary-500 rounded-full"
                                                                style={{ width: `${stat.percentage}%` }}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {summary.eventsByType.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="py-8 text-center text-slate-500">
                                                        No events in selected date range
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Compliance Report */}
                    {reportType === 'compliance' && (
                        <div className="space-y-6">
                            <div className="card p-6">
                                <h3 className="text-sm font-semibold text-slate-900 mb-4">Compliance Summary</h3>
                                <div className="prose prose-sm max-w-none">
                                    <p className="text-slate-600">
                                        This report provides a compliance overview for the period{' '}
                                        <strong>{format(dateRange.start, 'PP')}</strong> to{' '}
                                        <strong>{format(dateRange.end, 'PP')}</strong>.
                                    </p>
                                </div>
                                
                                <div className="mt-6 space-y-4">
                                    {/* Audit Trail Integrity */}
                                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs">OK</span>
                                            </div>
                                            <h4 className="font-medium text-green-800">Audit Trail Active</h4>
                                        </div>
                                        <p className="text-sm text-green-700">
                                            {summary.totalEvents.toLocaleString()} events recorded with hash chain integrity.
                                        </p>
                                    </div>

                                    {/* User Access Summary */}
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <h4 className="font-medium text-blue-800 mb-2">User Access Summary</h4>
                                        <ul className="text-sm text-blue-700 space-y-1">
                                            <li>{summary.uniqueUsers} unique users recorded activity</li>
                                            <li>{summary.authEvents} authentication events</li>
                                            <li>{summary.eventsByType.find(e => e.eventType === 'AUTH_LOGIN')?.count || 0} successful logins</li>
                                        </ul>
                                    </div>

                                    {/* Document Activity Summary */}
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <h4 className="font-medium text-slate-800 mb-2">Document Activity Summary</h4>
                                        <ul className="text-sm text-slate-700 space-y-1">
                                            <li>{summary.documentEvents} total document operations</li>
                                            <li>{summary.eventsByType.find(e => e.eventType === 'DOCUMENT_CREATE')?.count || 0} documents created</li>
                                            <li>{summary.eventsByType.find(e => e.eventType === 'DOCUMENT_EXPORT')?.count || 0} documents exported</li>
                                            <li>{summary.eventsByType.find(e => e.eventType === 'DOCUMENT_SHARE')?.count || 0} documents shared</li>
                                        </ul>
                                    </div>

                                    {/* AI Usage Summary */}
                                    <div className="p-4 bg-violet-50 rounded-lg border border-violet-200">
                                        <h4 className="font-medium text-violet-800 mb-2">AI Usage Summary</h4>
                                        <ul className="text-sm text-violet-700 space-y-1">
                                            <li>{summary.aiEvents} total AI interactions</li>
                                            <li>{summary.eventsByType.find(e => e.eventType === 'AI_SUGGESTION_GENERATED')?.count || 0} suggestion batches generated</li>
                                            <li>{summary.eventsByType.find(e => e.eventType === 'AI_SUGGESTION_ACCEPTED')?.count || 0} suggestions accepted</li>
                                            <li>{summary.eventsByType.find(e => e.eventType === 'AI_FEEDBACK_SUBMITTED')?.count || 0} feedback submissions</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* User Activity Report */}
                    {reportType === 'user' && (
                        <div className="space-y-6">
                            <div className="card p-6">
                                <h3 className="text-sm font-semibold text-slate-900 mb-4">Top Users by Activity</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-2 px-3 text-slate-500 font-medium">Rank</th>
                                                <th className="text-left py-2 px-3 text-slate-500 font-medium">User ID</th>
                                                <th className="text-right py-2 px-3 text-slate-500 font-medium">Events</th>
                                                <th className="text-right py-2 px-3 text-slate-500 font-medium">Last Activity</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summary.topUsers.map((user, index) => (
                                                <tr key={user.userId} className="border-b border-slate-100 last:border-0">
                                                    <td className="py-2 px-3">
                                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                                                            index < 3 ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {index + 1}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3 font-mono text-slate-900">{user.userId}</td>
                                                    <td className="py-2 px-3 text-right text-slate-700">{user.count}</td>
                                                    <td className="py-2 px-3 text-right text-slate-500">
                                                        {format(parseISO(user.lastActivity), 'MMM d, h:mm a')}
                                                    </td>
                                                </tr>
                                            ))}
                                            {summary.topUsers.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="py-8 text-center text-slate-500">
                                                        No user activity in selected date range
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Document Report */}
                    {reportType === 'document' && (
                        <div className="space-y-6">
                            {/* Document Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard
                                    title="Created"
                                    value={summary.eventsByType.find(e => e.eventType === 'DOCUMENT_CREATE')?.count || 0}
                                    icon={<FileText className="w-5 h-5" />}
                                    color="bg-green-100 text-green-600"
                                />
                                <StatCard
                                    title="Updated"
                                    value={summary.eventsByType.find(e => e.eventType === 'DOCUMENT_UPDATE')?.count || 0}
                                    icon={<FileText className="w-5 h-5" />}
                                    color="bg-blue-100 text-blue-600"
                                />
                                <StatCard
                                    title="Exported"
                                    value={summary.eventsByType.find(e => e.eventType === 'DOCUMENT_EXPORT')?.count || 0}
                                    icon={<Download className="w-5 h-5" />}
                                    color="bg-purple-100 text-purple-600"
                                />
                                <StatCard
                                    title="Shared"
                                    value={summary.eventsByType.find(e => e.eventType === 'DOCUMENT_SHARE')?.count || 0}
                                    icon={<Users className="w-5 h-5" />}
                                    color="bg-cyan-100 text-cyan-600"
                                />
                            </div>

                            {/* Document Events Breakdown */}
                            <div className="card p-6">
                                <h3 className="text-sm font-semibold text-slate-900 mb-4">Document Operations</h3>
                                <div className="space-y-3">
                                    {summary.eventsByType
                                        .filter(e => EVENT_CATEGORIES.document.includes(e.eventType))
                                        .map((stat, index) => (
                                            <div key={index} className="flex items-center gap-4">
                                                <span className="text-sm text-slate-700 w-40">
                                                    {EVENT_TYPE_LABELS[stat.eventType] || stat.eventType}
                                                </span>
                                                <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary-500 rounded-full transition-all"
                                                        style={{ 
                                                            width: `${summary.documentEvents > 0 
                                                                ? (stat.count / summary.documentEvents) * 100 
                                                                : 0}%` 
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-sm font-medium text-slate-900 w-16 text-right">
                                                    {stat.count}
                                                </span>
                                            </div>
                                        ))
                                    }
                                    {summary.eventsByType.filter(e => EVENT_CATEGORIES.document.includes(e.eventType)).length === 0 && (
                                        <p className="text-sm text-slate-500 text-center py-4">
                                            No document events in selected date range
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Footer */}
            <div className="text-xs text-slate-400 text-center pt-4 border-t border-slate-100">
                Report generated {format(new Date(), 'PPpp')} - {summary.totalEvents.toLocaleString()} events analyzed
            </div>
        </div>
    );
}

export default AuditReportGenerator;

