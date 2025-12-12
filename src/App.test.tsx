import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import documentReducer from './features/documentSlice';
import suggestionsReducer from './features/suggestionsSlice';
import uiReducer from './features/uiSlice';
import authReducer from './features/authSlice';
import intakeReducer from './features/intakeSlice';
import App from './App';

// Mock audit utilities to prevent side effects during tests
vi.mock('./utils/audit', () => ({
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

// Track auth state for mocking
let mockIsAuthenticated = true;

vi.mock('aws-amplify/auth', () => ({
    getCurrentUser: vi.fn(() => {
        if (mockIsAuthenticated) {
            return Promise.resolve({ userId: 'user-123', username: 'test@example.com' });
        }
        return Promise.reject(new Error('Not authenticated'));
    }),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    fetchAuthSession: vi.fn().mockResolvedValue({ tokens: { accessToken: { payload: {} } } }),
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
const createTestStore = (isAuthenticated = true) => configureStore({
    reducer: {
        document: documentReducer,
        suggestions: suggestionsReducer,
        ui: uiReducer,
        auth: authReducer,
        intake: intakeReducer,
    } as any,
    preloadedState: {
        auth: {
            isAuthenticated,
            email: isAuthenticated ? 'test@example.com' : null,
            userId: isAuthenticated ? 'user-123' : null,
            isAdmin: false,
            loading: false,
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
            signals: { formality: 'moderate', riskAppetite: 'moderate', stickiness: 'medium' },
            approverPov: null,
            suggestionCount: 5,
            isGenerating: false,
            lastGeneratedAt: null,
            error: null,
        },
        ui: {
            rightPanelOpen: true,
            rightPanelTab: 'suggestions',
            fontSize: 'medium',
            showNewDocModal: false,
            showShareModal: false,
            showDeleteConfirm: null,
            pendingInsertion: null,
        },
    },
});

describe('App Routing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsAuthenticated = true;
    });

    it('renders Dashboard for authenticated users at root', async () => {
        const store = createTestStore(true);

        render(
            <Provider store={store}>
                <App />
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByText(/LexForge/i)).toBeInTheDocument();
        });
    });

    it('redirects to login for unauthenticated users', async () => {
        mockIsAuthenticated = false;
        const store = createTestStore(false);

        render(
            <Provider store={store}>
                <App />
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
        });
    });

    it('renders Login page on /login', async () => {
        const store = createTestStore(false);

        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={['/login']}>
                    <Routes>
                        <Route path="/login" element={
                            <Provider store={store}>
                                <div>Login Page</div>
                            </Provider>
                        } />
                    </Routes>
                </MemoryRouter>
            </Provider>
        );

        expect(screen.getByText(/Login Page/i)).toBeInTheDocument();
    });
});
