import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { toggleSidebar, setContent, setSaving, setLastSaved, setSuggestions } from '../features/editorSlice';
import { SidebarIcon, Search, Settings, Sparkles } from 'lucide-react';
import classNames from 'classnames';
import { SuggestionCard } from '../components/SuggestionCard';


export const Editor = () => {
    const dispatch = useDispatch();
    const { content, isSidebarOpen, isSaving, lastSavedAt, suggestions } = useSelector((state: RootState) => state.editor);

    // Initialize Data Client
    // const client = generateClient<Schema>();

    const triggerAI = async () => {
        dispatch(setSaving(true));

        try {
            // REAL CALL (Commented out until backend is deployed)
            // const { data: result } = await client.queries.askAI({
            //   text: editor?.getText() || '',
            //   context: JSON.stringify({ jurisdiction: 'California' }) 
            // });
            // if (result) dispatch(setSuggestions(JSON.parse(result as string)));

            // MOCK FALLBACK
            setTimeout(() => {
                dispatch(setSuggestions([
                    {
                        id: '1',
                        type: 'tone',
                        text: 'This language is highly aggressive and may alienate the opposing counsel.',
                        replacementText: 'We kindly request prompt payment...',
                        confidence: 0.9,
                    },
                    {
                        id: '2',
                        type: 'source',
                        text: 'Cited statute Cal. Civil Code § 1798 is applicable here.',
                        source: 'https://leginfo.legislature.ca.gov/',
                        confidence: 0.95,
                    }
                ]));
                dispatch(setSaving(false));
            }, 1500);

        } catch (error) {
            console.error('RAG Error:', error);
            dispatch(setSaving(false));
        }
    };

    const editor = useEditor({
        extensions: [StarterKit],
        content, // Initial content from Redux
        onUpdate: ({ editor }) => {
            dispatch(setContent(editor.getHTML()));
            dispatch(setSaving(true));
            // Debounce simulation
            setTimeout(() => {
                dispatch(setSaving(false));
                dispatch(setLastSaved(new Date().toISOString()));
            }, 1000);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[800px] bg-white text-black p-12 shadow-md hover:shadow-lg transition-shadow',
            },
        },
    });

    if (!editor) {
        return null;
    }

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Main Workspace */}
            <div className="flex-1 flex flex-col bg-[#F3F4F6] relative transition-all duration-300">

                {/* Toolbar */}
                <header className="h-14 bg-[var(--bg-app)] border-b border-[var(--border-strong)] flex items-center justify-between px-4 z-10 glass-panel">
                    <div className="flex items-center gap-4">
                        <h1 className="font-serif font-bold text-lg">LexForge // Draft</h1>
                        <span className="text-xs text-[var(--text-tertiary)]">
                            {isSaving ? 'Saving...' : lastSavedAt ? `Saved` : ''}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => dispatch(toggleSidebar())}
                            className={`p-2 rounded hover:bg-[var(--bg-surface-hover)] ${isSidebarOpen ? 'text-[var(--primary-brand)]' : ''}`}
                        >
                            <SidebarIcon size={20} />
                        </button>
                        <button
                            onClick={triggerAI}
                            className="p-2 rounded hover:bg-[var(--bg-surface-hover)] text-[var(--primary-brand)]"
                            title="Generate Suggestions"
                        >
                            <Sparkles size={20} />
                        </button>
                        <button className="p-2 rounded hover:bg-[var(--bg-surface-hover)]">
                            <Search size={20} />
                        </button>
                    </div>
                </header>

                {/* Editor Canvas */}
                <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                    <div className="max-w-[816px] mx-auto transition-transform duration-300">
                        <EditorContent editor={editor} />
                    </div>
                </div>
            </div>

            {/* RAG Sidebar */}
            <div
                className={classNames(
                    "w-80 bg-[var(--bg-surface)] border-l border-[var(--border-strong)] transform transition-transform duration-300 absolute right-0 top-0 bottom-0 z-20 shadow-2xl flex flex-col",
                    {
                        "translate-x-0": isSidebarOpen,
                        "translate-x-full": !isSidebarOpen,
                    }
                )}
            >
                <div className="p-4 border-b border-[var(--border-strong)] flex items-center justify-between">
                    <h2 className="font-semibold text-sm uppercase tracking-wide">LexForge AI</h2>
                    <Settings size={16} className="text-[var(--text-tertiary)]" />
                </div>

                <div className="flex-1 p-4 overflow-y-auto">
                    {suggestions.length === 0 ? (
                        <div className="mt-8 text-center text-[var(--text-tertiary)] text-xs">
                            <p>No suggestions yet.</p>
                            <p>Highlight text or keep typing to activate LexForge AI.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {suggestions.map((s) => (
                                <SuggestionCard
                                    key={s.id}
                                    suggestion={s}
                                    onAccept={(id) => console.log('Accept', id)}
                                    onDismiss={(id) => console.log('Dismiss', id)}
                                />
                            ))}
                        </div>
                    )}          </div>
            </div>
        </div>
    );
};
