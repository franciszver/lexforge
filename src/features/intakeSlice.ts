import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { IntakeData } from '../types';

const initialState: IntakeData = {
    jurisdiction: 'Federal',
    practiceArea: 'Litigation',
    docType: 'Demand Letter',
    opponentName: '',
    clientGoal: '',
    keyFacts: [],
};

const intakeSlice = createSlice({
    name: 'intake',
    initialState,
    reducers: {
        updateField: (state, action: PayloadAction<Partial<IntakeData>>) => {
            return { ...state, ...action.payload };
        },
        addFact: (state, action: PayloadAction<string>) => {
            state.keyFacts.push(action.payload);
        },
        removeFact: (state, action: PayloadAction<number>) => {
            state.keyFacts.splice(action.payload, 1);
        },
        resetIntake: () => initialState,
    },
});

export const { updateField, addFact, removeFact, resetIntake } = intakeSlice.actions;
export default intakeSlice.reducer;
