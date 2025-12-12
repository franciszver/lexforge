import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import HTMLtoDOCX from 'html-to-docx';
import { saveAs } from 'file-saver';
import { debounce } from 'lodash-es';
import { useAppDispatch, useAppSelector } from '../store';
import {
    loadDocument,
    saveDocument,
    updateContent,
    updateTitle,
    updateStatus,
    createSnapshot,
} from '../features/documentSlice';
import { toggleRightPanel, setShowShareModal, setShowInviteModal, setShowClauseBrowser, clearPendingInsertion } from '../features/uiSlice';
import { generateSuggestions } from '../features/suggestionsSlice';
import { RightPanel, StatusBar } from '../components';
import { PresenceIndicator, usePresenceEditing } from '../components/PresenceIndicator';
import { ConflictDialog } from '../components/ConflictDialog';
import { useContentSync } from '../hooks/useContentSync';
import { useCursorSync } from '../hooks/useCursorSync';
import { CollaborationCursor } from '../extensions/CollaborationCursor';
import type { DocumentSyncState, UserPresence } from '../utils/presenceTypes';
import {
    FileText, LayoutList, Sparkles, Download, Share2, Users, BookOpen,
    Bold, Italic, List, ListOrdered, Undo, Redo, PanelRight, Save
} from 'lucide-react';
import { format } from 'date-fns';

/**
 * The main Editor component using TipTap with autosave.
 */
