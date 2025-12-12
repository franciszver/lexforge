import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import auditReducer, { type AuditLogEntry } from '../features/auditSlice';
import { AuditReportGenerator } from './AuditReportGenerator';

// Mock the audit utility
vi.mock('../utils/audit', () => ({
    auditDocument: { created: vi.fn(), read: vi.fn(), updated: vi.fn(), deleted: vi.fn(), exported: vi.fn(), shared: vi.fn(), duplicated: vi.fn() },
    auditAI: { suggestionsGenerated: vi.fn(), suggestionAccepted: vi.fn(), suggestionRejected: vi.fn(), feedbackSubmitted: vi.fn() },
    auditAuth: { login: vi.fn(), logout: vi.fn(), signup: vi.fn(), passwordReset: vi.fn() },
    auditTemplate: { created: vi.fn(), updated: vi.fn(), deleted: vi.fn() },
    auditSnapshot: { created: vi.fn(), restored: vi.fn() },
    auditAdmin: { accessed: vi.fn() },
}));

// Mock file-saver
vi.mock('file-saver', () => ({
    saveAs: vi.fn(),
}));

// Sample audit log data
const mockAuditLogs: AuditLogEntry[] = [
    {
        id: 'audit-1',
        timestamp: new Date().toISOString(),
        userId: 'user-123',
        userEmail: 'test@example.com',
        eventType: 'DOCUMENT_CREATE',
        action: 'create',
        resourceType: 'draft',
        resourceId: 'doc-456',
        metadata: { title: 'Test Document' },
        previousHash: 'GENESIS',
        hash: 'abc123',
    },
    {
        id: 'audit-2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        userId: 'user-123',
        userEmail: 'test@example.com',
        eventType: 'AUTH_LOGIN',
        action: 'login',
        resourceType: undefined,
        resourceId: undefined,
        metadata: undefined,
        previousHash: 'abc123',
        hash: 'def456',
    },
    {
        id: 'audit-3',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        userId: 'user-456',
        userEmail: 'admin@example.com',
        eventType: 'AI_SUGGESTION_GENERATED',
        action: 'generate',
        resourceType: 'draft',
        resourceId: 'doc-789',
        metadata: { count: 5 },
        previousHash: 'def456',
        hash: 'ghi789',
    },
    {
        id: 'audit-4',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        userId: 'user-789',
        userEmail: 'user@example.com',
        eventType: 'DOCUMENT_EXPORT',
        action: 'export',
        resourceType: 'draft',
        resourceId: 'doc-123',
        metadata: { format: 'docx' },
        previousHash: 'ghi789',
        hash: 'jkl012',
    },
];

// Mock Amplify
const mockAuditLogList = vi.fn();

vi.mock('aws-amplify/data', () => ({
    generateClient: vi.fn(() => ({
        models: {
            AuditLog: {
                list: mockAuditLogList,
                listAuditLogByUserIdAndTimestamp: vi.fn().mockResolvedValue({ data: [], errors: null, nextToken: null }),
                listAuditLogByEventTypeAndTimestamp: vi.fn().mockResolvedValue({ data: [], errors: null, nextToken: null }),
                listAuditLogByResourceIdAndTimestamp: vi.fn().mockResolvedValue({ data: [], errors: null, nextToken: null }),
            },
        },
    })),
}));

function createTestStore() {
    return configureStore({
        reducer: {
            audit: auditReducer,
        },
    });
}

function renderWithProviders(ui: React.ReactElement, store = createTestStore()) {
    return {
        ...render(
            <Provider store={store}>
                {ui}
            </Provider>
        ),
        store,
    };
}

