import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import documentReducer from '../features/documentSlice';
import suggestionsReducer from '../features/suggestionsSlice';
import uiReducer from '../features/uiSlice';
import authReducer from '../features/authSlice';
import intakeReducer from '../features/intakeSlice';
import { Dashboard, Login, Admin } from './index';

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
    auditSnapshot: {
        created: vi.fn(),
        restored: vi.fn(),
    },
    dispatchAuditEvent: vi.fn(),
}));

// Mock Amplify
vi.mock('aws-amplify/data', () => ({
    generateClient: () => ({
        models: {
            Draft: {
                get: vi.fn().mockResolvedValue({ data: null, errors: null }),
                list: vi.fn().mockResolvedValue({ data: [], errors: null }),
                create: vi.fn().mockResolvedValue({ data: null, errors: null }),
            },
            Template: {
                list: vi.fn().mockResolvedValue({ data: [], errors: null }),
            },
        },
    }),
}));

vi.mock('aws-amplify/auth', () => ({
    getCurrentUser: vi.fn().mockRejectedValue(new Error('Not authenticated')),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
}));

// Mock TipTap
vi.mock('@tiptap/react', () => ({
    useEditor: () => ({
        getHTML: vi.fn(() => ''),
        getText: vi.fn(() => ''),
        commands: { setContent: vi.fn(), insertContent: vi.fn() },
        chain: () => ({
            focus: () => ({
                run: vi.fn(),
                toggleBold: () => ({ run: vi.fn() }),
                toggleItalic: () => ({ run: vi.fn() }),
                toggleBulletList: () => ({ run: vi.fn() }),
                toggleOrderedList: () => ({ run: vi.fn() }),
                toggleHeading: () => ({ run: vi.fn() }),
                undo: () => ({ run: vi.fn() }),
                redo: () => ({ run: vi.fn() }),
            }),
        }),
        isActive: () => false,
        can: () => ({ undo: () => true, redo: () => true }),
    }),
    EditorContent: () => <div data-testid="tiptap-editor">Editor</div>,
}));

vi.mock('@tiptap/starter-kit', () => ({ default: {} }));

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
vi.mock('html-to-docx', () => ({ default: vi.fn().mockResolvedValue(new Blob()) }));

// Create store for testing
const createTestStore = () => configureStore({
    reducer: {
        document: documentReducer,
        suggestions: suggestionsReducer,
        ui: uiReducer,
        auth: authReducer,
        intake: intakeReducer,
    },
    preloadedState: {
        auth: {
            isAuthenticated: true,
            isAdmin: false,
            user: {
                email: 'test@example.com',
                userId: 'user-123',
            },
            loading: false,
            error: null,
        },
        document: {
            currentDocument: null,
            allDocuments: [],
            snapshots: [],
            shareLinks: [],
            isDirty: false,
            isAutosaving: false,
            loading: false,
            loadingAll: false,
            error: null,
        },
        suggestions: {
            suggestions: [],
            archivedSuggestions: [],
            collapsedIds: [],
            signals: { formality: 'moderate' as const, riskAppetite: 'moderate' as const, stickiness: 'medium' as const },
            approverPov: null,
            suggestionCount: 5,
            isGenerating: false,
            lastGeneratedAt: null,
            error: null,
        },
        ui: {
            rightPanelOpen: true,
            rightPanelTab: 'suggestions' as const,
            fontSize: 'medium' as const,
            showNewDocModal: false,
            showShareModal: false,
            showInviteModal: false,
            showClauseBrowser: false,
            showDeleteConfirm: null,
            pendingInsertion: null,
        },
    },
});

// Helper to wrap components with required providers
const renderWithProviders = (component: React.ReactNode) => {
    const store = createTestStore();
    return render(
        <Provider store={store}>
            <MemoryRouter>
                {component}
            </MemoryRouter>
        </Provider>
    );
};

describe('Page Components', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders Dashboard correctly', async () => {
        renderWithProviders(<Dashboard />);
        await waitFor(() => {
            // Dashboard should show the LexForge branding
            expect(screen.getByText(/LexForge/i)).toBeInTheDocument();
        });
    });

    it('renders Login correctly', async () => {
        renderWithProviders(<Login />);
        // Wait for the checking auth state to complete
        await waitFor(() => {
            expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('renders Admin correctly', async () => {
        renderWithProviders(<Admin />);
        await waitFor(() => {
            expect(screen.getByText(/Admin Console/i)).toBeInTheDocument();
        });
    });
});
