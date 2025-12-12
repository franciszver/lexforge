/**
 * Citation Manager Types
 * Defines the structure for legal citations and formatting rules.
 */

// ============================================
// Citation Types
// ============================================

export type CitationType = 'case' | 'statute' | 'regulation' | 'constitution' | 'secondary' | 'treaty';

export interface Citation {
    id: string;
    title: string;
    citation: string;
    type: CitationType;
    
    // Case-specific fields
    court?: string;
    year?: number;
    volume?: string;
    reporter?: string;
    page?: string;
    pinpoint?: string;
    
    // Statute/regulation fields
    jurisdiction?: string;
    codeTitle?: string;
    section?: string;
    subdivision?: string;
    
    // Additional metadata
    shortForm?: string;
    parenthetical?: string;
    url?: string;
    
    // Categorization
    category?: string;
    tags: string[];
    
    // Usage tracking
    usageCount: number;
    lastUsedAt?: string;
    
    // Metadata
    notes?: string;
    isVerified: boolean;
    createdBy?: string;
    
    // Timestamps
    createdAt: string;
    updatedAt: string;
}

export interface UserCitationFavorite {
    id: string;
    citationId: string;
    notes?: string;
    createdAt: string;
}

// ============================================
// Formatting Styles
// ============================================

export type CitationStyle = 'bluebook' | 'alwd' | 'chicago' | 'apa' | 'mla';

export interface FormattedCitation {
    full: string;         // Full citation
    short: string;        // Short form for subsequent references
    footnote: string;     // Format for footnotes
    bibliography: string; // Format for bibliography/table of authorities
}

// ============================================
// Search & Filter Types
// ============================================

export interface CitationFilter {
    type?: CitationType;
    jurisdiction?: string;
    category?: string;
    court?: string;
    yearStart?: number;
    yearEnd?: number;
    tags?: string[];
    searchQuery?: string;
    isVerified?: boolean;
}

export type CitationSortField = 'title' | 'year' | 'usageCount' | 'lastUsedAt' | 'createdAt';
export type CitationSortDirection = 'asc' | 'desc';

export interface CitationSort {
    field: CitationSortField;
    direction: CitationSortDirection;
}

export interface CitationSearchResult {
    citations: Citation[];
    totalCount: number;
    nextToken?: string;
}

// ============================================
// Constants
// ============================================

export const CITATION_TYPES: { value: CitationType; label: string; description: string }[] = [
    { value: 'case', label: 'Case', description: 'Court decisions and opinions' },
    { value: 'statute', label: 'Statute', description: 'Legislative acts and codes' },
    { value: 'regulation', label: 'Regulation', description: 'Administrative rules' },
    { value: 'constitution', label: 'Constitution', description: 'Constitutional provisions' },
    { value: 'secondary', label: 'Secondary Source', description: 'Law reviews, treatises, etc.' },
    { value: 'treaty', label: 'Treaty', description: 'International agreements' },
];

export const FEDERAL_REPORTERS = [
    'U.S.',           // United States Reports
    'S. Ct.',         // Supreme Court Reporter
    'L. Ed.',         // Lawyers' Edition
    'L. Ed. 2d',      // Lawyers' Edition Second
    'F.',             // Federal Reporter
    'F.2d',           // Federal Reporter Second
    'F.3d',           // Federal Reporter Third
    'F.4th',          // Federal Reporter Fourth
    'F. Supp.',       // Federal Supplement
    'F. Supp. 2d',    // Federal Supplement Second
    'F. Supp. 3d',    // Federal Supplement Third
    'F.R.D.',         // Federal Rules Decisions
    'B.R.',           // Bankruptcy Reporter
] as const;

export const STATE_REPORTERS: Record<string, string[]> = {
    'California': ['Cal.', 'Cal. 2d', 'Cal. 3d', 'Cal. 4th', 'Cal. 5th', 'Cal. App.', 'Cal. App. 2d', 'Cal. App. 3d', 'Cal. App. 4th', 'Cal. App. 5th', 'Cal. Rptr.', 'Cal. Rptr. 2d', 'Cal. Rptr. 3d'],
    'New York': ['N.Y.', 'N.Y.2d', 'N.Y.3d', 'A.D.', 'A.D.2d', 'A.D.3d', 'N.Y.S.', 'N.Y.S.2d', 'N.Y.S.3d'],
    'Texas': ['Tex.', 'S.W.', 'S.W.2d', 'S.W.3d'],
    'Florida': ['Fla.', 'So.', 'So. 2d', 'So. 3d'],
    'Illinois': ['Ill.', 'Ill. 2d', 'Ill. App.', 'Ill. App. 2d', 'Ill. App. 3d', 'N.E.', 'N.E.2d', 'N.E.3d'],
};

export const FEDERAL_CODES = [
    'U.S.C.',         // United States Code
    'U.S.C.A.',       // United States Code Annotated
    'U.S.C.S.',       // United States Code Service
    'Pub. L.',        // Public Law
    'Stat.',          // United States Statutes at Large
] as const;

