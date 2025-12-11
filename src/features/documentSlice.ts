import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

/**
 * Document management slice with full CRUD operations.
 * Supports autosave, snapshots, and share links.
 */

export interface Snapshot {
  id: string;
  documentId: string;
  content: string;
  title: string;
  createdAt: string;
  isAutoSave: boolean;
}

export interface ShareLink {
  id: string;
  documentId: string;
  token: string;
  passcode: string;
  createdAt: string;
  expiresAt: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'review' | 'final';
  jurisdiction: string;
  practiceArea: string;
  docType: string;
  opponentName: string;
  clientGoal: string;
  createdAt: string;
  updatedAt: string;
  lastAutosaveAt: string | null;
}

interface DocumentState {
  currentDocument: Document | null;
  allDocuments: Document[];
  snapshots: Snapshot[];
  shareLinks: ShareLink[];
  isDirty: boolean;
  isAutosaving: boolean;
  loading: boolean;
  loadingAll: boolean;
  error: string | null;
}

const initialState: DocumentState = {
  currentDocument: null,
  allDocuments: [],
  snapshots: [],
  shareLinks: [],
  isDirty: false,
  isAutosaving: false,
  loading: false,
  loadingAll: false,
  error: null,
};

const MAX_SNAPSHOTS = 20;

// Helper to generate random passcode
const generatePasscode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createDocument = createAsyncThunk(
  'document/create',
  async (data: Partial<Document>, { rejectWithValue }) => {
    try {
      const now = new Date().toISOString();
      const document: Document = {
        id: uuidv4(),
        title: data.title || 'Untitled Document',
        content: data.content || '',
        status: 'draft',
        jurisdiction: data.jurisdiction || 'Federal',
        practiceArea: data.practiceArea || 'Litigation',
        docType: data.docType || 'Demand Letter',
        opponentName: data.opponentName || '',
        clientGoal: data.clientGoal || '',
        createdAt: now,
        updatedAt: now,
        lastAutosaveAt: null,
      };

      localStorage.setItem(`lexforge_doc_${document.id}`, JSON.stringify(document));
      return document;
    } catch (error) {
      return rejectWithValue('Failed to create document');
    }
  }
);

export const loadDocument = createAsyncThunk(
  'document/load',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const stored = localStorage.getItem(`lexforge_doc_${documentId}`);
      if (stored) {
        return JSON.parse(stored) as Document;
      }
      return rejectWithValue('Document not found');
    } catch (error) {
      return rejectWithValue('Failed to load document');
    }
  }
);

export const saveDocument = createAsyncThunk(
  'document/save',
  async (
    { document, isAutosave }: { document: Document; isAutosave: boolean },
    { rejectWithValue }
  ) => {
    try {
      const now = new Date().toISOString();
      const updatedDocument = {
        ...document,
        updatedAt: now,
        lastAutosaveAt: isAutosave ? now : document.lastAutosaveAt,
      };

      localStorage.setItem(`lexforge_doc_${document.id}`, JSON.stringify(updatedDocument));
      return { document: updatedDocument, isAutosave };
    } catch (error) {
      return rejectWithValue('Failed to save document');
    }
  }
);

export const loadAllDocuments = createAsyncThunk(
  'document/loadAll',
  async (_, { rejectWithValue }) => {
    try {
      const documents: Document[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('lexforge_doc_')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              documents.push(JSON.parse(stored) as Document);
            } catch {
              // Skip invalid entries
            }
          }
        }
      }
      documents.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return documents;
    } catch (error) {
      return rejectWithValue('Failed to load documents');
    }
  }
);

export const deleteDocument = createAsyncThunk(
  'document/delete',
  async (documentId: string, { rejectWithValue }) => {
    try {
      localStorage.removeItem(`lexforge_doc_${documentId}`);
      localStorage.removeItem(`lexforge_snapshots_${documentId}`);
      localStorage.removeItem(`lexforge_share_${documentId}`);
      return documentId;
    } catch (error) {
      return rejectWithValue('Failed to delete document');
    }
  }
);

export const duplicateDocument = createAsyncThunk(
  'document/duplicate',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const stored = localStorage.getItem(`lexforge_doc_${documentId}`);
      if (!stored) {
        return rejectWithValue('Document not found');
      }

      const original = JSON.parse(stored) as Document;
      const now = new Date().toISOString();
      const duplicate: Document = {
        ...original,
        id: uuidv4(),
        title: `${original.title} (Copy)`,
        createdAt: now,
        updatedAt: now,
        lastAutosaveAt: null,
      };

      localStorage.setItem(`lexforge_doc_${duplicate.id}`, JSON.stringify(duplicate));
      return duplicate;
    } catch (error) {
      return rejectWithValue('Failed to duplicate document');
    }
  }
);

