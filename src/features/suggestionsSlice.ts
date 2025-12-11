import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced suggestions slice with signal controls, pin/archive, and filtering.
 */

export interface Suggestion {
    id: string;
    type: 'tone' | 'precision' | 'source' | 'risk' | 'structured';
    title: string;
    text: string;
    replacementText?: string;
    confidence: number;
    source?: string;
    sourceRefs: string[];
    createdAt: string;
    pinned: boolean;
    archived: boolean;
    superseded: boolean;
}

export type Formality = 'casual' | 'moderate' | 'formal';
export type RiskAppetite = 'conservative' | 'moderate' | 'aggressive';
export type Stickiness = 'low' | 'medium' | 'high';
export type ApproverPOV =
    | 'operational_risk'
    | 'regulatory_compliance'
    | 'financial_impact'
    | 'safety_workforce'
    | 'environmental_impact'
    | 'legal_contractual'
    | null;

interface SignalSettings {
    formality: Formality;
    riskAppetite: RiskAppetite;
    stickiness: Stickiness;
}

interface SuggestionsState {
    suggestions: Suggestion[];
    archivedSuggestions: Suggestion[];
    collapsedIds: string[];
    signals: SignalSettings;
    approverPov: ApproverPOV;
    suggestionCount: number;
    isGenerating: boolean;
    lastGeneratedAt: string | null;
    error: string | null;
}

const initialState: SuggestionsState = {
    suggestions: [],
    archivedSuggestions: [],
    collapsedIds: [],
    signals: {
        formality: 'moderate',
        riskAppetite: 'moderate',
        stickiness: 'medium',
    },
    approverPov: null,
    suggestionCount: 5,
    isGenerating: false,
    lastGeneratedAt: null,
    error: null,
};

// Mock suggestion generation (replace with real API call)
export const generateSuggestions = createAsyncThunk(
    'suggestions/generate',
    async (
        { documentId: _documentId, content: _content, appendMode }: { documentId: string; content: string; appendMode?: boolean },
        { getState, rejectWithValue }
    ) => {
        try {
            const state = getState() as { suggestions: SuggestionsState };
            const { signals, approverPov: _approverPov, suggestionCount } = state.suggestions;
            // Note: _documentId, _content, and _approverPov will be used when integrating with real API

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Mock suggestions based on signals
            const mockSuggestions: Suggestion[] = [
                {
                    id: uuidv4(),
                    type: 'tone',
                    title: 'Formality Adjustment',
                    text: signals.formality === 'formal'
                        ? 'Consider using more formal language for regulatory compliance documents.'
                        : 'The tone is appropriate for the document type.',
                    replacementText: 'We formally request immediate compliance with the terms outlined herein.',
                    confidence: 0.85,
                    sourceRefs: ['https://www.law.cornell.edu/rules', 'https://www.uscourts.gov/rules-policies'],
                    createdAt: new Date().toISOString(),
                    pinned: false,
                    archived: false,
                    superseded: false,
                },
                {
                    id: uuidv4(),
                    type: 'precision',
                    title: 'Date Specification Required',
                    text: 'Specify exact dates for the alleged breach to strengthen the legal position.',
                    confidence: 0.92,
                    sourceRefs: ['https://www.law.cornell.edu/ucc'],
                    createdAt: new Date().toISOString(),
                    pinned: false,
                    archived: false,
                    superseded: false,
                },
                {
                    id: uuidv4(),
                    type: 'risk',
                    title: signals.riskAppetite === 'conservative' ? 'Risk Mitigation Recommended' : 'Risk Assessment',
                    text: signals.riskAppetite === 'conservative'
                        ? 'Consider adding additional safeguards and disclaimers to minimize liability exposure.'
                        : 'Current risk exposure is within acceptable parameters.',
                    confidence: 0.78,
                    sourceRefs: [],
                    createdAt: new Date().toISOString(),
                    pinned: false,
                    archived: false,
                    superseded: false,
                },
                {
                    id: uuidv4(),
                    type: 'source',
                    title: 'Citation Needed',
                    text: 'Add legal precedent citation to support the claim regarding breach of contract.',
                    replacementText: 'As established in Smith v. Jones, 123 F.3d 456 (9th Cir. 2019)...',
                    confidence: 0.88,
                    source: 'Westlaw Database',
                    sourceRefs: ['https://www.westlaw.com'],
                    createdAt: new Date().toISOString(),
                    pinned: false,
                    archived: false,
                    superseded: false,
                },
                {
                    id: uuidv4(),
                    type: 'structured',
                    title: 'Section Organization',
                    text: 'Consider restructuring the document with clear headings for better readability.',
                    confidence: 0.75,
                    sourceRefs: [],
                    createdAt: new Date().toISOString(),
                    pinned: false,
                    archived: false,
                    superseded: false,
                },
            ];

            // Return limited number based on suggestionCount
            return {
                suggestions: mockSuggestions.slice(0, suggestionCount),
                appendMode: appendMode ?? false,
            };
        } catch (error) {
            return rejectWithValue('Failed to generate suggestions');
        }
    }
);

