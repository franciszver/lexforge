import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/authSlice';
import auditReducer from '../features/auditSlice';
import { Admin } from './Admin';

// Mock audit utilities to prevent side effects during tests
vi.mock('../utils/audit', () => ({
    auditDocument: {
        created: vi.fn(),
        read: vi.fn(),
        updated: vi.fn(),
        deleted: vi.fn(),
        exported: vi.fn(),
        shared: vi.fn(),
        duplicated: vi.fn(),
    },
    auditAI: {
        suggestionsGenerated: vi.fn(),
        suggestionAccepted: vi.fn(),
        suggestionRejected: vi.fn(),
        feedbackSubmitted: vi.fn(),
    },
    auditTemplate: {
        created: vi.fn(),
        updated: vi.fn(),
        deleted: vi.fn(),
    },
    auditAdmin: {
        accessed: vi.fn(),
    },
    auditSnapshot: {
        created: vi.fn(),
        restored: vi.fn(),
    },
    dispatchAuditEvent: vi.fn(),
}));

// Mock templates data
const mockTemplates = [
    {
        id: 'template-1',
        name: 'Demand Letter Template',
        category: 'Demand Letter',
        skeletonContent: '<h1>Demand Letter</h1>',
    },
    {
        id: 'template-2',
        name: 'Contract Template',
        category: 'Contract',
        skeletonContent: '<h1>Contract</h1>',
    },
];

// Mock drafts data for stats
const mockDrafts = [
    {
        id: 'draft-1',
        userId: 'user-1',
        title: 'Test Draft 1',
        content: '<p>Content</p>',
        status: 'draft',
        metadata: JSON.stringify({ docType: 'Demand Letter', jurisdiction: 'Federal' }),
        intakeData: '{}',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'draft-2',
        userId: 'user-1',
        title: 'Test Draft 2',
        content: '<p>Content</p>',
        status: 'review',
        metadata: JSON.stringify({ docType: 'Contract', jurisdiction: 'California' }),
        intakeData: '{}',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'draft-3',
        userId: 'user-2',
        title: 'Test Draft 3',
        content: '<p>Content</p>',
        status: 'final',
        metadata: JSON.stringify({ docType: 'Demand Letter', jurisdiction: 'Federal' }),
        intakeData: '{}',
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        updatedAt: new Date().toISOString(),
    },
];

// Mock Amplify data client
const mockTemplateList = vi.fn();
const mockTemplateCreate = vi.fn();
const mockTemplateUpdate = vi.fn();
const mockTemplateDelete = vi.fn();
const mockDraftList = vi.fn();
const mockAuditLogList = vi.fn();
const mockAuditLogCreate = vi.fn();
const mockAuditLogListByUserId = vi.fn();
const mockAuditLogListByEventType = vi.fn();
const mockAuditLogListByResourceId = vi.fn();

