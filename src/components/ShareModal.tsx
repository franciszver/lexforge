import { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { createShareLink } from '../features/documentSlice';
import { setShowShareModal } from '../features/uiSlice';
import { X, Copy, Check, Link, Lock } from 'lucide-react';

/**
 * Modal for generating and sharing document links with passcode protection.
 */
export function ShareModal() {
  const dispatch = useAppDispatch();
  const { currentDocument, shareLinks } = useAppSelector((state) => state.document);
  const [copied, setCopied] = useState<'link' | 'passcode' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    dispatch(setShowShareModal(false));
  };

  const existingShare = shareLinks.find(sl => sl.documentId === currentDocument?.id);

  const handleCreateLink = useCallback(async () => {
    if (!currentDocument) return;
    setLoading(true);
    try {
      await dispatch(createShareLink(currentDocument.id)).unwrap();
    } catch (error) {
      console.error('Failed to create share link:', error);
    } finally {
      setLoading(false);
    }
  }, [dispatch, currentDocument]);

  const copyToClipboard = useCallback((text: string, type: 'link' | 'passcode') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const shareUrl = existingShare 
    ? `${window.location.origin}/shared/${existingShare.token}`
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <Link className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Share Document</h2>
                <p className="text-sm text-slate-500">{currentDocument?.title}</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!existingShare ? (
            <div className="text-center py-4">
              <Lock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">
                Generate a secure link to share this document. The recipient will need a passcode to access it.
              </p>
              <button
                onClick={handleCreateLink}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <>
                    <span className="spinner mr-2" />
                    Generating...
                  </>
                ) : (
                  'Generate Share Link'
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Share Link */}
              <div>
                <label className="label">Share Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl || ''}
                    readOnly
                    className="input flex-1 text-sm font-mono"
                  />
                  <button
                    onClick={() => shareUrl && copyToClipboard(shareUrl, 'link')}
                    className="btn-secondary"
                  >
                    {copied === 'link' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Passcode */}
              <div>
                <label className="label">Passcode</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={existingShare.passcode}
                    readOnly
                    className="input flex-1 text-sm font-mono tracking-widest text-center"
                  />
                  <button
                    onClick={() => copyToClipboard(existingShare.passcode, 'passcode')}
                    className="btn-secondary"
                  >
                    {copied === 'passcode' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expiry info */}
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-sm text-amber-700">
                  <strong>Expires:</strong> {new Date(existingShare.expiresAt).toLocaleString()}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Share both the link and passcode with the recipient.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button onClick={handleClose} className="btn-secondary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

