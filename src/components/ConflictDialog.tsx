/**
 * ConflictDialog Component
 * Shows when a document conflict is detected during save.
 */

import { AlertTriangle, RefreshCw, Save, X, User, Clock } from 'lucide-react';
import type { DocumentSyncState } from '../utils/presenceTypes';
import { formatDistanceToNow } from 'date-fns';

// ============================================
// Types
// ============================================

interface ConflictDialogProps {
    isOpen: boolean;
    onClose: () => void;
    localVersion: number;
    serverState: DocumentSyncState;
    onKeepLocal: () => void;
    onTakeServer: () => void;
    onMerge?: () => void;
}

// ============================================
// Component
// ============================================

export function ConflictDialog({
    isOpen,
    onClose,
    localVersion,
    serverState,
    onKeepLocal,
    onTakeServer,
    onMerge,
}: ConflictDialogProps) {
    if (!isOpen) return null;
    
    const modifiedTime = serverState.lastModifiedAt
        ? formatDistanceToNow(new Date(serverState.lastModifiedAt), { addSuffix: true })
        : 'recently';
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />
            
            {/* Dialog */}
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-amber-50 border-b border-amber-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-amber-900">
                                Document Conflict Detected
                            </h2>
                            <p className="text-sm text-amber-700">
                                Someone else has modified this document
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Content */}
                <div className="px-6 py-4">
                    <p className="text-slate-600 mb-4">
                        This document has been modified by another user while you were editing.
                        Choose how to resolve the conflict:
                    </p>
                    
                    {/* Version info */}
                    <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Your version:</span>
                            <span className="font-medium text-slate-700">v{localVersion}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Server version:</span>
                            <span className="font-medium text-slate-700">v{serverState.version}</span>
                        </div>
                        {serverState.lastModifiedBy && (
                            <div className="flex items-center gap-1 text-sm text-slate-500 pt-2 border-t border-slate-200">
                                <User className="w-4 h-4" />
                                <span>Modified by {serverState.lastModifiedBy}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                            <Clock className="w-4 h-4" />
                            <span>{modifiedTime}</span>
                        </div>
                    </div>
                    
                    {/* Options */}
                    <div className="space-y-2">
                        <button
                            onClick={onTakeServer}
                            className="w-full flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
                        >
                            <RefreshCw className="w-5 h-5 text-blue-500" />
                            <div>
                                <div className="font-medium text-slate-900">Load latest version</div>
                                <div className="text-sm text-slate-500">
                                    Discard your changes and load the server version
                                </div>
                            </div>
                        </button>
                        
                        <button
                            onClick={onKeepLocal}
                            className="w-full flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
                        >
                            <Save className="w-5 h-5 text-green-500" />
                            <div>
                                <div className="font-medium text-slate-900">Keep my changes</div>
                                <div className="text-sm text-slate-500">
                                    Overwrite the server version with your changes
                                </div>
                            </div>
                        </button>
                        
                        {onMerge && (
                            <button
                                onClick={onMerge}
                                className="w-full flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
                            >
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                <div>
                                    <div className="font-medium text-slate-900">Review differences</div>
                                    <div className="text-sm text-slate-500">
                                        Compare both versions side by side
                                    </div>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900"
                    >
                        <X className="w-4 h-4" />
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConflictDialog;

