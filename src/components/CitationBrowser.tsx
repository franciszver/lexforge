/**
 * CitationBrowser Component
 * Searchable citation library for inserting citations into the editor.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search,
    Filter,
    X,
    Star,
    StarOff,
    Plus,
    Clock,
    TrendingUp,
    RefreshCw,
    Gavel,
    BookOpen,
    FileText,
    Scale,
    BookMarked,
    Globe,
    CheckCircle,
    ExternalLink,
    Copy,
} from 'lucide-react';
import type {
    Citation,
    CitationType,
    CitationFilter,
    CitationSort,
    CitationSortField,
} from '../utils/citationTypes';
import {
    CITATION_TYPES,
    LEGAL_CATEGORIES,
    JURISDICTIONS,
} from '../utils/citationTypes';
import {
    searchCitations,
    getPopularCitations,
    getRecentCitations,
    incrementCitationUsage,
    addCitationToFavorites,
    removeCitationFromFavorites,
    getUserCitationFavorites,
} from '../utils/citationService';
import type { CitationStyle } from '../utils/citationTypes';
import { formatCitation, citationToHtml } from '../utils/citationFormatter';

// ============================================
// Type Icons
// ============================================

const TYPE_ICONS: Record<CitationType, React.ComponentType<{ className?: string }>> = {
    case: Gavel,
    statute: BookOpen,
    regulation: FileText,
    constitution: Scale,
    secondary: BookMarked,
    treaty: Globe,
};

// ============================================
// Sub-Components
// ============================================

interface CitationCardProps {
    citation: Citation;
    isSelected: boolean;
    isFavorite: boolean;
    style: CitationStyle;
    onSelect: () => void;
    onInsert: (format: 'full' | 'short' | 'footnote') => void;
    onToggleFavorite: () => void;
}

function CitationCard({
    citation,
    isSelected,
    isFavorite,
    style,
    onSelect,
    onInsert,
    onToggleFavorite,
}: CitationCardProps) {
    const TypeIcon = TYPE_ICONS[citation.type];
    const formatted = formatCitation(citation, style);

    return (
        <div
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
                isSelected
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
            onClick={onSelect}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <TypeIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500 uppercase">
                            {CITATION_TYPES.find(t => t.value === citation.type)?.label}
                        </span>
                        {citation.isVerified && (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                        )}
                    </div>
                    <h4 className="font-medium text-slate-900">{citation.title}</h4>
                    <p className="text-sm text-slate-600 mt-1">{formatted.full}</p>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite();
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                            isFavorite
                                ? 'text-amber-500 hover:bg-amber-50'
                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                        }`}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        {isFavorite ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onInsert('full');
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        title="Insert citation"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                {citation.category && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {citation.category}
                    </span>
                )}
                {citation.year && (
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                        {citation.year}
                    </span>
                )}
                {citation.usageCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded">
                        <TrendingUp className="w-3 h-3" />
                        {citation.usageCount}
                    </span>
                )}
            </div>
        </div>
    );
}

interface CitationPreviewProps {
    citation: Citation;
    style: CitationStyle;
    onInsert: (format: 'full' | 'short' | 'footnote') => void;
    onClose: () => void;
    onCopyToClipboard: (text: string) => void;
}

function CitationPreview({ citation, style, onInsert, onClose, onCopyToClipboard }: CitationPreviewProps) {
    const formatted = formatCitation(citation, style);
    const TypeIcon = TYPE_ICONS[citation.type];

    return (
        <div className="h-full flex flex-col bg-white border-l border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TypeIcon className="w-5 h-5 text-slate-400" />
                        <h3 className="font-semibold text-slate-900">{citation.title}</h3>
                    </div>
                    <button onClick={onClose} className="btn-ghost btn-xs">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                {citation.isVerified && (
                    <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                    </div>
                )}
            </div>

            {/* Formatted Citations */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Full Citation */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-500 uppercase">Full Citation</label>
                        <button
                            onClick={() => onCopyToClipboard(formatted.full)}
                            className="text-xs text-slate-400 hover:text-slate-600"
                        >
                            <Copy className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-sm">
                        <span dangerouslySetInnerHTML={{ __html: citationToHtml(citation, style) }} />
                    </div>
                    <button
                        onClick={() => onInsert('full')}
                        className="btn-primary btn-xs mt-2"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Insert Full
                    </button>
                </div>

                {/* Short Form */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-500 uppercase">Short Form</label>
                        <button
                            onClick={() => onCopyToClipboard(formatted.short)}
                            className="text-xs text-slate-400 hover:text-slate-600"
                        >
                            <Copy className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-sm">
                        {formatted.short}
                    </div>
                    <button
                        onClick={() => onInsert('short')}
                        className="btn-ghost btn-xs mt-2"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Insert Short
                    </button>
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t border-slate-200">
                    <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Details</h4>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                        <dt className="text-slate-500">Type:</dt>
                        <dd className="text-slate-900">{CITATION_TYPES.find(t => t.value === citation.type)?.label}</dd>
                        
                        {citation.year && (
                            <>
                                <dt className="text-slate-500">Year:</dt>
                                <dd className="text-slate-900">{citation.year}</dd>
                            </>
                        )}
                        
                        {citation.court && (
                            <>
                                <dt className="text-slate-500">Court:</dt>
                                <dd className="text-slate-900">{citation.court}</dd>
                            </>
                        )}
                        
                        {citation.jurisdiction && (
                            <>
                                <dt className="text-slate-500">Jurisdiction:</dt>
                                <dd className="text-slate-900">{citation.jurisdiction}</dd>
                            </>
                        )}
                        
                        {citation.category && (
                            <>
                                <dt className="text-slate-500">Category:</dt>
                                <dd className="text-slate-900">{citation.category}</dd>
                            </>
                        )}
                    </dl>
                </div>

                {/* Parenthetical */}
                {citation.parenthetical && (
                    <div className="pt-4 border-t border-slate-200">
                        <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Parenthetical</h4>
                        <p className="text-sm text-slate-700">({citation.parenthetical})</p>
                    </div>
                )}

                {/* URL */}
                {citation.url && (
                    <div className="pt-4 border-t border-slate-200">
                        <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                        >
                            <ExternalLink className="w-4 h-4" />
                            View Source
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// Main Component
// ============================================

interface CitationBrowserProps {
    onInsertCitation: (html: string, citation: Citation) => void;
    category?: string;
    jurisdiction?: string;
    style?: CitationStyle;
    compact?: boolean;
}

export function CitationBrowser({
    onInsertCitation,
    category,
    jurisdiction,
    style = 'bluebook',
    compact = false,
}: CitationBrowserProps) {
    // State
    const [citations, setCitations] = useState<Citation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
    const [showFilters, setShowFilters] = useState(!compact);
    const [favorites, setFavorites] = useState<Map<string, string>>(new Map());
    const [citationStyle, setCitationStyle] = useState<CitationStyle>(style);

    // Filter state
    const [filter, setFilter] = useState<CitationFilter>({
        category,
        jurisdiction,
    });
    const [sort, setSort] = useState<CitationSort>({ field: 'title', direction: 'asc' });
    const [searchQuery, setSearchQuery] = useState('');

    // View mode
    const [viewMode, setViewMode] = useState<'all' | 'popular' | 'recent' | 'favorites'>('all');

    // Load citations
    const loadCitations = useCallback(async () => {
        setLoading(true);
        try {
            let result: Citation[] = [];

            switch (viewMode) {
                case 'popular':
                    result = await getPopularCitations(20);
                    break;
                case 'recent':
                    result = await getRecentCitations(20);
                    break;
                case 'favorites':
                    const favs = await getUserCitationFavorites();
                    result = favs.map(f => f.citation);
                    break;
                default:
                    const searchResult = await searchCitations(
                        { ...filter, searchQuery: searchQuery || undefined },
                        sort
                    );
                    result = searchResult.citations;
            }

            setCitations(result);
        } catch (error) {
            console.error('Error loading citations:', error);
        } finally {
            setLoading(false);
        }
    }, [filter, sort, searchQuery, viewMode]);

    // Load favorites
    const loadFavorites = useCallback(async () => {
        try {
            const favs = await getUserCitationFavorites();
            const favMap = new Map<string, string>();
            favs.forEach(f => favMap.set(f.citation.id, f.favorite.id));
            setFavorites(favMap);
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }, []);

    useEffect(() => {
        loadCitations();
    }, [loadCitations]);

    useEffect(() => {
        loadFavorites();
    }, [loadFavorites]);

    // Handle insert
    const handleInsert = useCallback(async (citation: Citation, format: 'full' | 'short' | 'footnote') => {
        const formatted = formatCitation(citation, citationStyle);
        let html: string;

        switch (format) {
            case 'short':
                html = formatted.short;
                break;
            case 'footnote':
                html = formatted.footnote;
                break;
            default:
                html = citationToHtml(citation, citationStyle);
        }

        onInsertCitation(html, citation);
        await incrementCitationUsage(citation.id);

        // Update local state
        setCitations(prev =>
            prev.map(c =>
                c.id === citation.id
                    ? { ...c, usageCount: c.usageCount + 1, lastUsedAt: new Date().toISOString() }
                    : c
            )
        );
    }, [onInsertCitation, citationStyle]);

    // Handle favorite toggle
    const handleToggleFavorite = useCallback(async (citation: Citation) => {
        const favoriteId = favorites.get(citation.id);

        if (favoriteId) {
            const success = await removeCitationFromFavorites(favoriteId);
            if (success) {
                setFavorites(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(citation.id);
                    return newMap;
                });
            }
        } else {
            const favorite = await addCitationToFavorites(citation.id);
            if (favorite) {
                setFavorites(prev => {
                    const newMap = new Map(prev);
                    newMap.set(citation.id, favorite.id);
                    return newMap;
                });
            }
        }
    }, [favorites]);

    // Handle copy to clipboard
    const handleCopyToClipboard = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
    }, []);

    // Clear filters
    const handleClearFilters = useCallback(() => {
        setFilter({ category, jurisdiction });
        setSearchQuery('');
    }, [category, jurisdiction]);

    const hasActiveFilters = useMemo(() => {
        return (
            !!filter.type ||
            (filter.category !== category) ||
            (filter.jurisdiction !== jurisdiction) ||
            !!filter.court ||
            !!filter.yearStart ||
            !!filter.yearEnd ||
            !!searchQuery
        );
    }, [filter, searchQuery, category, jurisdiction]);

    return (
        <div className={`flex flex-col h-full ${compact ? 'max-h-[600px]' : ''}`}>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary-600" />
                        Citations
                    </h2>
                    <div className="flex items-center gap-2">
                        <select
                            value={citationStyle}
                            onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
                            className="input input-sm w-28"
                        >
                            <option value="bluebook">Bluebook</option>
                            <option value="alwd">ALWD</option>
                        </select>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`btn-ghost btn-sm ${showFilters ? 'text-primary-600' : ''}`}
                        >
                            <Filter className="w-4 h-4 mr-1" />
                            Filters
                            {hasActiveFilters && (
                                <span className="ml-1 w-2 h-2 rounded-full bg-primary-500" />
                            )}
                        </button>
                        <button onClick={loadCitations} className="btn-ghost btn-sm" disabled={loading}>
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search citations..."
                        className="input pl-9 pr-9"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* View Mode Tabs */}
                <div className="flex gap-1 mt-3">
                    {[
                        { id: 'all', label: 'All', icon: BookOpen },
                        { id: 'popular', label: 'Popular', icon: TrendingUp },
                        { id: 'recent', label: 'Recent', icon: Clock },
                        { id: 'favorites', label: 'Favorites', icon: Star },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setViewMode(tab.id as typeof viewMode)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors ${
                                    viewMode === tab.id
                                        ? 'bg-primary-100 text-primary-700'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <Icon className="w-3 h-3" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label text-xs">Type</label>
                            <select
                                value={filter.type || ''}
                                onChange={(e) => setFilter({ ...filter, type: e.target.value as CitationType || undefined })}
                                className="input input-sm"
                            >
                                <option value="">All Types</option>
                                {CITATION_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label text-xs">Category</label>
                            <select
                                value={filter.category || ''}
                                onChange={(e) => setFilter({ ...filter, category: e.target.value || undefined })}
                                className="input input-sm"
                            >
                                <option value="">All Categories</option>
                                {LEGAL_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label text-xs">Jurisdiction</label>
                            <select
                                value={filter.jurisdiction || ''}
                                onChange={(e) => setFilter({ ...filter, jurisdiction: e.target.value || undefined })}
                                className="input input-sm"
                            >
                                <option value="">All Jurisdictions</option>
                                {JURISDICTIONS.map((j) => (
                                    <option key={j} value={j}>{j}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label text-xs">Sort By</label>
                            <select
                                value={sort.field}
                                onChange={(e) => setSort({ ...sort, field: e.target.value as CitationSortField })}
                                className="input input-sm"
                            >
                                <option value="title">Title</option>
                                <option value="year">Year</option>
                                <option value="usageCount">Usage</option>
                                <option value="lastUsedAt">Last Used</option>
                            </select>
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <button onClick={handleClearFilters} className="text-xs text-primary-600 hover:text-primary-700">
                            Clear all filters
                        </button>
                    )}
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Citation List */}
                <div className={`flex-1 overflow-y-auto p-4 ${selectedCitation && !compact ? 'w-1/2' : 'w-full'}`}>
                    {loading ? (
                        <div className="text-center py-12">
                            <span className="spinner w-8 h-8 text-primary-600" />
                            <p className="text-sm text-slate-500 mt-3">Loading citations...</p>
                        </div>
                    ) : citations.length === 0 ? (
                        <div className="text-center py-12">
                            <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
                            <p className="text-sm text-slate-500 mt-3">No citations found</p>
                            {hasActiveFilters && (
                                <button onClick={handleClearFilters} className="text-sm text-primary-600 hover:text-primary-700 mt-2">
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-500">{citations.length} citation{citations.length !== 1 ? 's' : ''} found</p>
                            {citations.map((citation) => (
                                <CitationCard
                                    key={citation.id}
                                    citation={citation}
                                    isSelected={selectedCitation?.id === citation.id}
                                    isFavorite={favorites.has(citation.id)}
                                    style={citationStyle}
                                    onSelect={() => setSelectedCitation(citation)}
                                    onInsert={(format) => handleInsert(citation, format)}
                                    onToggleFavorite={() => handleToggleFavorite(citation)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Preview Panel */}
                {selectedCitation && !compact && (
                    <div className="w-1/2">
                        <CitationPreview
                            citation={selectedCitation}
                            style={citationStyle}
                            onInsert={(format) => handleInsert(selectedCitation, format)}
                            onClose={() => setSelectedCitation(null)}
                            onCopyToClipboard={handleCopyToClipboard}
                        />
                    </div>
                )}
            </div>

            {/* Compact Preview Modal */}
            {selectedCitation && compact && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                        <CitationPreview
                            citation={selectedCitation}
                            style={citationStyle}
                            onInsert={(format) => {
                                handleInsert(selectedCitation, format);
                                setSelectedCitation(null);
                            }}
                            onClose={() => setSelectedCitation(null)}
                            onCopyToClipboard={handleCopyToClipboard}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default CitationBrowser;

