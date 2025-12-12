import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { auditAI } from '../utils/audit';

// Lazy client initialization to avoid "Amplify not configured" errors
let _client: ReturnType<typeof generateClient<Schema>> | null = null;
function getClient() {
  if (!_client) {
    _client = generateClient<Schema>();
  }
  return _client;
}

/**
 * Enhanced suggestions slice with signal controls, pin/archive, and filtering.
 * Now integrated with real OpenAI-powered Lambda function via Amplify.
 */

export type FeedbackType = 'up' | 'down' | null;

export interface Suggestion {
    id: string;
    type: 'tone' | 'precision' | 'source' | 'risk' | 'structured' | 'clause';
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
    feedback: FeedbackType;
    // Clause-specific fields
    clauseId?: string;
    clauseContent?: string;
    clauseCategory?: string;
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

interface DocumentContext {
    jurisdiction?: string;
    docType?: string;
    practiceArea?: string;
}

// Thunk for submitting feedback with audit logging
export const submitFeedback = createAsyncThunk(
    'suggestions/submitFeedback',
    async (
        { suggestionId, feedback }: { suggestionId: string; feedback: 'up' | 'down' },
        { dispatch }
    ) => {
        // Dispatch the reducer action to update state
        dispatch(setFeedbackInternal({ id: suggestionId, feedback }));
        
        // Fire audit event (fire-and-forget)
        auditAI.feedbackSubmitted(suggestionId, feedback);
        
        return { suggestionId, feedback };
    }
);

// Real suggestion generation via Amplify Lambda
export const generateSuggestions = createAsyncThunk(
    'suggestions/generate',
    async (
        { documentId, content, appendMode, context }: { documentId: string; content: string; appendMode?: boolean; context?: DocumentContext },
        { getState, rejectWithValue }
    ) => {
        try {
            const state = getState() as { suggestions: SuggestionsState };
            const { signals, approverPov, suggestionCount } = state.suggestions;

            // Call the Lambda function via Amplify GraphQL
            const response = await getClient().queries.askAI({
                text: content,
                context: {
                    jurisdiction: context?.jurisdiction || 'Federal',
                    docType: context?.docType || 'Legal Document',
                    practiceArea: context?.practiceArea || 'General',
                    formality: signals.formality,
                    riskAppetite: signals.riskAppetite,
                    approverPov: approverPov,
                    suggestionCount: suggestionCount,
                    includeClauseSuggestions: true, // Enable clause suggestions from RAG
                },
            });

            if (response.errors && response.errors.length > 0) {
                console.error('GraphQL errors:', response.errors);
                return rejectWithValue('Failed to generate suggestions');
            }

            // Parse the response
            const data = response.data as { 
                suggestions?: Array<{
                    id: string;
                    type: string;
                    title: string;
                    text: string;
                    replacementText?: string;
                    confidence: number;
                    sourceRefs?: string[];
                    // Clause-specific fields
                    clauseId?: string;
                    clauseContent?: string;
                    clauseCategory?: string;
                }>;
                relevantClauses?: Array<{
                    id: string;
                    title: string;
                    category: string;
                    description?: string;
                    relevanceScore: number;
                }>;
            } | null;
            
            const rawSuggestions = data?.suggestions || [];

            // Transform to our Suggestion format
            const suggestions: Suggestion[] = rawSuggestions.slice(0, suggestionCount + 5).map((s) => ({
                id: s.id || crypto.randomUUID(),
                type: (s.type as Suggestion['type']) || 'structured',
                title: s.title || 'Suggestion',
                text: s.text || '',
                replacementText: s.replacementText,
                confidence: s.confidence || 0.75,
                sourceRefs: s.sourceRefs || [],
                createdAt: new Date().toISOString(),
                pinned: false,
                archived: false,
                superseded: false,
                feedback: null,
                // Clause-specific fields
                clauseId: s.clauseId,
                clauseContent: s.clauseContent,
                clauseCategory: s.clauseCategory,
            }));

            return {
                suggestions,
                appendMode: appendMode ?? false,
                documentId,
            };
        } catch (error) {
            console.error('Error generating suggestions:', error);
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
        // Internal reducer - use submitFeedback thunk instead for audit logging
        setFeedbackInternal: (state, action: PayloadAction<{ id: string; feedback: FeedbackType }>) => {
            const suggestion = state.suggestions.find(s => s.id === action.payload.id);
            if (suggestion) {
                suggestion.feedback = action.payload.feedback;
            }
            // Also check archived suggestions
            const archivedSuggestion = state.archivedSuggestions.find(s => s.id === action.payload.id);
            if (archivedSuggestion) {
                archivedSuggestion.feedback = action.payload.feedback;
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
                // Audit: AI suggestions generated
                auditAI.suggestionsGenerated(
                    action.payload.documentId,
                    action.payload.suggestions.length,
                    { appendMode: action.payload.appendMode }
                );
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
    setFeedbackInternal,
    archiveSuggestion,
    unarchiveSuggestion,
    removeSuggestion,
    toggleCollapse,
    collapseAll,
    expandAll,
    clearSuggestions,
} = suggestionsSlice.actions;

// Re-export setFeedbackInternal as setFeedback for backwards compatibility
// but prefer using submitFeedback thunk for new code
export const setFeedback = setFeedbackInternal;

export default suggestionsSlice.reducer;

