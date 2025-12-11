import { describe, it, expect } from 'vitest';
import intakeReducer, { updateField, addFact, removeFact, resetIntake } from './intakeSlice';
import editorReducer, { toggleSidebar, setContent, setSuggestions, setActiveSuggestion } from './editorSlice';
import type { Suggestion } from '../types';

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

describe('Editor Reducer', () => {
    it('should toggle sidebar', () => {
        const initial = editorReducer(undefined, { type: 'unknown' });
        const toggled = editorReducer(initial, toggleSidebar());
        expect(toggled.isSidebarOpen).toBe(!initial.isSidebarOpen);
    });

    it('should set content', () => {
        const actual = editorReducer(undefined, setContent('<p>New</p>'));
        expect(actual.content).toBe('<p>New</p>');
    });

    it('should set suggestions', () => {
        const mockSuggestions: Suggestion[] = [{ id: '1', type: 'tone', text: 'test', confidence: 1 }];
        const actual = editorReducer(undefined, setSuggestions(mockSuggestions));
        expect(actual.suggestions).toHaveLength(1);
    });

    it('should set active suggestion', () => {
        const actual = editorReducer(undefined, setActiveSuggestion('123'));
        expect(actual.activeSuggestionId).toBe('123');
    });
});
