/**
 * ClauseSuggestions Component
 * Shows context-aware clause suggestions based on document type and content.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Lightbulb,
    Plus,
    ChevronRight,
    RefreshCw,
    X,
    MapPin,
    TrendingUp,
} from 'lucide-react';
import type { Clause } from '../utils/clauseTypes';
import { CLAUSE_CATEGORIES } from '../utils/clauseTypes';
import { searchClauses, type Clause as ServiceClause } from '../utils/clauseService';

// Helper to map service clause to component clause
function mapServiceClauseToClause(sc: ServiceClause): Clause {
    return {
        id: sc.id,
        title: sc.title,
        content: sc.content,
        description: sc.description,
        category: sc.category,
        subcategory: sc.subcategory,
        tags: sc.tags || [],
        jurisdiction: sc.jurisdiction,
        documentTypes: sc.documentTypes || [],
        usageCount: sc.usageCount,
        lastUsedAt: sc.lastUsedAt,
        variations: sc.variations || [],
        // Cast placeholders to the expected type - the data is compatible
        placeholders: (sc.placeholders || []) as unknown as Clause['placeholders'],
        isPublished: true,
        isFavorite: false,
        createdAt: sc.createdAt,
        updatedAt: sc.updatedAt,
    };
}

// Wrapper functions to match expected API
async function getSuggestedClauses(params: { documentType?: string; jurisdiction?: string; limit?: number }): Promise<Clause[]> {
    const results = await searchClauses({
        documentType: params.documentType,
        jurisdiction: params.jurisdiction,
        limit: params.limit || 10,
    });
    return results.map(mapServiceClauseToClause);
}

async function getClausesByCategory(category: string): Promise<Clause[]> {
    const results = await searchClauses({ category });
    return results.map(mapServiceClauseToClause);
}

// ============================================
// Types
// ============================================

interface ClauseSuggestionsProps {
    documentType?: string;
    jurisdiction?: string;
    documentContent?: string;
    onInsertClause: (content: string, clause: Clause) => void;
    compact?: boolean;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Extract clause categories that appear to already be in the document
 */
function detectExistingCategories(content: string): string[] {
    if (!content) return [];
    
    const contentLower = content.toLowerCase();
    const detected: string[] = [];
    
    // Simple keyword detection for common clause types
    const categoryKeywords: Record<string, string[]> = {
        'Indemnification': ['indemnify', 'indemnification', 'hold harmless'],
        'Confidentiality': ['confidential', 'non-disclosure', 'proprietary information'],
        'Termination': ['termination', 'terminate', 'expiration'],
        'Limitation of Liability': ['limitation of liability', 'liability cap', 'consequential damages'],
        'Intellectual Property': ['intellectual property', 'patent', 'copyright', 'trademark', 'ip rights'],
        'Dispute Resolution': ['arbitration', 'mediation', 'dispute resolution'],
        'Force Majeure': ['force majeure', 'act of god', 'unforeseeable'],
        'Governing Law': ['governing law', 'choice of law', 'jurisdiction'],
        'Assignment': ['assignment', 'assign', 'transfer'],
        'Notices': ['notice', 'notification', 'written notice'],
        'Amendments': ['amendment', 'modify', 'modification'],
        'Severability': ['severability', 'severable'],
        'Entire Agreement': ['entire agreement', 'integration', 'merger clause'],
        'Waiver': ['waiver', 'waive'],
        'Non-Compete': ['non-compete', 'competition', 'competitive activity'],
        'Non-Solicitation': ['non-solicitation', 'solicitation'],
    };
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => contentLower.includes(keyword))) {
            detected.push(category);
        }
    }
    
    return detected;
}

/**
 * Get recommended categories based on document type
 */
function getRecommendedCategoriesForDocType(documentType: string): string[] {
    const recommendations: Record<string, string[]> = {
        'Contract': [
            'Indemnification', 'Confidentiality', 'Termination', 'Governing Law',
            'Dispute Resolution', 'Limitation of Liability', 'Force Majeure'
        ],
        'NDA': [
            'Confidentiality', 'Termination', 'Governing Law', 'Dispute Resolution',
            'Entire Agreement', 'Severability'
        ],
        'Agreement': [
            'Indemnification', 'Confidentiality', 'Termination', 'Governing Law',
            'Dispute Resolution', 'Amendments', 'Notices'
        ],
        'Employment Agreement': [
            'Confidentiality', 'Non-Compete', 'Non-Solicitation', 'Intellectual Property',
            'Termination', 'Governing Law'
        ],
        'Service Agreement': [
            'Indemnification', 'Limitation of Liability', 'Confidentiality',
            'Termination', 'Payment Terms', 'Governing Law'
        ],
        'License Agreement': [
            'Intellectual Property', 'Limitation of Liability', 'Termination',
            'Indemnification', 'Governing Law', 'Confidentiality'
        ],
        'Lease': [
            'Termination', 'Notices', 'Assignment', 'Governing Law',
            'Force Majeure', 'Insurance'
        ],
    };
    
    return recommendations[documentType] || [
        'Indemnification', 'Confidentiality', 'Termination', 'Governing Law'
    ];
}

// ============================================
// Main Component
// ============================================

