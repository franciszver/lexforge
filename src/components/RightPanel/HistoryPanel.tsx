import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { loadSnapshots, restoreSnapshot, createSnapshot, type Snapshot } from '../../features/documentSlice';
import { formatDistanceToNow, format } from 'date-fns';
import { Clock, RotateCcw, Save, FileText } from 'lucide-react';
import { useEffect } from 'react';

/**
 * History panel showing document snapshots with restore capability.
 */
export function HistoryPanel() {
  const dispatch = useAppDispatch();
  const { currentDocument, snapshots } = useAppSelector((state) => state.document);

  // Load snapshots when document changes
  useEffect(() => {
    if (currentDocument?.id) {
      dispatch(loadSnapshots(currentDocument.id));
    }
  }, [dispatch, currentDocument?.id]);

  const handleCreateSnapshot = useCallback(() => {
    if (currentDocument) {
      dispatch(createSnapshot({
        documentId: currentDocument.id,
        content: currentDocument.content,
        title: `Manual snapshot - ${format(new Date(), 'MMM d, h:mm a')}`,
        isAutoSave: false,
      }));
    }
  }, [dispatch, currentDocument]);

  const handleRestore = useCallback((snapshot: Snapshot) => {
    if (confirm('Restore this version? Your current changes will be lost unless you save first.')) {
      dispatch(restoreSnapshot(snapshot));
    }
  }, [dispatch]);

  if (!currentDocument) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">
            No document selected
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-slate-900">Version History</h3>
          <button
            onClick={handleCreateSnapshot}
            className="btn-sm btn-secondary flex items-center gap-1"
          >
            <Save className="w-3.5 h-3.5" />
            Save Version
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {snapshots.length} version{snapshots.length !== 1 ? 's' : ''} saved (max 20)
        </p>
      </div>

      {/* Snapshots list */}
      <div className="flex-1 overflow-auto">
        {snapshots.length === 0 ? (
          <div className="p-4 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-3">No versions saved yet</p>
            <button onClick={handleCreateSnapshot} className="btn-primary btn-sm">
              Create First Version
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {snapshots.map((snapshot) => (
              <SnapshotItem
                key={snapshot.id}
                snapshot={snapshot}
                onRestore={() => handleRestore(snapshot)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <p className="text-xs text-slate-500">
          Versions are automatically created when you save. Click "Restore" to revert to a previous version.
        </p>
      </div>
    </div>
  );
}

interface SnapshotItemProps {
  snapshot: Snapshot;
  onRestore: () => void;
}

function SnapshotItem({ snapshot, onRestore }: SnapshotItemProps) {
  const timeAgo = formatDistanceToNow(new Date(snapshot.createdAt), { addSuffix: true });
  const fullDate = format(new Date(snapshot.createdAt), 'MMM d, yyyy h:mm a');

  // Calculate word count from content
  const wordCount = snapshot.content
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="p-4 hover:bg-slate-50 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {snapshot.isAutoSave ? (
              <span className="badge-slate text-xs">Auto</span>
            ) : (
              <span className="badge-primary text-xs">Manual</span>
            )}
            <span className="text-xs text-slate-400" title={fullDate}>
              {timeAgo}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-900 truncate">
            {snapshot.title}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {wordCount} words
          </p>
        </div>
        <button
          onClick={onRestore}
          className="opacity-0 group-hover:opacity-100 btn-sm btn-ghost flex items-center gap-1 text-primary-600"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restore
        </button>
      </div>
    </div>
  );
}

