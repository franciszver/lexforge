import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import authReducer from './features/authSlice';
import documentReducer from './features/documentSlice';
import suggestionsReducer from './features/suggestionsSlice';
import uiReducer from './features/uiSlice';
import intakeReducer from './features/intakeSlice';
import auditReducer from './features/auditSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    document: documentReducer,
    suggestions: suggestionsReducer,
    ui: uiReducer,
    intake: intakeReducer,
    audit: auditReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks using react-redux v9 withTypes pattern
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
