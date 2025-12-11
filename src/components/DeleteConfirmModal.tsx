import { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { deleteDocument } from '../features/documentSlice';
import { setShowDeleteConfirm } from '../features/uiSlice';
import { X, Trash2, AlertTriangle } from 'lucide-react';

/**
 * Confirmation modal for document deletion.
 */
export function DeleteConfirmModal() {
  const dispatch = useAppDispatch();
  const { showDeleteConfirm } = useAppSelector((state) => state.ui);
  const { allDocuments } = useAppSelector((state) => state.document);
  const [loading, setLoading] = useState(false);

  const document = allDocuments.find(d => d.id === showDeleteConfirm);

  const handleClose = () => {
    dispatch(setShowDeleteConfirm(null));
  };

  const handleDelete = useCallback(async () => {
    if (!showDeleteConfirm) return;
    setLoading(true);
    try {
      await dispatch(deleteDocument(showDeleteConfirm)).unwrap();
      handleClose();
    } catch (error) {
      console.error('Failed to delete document:', error);
    } finally {
      setLoading(false);
    }
  }, [dispatch, showDeleteConfirm]);

  if (!showDeleteConfirm || !document) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Delete Document</h2>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-600 mb-4">
            Are you sure you want to delete <strong>"{document.title}"</strong>? This action cannot be undone.
          </p>
          <div className="p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm text-red-700">
              All versions and snapshots will also be permanently deleted.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex gap-3">
          <button onClick={handleClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="btn-danger flex-1 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="spinner" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

