import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * UI state slice for managing panel visibility, tabs, and UI preferences.
 */

export type RightPanelTab = 'domain' | 'suggestions' | 'history';
export type FontSize = 'small' | 'medium' | 'large';

interface PendingInsertion {
  text: string;
  suggestionId: string;
}

interface UIState {
  rightPanelOpen: boolean;
  rightPanelTab: RightPanelTab;
  fontSize: FontSize;
  showNewDocModal: boolean;
  showShareModal: boolean;
  showDeleteConfirm: string | null; // documentId or null
  pendingInsertion: PendingInsertion | null; // Text to insert into editor
}

const initialState: UIState = {
  rightPanelOpen: true,
  rightPanelTab: 'suggestions',
  fontSize: 'medium',
  showNewDocModal: false,
  showShareModal: false,
  showDeleteConfirm: null,
  pendingInsertion: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleRightPanel: (state) => {
      state.rightPanelOpen = !state.rightPanelOpen;
    },
    setRightPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.rightPanelOpen = action.payload;
    },
    setRightPanelTab: (state, action: PayloadAction<RightPanelTab>) => {
      state.rightPanelTab = action.payload;
    },
    setFontSize: (state, action: PayloadAction<FontSize>) => {
      state.fontSize = action.payload;
    },
    setShowNewDocModal: (state, action: PayloadAction<boolean>) => {
      state.showNewDocModal = action.payload;
    },
    setShowShareModal: (state, action: PayloadAction<boolean>) => {
      state.showShareModal = action.payload;
    },
    setShowDeleteConfirm: (state, action: PayloadAction<string | null>) => {
      state.showDeleteConfirm = action.payload;
    },
    setPendingInsertion: (state, action: PayloadAction<{ text: string; suggestionId: string } | null>) => {
      state.pendingInsertion = action.payload;
    },
    clearPendingInsertion: (state) => {
      state.pendingInsertion = null;
    },
  },
});

export const {
  toggleRightPanel,
  setRightPanelOpen,
  setRightPanelTab,
  setFontSize,
  setShowNewDocModal,
  setShowShareModal,
  setShowDeleteConfirm,
  setPendingInsertion,
  clearPendingInsertion,
} = uiSlice.actions;

export default uiSlice.reducer;

