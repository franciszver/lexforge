import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard, Login, Editor, Admin } from './pages';
import { ProtectedRoute, AdminRoute, NewDocumentModal, ShareModal, DeleteConfirmModal } from './components';
import { useAppSelector } from './store';

/**
 * Main App Component with route protection and global modals.
 * Routes to different pages - each page manages its own header.
 */
function AppContent() {
  const { showNewDocModal, showShareModal, showDeleteConfirm } = useAppSelector((state) => state.ui);

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
