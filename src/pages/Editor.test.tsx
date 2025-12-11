import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer from '../features/editorSlice';
import { Editor } from './Editor';

// --- MOCKS ---

// 1. Mock TipTap
const mockGetHTML = vi.fn(() => '<p>Mock Content</p>');
const mockGetText = vi.fn(() => 'Mock Content');

vi.mock('@tiptap/react', () => ({
    useEditor: () => ({
        getHTML: mockGetHTML,
        getText: mockGetText,
        commands: {
            setContent: vi.fn(),
        },
        chain: () => ({
            focus: () => ({
                run: vi.fn(),
            }),
        }),
    }),
    EditorContent: () => <div data-testid="tiptap-editor">Editor Content</div>,
}));

vi.mock('@tiptap/starter-kit', () => ({
    default: {},
}));

// 2. Mock file-saver and html-to-docx
const mockSaveAs = vi.fn();
vi.mock('file-saver', () => ({
    saveAs: (...args: unknown[]) => mockSaveAs(...args),
}));

vi.mock('html-to-docx', () => ({
    default: vi.fn().mockResolvedValue(new Blob(['mock data'])),
}));

// --- SETUP ---

const renderEditor = (initialState = {}) => {
    const store = configureStore({
        reducer: {
            editor: editorReducer,
        },
        preloadedState: {
            editor: {
                isSidebarOpen: false,
                suggestions: [],
                activeSuggestionId: null,
                content: '<p>Initial</p>',
                isSaving: false,
                lastSavedAt: null,
                ...initialState
            }
        }
    });
    return {
        ...render(
            <Provider store={store}>
                <Editor />
            </Provider>
        ), store
    };
};

describe('Editor Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the editor with initial content', () => {
        renderEditor();
        expect(screen.getByText('LexForge // Draft')).toBeInTheDocument();
        expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
    });

    it('triggers AI suggestions', async () => {
        vi.useFakeTimers();
        renderEditor();
        const aiBtn = screen.getByTitle(/Generate Suggestions/i);
        fireEvent.click(aiBtn);

        // Advance timer by 2000ms to trigger mock response securely
        await vi.runAllTimersAsync();

        // State should be updated now
        expect(screen.getByText(/Cited statute/i)).toBeInTheDocument();
    });

    it('exports the document', async () => {
        renderEditor({ content: '<p>Export Me</p>' });

        const exportBtn = screen.getByTitle(/Export to Word/i);
        fireEvent.click(exportBtn);

        await waitFor(() => {
            expect(mockSaveAs).toHaveBeenCalled();
        });

        expect(mockSaveAs).toHaveBeenCalledWith(
            expect.any(Blob),
            expect.stringContaining('LexForge_Draft_')
        );
    });
    it('removes suggestion on dismiss', async () => {
        const initialState = {
            suggestions: [{
                id: '1',
                type: 'tone',
                text: 'Bad tone',
                replacementText: 'Good tone',
                confidence: 0.9
            }],
            isSidebarOpen: true
        };
        renderEditor(initialState);

        const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
        fireEvent.click(dismissBtn);

        await waitFor(() => {
            expect(screen.queryByText('Bad tone')).not.toBeInTheDocument();
        });
    });
});