export function ClauseSuggestions({
    documentType,
    jurisdiction,
    documentContent,
    onInsertClause,
    compact = false,
}: ClauseSuggestionsProps) {
    const [suggestions, setSuggestions] = useState<Clause[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [categoryClauseData, setCategoryClauseData] = useState<Map<string, Clause[]>>(new Map());
    const [loadingCategory, setLoadingCategory] = useState<string | null>(null);

    // Detect existing categories in document
    const existingCategories = detectExistingCategories(documentContent || '');
    
    // Get recommended categories
    const recommendedCategories = getRecommendedCategoriesForDocType(documentType || 'Contract');
    
    // Filter to categories not yet in document
    const missingCategories = recommendedCategories.filter(
        cat => !existingCategories.includes(cat)
    );

    // Load suggestions
    const loadSuggestions = useCallback(async () => {
        if (!documentType) return;
        
        setLoading(true);
        try {
            const clauses = await getSuggestedClauses({
                documentType,
                jurisdiction,
                limit: 10,
            });
            // Filter out clauses from categories already in document
            const filtered = clauses.filter(c => !existingCategories.includes(c.category));
            setSuggestions(filtered);
        } catch (error) {
            console.error('Error loading suggestions:', error);
        } finally {
            setLoading(false);
        }
    }, [documentType, jurisdiction, existingCategories.join(',')]);

    useEffect(() => {
        loadSuggestions();
    }, [loadSuggestions]);

    // Load clauses for a specific category
    const loadCategoryClause = useCallback(async (category: string) => {
        if (categoryClauseData.has(category)) {
            setExpandedCategory(expandedCategory === category ? null : category);
            return;
        }

        setLoadingCategory(category);
        try {
            const clauses = await getClausesByCategory(category);
            setCategoryClauseData(prev => {
                const newMap = new Map(prev);
                newMap.set(category, clauses);
                return newMap;
            });
            setExpandedCategory(category);
        } catch (error) {
            console.error('Error loading category clauses:', error);
        } finally {
            setLoadingCategory(null);
        }
    }, [categoryClauseData, expandedCategory]);

    // Handle insert
    const handleInsert = useCallback((clause: Clause) => {
        onInsertClause(clause.content, clause);
    }, [onInsertClause]);

    if (!documentType && !compact) {
        return (
            <div className="p-4 text-center text-slate-500">
                <Lightbulb className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm">Select a document type to see clause suggestions</p>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${compact ? '' : 'p-4'}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-slate-900">Suggested Clauses</h3>
                </div>
                <button
                    onClick={loadSuggestions}
                    className="btn-ghost btn-xs"
                    disabled={loading}
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Missing Categories Alert */}
            {missingCategories.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium mb-2">
                        Consider adding these clauses:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {missingCategories.slice(0, 5).map((category) => (
                            <button
                                key={category}
                                onClick={() => loadCategoryClause(category)}
                                className="text-xs px-2 py-1 bg-white border border-amber-200 rounded text-amber-700 hover:bg-amber-100 transition-colors"
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Existing Categories */}
            {existingCategories.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium mb-2">
                        Detected in document:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {existingCategories.map((category) => (
                            <span
                                key={category}
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded"
                            >
                                {category}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Category Expansion */}
            {expandedCategory && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="p-3 bg-slate-50 flex items-center justify-between">
                        <span className="font-medium text-slate-900">{expandedCategory}</span>
                        <button
                            onClick={() => setExpandedCategory(null)}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                        {loadingCategory === expandedCategory ? (
                            <div className="text-center py-4">
                                <span className="spinner w-5 h-5 text-primary-600" />
                            </div>
                        ) : (categoryClauseData.get(expandedCategory) || []).length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">
                                No clauses available in this category
                            </p>
                        ) : (
                            (categoryClauseData.get(expandedCategory) || []).map((clause) => (
                                <div
                                    key={clause.id}
                                    className="p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-slate-900 truncate">
                                                {clause.title}
                                            </p>
                                            <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                                {clause.description || 'No description'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleInsert(clause)}
                                            className="btn-primary btn-xs"
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Insert
                                        </button>
                                    </div>
                                    {clause.jurisdiction && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                                            <MapPin className="w-3 h-3" />
                                            {clause.jurisdiction}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Top Suggestions */}
            {suggestions.length > 0 && !expandedCategory && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Popular Clauses
                    </p>
                    {suggestions.slice(0, compact ? 3 : 5).map((clause) => (
                        <div
                            key={clause.id}
                            className="p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-slate-900">
                                        {clause.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                            {clause.category}
                                        </span>
                                        {clause.usageCount > 0 && (
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3" />
                                                {clause.usageCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleInsert(clause)}
                                    className="btn-ghost btn-xs text-primary-600 hover:bg-primary-50"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Browse All */}
            {!compact && (
                <div className="pt-2 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                        Browse by Category
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {CLAUSE_CATEGORIES.slice(0, 8).map((category) => (
                            <button
                                key={category}
                                onClick={() => loadCategoryClause(category)}
                                className={`p-2 text-left text-sm rounded-lg border transition-colors ${
                                    existingCategories.includes(category)
                                        ? 'border-green-200 bg-green-50 text-green-700'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="truncate">{category}</span>
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && suggestions.length === 0 && (
                <div className="text-center py-8">
                    <span className="spinner w-6 h-6 text-primary-600" />
                    <p className="text-sm text-slate-500 mt-2">Loading suggestions...</p>
                </div>
            )}
        </div>
    );
}

export default ClauseSuggestions;

