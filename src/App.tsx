import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard, Login, Editor, Admin } from './pages';
import { ProtectedRoute, AdminRoute, NewDocumentModal, ShareModal, InviteCollaboratorModal, ClauseBrowser, CitationBrowser, DeleteConfirmModal } from './components';
import { useAppSelector, useAppDispatch } from './store';
import { setShowClauseBrowser, setShowCitationBrowser, setPendingInsertion } from './features/uiSlice';
import type { Citation } from './utils/citationTypes';
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main App Component with route protection and global modals.
 * Routes to different pages - each page manages its own header.
 */
function AppContent() {
  const dispatch = useAppDispatch();
  const { showNewDocModal, showShareModal, showInviteModal, showClauseBrowser, showCitationBrowser, showDeleteConfirm } = useAppSelector((state) => state.ui);

  // Handle clause insertion
  const handleClauseInsert = useCallback((content: string) => {
    dispatch(setPendingInsertion({ text: content, suggestionId: uuidv4() }));
    dispatch(setShowClauseBrowser(false));
  }, [dispatch]);

  // Handle citation insertion
  const handleCitationInsert = useCallback((html: string, _citation: Citation) => {
    dispatch(setPendingInsertion({ text: html, suggestionId: uuidv4() }));
    dispatch(setShowCitationBrowser(false));
  }, [dispatch]);

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/draft/:id"
          element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor"
          element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global modals */}
      {showNewDocModal && <NewDocumentModal />}
      {showShareModal && <ShareModal />}
      {showInviteModal && <InviteCollaboratorModal />}
      {showClauseBrowser && <ClauseBrowser onInsert={handleClauseInsert} />}
      {showCitationBrowser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[85vh] flex flex-col animate-slide-up overflow-hidden">
            <CitationBrowser onInsertCitation={handleCitationInsert} />
          </div>
        </div>
      )}
      {showDeleteConfirm && <DeleteConfirmModal />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
