import { useState, useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setShowClauseBrowser } from '../features/uiSlice';
import { 
    searchClauses, 
    getCategories, 
    recordClauseUsage,
    type Clause, 
    type ClauseCategory 
} from '../utils/clauseService';
import { 
    X, Search, BookOpen, ChevronRight, ChevronDown, 
    FileText, Star, Copy, Check, Sparkles 
} from 'lucide-react';

interface ClauseBrowserProps {
    onInsert: (content: string) => void;
}

export function ClauseBrowser({ onInsert }: ClauseBrowserProps) {
    const dispatch = useAppDispatch();
    const { currentDocument } = useAppSelector((state) => state.document);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [categories, setCategories] = useState<ClauseCategory[]>([]);
    const [clauses, setClauses] = useState<Clause[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
    const [copied, setCopied] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    
    // Load categories on mount
    useEffect(() => {
        async function loadCategories() {
            try {
                const cats = await getCategories();
                setCategories(cats);
                // Expand first category by default
                if (cats.length > 0) {
                    setExpandedCategories(new Set([cats[0].name]));
                }
            } catch (err) {
                console.error('Failed to load categories:', err);
            }
        }
        loadCategories();
    }, []);
    
    // Search clauses when query or category changes
    useEffect(() => {
        async function search() {
            setLoading(true);
            try {
                const results = await searchClauses({
                    query: searchQuery || undefined,
                    category: selectedCategory || undefined,
                    documentType: currentDocument?.docType,
                });
                setClauses(results);
            } catch (err) {
                console.error('Failed to search clauses:', err);
            } finally {
                setLoading(false);
            }
        }
        
        const debounce = setTimeout(search, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, selectedCategory, currentDocument?.docType]);

    const handleClose = () => {
        dispatch(setShowClauseBrowser(false));
    };
    
    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
        setSelectedCategory(category);
    };
    
    const handleSelectClause = (clause: Clause) => {
        setSelectedClause(clause);
    };
    
    const handleInsert = useCallback(async () => {
        if (!selectedClause) return;
        
        try {
            // Record usage (fire-and-forget, don't block insertion)
            recordClauseUsage(selectedClause.id).catch(err => 
                console.warn('Failed to record clause usage:', err)
            );
            
            // Insert content
            onInsert(selectedClause.content);
            
            // Close browser
            dispatch(setShowClauseBrowser(false));
        } catch (err) {
            console.error('Failed to insert clause:', err);
        }
    }, [selectedClause, onInsert, dispatch]);
    
    const handleCopy = useCallback(() => {
        if (!selectedClause) return;
        
        // Strip HTML tags for plain text copy
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = selectedClause.content;
        navigator.clipboard.writeText(tempDiv.textContent || '');
        
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [selectedClause]);
    
    // Group clauses by category for display
    const clausesByCategory = clauses.reduce((acc, clause) => {
        const cat = clause.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(clause);
        return acc;
    }, {} as Record<string, Clause[]>);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[85vh] flex flex-col animate-slide-up">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Clause Library</h2>
                                <p className="text-sm text-slate-500">Browse and insert pre-approved clauses</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search clauses by title, content, or tags..."
                            className="input pl-10 w-full"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar - Categories */}
                    <div className="w-64 border-r border-slate-200 overflow-y-auto flex-shrink-0 bg-slate-50">
                        <div className="p-3">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    !selectedCategory 
                                        ? 'bg-primary-100 text-primary-700' 
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                All Clauses
                                <span className="ml-2 text-slate-400">({clauses.length})</span>
                            </button>
                        </div>
                        
                        <div className="px-3 pb-3">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3">
                                Categories
                            </h3>
                            <div className="space-y-1">
                                {categories.map((category) => (
                                    <button
                                        key={category.name}
                                        onClick={() => toggleCategory(category.name)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                                            selectedCategory === category.name
                                                ? 'bg-primary-100 text-primary-700'
                                                : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            {expandedCategories.has(category.name) ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                            {category.name}
                                        </span>
                                        <span className="text-xs text-slate-400">{category.count}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {/* Clause List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <span className="spinner" />
                            </div>
                        ) : clauses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <FileText className="w-12 h-12 mb-4 text-slate-300" />
                                <p>No clauses found</p>
                                <p className="text-sm">Try adjusting your search or category filter</p>
                            </div>
                        ) : (
                            <div className="p-4 space-y-2">
                                {Object.entries(clausesByCategory).map(([category, categoryClauses]) => (
                                    <div key={category}>
                                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                            {category}
                                        </h3>
                                        <div className="space-y-2 mb-4">
                                            {categoryClauses.map((clause) => (
                                                <button
                                                    key={clause.id}
                                                    onClick={() => handleSelectClause(clause)}
                                                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                                                        selectedClause?.id === clause.id
                                                            ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                                                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-slate-900 truncate">
                                                                {clause.title}
                                                            </h4>
                                                            {clause.description && (
                                                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                                                    {clause.description}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-2 mt-2">
                                                                {clause.jurisdiction && (
                                                                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                                                                        {clause.jurisdiction}
                                                                    </span>
                                                                )}
                                                                {clause.tags?.slice(0, 3).map((tag) => (
                                                                    <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-slate-400 flex-shrink-0">
                                                            <Star className="w-4 h-4" />
                                                            <span className="text-xs">{clause.usageCount}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Preview Panel */}
                    <div className="w-96 border-l border-slate-200 flex-shrink-0 flex flex-col bg-white">
                        {selectedClause ? (
                            <>
                                <div className="p-4 border-b border-slate-200">
                                    <h3 className="font-semibold text-slate-900">{selectedClause.title}</h3>
                                    {selectedClause.description && (
                                        <p className="text-sm text-slate-500 mt-1">{selectedClause.description}</p>
                                    )}
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4">
                                    <div 
                                        className="prose prose-sm max-w-none text-slate-700"
                                        dangerouslySetInnerHTML={{ __html: selectedClause.content }}
                                    />
                                    
                                    {selectedClause.placeholders && selectedClause.placeholders.length > 0 && (
                                        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                            <h4 className="text-sm font-medium text-amber-800 mb-2">
                                                Placeholders to Fill
                                            </h4>
                                            <ul className="text-sm text-amber-700 space-y-1">
                                                {selectedClause.placeholders.map((p) => (
                                                    <li key={p.name} className="flex items-center gap-2">
                                                        <span className="font-mono text-amber-600">{'{{' + p.name + '}}'}</span>
                                                        <span>- {p.label}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-4 border-t border-slate-200 space-y-2">
                                    <button
                                        onClick={handleInsert}
                                        className="btn-primary w-full flex items-center justify-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Insert into Document
                                    </button>
                                    <button
                                        onClick={handleCopy}
                                        className="btn-secondary w-full flex items-center justify-center gap-2"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-4 h-4 text-green-600" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4" />
                                                Copy to Clipboard
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4">
                                <FileText className="w-12 h-12 mb-4" />
                                <p className="text-center">Select a clause to preview</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

