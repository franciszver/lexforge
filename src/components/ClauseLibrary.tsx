/**
 * ClauseLibrary Component
 * Searchable library of reusable legal clauses with filtering and preview.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search,
    Filter,
    X,
    Star,
    StarOff,
    Copy,
    Clock,
    TrendingUp,
    Tag,
    MapPin,
    FileText,
    Plus,
    Bookmark,
    ArrowUpDown,
    RefreshCw,
} from 'lucide-react';
import type { Clause, ClauseFilter, ClauseSort, ClauseSortField } from '../utils/clauseTypes';
import {
    CLAUSE_CATEGORIES,
    JURISDICTIONS,
    DOCUMENT_TYPES,
} from '../utils/clauseTypes';
import {
    searchClauses,
    getPopularClauses,
    getRecentClauses,
    incrementClauseUsage,
    addToFavorites,
    removeFromFavorites,
    getUserFavoritesWithClauses,
} from '../utils/clauseService';

// Wrapper for getUserFavorites that returns the expected structure
async function getUserFavorites(): Promise<Array<{ clause: Clause; favorite: { id: string } }>> {
    const results = await getUserFavoritesWithClauses();
    return results.map(r => ({
        clause: r.clause,
        favorite: { id: r.favoriteId },
    }));
}
import { format } from 'date-fns';

// ============================================
// Sub-Components
// ============================================

interface ClauseCardProps {
    clause: Clause;
    isSelected: boolean;
    isFavorite: boolean;
    favoriteId?: string;
    onSelect: () => void;
    onInsert: () => void;
    onToggleFavorite: () => void;
}

function ClauseCard({
    clause,
    isSelected,
    isFavorite,
    onSelect,
    onInsert,
    onToggleFavorite,
}: ClauseCardProps) {
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
                    <h4 className="font-medium text-slate-900 truncate">{clause.title}</h4>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                        {clause.description || 'No description'}
                    </p>
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
                            onInsert();
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        title="Insert clause"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    <Tag className="w-3 h-3" />
                    {clause.category}
                </span>
                {clause.jurisdiction && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                        <MapPin className="w-3 h-3" />
                        {clause.jurisdiction}
                    </span>
                )}
                {clause.usageCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded">
                        <TrendingUp className="w-3 h-3" />
                        {clause.usageCount} uses
                    </span>
                )}
            </div>

            {clause.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {clause.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="text-xs px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded"
                        >
                            {tag}
                        </span>
                    ))}
                    {clause.tags.length > 3 && (
                        <span className="text-xs text-slate-400">+{clause.tags.length - 3}</span>
                    )}
                </div>
            )}
        </div>
    );
}

interface ClausePreviewProps {
    clause: Clause;
    onInsert: () => void;
    onClose: () => void;
}

function ClausePreview({ clause, onInsert, onClose }: ClausePreviewProps) {
    const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | null>(null);

    const displayContent = useMemo(() => {
        if (selectedJurisdiction) {
            const variation = clause.variations.find(v => v.jurisdiction === selectedJurisdiction);
            if (variation) return variation.content;
        }
        return clause.content;
    }, [clause, selectedJurisdiction]);

    return (
        <div className="h-full flex flex-col bg-white border-l border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">{clause.title}</h3>
                    <button onClick={onClose} className="btn-ghost btn-xs">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-sm text-slate-500 mt-1">{clause.description}</p>
            </div>

            {/* Metadata */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <span className="text-slate-500">Category:</span>
                        <span className="ml-2 font-medium text-slate-900">{clause.category}</span>
                    </div>
                    <div>
                        <span className="text-slate-500">Jurisdiction:</span>
                        <span className="ml-2 font-medium text-slate-900">{clause.jurisdiction || 'General'}</span>
                    </div>
                    <div>
                        <span className="text-slate-500">Used:</span>
                        <span className="ml-2 font-medium text-slate-900">{clause.usageCount} times</span>
                    </div>
                    <div>
                        <span className="text-slate-500">Doc Types:</span>
                        <span className="ml-2 font-medium text-slate-900">{clause.documentTypes.length}</span>
                    </div>
                </div>

                {clause.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                        {clause.tags.map((tag) => (
                            <span
                                key={tag}
                                className="text-xs px-2 py-0.5 bg-white text-slate-600 rounded border border-slate-200"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Jurisdiction Variations */}
            {clause.variations.length > 0 && (
                <div className="p-4 border-b border-slate-200">
                    <label className="text-sm font-medium text-slate-700">Jurisdiction Variation:</label>
                    <select
                        value={selectedJurisdiction || ''}
                        onChange={(e) => setSelectedJurisdiction(e.target.value || null)}
                        className="input input-sm mt-1"
                    >
                        <option value="">Default (General)</option>
                        {clause.variations.map((v) => (
                            <option key={v.jurisdiction} value={v.jurisdiction}>
                                {v.jurisdiction}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Content Preview */}
            <div className="flex-1 overflow-y-auto p-4">
                <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: displayContent }}
                />
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                    {clause.lastUsedAt && (
                        <>
                            <Clock className="w-3 h-3 inline mr-1" />
                            Last used {format(new Date(clause.lastUsedAt), 'MMM d, yyyy')}
                        </>
                    )}
                </div>
                <button onClick={onInsert} className="btn-primary btn-sm">
                    <Copy className="w-4 h-4 mr-1" />
                    Insert Clause
                </button>
            </div>
        </div>
    );
}

// ============================================
// Main Component
// ============================================

interface ClauseLibraryProps {
    onInsertClause: (content: string, clause: Clause) => void;
    documentType?: string;
    jurisdiction?: string;
    compact?: boolean;
}

export function ClauseLibrary({
    onInsertClause,
    documentType,
    jurisdiction,
    compact = false,
}: ClauseLibraryProps) {
    // State
    const [clauses, setClauses] = useState<Clause[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
    const [showFilters, setShowFilters] = useState(!compact);
    const [favorites, setFavorites] = useState<Map<string, string>>(new Map()); // clauseId -> favoriteId

    // Filter state
    const [filter, setFilter] = useState<ClauseFilter>({
        documentType,
        jurisdiction,
    });
    const [sort, setSort] = useState<ClauseSort>({ field: 'title', direction: 'asc' });
    const [searchQuery, setSearchQuery] = useState('');

    // View mode
    const [viewMode, setViewMode] = useState<'all' | 'popular' | 'recent' | 'favorites'>('all');

    // Load clauses
    const loadClauses = useCallback(async () => {
        setLoading(true);
        try {
            let result: Clause[] = [];

            switch (viewMode) {
                case 'popular': {
                    result = await getPopularClauses(20);
                    break;
                }
                case 'recent': {
                    result = await getRecentClauses(20);
                    break;
                }
                case 'favorites': {
                    const favs = await getUserFavorites();
                    result = favs.map(f => ({ ...f.clause, isFavorite: true }));
                    break;
                }
                default: {
                    result = await searchClauses({
                        query: searchQuery || undefined,
                        category: filter.category,
                        jurisdiction: filter.jurisdiction,
                        documentType: filter.documentType,
                    });
                }
            }

            setClauses(result);
        } catch (error) {
            console.error('Error loading clauses:', error);
        } finally {
            setLoading(false);
        }
    }, [filter, sort, searchQuery, viewMode]);

    // Load favorites
    const loadFavorites = useCallback(async () => {
        try {
            const favs = await getUserFavorites();
            const favMap = new Map<string, string>();
            favs.forEach(f => favMap.set(f.clause.id, f.favorite.id));
            setFavorites(favMap);
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }, []);

    useEffect(() => {
        loadClauses();
    }, [loadClauses]);

    useEffect(() => {
        loadFavorites();
    }, [loadFavorites]);

    // Handle insert
    const handleInsert = useCallback(async (clause: Clause) => {
        const content = clause.content;
        onInsertClause(content, clause);
        await incrementClauseUsage(clause.id);
        
        // Update local state
        setClauses(prev =>
            prev.map(c =>
                c.id === clause.id
                    ? { ...c, usageCount: c.usageCount + 1, lastUsedAt: new Date().toISOString() }
                    : c
            )
        );
    }, [onInsertClause]);

    // Handle favorite toggle
    const handleToggleFavorite = useCallback(async (clause: Clause) => {
        const favoriteId = favorites.get(clause.id);

        if (favoriteId) {
            // Remove from favorites
            try {
                await removeFromFavorites(favoriteId);
                setFavorites(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(clause.id);
                    return newMap;
                });
            } catch (error) {
                console.error('Error removing from favorites:', error);
            }
        } else {
            // Add to favorites
            try {
                const newFavoriteId = await addToFavorites(clause.id);
                if (newFavoriteId) {
                    setFavorites(prev => {
                        const newMap = new Map(prev);
                        newMap.set(clause.id, newFavoriteId);
                        return newMap;
                    });
                }
            } catch (error) {
                console.error('Error adding to favorites:', error);
            }
        }
    }, [favorites]);

    // Clear filters
    const handleClearFilters = useCallback(() => {
        setFilter({ documentType, jurisdiction });
        setSearchQuery('');
    }, [documentType, jurisdiction]);

    const hasActiveFilters = useMemo(() => {
        return (
            !!filter.category ||
            !!filter.subcategory ||
            (filter.jurisdiction !== jurisdiction) ||
            (filter.documentType !== documentType) ||
            (filter.tags && filter.tags.length > 0) ||
            !!searchQuery
        );
    }, [filter, searchQuery, documentType, jurisdiction]);

    return (
        <div className={`flex flex-col h-full ${compact ? 'max-h-[600px]' : ''}`}>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <Bookmark className="w-5 h-5 text-primary-600" />
                        Clause Library
                    </h2>
                    <div className="flex items-center gap-2">
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
                        <button onClick={loadClauses} className="btn-ghost btn-sm" disabled={loading}>
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
                        placeholder="Search clauses..."
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
                        { id: 'all', label: 'All', icon: FileText },
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
                            <label className="label text-xs">Category</label>
                            <select
                                value={filter.category || ''}
                                onChange={(e) => setFilter({ ...filter, category: e.target.value || undefined })}
                                className="input input-sm"
                            >
                                <option value="">All Categories</option>
                                {CLAUSE_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
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
                            <label className="label text-xs">Document Type</label>
                            <select
                                value={filter.documentType || ''}
                                onChange={(e) => setFilter({ ...filter, documentType: e.target.value || undefined })}
                                className="input input-sm"
                            >
                                <option value="">All Types</option>
                                {DOCUMENT_TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label text-xs">Sort By</label>
                            <div className="flex gap-1">
                                <select
                                    value={sort.field}
                                    onChange={(e) => setSort({ ...sort, field: e.target.value as ClauseSortField })}
                                    className="input input-sm flex-1"
                                >
                                    <option value="title">Title</option>
                                    <option value="category">Category</option>
                                    <option value="usageCount">Usage</option>
                                    <option value="lastUsedAt">Last Used</option>
                                    <option value="createdAt">Created</option>
                                </select>
                                <button
                                    onClick={() => setSort({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
                                    className="btn-ghost btn-sm px-2"
                                    title={sort.direction === 'asc' ? 'Ascending' : 'Descending'}
                                >
                                    <ArrowUpDown className="w-4 h-4" />
                                </button>
                            </div>
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
                {/* Clause List */}
                <div className={`flex-1 overflow-y-auto p-4 ${selectedClause && !compact ? 'w-1/2' : 'w-full'}`}>
                    {loading ? (
                        <div className="text-center py-12">
                            <span className="spinner w-8 h-8 text-primary-600" />
                            <p className="text-sm text-slate-500 mt-3">Loading clauses...</p>
                        </div>
                    ) : clauses.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 mx-auto text-slate-300" />
                            <p className="text-sm text-slate-500 mt-3">No clauses found</p>
                            {hasActiveFilters && (
                                <button onClick={handleClearFilters} className="text-sm text-primary-600 hover:text-primary-700 mt-2">
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-500">{clauses.length} clause{clauses.length !== 1 ? 's' : ''} found</p>
                            {clauses.map((clause) => (
                                <ClauseCard
                                    key={clause.id}
                                    clause={clause}
                                    isSelected={selectedClause?.id === clause.id}
                                    isFavorite={favorites.has(clause.id)}
                                    favoriteId={favorites.get(clause.id)}
                                    onSelect={() => setSelectedClause(clause)}
                                    onInsert={() => handleInsert(clause)}
                                    onToggleFavorite={() => handleToggleFavorite(clause)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Preview Panel */}
                {selectedClause && !compact && (
                    <div className="w-1/2">
                        <ClausePreview
                            clause={selectedClause}
                            onInsert={() => handleInsert(selectedClause)}
                            onClose={() => setSelectedClause(null)}
                        />
                    </div>
                )}
            </div>

            {/* Compact Preview Modal */}
            {selectedClause && compact && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <ClausePreview
                            clause={selectedClause}
                            onInsert={() => {
                                handleInsert(selectedClause);
                                setSelectedClause(null);
                            }}
                            onClose={() => setSelectedClause(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClauseLibrary;