export const FEDERAL_REGULATIONS = [
    'C.F.R.',         // Code of Federal Regulations
    'Fed. Reg.',      // Federal Register
] as const;

export const COURTS = {
    federal: [
        'Supreme Court of the United States',
        'U.S. Court of Appeals for the First Circuit',
        'U.S. Court of Appeals for the Second Circuit',
        'U.S. Court of Appeals for the Third Circuit',
        'U.S. Court of Appeals for the Fourth Circuit',
        'U.S. Court of Appeals for the Fifth Circuit',
        'U.S. Court of Appeals for the Sixth Circuit',
        'U.S. Court of Appeals for the Seventh Circuit',
        'U.S. Court of Appeals for the Eighth Circuit',
        'U.S. Court of Appeals for the Ninth Circuit',
        'U.S. Court of Appeals for the Tenth Circuit',
        'U.S. Court of Appeals for the Eleventh Circuit',
        'U.S. Court of Appeals for the D.C. Circuit',
        'U.S. Court of Appeals for the Federal Circuit',
        'U.S. District Court',
        'U.S. Bankruptcy Court',
    ],
    abbreviations: {
        'Supreme Court of the United States': '',
        'U.S. Court of Appeals for the First Circuit': '1st Cir.',
        'U.S. Court of Appeals for the Second Circuit': '2d Cir.',
        'U.S. Court of Appeals for the Third Circuit': '3d Cir.',
        'U.S. Court of Appeals for the Fourth Circuit': '4th Cir.',
        'U.S. Court of Appeals for the Fifth Circuit': '5th Cir.',
        'U.S. Court of Appeals for the Sixth Circuit': '6th Cir.',
        'U.S. Court of Appeals for the Seventh Circuit': '7th Cir.',
        'U.S. Court of Appeals for the Eighth Circuit': '8th Cir.',
        'U.S. Court of Appeals for the Ninth Circuit': '9th Cir.',
        'U.S. Court of Appeals for the Tenth Circuit': '10th Cir.',
        'U.S. Court of Appeals for the Eleventh Circuit': '11th Cir.',
        'U.S. Court of Appeals for the D.C. Circuit': 'D.C. Cir.',
        'U.S. Court of Appeals for the Federal Circuit': 'Fed. Cir.',
    } as Record<string, string>,
};

export const LEGAL_CATEGORIES = [
    'Administrative Law',
    'Antitrust Law',
    'Bankruptcy Law',
    'Civil Procedure',
    'Civil Rights',
    'Commercial Law',
    'Constitutional Law',
    'Contract Law',
    'Corporate Law',
    'Criminal Law',
    'Criminal Procedure',
    'Employment Law',
    'Environmental Law',
    'Evidence',
    'Family Law',
    'Health Law',
    'Immigration Law',
    'Insurance Law',
    'Intellectual Property',
    'International Law',
    'Labor Law',
    'Property Law',
    'Real Estate Law',
    'Securities Law',
    'Tax Law',
    'Tort Law',
    'Other',
] as const;

export const JURISDICTIONS = [
    'Federal',
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming', 'District of Columbia',
] as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a citation matches a filter
 */
export function matchesCitationFilter(citation: Citation, filter: CitationFilter): boolean {
    if (filter.type && citation.type !== filter.type) {
        return false;
    }
    
    if (filter.jurisdiction && citation.jurisdiction !== filter.jurisdiction) {
        return false;
    }
    
    if (filter.category && citation.category !== filter.category) {
        return false;
    }
    
    if (filter.court && citation.court !== filter.court) {
        return false;
    }
    
    if (filter.yearStart && citation.year && citation.year < filter.yearStart) {
        return false;
    }
    
    if (filter.yearEnd && citation.year && citation.year > filter.yearEnd) {
        return false;
    }
    
    if (filter.tags && filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some(tag => citation.tags.includes(tag));
        if (!hasMatchingTag) {
            return false;
        }
    }
    
    if (filter.isVerified !== undefined && citation.isVerified !== filter.isVerified) {
        return false;
    }
    
    if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const searchableText = [
            citation.title,
            citation.citation,
            citation.court || '',
            citation.category || '',
            ...citation.tags,
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Sort citations by a field
 */
export function sortCitations(citations: Citation[], sort: CitationSort): Citation[] {
    return [...citations].sort((a, b) => {
        let comparison = 0;
        
        switch (sort.field) {
            case 'title':
                comparison = a.title.localeCompare(b.title);
                break;
            case 'year':
                const aYear = a.year || 0;
                const bYear = b.year || 0;
                comparison = aYear - bYear;
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
 * Get unique tags from a list of citations
 */
export function getUniqueCitationTags(citations: Citation[]): string[] {
    const tagSet = new Set<string>();
    citations.forEach(citation => {
        citation.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
}

