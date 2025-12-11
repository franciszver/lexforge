import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * UI state slice for managing panel visibility, tabs, and UI preferences.
 */

export type RightPanelTab = 'domain' | 'suggestions' | 'history';
export type FontSize = 'small' | 'medium' | 'large';

interface UIState {
  rightPanelOpen: boolean;
  rightPanelTab: RightPanelTab;
  fontSize: FontSize;
  showNewDocModal: boolean;
  showShareModal: boolean;
  showDeleteConfirm: string | null; // documentId or null
}

const initialState: UIState = {
  rightPanelOpen: true,
  rightPanelTab: 'suggestions',
  fontSize: 'medium',
  showNewDocModal: false,
  showShareModal: false,
  showDeleteConfirm: null,
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
} = uiSlice.actions;

export default uiSlice.reducer;

