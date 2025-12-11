import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { toggleSidebar, setContent, setSaving, setLastSaved, setSuggestions, removeSuggestion } from '../features/editorSlice';
import classNames from 'classnames';
import { SuggestionCard } from '../components/SuggestionCard';
import HTMLtoDOCX from 'html-to-docx';
import { saveAs } from 'file-saver';
import { Link } from 'react-router-dom';
import React from 'react';

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

/**
 * The main Editor component using TipTap.
 * Styled to match DraftWise theming.
 */
export const Editor = () => {
    const dispatch = useDispatch();
    const { content, isSidebarOpen, isSaving, lastSavedAt, suggestions } = useSelector((state: RootState) => state.editor);
    const [isAILoading, setIsAILoading] = React.useState(false);
    const [docTitle, setDocTitle] = React.useState('Untitled Document');

    const client = generateClient<Schema>();

    const triggerAI = async () => {
        setIsAILoading(true);
        if (!isSidebarOpen) {
            dispatch(toggleSidebar());
        }

        try {
            const response = await client.queries.askAI({
                text: editor?.getText() || '',
                context: JSON.stringify({ jurisdiction: 'California' })
            });

            console.log('RAG Response:', response);

            if (response.data) {
                const result = typeof response.data === 'string'
                    ? JSON.parse(response.data)
                    : response.data;

                if (result && result.suggestions) {
                    dispatch(setSuggestions(result.suggestions));
                }
            }

        } catch (error) {
            console.error('RAG Error:', error);
        } finally {
            setIsAILoading(false);
        }
    };

    const handleExport = async () => {
        if (!content) return;

        try {
            const fileBuffer = await HTMLtoDOCX(content, null, {
                table: { row: { cantSplit: true } },
                footer: true,
                pageNumber: true,
            });
            const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
            saveAs(blob, `LexForge_Draft_${new Date().toISOString().split('T')[0]}.docx`);
        } catch (error) {
            console.error('Export Error:', error);
            alert('Failed to export document.');
        }
    };

    const editor = useEditor({
        extensions: [StarterKit],
        content,
        onUpdate: ({ editor }) => {
            dispatch(setContent(editor.getHTML()));
            dispatch(setSaving(true));
            setTimeout(() => {
                dispatch(setSaving(false));
                dispatch(setLastSaved(new Date().toISOString()));
            }, 1000);
        },
        editorProps: {
            attributes: {
                class: 'tiptap-editor focus:outline-none',
            },
        },
    });

    if (!editor) {
        return null;
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
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className="font-semibold text-slate-900">LexForge</span>
                        </Link>

                        <div className="h-6 w-px bg-slate-200" />

                        {/* Document title */}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={docTitle}
                                onChange={(e) => setDocTitle(e.target.value)}
                                className="text-sm font-medium text-slate-700 bg-transparent border-none focus:outline-none focus:ring-0 max-w-xs"
                                placeholder="Untitled Document"
                            />
                            {isSaving && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <span className="spinner w-3 h-3" />
                                    Saving...
                                </span>
                            )}
                            {!isSaving && lastSavedAt && (
                                <span className="text-xs text-slate-400">Saved</span>
                            )}
                        </div>
                    </div>

                    {/* Right section */}
                    <div className="flex items-center gap-2">
                        <Link
                            to="/"
                            className="btn-ghost btn-sm"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            Documents
                        </Link>

                        <button
                            onClick={triggerAI}
                            disabled={isAILoading}
                            className="btn-primary btn-sm"
                        >
                            {isAILoading ? (
                                <span className="spinner w-4 h-4 mr-1" />
                            ) : (
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                            )}
                            AI Assist
                        </button>

                        <button
                            onClick={handleExport}
                            className="btn-ghost btn-sm"
                            title="Export to Word"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>

                        <button
                            onClick={() => dispatch(toggleSidebar())}
                            className={`btn-ghost btn-sm ${isSidebarOpen ? 'bg-slate-100' : ''}`}
                            title={isSidebarOpen ? 'Hide panel' : 'Show panel'}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-1">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-2 rounded hover:bg-slate-100 ${editor.isActive('bold') ? 'bg-slate-100 text-primary-600' : 'text-slate-600'}`}
                    title="Bold (Ctrl+B)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                    </svg>
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-2 rounded hover:bg-slate-100 ${editor.isActive('italic') ? 'bg-slate-100 text-primary-600' : 'text-slate-600'}`}
                    title="Italic (Ctrl+I)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 16V4m-6 16h4" transform="rotate(-15 12 12)" />
                    </svg>
                </button>
                <div className="h-5 w-px bg-slate-200 mx-2" />
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-2 rounded hover:bg-slate-100 ${editor.isActive('bulletList') ? 'bg-slate-100 text-primary-600' : 'text-slate-600'}`}
                    title="Bullet List"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-2 rounded hover:bg-slate-100 ${editor.isActive('orderedList') ? 'bg-slate-100 text-primary-600' : 'text-slate-600'}`}
                    title="Numbered List"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20h14M7 12h14M7 4h14M3 20h.01M3 12h.01M3 4h.01" />
                    </svg>
                </button>
                <div className="h-5 w-px bg-slate-200 mx-2" />
                <button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="p-2 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30"
                    title="Undo (Ctrl+Z)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                </button>
                <button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="p-2 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30"
                    title="Redo (Ctrl+Y)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main editor area */}
                <div className={`flex-1 overflow-y-auto p-8 transition-all duration-300 ${isSidebarOpen ? 'mr-0' : ''}`}>
                    <div className="max-w-[816px] mx-auto bg-white rounded-lg shadow-sm border border-slate-200 p-12 min-h-[1000px]">
                        <EditorContent editor={editor} />
                    </div>
                </div>

                {/* Right panel */}
                {isSidebarOpen && (
                    <div className="w-96 border-l border-slate-200 bg-white flex-shrink-0 flex flex-col">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                <h2 className="font-semibold text-slate-900">AI Suggestions</h2>
                            </div>
                            <button 
                                onClick={() => dispatch(toggleSidebar())}
                                className="p-1 rounded hover:bg-slate-100 text-slate-400"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 p-4 overflow-y-auto">
                            {isAILoading ? (
                                <div className="text-center py-8">
                                    <div className="spinner w-8 h-8 text-primary-600 mx-auto mb-4" />
                                    <p className="text-sm font-medium text-slate-900">Analyzing your document...</p>
                                    <p className="text-xs text-slate-500 mt-1">This may take a few seconds</p>
                                </div>
                            ) : suggestions.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium text-slate-900 mb-1">No suggestions yet</p>
                                    <p className="text-xs text-slate-500">Click "AI Assist" to get intelligent suggestions for your document.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                        {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
                                    </p>
                                    {suggestions.map((s) => (
                                        <SuggestionCard
                                            key={s.id}
                                            suggestion={s}
                                            onAccept={() => {
                                                console.log('Accepted suggestion', s);
                                                dispatch(removeSuggestion(s.id));
                                            }}
                                            onDismiss={() => dispatch(removeSuggestion(s.id))}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
