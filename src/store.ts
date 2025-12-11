import { configureStore } from '@reduxjs/toolkit';
import intakeReducer from './features/intakeSlice';
import editorReducer from './features/editorSlice';

export const store = configureStore({
    reducer: {
        intake: intakeReducer,
        editor: editorReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
