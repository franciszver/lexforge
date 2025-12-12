import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { v4 as uuidv4 } from 'uuid';

// Lazy client initialization to avoid "Amplify not configured" errors
let _client: ReturnType<typeof generateClient<Schema>> | null = null;
function getClient() {
  if (!_client) {
    _client = generateClient<Schema>();
  }
  return _client;
}

// Helper to safely parse JSON fields from DynamoDB
function parseJsonField<T>(value: unknown, defaultValue: T): T {
  if (!value) return defaultValue;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }
  return value as T;
}

/**
 * Document management slice with full CRUD operations.
 * Now integrated with DynamoDB via Amplify Data API.
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
      
      // Create in DynamoDB via Amplify
      // Note: userId is required by schema but owner auth will associate the record with the user
      const { data: draft, errors } = await getClient().models.Draft.create({
        userId: '', // Required field, but owner auth takes precedence
        title: data.title || 'Untitled Document',
        content: data.content || '',
        status: 'draft',
        metadata: JSON.stringify({
          jurisdiction: data.jurisdiction || 'Federal',
          practiceArea: data.practiceArea || 'Litigation',
          docType: data.docType || 'Demand Letter',
          opponentName: data.opponentName || '',
        }),
        intakeData: JSON.stringify({
          clientGoal: data.clientGoal || '',
          keyFacts: [],
        }),
      });

      if (errors || !draft) {
        console.error('DynamoDB create errors:', JSON.stringify(errors, null, 2));
        const errorMessage = errors?.map(e => e.message).join(', ') || 'Unknown error';
        return rejectWithValue(`Failed to create document: ${errorMessage}`);
      }

      // Map DynamoDB response to our Document format
      const metadata = parseJsonField<Record<string, string>>(draft.metadata, {});
      const intakeData = parseJsonField<Record<string, unknown>>(draft.intakeData, {});
      
      const document: Document = {
        id: draft.id,
        title: draft.title || 'Untitled Document',
        content: draft.content || '',
        status: (draft.status as 'draft' | 'review' | 'final') || 'draft',
        jurisdiction: metadata.jurisdiction || 'Federal',
        practiceArea: metadata.practiceArea || 'Litigation',
        docType: metadata.docType || 'Demand Letter',
        opponentName: metadata.opponentName || '',
        clientGoal: (intakeData.clientGoal as string) || '',
        createdAt: draft.createdAt || now,
        updatedAt: draft.updatedAt || now,
        lastAutosaveAt: null,
      };

      return document;
    } catch (error) {
      console.error('Error creating document:', error);
      return rejectWithValue('Failed to create document');
    }
  }
);

export const loadDocument = createAsyncThunk(
  'document/load',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const { data: draft, errors } = await getClient().models.Draft.get({ id: documentId });

      if (errors || !draft) {
        console.error('DynamoDB load errors:', errors);
        return rejectWithValue('Document not found');
      }

      // Map DynamoDB response to our Document format
      const metadata = parseJsonField<Record<string, string>>(draft.metadata, {});
      const intakeData = parseJsonField<Record<string, unknown>>(draft.intakeData, {});

      const document: Document = {
        id: draft.id,
        title: draft.title || 'Untitled Document',
        content: draft.content || '',
        status: (draft.status as 'draft' | 'review' | 'final') || 'draft',
        jurisdiction: metadata.jurisdiction || 'Federal',
        practiceArea: metadata.practiceArea || 'Litigation',
        docType: metadata.docType || 'Demand Letter',
        opponentName: metadata.opponentName || '',
        clientGoal: (intakeData.clientGoal as string) || '',
        createdAt: draft.createdAt || new Date().toISOString(),
        updatedAt: draft.updatedAt || new Date().toISOString(),
        lastAutosaveAt: null,
      };

      return document;
    } catch (error) {
      console.error('Error loading document:', error);
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

      // Update in DynamoDB
      const { data: draft, errors } = await getClient().models.Draft.update({
        id: document.id,
        title: document.title,
        content: document.content,
        status: document.status,
        metadata: JSON.stringify({
          jurisdiction: document.jurisdiction,
          practiceArea: document.practiceArea,
          docType: document.docType,
          opponentName: document.opponentName,
        }),
        intakeData: JSON.stringify({
          clientGoal: document.clientGoal,
        }),
      });

      if (errors || !draft) {
        console.error('DynamoDB save errors:', errors);
        return rejectWithValue('Failed to save document');
      }

      const updatedDocument = {
        ...document,
        updatedAt: draft.updatedAt || now,
        lastAutosaveAt: isAutosave ? now : document.lastAutosaveAt,
      };

      return { document: updatedDocument, isAutosave };
    } catch (error) {
      console.error('Error saving document:', error);
      return rejectWithValue('Failed to save document');
    }
  }
);

export const loadAllDocuments = createAsyncThunk(
  'document/loadAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data: drafts, errors } = await getClient().models.Draft.list();

      if (errors) {
        console.error('DynamoDB list errors:', errors);
        return rejectWithValue('Failed to load documents');
      }

      // Map DynamoDB responses to our Document format
      const documents: Document[] = (drafts || []).map((draft) => {
        const metadata = parseJsonField<Record<string, string>>(draft.metadata, {});
        const intakeData = parseJsonField<Record<string, unknown>>(draft.intakeData, {});

        return {
          id: draft.id,
          title: draft.title || 'Untitled Document',
          content: draft.content || '',
          status: (draft.status as 'draft' | 'review' | 'final') || 'draft',
          jurisdiction: metadata.jurisdiction || 'Federal',
          practiceArea: metadata.practiceArea || 'Litigation',
          docType: metadata.docType || 'Demand Letter',
          opponentName: metadata.opponentName || '',
          clientGoal: (intakeData.clientGoal as string) || '',
          createdAt: draft.createdAt || new Date().toISOString(),
          updatedAt: draft.updatedAt || new Date().toISOString(),
          lastAutosaveAt: null,
        };
      });

      // Sort by updatedAt descending
      documents.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return documents;
    } catch (error) {
      console.error('Error loading documents:', error);
      return rejectWithValue('Failed to load documents');
    }
  }
);

export const deleteDocument = createAsyncThunk(
  'document/delete',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const { errors } = await getClient().models.Draft.delete({ id: documentId });

      if (errors) {
        console.error('DynamoDB delete errors:', errors);
        return rejectWithValue('Failed to delete document');
      }

      // Also clean up local storage for snapshots/share links (still using localStorage for these)
      localStorage.removeItem(`lexforge_snapshots_${documentId}`);
      localStorage.removeItem(`lexforge_share_${documentId}`);
      
      return documentId;
    } catch (error) {
      console.error('Error deleting document:', error);
      return rejectWithValue('Failed to delete document');
    }
  }
);

export const duplicateDocument = createAsyncThunk(
  'document/duplicate',
  async (documentId: string, { rejectWithValue }) => {
    try {
      // First, get the original document
      const { data: original, errors: getErrors } = await getClient().models.Draft.get({ id: documentId });

      if (getErrors || !original) {
        console.error('DynamoDB get errors:', getErrors);
        return rejectWithValue('Document not found');
      }

      // Create a duplicate - pass metadata/intakeData as-is since they're already JSON strings
      const { data: duplicate, errors: createErrors } = await getClient().models.Draft.create({
        userId: '', // Required field, but owner auth takes precedence
        title: `${original.title || 'Untitled'} (Copy)`,
        content: original.content || '',
        status: 'draft',
        metadata: original.metadata, // Already a JSON string from original
        intakeData: original.intakeData, // Already a JSON string from original
      });

      if (createErrors || !duplicate) {
        console.error('DynamoDB create errors:', createErrors);
        return rejectWithValue('Failed to duplicate document');
      }

      // Map to our Document format
      const metadata = parseJsonField<Record<string, string>>(duplicate.metadata, {});
      const intakeData = parseJsonField<Record<string, unknown>>(duplicate.intakeData, {});

      const document: Document = {
        id: duplicate.id,
        title: duplicate.title || 'Untitled Document',
        content: duplicate.content || '',
        status: (duplicate.status as 'draft' | 'review' | 'final') || 'draft',
        jurisdiction: metadata.jurisdiction || 'Federal',
        practiceArea: metadata.practiceArea || 'Litigation',
        docType: metadata.docType || 'Demand Letter',
        opponentName: metadata.opponentName || '',
        clientGoal: (intakeData.clientGoal as string) || '',
        createdAt: duplicate.createdAt || new Date().toISOString(),
        updatedAt: duplicate.updatedAt || new Date().toISOString(),
        lastAutosaveAt: null,
      };

      return document;
    } catch (error) {
      console.error('Error duplicating document:', error);
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

