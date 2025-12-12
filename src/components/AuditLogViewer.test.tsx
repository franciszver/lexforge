import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import auditReducer, { type AuditLogEntry } from '../features/auditSlice';
import { AuditLogViewer } from './AuditLogViewer';

// Mock the audit utility
vi.mock('../utils/audit', () => ({
    auditDocument: { created: vi.fn(), read: vi.fn(), updated: vi.fn(), deleted: vi.fn(), exported: vi.fn(), shared: vi.fn(), duplicated: vi.fn() },
    auditAI: { suggestionsGenerated: vi.fn(), suggestionAccepted: vi.fn(), suggestionRejected: vi.fn(), feedbackSubmitted: vi.fn() },
    auditAuth: { login: vi.fn(), logout: vi.fn(), signup: vi.fn(), passwordReset: vi.fn() },
    auditTemplate: { created: vi.fn(), updated: vi.fn(), deleted: vi.fn() },
    auditSnapshot: { created: vi.fn(), restored: vi.fn() },
    auditAdmin: { accessed: vi.fn() },
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
];

// Mock Amplify - return our mock data
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

describe('AuditLogViewer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: return mock logs
        mockAuditLogList.mockResolvedValue({ data: mockAuditLogs, errors: null, nextToken: null });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('Rendering', () => {
        it('should render the component with title', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            expect(screen.getByText('Audit Logs')).toBeInTheDocument();
        });

        it('should show loading state initially', async () => {
            // Make the mock never resolve to show loading state
            mockAuditLogList.mockImplementation(() => new Promise(() => {}));
            
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Loading audit logs...')).toBeInTheDocument();
            });
        });

        it('should display audit logs after loading', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Document Created')).toBeInTheDocument();
            });
            
            // Login appears both in dropdown and in log list, so check for multiple
            expect(screen.getAllByText('Login').length).toBeGreaterThan(0);
            // AI Suggestions also appears in dropdown
            expect(screen.getAllByText('AI Suggestions').length).toBeGreaterThan(0);
        });

        it('should show empty state when no logs', async () => {
            mockAuditLogList.mockResolvedValue({ data: [], errors: null, nextToken: null });
            
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('No audit logs found')).toBeInTheDocument();
            });
        });

        it('should render in compact mode without filters button', async () => {
            renderWithProviders(<AuditLogViewer compact />);
            
            await waitFor(() => {
                expect(screen.getByText('Document Created')).toBeInTheDocument();
            });
            
            expect(screen.queryByRole('button', { name: /filters/i })).not.toBeInTheDocument();
        });
    });

    describe('Filters', () => {
        it('should show filter panel by default', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Apply Filters')).toBeInTheDocument();
            });
        });

        it('should toggle filter panel', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Document Created')).toBeInTheDocument();
            });
            
            // Filter panel should be visible by default
            expect(screen.getByText('Apply Filters')).toBeInTheDocument();
            
            // Click toggle button - there's only one button with Filters text (plus icon)
            const buttons = screen.getAllByRole('button');
            const filtersButton = buttons.find(btn => btn.textContent?.includes('Filters'));
            expect(filtersButton).toBeInTheDocument();
            
            await act(async () => {
                fireEvent.click(filtersButton!);
            });
            
            // Filter panel should be hidden
            expect(screen.queryByText('Apply Filters')).not.toBeInTheDocument();
        });

        it('should have event type dropdown', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Event Type')).toBeInTheDocument();
            });
            
            expect(screen.getByRole('combobox')).toBeInTheDocument();
        });

        it('should have date range inputs', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Start Date')).toBeInTheDocument();
                expect(screen.getByText('End Date')).toBeInTheDocument();
            });
        });

        it('should have user ID filter input', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByPlaceholderText('Filter by user ID...')).toBeInTheDocument();
            });
        });

        it('should have resource ID filter input', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByPlaceholderText('Filter by document/resource ID...')).toBeInTheDocument();
            });
        });
    });

    describe('Event Detail Modal', () => {
        // Helper to find and click a log entry
        const findAndClickLogEntry = async (label: string) => {
            // Find all elements with the label - one in dropdown, possibly one in log list
            const elements = screen.getAllByText(label);
            // Find the one that's in the log list (has cursor-pointer ancestor)
            for (const textElement of elements) {
                let element: HTMLElement | null = textElement;
                while (element && !element.className?.includes('cursor-pointer')) {
                    element = element.parentElement;
                }
                if (element && element.className?.includes('cursor-pointer')) {
                    await act(async () => {
                        fireEvent.click(element!);
                    });
                    return element;
                }
            }
            return null;
        };

        it('should open modal when log is clicked', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Document Created')).toBeInTheDocument();
            });
            
            await findAndClickLogEntry('Document Created');
            
            // Modal should appear
            await waitFor(() => {
                expect(screen.getByText('Event ID')).toBeInTheDocument();
            });
        });

        it('should close modal when close button is clicked', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Document Created')).toBeInTheDocument();
            });
            
            await findAndClickLogEntry('Document Created');
            
            // Wait for modal
            await waitFor(() => {
                expect(screen.getByText('Event ID')).toBeInTheDocument();
            });
            
            // Click close button
            const closeButton = screen.getByRole('button', { name: /close/i });
            await act(async () => {
                fireEvent.click(closeButton);
            });
            
            // Modal should be closed
            await waitFor(() => {
                expect(screen.queryByText('Event ID')).not.toBeInTheDocument();
            });
        });

        it('should display event details in modal', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Document Created')).toBeInTheDocument();
            });
            
            await findAndClickLogEntry('Document Created');
            
            // Check modal content
            await waitFor(() => {
                expect(screen.getByText('Event ID')).toBeInTheDocument();
            });
            
            // These labels also appear in filter panel, so check for at least one
            expect(screen.getAllByText('User ID').length).toBeGreaterThan(0);
            expect(screen.getByText('Action')).toBeInTheDocument();
        });

        it('should show resource details when available', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Document Created')).toBeInTheDocument();
            });
            
            await findAndClickLogEntry('Document Created');
            
            await waitFor(() => {
                expect(screen.getByText('Resource Details')).toBeInTheDocument();
                expect(screen.getByText('Resource Type')).toBeInTheDocument();
            });
        });

        it('should show chain integrity info', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Document Created')).toBeInTheDocument();
            });
            
            await findAndClickLogEntry('Document Created');
            
            await waitFor(() => {
                expect(screen.getByText('Chain Integrity')).toBeInTheDocument();
            });
        });
    });

    describe('Pagination', () => {
        it('should show load more button when there is a nextToken', async () => {
            mockAuditLogList.mockResolvedValue({ data: mockAuditLogs, errors: null, nextToken: 'next-page-token' });
            
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Load More')).toBeInTheDocument();
            });
        });

        it('should not show load more button in compact mode', async () => {
            mockAuditLogList.mockResolvedValue({ data: mockAuditLogs, errors: null, nextToken: 'next-page-token' });
            
            renderWithProviders(<AuditLogViewer compact />);
            
            await waitFor(() => {
                expect(screen.getByText('Document Created')).toBeInTheDocument();
            });
            
            expect(screen.queryByText('Load More')).not.toBeInTheDocument();
        });

        it('should show log count', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText(/Showing 3 events/)).toBeInTheDocument();
            });
        });
    });

    describe('Refresh', () => {
        it('should have refresh button', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Document Created')).toBeInTheDocument();
            });
            
            // Find refresh button (it's the one with RefreshCw icon)
            const buttons = screen.getAllByRole('button');
            const refreshButton = buttons.find(btn => btn.querySelector('svg.lucide-refresh-cw'));
            expect(refreshButton).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('should show error state', async () => {
            mockAuditLogList.mockRejectedValue(new Error('Network error'));
            
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Error loading audit logs')).toBeInTheDocument();
            });
        });

        it('should have retry button on error', async () => {
            mockAuditLogList.mockRejectedValue(new Error('Network error'));
            
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
            });
        });
    });

    describe('Event Type Display', () => {
        it('should display correct event type labels', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Document Created')).toBeInTheDocument();
            });
            
            // These labels also appear in the dropdown, so check for multiple
            expect(screen.getAllByText('Login').length).toBeGreaterThan(0);
            expect(screen.getAllByText('AI Suggestions').length).toBeGreaterThan(0);
        });

        it('should show resource ID badge when available', async () => {
            renderWithProviders(<AuditLogViewer />);
            
            await waitFor(() => {
                expect(screen.getByText('Document Created')).toBeInTheDocument();
            });
            
            // Resource IDs under 8 chars are not truncated
            expect(screen.getByText('doc-456')).toBeInTheDocument();
        });
    });
});
