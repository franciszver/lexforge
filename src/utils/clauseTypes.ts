/**
 * Clause Library Types
 * Defines the structure for reusable legal clauses.
 */

import { PlaceholderDefinition } from './templateTypes';

// ============================================
// Clause Types
// ============================================

export interface ClauseVariation {
    jurisdiction: string;
    content: string;
    notes?: string;
}

export interface Clause {
    id: string;
    title: string;
    content: string;
    description?: string;
    
    // Categorization
    category: string;
    subcategory?: string;
    tags: string[];
    
    // Legal context
    jurisdiction?: string;
    documentTypes: string[];
    
    // Usage tracking
    usageCount: number;
    lastUsedAt?: string;
    
    // Variations
    variations: ClauseVariation[];
    
    // Metadata
    author?: string;
    isPublished: boolean;
    isFavorite?: boolean;
    notes?: string;
    
    // Placeholders
    placeholders: PlaceholderDefinition[];
    
    // Timestamps
    createdAt: string;
    updatedAt: string;
}

export interface UserClauseFavorite {
    id: string;
    clauseId: string;
    notes?: string;
    createdAt: string;
}

// ============================================
// Search & Filter Types
// ============================================

export interface ClauseFilter {
    category?: string;
    subcategory?: string;
    jurisdiction?: string;
    documentType?: string;
    tags?: string[];
    searchQuery?: string;
    isPublished?: boolean;
    isFavorite?: boolean;
}

export type ClauseSortField = 'title' | 'category' | 'usageCount' | 'lastUsedAt' | 'createdAt';
export type ClauseSortDirection = 'asc' | 'desc';

export interface ClauseSort {
    field: ClauseSortField;
    direction: ClauseSortDirection;
}

export interface ClauseSearchResult {
    clauses: Clause[];
    totalCount: number;
    nextToken?: string;
}

// ============================================
// Category Constants
// ============================================

export const CLAUSE_CATEGORIES = [
    'Indemnification',
    'Confidentiality',
    'Termination',
    'Limitation of Liability',
    'Intellectual Property',
    'Dispute Resolution',
    'Force Majeure',
    'Governing Law',
    'Assignment',
    'Notices',
    'Amendments',
    'Severability',
    'Entire Agreement',
    'Waiver',
    'Representations & Warranties',
    'Payment Terms',
    'Insurance',
    'Compliance',
    'Data Protection',
    'Non-Compete',
    'Non-Solicitation',
    'Other',
] as const;

export const JURISDICTIONS = [
    'Federal',
    'California',
    'New York',
    'Texas',
    'Florida',
    'Illinois',
    'Pennsylvania',
    'Ohio',
    'Georgia',
    'North Carolina',
    'Michigan',
    'New Jersey',
    'Virginia',
    'Washington',
    'Arizona',
    'Massachusetts',
    'Tennessee',
    'Indiana',
    'Missouri',
    'Maryland',
    'Wisconsin',
    'Colorado',
    'Minnesota',
    'South Carolina',
    'Alabama',
    'Louisiana',
    'Kentucky',
    'Oregon',
    'Oklahoma',
    'Connecticut',
    'Utah',
    'Iowa',
    'Nevada',
    'Arkansas',
    'Mississippi',
    'Kansas',
    'New Mexico',
    'Nebraska',
    'West Virginia',
    'Idaho',
    'Hawaii',
    'New Hampshire',
    'Maine',
    'Montana',
    'Rhode Island',
    'Delaware',
    'South Dakota',
    'North Dakota',
    'Alaska',
    'Vermont',
    'Wyoming',
    'District of Columbia',
] as const;

export const DOCUMENT_TYPES = [
    'Contract',
    'Agreement',
    'NDA',
    'Demand Letter',
    'Brief',
    'Motion',
    'Lease',
    'Employment Agreement',
    'Service Agreement',
    'License Agreement',
    'Purchase Agreement',
    'Partnership Agreement',
    'Operating Agreement',
    'Terms of Service',
    'Privacy Policy',
    'Settlement Agreement',
    'Release',
    'Other',
] as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a clause matches a filter
 */
export function matchesFilter(clause: Clause, filter: ClauseFilter): boolean {
    // Category filter
    if (filter.category && clause.category !== filter.category) {
        return false;
    }
    
    // Subcategory filter
    if (filter.subcategory && clause.subcategory !== filter.subcategory) {
        return false;
    }
    
    // Jurisdiction filter
    if (filter.jurisdiction && clause.jurisdiction !== filter.jurisdiction) {
        return false;
    }
    
    // Document type filter
    if (filter.documentType && !clause.documentTypes.includes(filter.documentType)) {
        return false;
    }
    
    // Tags filter (any match)
    if (filter.tags && filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some(tag => clause.tags.includes(tag));
        if (!hasMatchingTag) {
            return false;
        }
    }
    
    // Published filter
    if (filter.isPublished !== undefined && clause.isPublished !== filter.isPublished) {
        return false;
    }
    
    // Favorite filter
    if (filter.isFavorite !== undefined && clause.isFavorite !== filter.isFavorite) {
        return false;
    }
    
    // Search query (search in title, description, content, tags)
    if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const searchableText = [
            clause.title,
            clause.description || '',
            clause.content,
            ...clause.tags,
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Sort clauses by a field
 */
export function sortClauses(clauses: Clause[], sort: ClauseSort): Clause[] {
    return [...clauses].sort((a, b) => {
        let comparison = 0;
        
        switch (sort.field) {
            case 'title':
                comparison = a.title.localeCompare(b.title);
                break;
            case 'category':
                comparison = a.category.localeCompare(b.category);
                break;
            case 'usageCount':
                comparison = a.usageCount - b.usageCount;
                break;
            case 'lastUsedAt':
                const aDate = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
                const bDate = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
                comparison = aDate - bDate;
                break;
            case 'createdAt':
                comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                break;
        }
        
        return sort.direction === 'asc' ? comparison : -comparison;
    });
}

/**
 * Get unique tags from a list of clauses
 */
export function getUniqueTags(clauses: Clause[]): string[] {
    const tagSet = new Set<string>();
    clauses.forEach(clause => {
        clause.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
}

/**
 * Get clause variation for a specific jurisdiction
 */
export function getClauseForJurisdiction(clause: Clause, jurisdiction: string): string {
    // First, check for a specific variation
    const variation = clause.variations.find(v => v.jurisdiction === jurisdiction);
    if (variation) {
        return variation.content;
    }
    
    // Fall back to main content
    return clause.content;
}

