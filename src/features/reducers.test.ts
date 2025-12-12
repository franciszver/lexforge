import { describe, it, expect, vi } from 'vitest';
import intakeReducer, { updateField, addFact, removeFact, resetIntake } from './intakeSlice';
import documentReducer, { updateContent, markClean, clearDocument } from './documentSlice';
import suggestionsReducer, { setSignals, togglePin, clearSuggestions } from './suggestionsSlice';
import uiReducer, { toggleRightPanel, setRightPanelTab, setPendingInsertion, clearPendingInsertion } from './uiSlice';

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

describe('Intake Reducer', () => {
    it('should handle initial state', () => {
        const initialState = intakeReducer(undefined, { type: 'unknown' });
        expect(initialState.jurisdiction).toBe('Federal');
    });

    it('should handle updateField', () => {
        const actual = intakeReducer(undefined, updateField({ opponentName: 'Evil Corp' }));
        expect(actual.opponentName).toEqual('Evil Corp');
    });

    it('should handle addFact and removeFact', () => {
        let state = intakeReducer(undefined, addFact('Fact 1'));
        expect(state.keyFacts).toContain('Fact 1');

        state = intakeReducer(state, removeFact(0));
        expect(state.keyFacts).toHaveLength(0);
    });

    it('should handle resetIntake', () => {
        let state = intakeReducer(undefined, updateField({ opponentName: 'Changed' }));
        state = intakeReducer(state, resetIntake());
        expect(state.opponentName).toBe('');
    });
});

describe('Document Reducer', () => {
    const mockDocument = {
        id: '123',
        title: 'Test Doc',
        content: '<p>Test</p>',
        status: 'draft' as const,
        jurisdiction: 'Federal',
        practiceArea: 'Litigation',
        docType: 'Demand Letter',
        opponentName: '',
        clientGoal: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastAutosaveAt: null,
    };

    it('should handle initial state', () => {
        const initialState = documentReducer(undefined, { type: 'unknown' });
        expect(initialState.currentDocument).toBeNull();
        expect(initialState.allDocuments).toHaveLength(0);
        expect(initialState.isDirty).toBe(false);
    });

    it('should not update content without a current document', () => {
        const state = documentReducer(undefined, updateContent('<p>New Content</p>'));
        expect(state.currentDocument).toBeNull();
    });

    it('should handle markClean', () => {
        // Manually create a state with isDirty = true
        const dirtyState = {
            currentDocument: mockDocument,
            allDocuments: [],
            snapshots: [],
            shareLinks: [],
            isDirty: true,
            isAutosaving: false,
            loading: false,
            loadingAll: false,
            error: null,
        };
        const state = documentReducer(dirtyState, markClean());
        expect(state.isDirty).toBe(false);
    });

    it('should handle clearDocument', () => {
        const stateWithDoc = {
            currentDocument: mockDocument,
            allDocuments: [mockDocument],
            snapshots: [],
            shareLinks: [],
            isDirty: true,
            isAutosaving: false,
            loading: false,
            loadingAll: false,
            error: null,
        };
        const state = documentReducer(stateWithDoc, clearDocument());
        expect(state.currentDocument).toBeNull();
        expect(state.isDirty).toBe(false);
        expect(state.snapshots).toHaveLength(0);
    });
});

describe('Suggestions Reducer', () => {
    it('should handle initial state', () => {
        const initialState = suggestionsReducer(undefined, { type: 'unknown' });
        expect(initialState.suggestions).toHaveLength(0);
        expect(initialState.signals.formality).toBe('moderate');
        expect(initialState.isGenerating).toBe(false);
    });

    it('should handle setSignals', () => {
        const state = suggestionsReducer(undefined, setSignals({ formality: 'formal' }));
        expect(state.signals.formality).toBe('formal');
        expect(state.signals.riskAppetite).toBe('moderate'); // unchanged
    });

    it('should handle togglePin', () => {
        const stateWithSuggestion = {
            suggestions: [{
                id: '1',
                type: 'tone' as const,
                title: 'Test',
                text: 'Test suggestion',
                confidence: 0.8,
                sourceRefs: [],
                createdAt: new Date().toISOString(),
                pinned: false,
                archived: false,
                superseded: false,
                feedback: null,
            }],
            archivedSuggestions: [],
            collapsedIds: [],
            signals: { formality: 'moderate' as const, riskAppetite: 'moderate' as const, stickiness: 'medium' as const },
            approverPov: null,
            suggestionCount: 5,
            isGenerating: false,
            lastGeneratedAt: null,
            error: null,
        };
        const state = suggestionsReducer(stateWithSuggestion, togglePin('1'));
        expect(state.suggestions[0].pinned).toBe(true);
    });

    it('should handle clearSuggestions', () => {
        const stateWithSuggestion = {
            suggestions: [{
                id: '1',
                type: 'tone' as const,
                title: 'Test',
                text: 'Test',
                confidence: 0.8,
                sourceRefs: [],
                createdAt: new Date().toISOString(),
                pinned: false,
                archived: false,
                superseded: false,
                feedback: null,
            }],
            archivedSuggestions: [],
            collapsedIds: ['1'],
            signals: { formality: 'moderate' as const, riskAppetite: 'moderate' as const, stickiness: 'medium' as const },
            approverPov: null,
            suggestionCount: 5,
            isGenerating: false,
            lastGeneratedAt: null,
            error: null,
        };
        const state = suggestionsReducer(stateWithSuggestion, clearSuggestions());
        expect(state.suggestions).toHaveLength(0);
        expect(state.collapsedIds).toHaveLength(0);
    });
});

describe('UI Reducer', () => {
    it('should handle initial state', () => {
        const initialState = uiReducer(undefined, { type: 'unknown' });
        expect(initialState.rightPanelOpen).toBe(true);
        expect(initialState.rightPanelTab).toBe('suggestions');
        expect(initialState.pendingInsertion).toBeNull();
    });

    it('should toggle right panel', () => {
        const initial = uiReducer(undefined, { type: 'unknown' });
        const toggled = uiReducer(initial, toggleRightPanel());
        expect(toggled.rightPanelOpen).toBe(!initial.rightPanelOpen);
    });

    it('should set right panel tab', () => {
        const state = uiReducer(undefined, setRightPanelTab('history'));
        expect(state.rightPanelTab).toBe('history');
    });

    it('should set and clear pending insertion', () => {
        let state = uiReducer(undefined, setPendingInsertion({ text: 'Test text', suggestionId: '123' }));
        expect(state.pendingInsertion).toEqual({ text: 'Test text', suggestionId: '123' });

        state = uiReducer(state, clearPendingInsertion());
        expect(state.pendingInsertion).toBeNull();
    });
});
