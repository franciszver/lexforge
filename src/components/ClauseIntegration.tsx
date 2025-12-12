/**
 * ClauseIntegration Component
 * Provides clause suggestions integrated with argument building.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Bookmark,
    Search,
    Plus,
    ChevronRight,
    AlertCircle,
    Loader2,
    CheckCircle,
    Copy,
} from 'lucide-react';
import type { Argument } from '../utils/argumentTypes';
import type { Clause } from '../utils/clauseTypes';
import { getSuggestedClauses, getClausesByCategory, incrementClauseUsage } from '../utils/clauseService';

// ============================================
// Types
// ============================================

interface ClauseIntegrationProps {
    argument?: Argument;
    documentType?: string;
    jurisdiction?: string;
    onInsertClause?: (clause: Clause, asSupport?: boolean) => void;
    compact?: boolean;
}

interface SuggestedClauseGroup {
    category: string;
    clauses: Clause[];
    relevance: 'high' | 'medium' | 'low';
}

// ============================================
// Helper Functions
// ============================================

/**
 * Map argument type to relevant clause categories
 */
function getRelevantCategories(argumentType: string): string[] {
    const mapping: Record<string, string[]> = {
        'legal': ['Governing Law', 'Dispute Resolution', 'Amendments'],
        'factual': ['Representations & Warranties', 'Notices'],
        'policy': ['Compliance', 'Data Protection'],
        'equitable': ['Waiver', 'Severability'],
        'procedural': ['Notices', 'Amendments'],
        'statutory': ['Compliance', 'Governing Law'],
        'constitutional': ['Severability', 'Governing Law'],
        'indemnification': ['Indemnification'],
        'confidentiality': ['Confidentiality'],
        'termination': ['Termination'],
        'liability': ['Limitation of Liability', 'Indemnification'],
    };
    
    return mapping[argumentType] || ['Other'];
}

/**
 * Determine relevance based on argument content
 */
function calculateRelevance(clause: Clause, argument?: Argument): 'high' | 'medium' | 'low' {
    if (!argument) return 'medium';
    
    const contentLower = (argument.thesis + argument.title).toLowerCase();
    const clauseKeywords = [
        clause.title.toLowerCase(),
        clause.category.toLowerCase(),
        clause.description?.toLowerCase() || '',
        ...(clause.tags || []).map(t => t.toLowerCase()),
    ];
    
    const matchCount = clauseKeywords.filter(kw => contentLower.includes(kw)).length;
    
    if (matchCount >= 2) return 'high';
    if (matchCount >= 1) return 'medium';
    return 'low';
}

// ============================================
// Sub-Components
// ============================================

interface ClauseCardProps {
    clause: Clause;
    relevance: 'high' | 'medium' | 'low';
    onInsert: () => void;
    onInsertAsSupport?: () => void;
}

