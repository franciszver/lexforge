import { useMemo } from 'react';
import { useAppSelector } from '../store';
import { Cloud, CloudOff, AlertCircle } from 'lucide-react';

/**
 * Status bar showing word count, save status, and document info.
 */
export function StatusBar() {
  const { currentDocument, isDirty, isAutosaving } = useAppSelector((state) => state.document);

  const wordCount = useMemo(() => {
    if (!currentDocument?.content) return 0;
    // Strip HTML tags and count words
    const text = currentDocument.content.replace(/<[^>]*>/g, ' ');
    return text.split(/\s+/).filter(Boolean).length;
  }, [currentDocument?.content]);

  const charCount = useMemo(() => {
    if (!currentDocument?.content) return 0;
    return currentDocument.content.replace(/<[^>]*>/g, '').length;
  }, [currentDocument?.content]);

  if (!currentDocument) return null;

  return (
    <div className="border-t border-slate-200 px-6 py-2 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
      {/* Left side - document info */}
      <div className="flex items-center gap-4">
        <span>{wordCount} words</span>
        <span className="text-slate-300">|</span>
        <span>{charCount} characters</span>
        <span className="text-slate-300">|</span>
        <span className={`badge ${
          currentDocument.status === 'final' ? 'badge-success' :
          currentDocument.status === 'review' ? 'badge-warning' :
          'badge-slate'
        }`}>
          {currentDocument.status}
        </span>
      </div>

      {/* Right side - save status */}
      <div className="flex items-center gap-2">
        {isAutosaving && (
          <span className="flex items-center gap-1.5 text-primary-600">
            <span className="spinner w-3 h-3" />
            Saving...
          </span>
        )}
        {!isAutosaving && isDirty && (
          <span className="flex items-center gap-1.5 text-amber-600">
            <AlertCircle className="w-3.5 h-3.5" />
            Unsaved changes
          </span>
        )}
        {!isAutosaving && !isDirty && (
          <span className="flex items-center gap-1.5 text-green-600">
            <Cloud className="w-3.5 h-3.5" />
            All changes saved
          </span>
        )}
        {currentDocument.lastAutosaveAt && !isAutosaving && (
          <span className="text-slate-400 ml-2">
            Last saved {new Date(currentDocument.lastAutosaveAt).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