vi.mock('aws-amplify/data', () => ({
    generateClient: () => ({
        models: {
            Template: {
                list: mockTemplateList,
                create: mockTemplateCreate,
                update: mockTemplateUpdate,
                delete: mockTemplateDelete,
            },
            Draft: {
                list: mockDraftList,
            },
            AuditLog: {
                list: mockAuditLogList,
                create: mockAuditLogCreate,
                listAuditLogByUserIdAndTimestamp: mockAuditLogListByUserId,
                listAuditLogByEventTypeAndTimestamp: mockAuditLogListByEventType,
                listAuditLogByResourceIdAndTimestamp: mockAuditLogListByResourceId,
            },
        },
    }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const renderAdmin = () => {
    const store = configureStore({
        reducer: {
            auth: authReducer,
            audit: auditReducer,
        },
        preloadedState: {
            auth: {
                isAuthenticated: true,
                isAdmin: true,
                user: {
                    email: 'admin@example.com',
                    userId: 'admin-123',
                },
                loading: false,
                error: null,
            },
        },
    });

    return render(
        <Provider store={store}>
            <MemoryRouter>
                <Admin />
            </MemoryRouter>
        </Provider>
    );
};

// Helper to navigate to Templates tab
const navigateToTemplatesTab = () => {
    const templatesTab = screen.getByRole('button', { name: /Templates/i });
    fireEvent.click(templatesTab);
};

describe('Admin Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTemplateList.mockResolvedValue({ data: mockTemplates, errors: null });
        mockDraftList.mockResolvedValue({ data: mockDrafts, errors: null });
        mockTemplateCreate.mockResolvedValue({ 
            data: { id: 'new-template', name: 'New Template', category: 'Motion', skeletonContent: '' },
            errors: null 
        });
        mockTemplateDelete.mockResolvedValue({ errors: null });
        mockAuditLogList.mockResolvedValue({ data: [], errors: null, nextToken: null });
        mockAuditLogListByUserId.mockResolvedValue({ data: [], errors: null, nextToken: null });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Header and Navigation', () => {
        it('renders Admin Console header', async () => {
            renderAdmin();
            
            await waitFor(() => {
                expect(screen.getByText('Admin Console')).toBeInTheDocument();
            });
        });

        it('shows tab navigation', async () => {
            renderAdmin();
            
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Overview/i })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /Templates/i })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /Audit Logs/i })).toBeInTheDocument();
            });
        });

        it('navigates back to dashboard', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Back to Dashboard'));

            expect(mockNavigate).toHaveBeenCalledWith('/');
        });

        it('shows Refresh Data button', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByText('Refresh Data')).toBeInTheDocument();
            });
        });
    });

    describe('Overview Tab', () => {
        it('displays total documents count', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByText('Total Documents')).toBeInTheDocument();
                expect(screen.getByText('3')).toBeInTheDocument(); // 3 mock drafts
            });
        });

        it('displays documents by status counts', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByText('In Draft')).toBeInTheDocument();
                expect(screen.getByText('In Review')).toBeInTheDocument();
                expect(screen.getByText('Finalized')).toBeInTheDocument();
            });
        });

        it('shows Documents by Type section', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /Documents by Type/i })).toBeInTheDocument();
            });
        });

        it('shows Recent Activity section', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /Recent Activity/i })).toBeInTheDocument();
            });
        });

        it('displays recent drafts in activity feed', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByText('Test Draft 1')).toBeInTheDocument();
                expect(screen.getByText('Test Draft 2')).toBeInTheDocument();
                expect(screen.getByText('Test Draft 3')).toBeInTheDocument();
            });
        });

        it('shows Users section with Cognito info', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /Users/i })).toBeInTheDocument();
                expect(screen.getByText(/User management is handled through AWS Cognito/i)).toBeInTheDocument();
            });
        });

        it('shows AI Config section', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /AI Config/i })).toBeInTheDocument();
            });
        });

        it('shows System Info section', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /System Info/i })).toBeInTheDocument();
            });
        });

        it('handles empty draft list gracefully', async () => {
            mockDraftList.mockResolvedValue({ data: [], errors: null });

            renderAdmin();

            await waitFor(() => {
                expect(screen.getByText('No documents yet')).toBeInTheDocument();
                expect(screen.getByText('No recent activity')).toBeInTheDocument();
            });
        });

        it('handles draft loading errors gracefully', async () => {
            mockDraftList.mockResolvedValue({ data: null, errors: [{ message: 'Not authorized' }] });

            renderAdmin();

            // Should show 0 counts when there's an error (admin may not have access)
            await waitFor(() => {
                expect(screen.getByText('Total Documents')).toBeInTheDocument();
            });
        });

        it('refreshes data when Refresh Data is clicked', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByText('Refresh Data')).toBeInTheDocument();
            });

            // Clear the call counts
            mockTemplateList.mockClear();
            mockDraftList.mockClear();

            fireEvent.click(screen.getByText('Refresh Data'));

            await waitFor(() => {
                expect(mockTemplateList).toHaveBeenCalled();
                expect(mockDraftList).toHaveBeenCalled();
            });
        });
    });

    describe('Templates Tab', () => {
        it('loads and displays templates', async () => {
            renderAdmin();

            // Wait for initial load then navigate to templates tab
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Templates/i })).toBeInTheDocument();
            });

            navigateToTemplatesTab();

            await waitFor(() => {
                expect(screen.getByText('Demand Letter Template')).toBeInTheDocument();
                expect(screen.getByText('Contract Template')).toBeInTheDocument();
            });
        });

        it('shows Templates section heading', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Templates/i })).toBeInTheDocument();
            });

            navigateToTemplatesTab();

            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /Templates/i })).toBeInTheDocument();
            });
        });

        it('shows New Template button', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Templates/i })).toBeInTheDocument();
            });

            navigateToTemplatesTab();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /New Template/i })).toBeInTheDocument();
            });
        });

        it('opens create template modal when New Template is clicked', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Templates/i })).toBeInTheDocument();
            });

            navigateToTemplatesTab();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /New Template/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /New Template/i }));

            expect(screen.getByRole('heading', { name: 'New Template' })).toBeInTheDocument();
            expect(screen.getByPlaceholderText('e.g., Standard Demand Letter')).toBeInTheDocument();
        });

        it('creates a new template', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Templates/i })).toBeInTheDocument();
            });

            navigateToTemplatesTab();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /New Template/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /New Template/i }));

            const nameInput = screen.getByPlaceholderText('e.g., Standard Demand Letter');
            fireEvent.change(nameInput, { target: { value: 'Test Template' } });

            const createButton = screen.getByRole('button', { name: /Create Template/i });
            fireEvent.click(createButton);

            await waitFor(() => {
                expect(mockTemplateCreate).toHaveBeenCalled();
            });
        });

        it('deletes a template when confirmed', async () => {
            const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Templates/i })).toBeInTheDocument();
            });

            navigateToTemplatesTab();

            await waitFor(() => {
                expect(screen.getByText('Demand Letter Template')).toBeInTheDocument();
            });

            // Find delete buttons (using aria-label or by finding the Trash icon button)
            const deleteButtons = screen.getAllByRole('button').filter(btn => 
                btn.querySelector('svg.lucide-trash-2')
            );
            expect(deleteButtons.length).toBeGreaterThan(0);

            fireEvent.click(deleteButtons[0]);

            expect(confirmSpy).toHaveBeenCalled();

            await waitFor(() => {
                expect(mockTemplateDelete).toHaveBeenCalledWith({ id: 'template-1' });
            });
        });

        it('does not delete when cancelled', async () => {
            const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);

            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Templates/i })).toBeInTheDocument();
            });

            navigateToTemplatesTab();

            await waitFor(() => {
                expect(screen.getByText('Demand Letter Template')).toBeInTheDocument();
            });

            const deleteButtons = screen.getAllByRole('button').filter(btn => 
                btn.querySelector('svg.lucide-trash-2')
            );
            
            fireEvent.click(deleteButtons[0]);

            expect(confirmSpy).toHaveBeenCalled();
            expect(mockTemplateDelete).not.toHaveBeenCalled();
        });
    });

    describe('Audit Logs Tab', () => {
        it('shows Audit Logs tab content when clicked', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Audit Logs/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /Audit Logs/i }));

            // The AuditLogViewer component renders within the tab content
            // Check for the Apply Filters button which is part of the AuditLogViewer
            await waitFor(() => {
                expect(screen.getByText('Apply Filters')).toBeInTheDocument();
            });
        });
    });

    describe('Reports Tab', () => {
        it('shows Reports tab in navigation', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Reports/i })).toBeInTheDocument();
            });
        });

        it('shows Reports tab content when clicked', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Reports/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /Reports/i }));

            // The AuditReportGenerator component renders within the tab content
            await waitFor(() => {
                expect(screen.getByText('Audit Reports')).toBeInTheDocument();
            });
        });

        it('shows date range options in reports tab', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Reports/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /Reports/i }));

            await waitFor(() => {
                expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
                expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
            });
        });

        it('shows export CSV button in reports tab', async () => {
            renderAdmin();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Reports/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /Reports/i }));

            await waitFor(() => {
                expect(screen.getByText('Export CSV')).toBeInTheDocument();
            });
        });
    });
});