function ClauseCard({ clause, relevance, onInsert, onInsertAsSupport }: ClauseCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(clause.content.replace(/<[^>]+>/g, ''));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [clause.content]);
    
    const relevanceColors = {
        high: 'bg-green-100 text-green-700 border-green-200',
        medium: 'bg-amber-100 text-amber-700 border-amber-200',
        low: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    
    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div
                className="p-3 cursor-pointer hover:bg-slate-50"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800 truncate">{clause.title}</span>
                            <span className={`px-1.5 py-0.5 text-xs rounded border ${relevanceColors[relevance]}`}>
                                {relevance}
                            </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            {clause.category}
                            {clause.jurisdiction && ` - ${clause.jurisdiction}`}
                        </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </div>
            </div>
            
            {expanded && (
                <div className="p-3 border-t border-slate-100 bg-slate-50">
                    {clause.description && (
                        <p className="text-sm text-slate-600 mb-3">{clause.description}</p>
                    )}
                    
                    <div 
                        className="text-sm text-slate-700 bg-white p-3 rounded border border-slate-200 mb-3 max-h-40 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: clause.content }}
                    />
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onInsert();
                            }}
                            className="btn btn-primary btn-sm"
                        >
                            <Plus className="w-3 h-3 mr-1" />
                            Insert
                        </button>
                        
                        {onInsertAsSupport && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onInsertAsSupport();
                                }}
                                className="btn btn-secondary btn-sm"
                            >
                                <Bookmark className="w-3 h-3 mr-1" />
                                Add as Support
                            </button>
                        )}
                        
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCopy();
                            }}
                            className="btn btn-secondary btn-sm"
                        >
                            {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// Main Component
// ============================================

export function ClauseIntegration({
    argument,
    documentType,
    jurisdiction,
    onInsertClause,
    compact = false,
}: ClauseIntegrationProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<SuggestedClauseGroup[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Clause[]>([]);
    const [searching, setSearching] = useState(false);
    
    // Load suggestions based on argument type
    useEffect(() => {
        async function loadSuggestions() {
            if (!argument && !documentType) return;
            
            setLoading(true);
            setError(null);
            
            try {
                const categories = argument 
                    ? getRelevantCategories(argument.type)
                    : getRelevantCategories(documentType?.toLowerCase() || '');
                
                const groups: SuggestedClauseGroup[] = [];
                
                for (const category of categories) {
                    const allClauses = await getClausesByCategory(category);
                    const clauses = allClauses.slice(0, 5);
                    if (clauses.length > 0) {
                        // Sort by relevance
                        const withRelevance = clauses.map(c => ({
                            clause: c,
                            relevance: calculateRelevance(c, argument),
                        }));
                        
                        withRelevance.sort((a, b) => {
                            const order = { high: 0, medium: 1, low: 2 };
                            return order[a.relevance] - order[b.relevance];
                        });
                        
                        groups.push({
                            category,
                            clauses: withRelevance.map(w => w.clause),
                            relevance: withRelevance[0]?.relevance || 'medium',
                        });
                    }
                }
                
                // Sort groups by relevance
                groups.sort((a, b) => {
                    const order = { high: 0, medium: 1, low: 2 };
                    return order[a.relevance] - order[b.relevance];
                });
                
                setSuggestions(groups);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load suggestions');
            } finally {
                setLoading(false);
            }
        }
        
        loadSuggestions();
    }, [argument, documentType]);
    
    // Search clauses
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        
        setSearching(true);
        
        try {
            const results = await getSuggestedClauses(documentType || '', jurisdiction || '', []);
            // Filter by search query
            const filtered = results.filter(c => 
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setSearchResults(filtered);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setSearching(false);
        }
    }, [searchQuery, documentType, jurisdiction]);
    
    const handleInsert = useCallback(async (clause: Clause, asSupport: boolean = false) => {
        // Increment usage count
        await incrementClauseUsage(clause.id);
        
        if (onInsertClause) {
            onInsertClause(clause, asSupport);
        }
    }, [onInsertClause]);
    
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                <span className="ml-2 text-sm text-slate-600">Loading suggestions...</span>
            </div>
        );
    }
    
    return (
        <div className={`space-y-4 ${compact ? '' : 'p-4'}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-primary-500" />
                    Supporting Clauses
                </h3>
            </div>
            
            {/* Search */}
            <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search clauses..."
                        className="input pl-9 w-full"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="btn btn-secondary btn-sm"
                >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>
            </div>
            
            {/* Error */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    {error}
                </div>
            )}
            
            {/* Search Results */}
            {searchResults.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-medium text-slate-500 uppercase">Search Results</h4>
                    {searchResults.map(clause => (
                        <ClauseCard
                            key={clause.id}
                            clause={clause}
                            relevance={calculateRelevance(clause, argument)}
                            onInsert={() => handleInsert(clause)}
                            onInsertAsSupport={argument ? () => handleInsert(clause, true) : undefined}
                        />
                    ))}
                </div>
            )}
            
            {/* Suggested Clauses */}
            {suggestions.length > 0 ? (
                <div className="space-y-4">
                    {suggestions.map(group => (
                        <div key={group.category} className="space-y-2">
                            <h4 className="text-xs font-medium text-slate-500 uppercase flex items-center gap-2">
                                {group.category}
                                <span className={`px-1.5 py-0.5 text-xs rounded ${
                                    group.relevance === 'high' ? 'bg-green-100 text-green-700' :
                                    group.relevance === 'medium' ? 'bg-amber-100 text-amber-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {group.relevance}
                                </span>
                            </h4>
                            <div className="space-y-2">
                                {group.clauses.slice(0, compact ? 2 : 3).map(clause => (
                                    <ClauseCard
                                        key={clause.id}
                                        clause={clause}
                                        relevance={calculateRelevance(clause, argument)}
                                        onInsert={() => handleInsert(clause)}
                                        onInsertAsSupport={argument ? () => handleInsert(clause, true) : undefined}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                !loading && searchResults.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-sm">
                        <Bookmark className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p>No clause suggestions available</p>
                        <p className="text-xs mt-1">Try searching for specific terms</p>
                    </div>
                )
            )}
            
            {/* Info */}
            {argument && (
                <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                    <strong>Tip:</strong> Click "Add as Support" to include a clause as a supporting point in your argument.
                </div>
            )}
        </div>
    );
}

export default ClauseIntegration;