describe('AuditReportGenerator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuditLogList.mockResolvedValue({ data: mockAuditLogs, errors: null, nextToken: null });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('Rendering', () => {
        it('should render the component with title', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            expect(screen.getByText('Audit Reports')).toBeInTheDocument();
        });

        it('should show loading state initially', async () => {
            mockAuditLogList.mockImplementation(() => new Promise(() => {}));
            
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                expect(screen.getByText('Loading audit data...')).toBeInTheDocument();
            });
        });

        it('should display stats after loading', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                expect(screen.getByText('Total Events')).toBeInTheDocument();
            });
            
            expect(screen.getByText('Unique Users')).toBeInTheDocument();
            expect(screen.getByText('Document Events')).toBeInTheDocument();
            expect(screen.getByText('AI Events')).toBeInTheDocument();
        });

        it('should render export CSV button', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                expect(screen.getByText('Export CSV')).toBeInTheDocument();
            });
        });

        it('should render date range options', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
                expect(screen.getByText('Last 14 Days')).toBeInTheDocument();
                expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
                expect(screen.getByText('Last 90 Days')).toBeInTheDocument();
            });
        });
    });

    describe('Report Tabs', () => {
        it('should show summary tab by default', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                expect(screen.getByText('Daily Activity')).toBeInTheDocument();
            });
        });

        it('should switch to compliance report', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                expect(screen.getByText('Compliance')).toBeInTheDocument();
            });
            
            await act(async () => {
                fireEvent.click(screen.getByText('Compliance'));
            });
            
            await waitFor(() => {
                expect(screen.getByText('Compliance Summary')).toBeInTheDocument();
            });
        });

        it('should switch to user activity report', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                // Find the User Activity tab button (not the stat card)
                const tabs = screen.getAllByRole('button');
                const userTab = tabs.find(t => t.textContent?.includes('User Activity'));
                expect(userTab).toBeInTheDocument();
            });
            
            const tabs = screen.getAllByRole('button');
            const userTab = tabs.find(t => t.textContent?.includes('User Activity'));
            
            await act(async () => {
                fireEvent.click(userTab!);
            });
            
            await waitFor(() => {
                expect(screen.getByText('Top Users by Activity')).toBeInTheDocument();
            });
        });

        it('should switch to document report', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                // Find the Documents tab button
                const tabs = screen.getAllByRole('button');
                const docTab = tabs.find(t => t.textContent?.includes('Documents'));
                expect(docTab).toBeInTheDocument();
            });
            
            const tabs = screen.getAllByRole('button');
            const docTab = tabs.find(t => t.textContent?.includes('Documents'));
            
            await act(async () => {
                fireEvent.click(docTab!);
            });
            
            await waitFor(() => {
                expect(screen.getByText('Document Operations')).toBeInTheDocument();
            });
        });
    });

    describe('Date Range Selection', () => {
        it('should change date range when option clicked', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
            });
            
            await act(async () => {
                fireEvent.click(screen.getByText('Last 30 Days'));
            });
            
            // The button should now be highlighted (has primary color)
            const button = screen.getByText('Last 30 Days');
            expect(button).toHaveClass('bg-primary-600');
        });

        it('should show custom date picker when Custom clicked', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                expect(screen.getByText('Custom')).toBeInTheDocument();
            });
            
            await act(async () => {
                fireEvent.click(screen.getByText('Custom'));
            });
            
            await waitFor(() => {
                expect(screen.getByText('Start Date')).toBeInTheDocument();
                expect(screen.getByText('End Date')).toBeInTheDocument();
            });
        });
    });

    describe('Export Functionality', () => {
        it('should export CSV when button clicked', async () => {
            const { saveAs } = await import('file-saver');
            
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                expect(screen.getByText('Export CSV')).toBeInTheDocument();
            });
            
            await act(async () => {
                fireEvent.click(screen.getByText('Export CSV'));
            });
            
            await waitFor(() => {
                expect(saveAs).toHaveBeenCalled();
            });
        });

        it('should disable export when loading', async () => {
            mockAuditLogList.mockImplementation(() => new Promise(() => {}));
            
            renderWithProviders(<AuditReportGenerator />);
            
            const exportButton = screen.getByText('Export CSV').closest('button');
            expect(exportButton).toBeDisabled();
        });
    });

    describe('Statistics Calculation', () => {
        it('should calculate total events correctly', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                // Should show 4 total events from mock data
                expect(screen.getByText('4')).toBeInTheDocument();
            });
        });

        it('should calculate unique users correctly', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                // Should show 3 unique users (user-123, user-456, user-789)
                expect(screen.getByText('3')).toBeInTheDocument();
            });
        });

        it('should display events by type table', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                expect(screen.getByText('All Event Types')).toBeInTheDocument();
            });
        });
    });

    describe('Compliance Report', () => {
        it('should show audit trail status', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                expect(screen.getByText('Compliance')).toBeInTheDocument();
            });
            
            await act(async () => {
                fireEvent.click(screen.getByText('Compliance'));
            });
            
            await waitFor(() => {
                expect(screen.getByText('Audit Trail Active')).toBeInTheDocument();
            });
        });

        it('should show user access summary', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await act(async () => {
                fireEvent.click(screen.getByText('Compliance'));
            });
            
            await waitFor(() => {
                expect(screen.getByText('User Access Summary')).toBeInTheDocument();
            });
        });

        it('should show document activity summary', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await act(async () => {
                fireEvent.click(screen.getByText('Compliance'));
            });
            
            await waitFor(() => {
                expect(screen.getByText('Document Activity Summary')).toBeInTheDocument();
            });
        });

        it('should show AI usage summary', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await act(async () => {
                fireEvent.click(screen.getByText('Compliance'));
            });
            
            await waitFor(() => {
                expect(screen.getByText('AI Usage Summary')).toBeInTheDocument();
            });
        });
    });

    describe('Refresh', () => {
        it('should have refresh button', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                expect(screen.getByText('Total Events')).toBeInTheDocument();
            });
            
            const buttons = screen.getAllByRole('button');
            const refreshButton = buttons.find(btn => btn.querySelector('svg.lucide-refresh-cw'));
            expect(refreshButton).toBeInTheDocument();
        });
    });

    describe('Close Button', () => {
        it('should call onClose when provided and clicked', async () => {
            const onClose = vi.fn();
            renderWithProviders(<AuditReportGenerator onClose={onClose} />);
            
            await waitFor(() => {
                expect(screen.getByText('Close')).toBeInTheDocument();
            });
            
            await act(async () => {
                fireEvent.click(screen.getByText('Close'));
            });
            
            expect(onClose).toHaveBeenCalled();
        });

        it('should not show close button when onClose not provided', async () => {
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                expect(screen.getByText('Total Events')).toBeInTheDocument();
            });
            
            expect(screen.queryByText('Close')).not.toBeInTheDocument();
        });
    });

    describe('Empty State', () => {
        it('should handle empty logs gracefully', async () => {
            mockAuditLogList.mockResolvedValue({ data: [], errors: null, nextToken: null });
            
            renderWithProviders(<AuditReportGenerator />);
            
            await waitFor(() => {
                // All stat cards should show 0 when there are no logs
                const zeroElements = screen.getAllByText('0');
                expect(zeroElements.length).toBe(4); // Total Events, Unique Users, Document Events, AI Events
            });
        });
    });
});