export const createSnapshot = createAsyncThunk(
  'document/createSnapshot',
  async (
    { documentId, content, title, isAutoSave }: { documentId: string; content: string; title?: string; isAutoSave: boolean },
    { rejectWithValue }
  ) => {
    try {
      const snapshot: Snapshot = {
        id: uuidv4(),
        documentId,
        content,
        title: title || `Snapshot ${new Date().toLocaleString()}`,
        createdAt: new Date().toISOString(),
        isAutoSave,
      };

      // Load existing snapshots from localStorage to avoid losing them
      const stored = localStorage.getItem(`lexforge_snapshots_${documentId}`);
      let snapshots: Snapshot[] = stored ? JSON.parse(stored) : [];
      
      // Add new snapshot
      snapshots = [snapshot, ...snapshots];

      // Enforce MAX_SNAPSHOTS limit
      if (snapshots.length > MAX_SNAPSHOTS) {
        snapshots = snapshots
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, MAX_SNAPSHOTS);
      }

      localStorage.setItem(`lexforge_snapshots_${documentId}`, JSON.stringify(snapshots));
      return snapshot;
    } catch (error) {
      return rejectWithValue('Failed to create snapshot');
    }
  }
);

export const loadSnapshots = createAsyncThunk(
  'document/loadSnapshots',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const stored = localStorage.getItem(`lexforge_snapshots_${documentId}`);
      if (stored) {
        return JSON.parse(stored) as Snapshot[];
      }
      return [];
    } catch (error) {
      return rejectWithValue('Failed to load snapshots');
    }
  }
);

export const createShareLink = createAsyncThunk(
  'document/createShareLink',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const shareLink: ShareLink = {
        id: uuidv4(),
        documentId,
        token: uuidv4(),
        passcode: generatePasscode(),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours
      };

      localStorage.setItem(`lexforge_share_${documentId}`, JSON.stringify(shareLink));
      return shareLink;
    } catch (error) {
      return rejectWithValue('Failed to create share link');
    }
  }
);

const documentSlice = createSlice({
  name: 'document',
  initialState,
  reducers: {
    updateContent: (state, action: PayloadAction<string>) => {
      if (state.currentDocument) {
        state.currentDocument.content = action.payload;
        state.isDirty = true;
      }
    },
    updateTitle: (state, action: PayloadAction<string>) => {
      if (state.currentDocument) {
        state.currentDocument.title = action.payload;
        state.isDirty = true;
      }
    },
    updateStatus: (state, action: PayloadAction<'draft' | 'review' | 'final'>) => {
      if (state.currentDocument) {
        state.currentDocument.status = action.payload;
        state.isDirty = true;
      }
    },
    markClean: (state) => {
      state.isDirty = false;
    },
    clearDocument: (state) => {
      state.currentDocument = null;
      state.snapshots = [];
      state.isDirty = false;
    },
    restoreSnapshot: (state, action: PayloadAction<Snapshot>) => {
      if (state.currentDocument) {
        state.currentDocument.content = action.payload.content;
        state.isDirty = true;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Create document
      .addCase(createDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDocument = action.payload;
        state.allDocuments = [action.payload, ...state.allDocuments];
        state.snapshots = [];
        state.isDirty = false;
      })
      .addCase(createDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Load document
      .addCase(loadDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDocument = action.payload;
        state.isDirty = false;
      })
      .addCase(loadDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Save document
      .addCase(saveDocument.pending, (state, action) => {
        if (action.meta.arg.isAutosave) {
          state.isAutosaving = true;
        }
      })
      .addCase(saveDocument.fulfilled, (state, action) => {
        state.currentDocument = action.payload.document;
        state.isDirty = false;
        state.isAutosaving = false;
        // Update in allDocuments array
        const idx = state.allDocuments.findIndex(d => d.id === action.payload.document.id);
        if (idx !== -1) {
          state.allDocuments[idx] = action.payload.document;
        }
      })
      .addCase(saveDocument.rejected, (state, action) => {
        state.isAutosaving = false;
        state.error = action.payload as string;
      })
      // Load all documents
      .addCase(loadAllDocuments.pending, (state) => {
        state.loadingAll = true;
        state.error = null;
      })
      .addCase(loadAllDocuments.fulfilled, (state, action) => {
        state.loadingAll = false;
        state.allDocuments = action.payload;
      })
      .addCase(loadAllDocuments.rejected, (state, action) => {
        state.loadingAll = false;
        state.error = action.payload as string;
      })
      // Delete document
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.allDocuments = state.allDocuments.filter(doc => doc.id !== action.payload);
        if (state.currentDocument?.id === action.payload) {
          state.currentDocument = null;
          state.snapshots = [];
          state.isDirty = false;
        }
      })
      // Duplicate document
      .addCase(duplicateDocument.fulfilled, (state, action) => {
        state.allDocuments = [action.payload, ...state.allDocuments];
      })
      // Load snapshots
      .addCase(loadSnapshots.fulfilled, (state, action) => {
        state.snapshots = action.payload;
      })
      // Create snapshot
      .addCase(createSnapshot.fulfilled, (state, action) => {
        const updated = [action.payload, ...state.snapshots];
        state.snapshots = updated
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, MAX_SNAPSHOTS);
      })
      // Share link
      .addCase(createShareLink.fulfilled, (state, action) => {
        state.shareLinks = [...state.shareLinks, action.payload];
      });
  },
});

export const {
  updateContent,
  updateTitle,
  updateStatus,
  markClean,
  clearDocument,
  restoreSnapshot,
} = documentSlice.actions;

export default documentSlice.reducer;