export const Editor = () => {
    const { id } = useParams();
    // Navigation hook available for future use
    void useNavigate();
    const dispatch = useAppDispatch();
    const { currentDocument, isDirty, isAutosaving, loading } = useAppSelector((state) => state.document);
    const { rightPanelOpen, pendingInsertion } = useAppSelector((state) => state.ui);
    const { isGenerating } = useAppSelector((state) => state.suggestions);
    const auth = useAppSelector((state) => state.auth);

    const autosaveRef = useRef<ReturnType<typeof debounce> | null>(null);
    
    // Presence state
    const [showConflictDialog, setShowConflictDialog] = useState(false);
    const [conflictServerState, setConflictServerState] = useState<DocumentSyncState | null>(null);
    
    // Presence editing hooks
    const { startEditing, stopEditing } = usePresenceEditing();
    
    // Content sync hook
    const {
        localVersion,
        isSyncing,
        syncContent,
        forceSave: forceSyncSave,
        resolveConflict,
    } = useContentSync({
        documentId: id || '',
        userId: auth.user?.userId || '',
        onConflict: (_localVer, serverSt) => {
            setConflictServerState(serverSt);
            setShowConflictDialog(true);
        },
    });

    // Load document on mount
    useEffect(() => {
        if (id) {
            dispatch(loadDocument(id));
        }
    }, [dispatch, id]);

    // Set up debounced autosave
    useEffect(() => {
        autosaveRef.current = debounce(async (doc: typeof currentDocument) => {
            if (doc) {
                await dispatch(saveDocument({ document: doc, isAutosave: true }));
            }
        }, 2000);

        return () => {
            autosaveRef.current?.cancel();
        };
    }, [dispatch]);

    // Trigger autosave when document changes
    useEffect(() => {
        if (isDirty && currentDocument && autosaveRef.current) {
            autosaveRef.current(currentDocument);
        }
    }, [currentDocument, isDirty]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            CollaborationCursor.configure({
                throttleDelay: 100,
                currentUserId: auth.user?.userId,
            }),
        ],
        content: currentDocument?.content || '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            dispatch(updateContent(html));
            
            // Sync content to server (debounced)
            if (id) {
                syncContent(html);
            }
        },
        onFocus: () => {
            startEditing();
        },
        onBlur: () => {
            stopEditing();
        },
        editorProps: {
            attributes: {
                class: 'tiptap-editor focus:outline-none min-h-[600px]',
            },
        },
    });
    
    // Cursor synchronization for live collaboration
    // The hook manages cursor updates internally via the TipTap extension
    useCursorSync({
        editor,
        userId: auth.user?.userId || '',
        enabled: !!id && !!auth.user,
    });

    // Update editor content when document loads
    useEffect(() => {
        if (editor && currentDocument?.content && editor.getHTML() !== currentDocument.content) {
            editor.commands.setContent(currentDocument.content);
        }
    }, [editor, currentDocument?.content]);

    // Handle accepted suggestions - insert text at cursor position
    useEffect(() => {
        if (editor && pendingInsertion) {
            // Focus the editor and insert the text at the current selection
            editor.chain().focus().insertContent(pendingInsertion.text).run();
            // Clear the pending insertion
            dispatch(clearPendingInsertion());
        }
    }, [editor, pendingInsertion, dispatch]);

    const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(updateTitle(e.target.value));
    }, [dispatch]);

    const handleStatusChange = useCallback((status: 'draft' | 'review' | 'final') => {
        dispatch(updateStatus(status));
    }, [dispatch]);

    const handleManualSave = useCallback(async () => {
        if (currentDocument) {
            await dispatch(saveDocument({ document: currentDocument, isAutosave: false }));
            await dispatch(createSnapshot({
                documentId: currentDocument.id,
                content: currentDocument.content,
                title: `Manual save - ${format(new Date(), 'MMM d, h:mm a')}`,
                isAutoSave: false,
            }));
        }
    }, [dispatch, currentDocument]);

    const handleAIAssist = useCallback(() => {
        if (currentDocument) {
            dispatch(generateSuggestions({
                documentId: currentDocument.id,
                content: currentDocument.content,
                context: {
                    jurisdiction: currentDocument.jurisdiction,
                    docType: currentDocument.docType,
                    practiceArea: currentDocument.practiceArea,
                },
            }));
            if (!rightPanelOpen) {
                dispatch(toggleRightPanel());
            }
        }
    }, [dispatch, currentDocument, rightPanelOpen]);

    const handleExport = useCallback(async () => {
        if (!currentDocument?.content) return;

        try {
            const fileBuffer = await HTMLtoDOCX(currentDocument.content, null, {
                table: { row: { cantSplit: true } },
                footer: true,
                pageNumber: true,
            });
            const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
            saveAs(blob, `${currentDocument.title || 'LexForge_Draft'}_${format(new Date(), 'yyyy-MM-dd')}.docx`);
        } catch (error) {
            console.error('Export Error:', error);
            alert('Failed to export document.');
        }
    }, [currentDocument]);

    const handleShare = useCallback(() => {
        dispatch(setShowShareModal(true));
    }, [dispatch]);
    
    const handleInvite = useCallback(() => {
        dispatch(setShowInviteModal(true));
    }, [dispatch]);
    
    const handleOpenClauses = useCallback(() => {
        dispatch(setShowClauseBrowser(true));
    }, [dispatch]);
    
    // Handle presence updates (can be used for UI indicators)
    const handlePresenceChange = useCallback((_presences: UserPresence[]) => {
        // Presences are displayed in the PresenceIndicator component
        // This callback can be used for additional UI updates if needed
    }, []);
    
    // Handle conflict resolution
    const handleKeepLocal = useCallback(async () => {
        if (currentDocument?.content) {
            await forceSyncSave(currentDocument.content);
        }
        resolveConflict('keep-local');
        setShowConflictDialog(false);
    }, [currentDocument, forceSyncSave, resolveConflict]);
    
    const handleTakeServer = useCallback(async () => {
        // Reload document from server
        if (id) {
            await dispatch(loadDocument(id));
        }
        resolveConflict('take-server');
        setShowConflictDialog(false);
    }, [id, dispatch, resolveConflict]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="spinner w-8 h-8 text-primary-600 mx-auto mb-4" />
                    <p className="text-slate-600">Loading document...</p>
                </div>
            </div>
        );
    }

    if (!currentDocument && id) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h2 className="text-lg font-medium text-slate-900 mb-2">Document not found</h2>
                    <p className="text-slate-500 mb-4">The document you're looking for doesn't exist.</p>
                    <Link to="/" className="btn-primary">
                        Back to Documents
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                    {/* Left section */}
                    <div className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                                <FileText className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-semibold text-slate-900">LexForge</span>
                        </Link>

                        <div className="h-6 w-px bg-slate-200" />

                        {/* Document title */}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={currentDocument?.title || ''}
                                onChange={handleTitleChange}
                                className="text-sm font-medium text-slate-700 bg-transparent border-none focus:outline-none focus:ring-0 max-w-xs"
                                placeholder="Untitled Document"
                            />
                            {isAutosaving && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <span className="spinner w-3 h-3" />
                                    Saving...
                                </span>
                            )}
                            {!isAutosaving && !isDirty && currentDocument?.lastAutosaveAt && (
                                <span className="text-xs text-green-600">Saved</span>
                            )}
                            {!isAutosaving && isDirty && (
                                <span className="text-xs text-amber-600">Unsaved</span>
                            )}
                        </div>
                    </div>

                    {/* Right section */}
                    <div className="flex items-center gap-2">
                        {/* Status dropdown */}
                        <select
                            value={currentDocument?.status || 'draft'}
                            onChange={(e) => handleStatusChange(e.target.value as 'draft' | 'review' | 'final')}
                            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
                        >
                            <option value="draft">Draft</option>
                            <option value="review">In Review</option>
                            <option value="final">Final</option>
                        </select>

                        <div className="h-6 w-px bg-slate-200" />
                        
                        {/* Presence indicator */}
                        {id && currentDocument && auth.user && (
                            <PresenceIndicator
                                documentId={id}
                                documentOwnerId={auth.user.userId}
                                compact={true}
                                onPresenceChange={handlePresenceChange}
                            />
                        )}

                        <div className="h-6 w-px bg-slate-200" />

                        <button onClick={handleManualSave} className="btn-ghost btn-sm" title="Save & Create Version">
                            <Save className="w-4 h-4" />
                        </button>

                        <Link to="/" className="btn-ghost btn-sm">
                            <LayoutList className="w-4 h-4 mr-1" />
                            Documents
                        </Link>

                        <button
                            onClick={handleAIAssist}
                            disabled={isGenerating}
                            className="btn-primary btn-sm"
                        >
                            {isGenerating ? (
                                <span className="spinner w-4 h-4 mr-1" />
                            ) : (
                                <Sparkles className="w-4 h-4 mr-1" />
                            )}
                            AI Assist
                        </button>

                        <button onClick={handleExport} className="btn-ghost btn-sm" title="Export to Word">
                            <Download className="w-4 h-4" />
                        </button>

                        <button onClick={handleInvite} className="btn-ghost btn-sm" title="Invite Collaborators">
                            <Users className="w-4 h-4" />
                        </button>

                        <button onClick={handleShare} className="btn-ghost btn-sm" title="Share Link">
                            <Share2 className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => dispatch(toggleRightPanel())}
                            className={`btn-ghost btn-sm ${rightPanelOpen ? 'bg-slate-100' : ''}`}
                            title={rightPanelOpen ? 'Hide panel' : 'Show panel'}
                        >
                            <PanelRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Toolbar */}
            {editor && (
                <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-1">
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`p-2 rounded hover:bg-slate-100 ${editor.isActive('bold') ? 'bg-slate-100 text-primary-600' : 'text-slate-600'}`}
                        title="Bold (Ctrl+B)"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`p-2 rounded hover:bg-slate-100 ${editor.isActive('italic') ? 'bg-slate-100 text-primary-600' : 'text-slate-600'}`}
                        title="Italic (Ctrl+I)"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <div className="h-5 w-px bg-slate-200 mx-2" />
                    <button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`p-2 rounded hover:bg-slate-100 ${editor.isActive('bulletList') ? 'bg-slate-100 text-primary-600' : 'text-slate-600'}`}
                        title="Bullet List"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={`p-2 rounded hover:bg-slate-100 ${editor.isActive('orderedList') ? 'bg-slate-100 text-primary-600' : 'text-slate-600'}`}
                        title="Numbered List"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </button>
                    <div className="h-5 w-px bg-slate-200 mx-2" />
                    <button
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        className="p-2 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        className="p-2 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30"
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo className="w-4 h-4" />
                    </button>

                    {/* Heading buttons */}
                    <div className="h-5 w-px bg-slate-200 mx-2" />
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={`p-2 rounded hover:bg-slate-100 text-sm font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-100 text-primary-600' : 'text-slate-600'}`}
                        title="Heading 1"
                    >
                        H1
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`p-2 rounded hover:bg-slate-100 text-sm font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-100 text-primary-600' : 'text-slate-600'}`}
                        title="Heading 2"
                    >
                        H2
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        className={`p-2 rounded hover:bg-slate-100 text-sm font-bold ${editor.isActive('heading', { level: 3 }) ? 'bg-slate-100 text-primary-600' : 'text-slate-600'}`}
                        title="Heading 3"
                    >
                        H3
                    </button>
                    
                    {/* Clause Library */}
                    <div className="h-5 w-px bg-slate-200 mx-2" />
                    <button
                        onClick={handleOpenClauses}
                        className="p-2 rounded hover:bg-slate-100 text-slate-600 flex items-center gap-1"
                        title="Insert Clause"
                    >
                        <BookOpen className="w-4 h-4" />
                        <span className="text-xs">Clauses</span>
                    </button>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Main editor area */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-[816px] mx-auto bg-white rounded-lg shadow-sm border border-slate-200 p-12 min-h-[1000px]">
                        <EditorContent editor={editor} />
                    </div>
                </div>

                {/* Right panel */}
                {rightPanelOpen && (
                    <div className="w-96 flex-shrink-0">
                        <RightPanel />
                    </div>
                )}
            </div>

            {/* Status bar */}
            <StatusBar />
            
            {/* Conflict dialog */}
            {showConflictDialog && conflictServerState && (
                <ConflictDialog
                    isOpen={showConflictDialog}
                    onClose={() => setShowConflictDialog(false)}
                    localVersion={localVersion}
                    serverState={conflictServerState}
                    onKeepLocal={handleKeepLocal}
                    onTakeServer={handleTakeServer}
                />
            )}
            
            {/* Sync indicator */}
            {isSyncing && (
                <div className="fixed bottom-20 right-4 bg-blue-500 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Syncing...
                </div>
            )}
        </div>
    );
};
