import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Suggestion } from '../types';

/**
 * Redux state for the Editor feature.
 * Tracks the document content, sidebar visibility, RAG suggestions, and saving status.
 */
interface EditorState {
    isSidebarOpen: boolean;
    suggestions: Suggestion[];
    activeSuggestionId: string | null;
    content: string; // HTML content
    isSaving: boolean;
    lastSavedAt: string | null;
}

const initialState: EditorState = {
    isSidebarOpen: true,
    suggestions: [],
    activeSuggestionId: null,
    content: '',
    isSaving: false,
    lastSavedAt: null,
};

const editorSlice = createSlice({
    name: 'editor',
    initialState,
    reducers: {
        toggleSidebar: (state) => {
            state.isSidebarOpen = !state.isSidebarOpen;
        },
        setSuggestions: (state, action: PayloadAction<Suggestion[]>) => {
            state.suggestions = action.payload;
        },
        setActiveSuggestion: (state, action: PayloadAction<string | null>) => {
            state.activeSuggestionId = action.payload;
        },
        setContent: (state, action: PayloadAction<string>) => {
            state.content = action.payload;
        },
        setSaving: (state, action: PayloadAction<boolean>) => {
            state.isSaving = action.payload;
        },
        setLastSaved: (state, action: PayloadAction<string>) => {
            state.lastSavedAt = action.payload;
        },
        removeSuggestion: (state, action: PayloadAction<string>) => {
            state.suggestions = state.suggestions.filter(s => s.id !== action.payload);
        },
    },
});

export const {
    toggleSidebar,
    setSuggestions,
    setActiveSuggestion,
    setContent,
    setSaving,
    setLastSaved,
    removeSuggestion
} = editorSlice.actions;

export default editorSlice.reducer;