const suggestionsSlice = createSlice({
    name: 'suggestions',
    initialState,
    reducers: {
        setSignals: (state, action: PayloadAction<Partial<SignalSettings>>) => {
            state.signals = { ...state.signals, ...action.payload };
        },
        setApproverPov: (state, action: PayloadAction<ApproverPOV>) => {
            state.approverPov = action.payload;
        },
        setSuggestionCount: (state, action: PayloadAction<number>) => {
            state.suggestionCount = action.payload;
        },
        togglePin: (state, action: PayloadAction<string>) => {
            const suggestion = state.suggestions.find(s => s.id === action.payload);
            if (suggestion) {
                suggestion.pinned = !suggestion.pinned;
            }
        },
        archiveSuggestion: (state, action: PayloadAction<string>) => {
            const idx = state.suggestions.findIndex(s => s.id === action.payload);
            if (idx !== -1) {
                const [archived] = state.suggestions.splice(idx, 1);
                archived.archived = true;
                state.archivedSuggestions.push(archived);
            }
        },
        unarchiveSuggestion: (state, action: PayloadAction<string>) => {
            const idx = state.archivedSuggestions.findIndex(s => s.id === action.payload);
            if (idx !== -1) {
                const [restored] = state.archivedSuggestions.splice(idx, 1);
                restored.archived = false;
                state.suggestions.push(restored);
            }
        },
        removeSuggestion: (state, action: PayloadAction<string>) => {
            state.suggestions = state.suggestions.filter(s => s.id !== action.payload);
        },
        toggleCollapse: (state, action: PayloadAction<string>) => {
            const idx = state.collapsedIds.indexOf(action.payload);
            if (idx !== -1) {
                state.collapsedIds.splice(idx, 1);
            } else {
                state.collapsedIds.push(action.payload);
            }
        },
        collapseAll: (state) => {
            state.collapsedIds = state.suggestions.map(s => s.id);
        },
        expandAll: (state) => {
            state.collapsedIds = [];
        },
        clearSuggestions: (state) => {
            state.suggestions = [];
            state.collapsedIds = [];
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(generateSuggestions.pending, (state) => {
                state.isGenerating = true;
                state.error = null;
            })
            .addCase(generateSuggestions.fulfilled, (state, action) => {
                state.isGenerating = false;
                if (action.payload.appendMode) {
                    // Mark existing non-pinned suggestions as superseded
                    state.suggestions = state.suggestions.map(s =>
                        s.pinned ? s : { ...s, superseded: true }
                    );
                    state.suggestions = [...state.suggestions, ...action.payload.suggestions];
                } else {
                    // Replace all suggestions
                    state.suggestions = action.payload.suggestions;
                }
                state.lastGeneratedAt = new Date().toISOString();
                state.collapsedIds = [];
            })
            .addCase(generateSuggestions.rejected, (state, action) => {
                state.isGenerating = false;
                state.error = action.payload as string;
            });
    },
});

export const {
    setSignals,
    setApproverPov,
    setSuggestionCount,
    togglePin,
    archiveSuggestion,
    unarchiveSuggestion,
    removeSuggestion,
    toggleCollapse,
    collapseAll,
    expandAll,
    clearSuggestions,
} = suggestionsSlice.actions;

export default suggestionsSlice.reducer;

