import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard, Login, Editor, Admin } from './pages';
import { ProtectedRoute, AdminRoute, NewDocumentModal, ShareModal, InviteCollaboratorModal, ClauseBrowser, DeleteConfirmModal } from './components';
import { useAppSelector, useAppDispatch } from './store';
import { setShowClauseBrowser, setPendingInsertion } from './features/uiSlice';
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main App Component with route protection and global modals.
 * Routes to different pages - each page manages its own header.
 */
function AppContent() {
  const dispatch = useAppDispatch();
  const { showNewDocModal, showShareModal, showInviteModal, showClauseBrowser, showDeleteConfirm } = useAppSelector((state) => state.ui);
  
  // Handle clause insertion
  const handleClauseInsert = useCallback((content: string) => {
    dispatch(setPendingInsertion({ text: content, suggestionId: uuidv4() }));
    dispatch(setShowClauseBrowser(false));
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
