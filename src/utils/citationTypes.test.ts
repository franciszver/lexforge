import { describe, it, expect } from 'vitest';
import {
    Citation,
    CitationFilter,
    CitationSort,
    matchesCitationFilter,
    sortCitations,
    getUniqueCitationTags,
    CITATION_TYPES,
    LEGAL_CATEGORIES,
    JURISDICTIONS,
    FEDERAL_REPORTERS,
    COURTS,
} from './citationTypes';

// ============================================
// Test Data
// ============================================

const createMockCitation = (overrides: Partial<Citation> = {}): Citation => ({
    id: 'cite-1',
    title: 'Brown v. Board of Education',
    citation: 'Brown v. Board of Education, 347 U.S. 483 (1954)',
    type: 'case',
    court: 'Supreme Court of the United States',
    year: 1954,
    jurisdiction: 'Federal',
    category: 'Constitutional Law',
    tags: ['civil rights', 'education', 'landmark'],
    usageCount: 100,
    lastUsedAt: '2024-01-15T10:00:00Z',
    isVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    ...overrides,
});

const mockCitations: Citation[] = [
    createMockCitation({ id: 'cite-1', title: 'Alpha Case', year: 1950, usageCount: 50 }),
    createMockCitation({ id: 'cite-2', title: 'Beta Case', year: 1960, usageCount: 30, type: 'statute' }),
    createMockCitation({ id: 'cite-3', title: 'Gamma Case', year: 1970, usageCount: 20, jurisdiction: 'California' }),
    createMockCitation({ id: 'cite-4', title: 'Delta Case', year: 1980, usageCount: 10, isVerified: false }),
    createMockCitation({ id: 'cite-5', title: 'Epsilon Case', year: 1990, usageCount: 40, category: 'Contract Law' }),
];

// ============================================
// Tests: matchesCitationFilter
// ============================================

describe('matchesCitationFilter', () => {
    it('should match citation with no filter', () => {
        const citation = createMockCitation();
        const filter: CitationFilter = {};
        expect(matchesCitationFilter(citation, filter)).toBe(true);
    });

    it('should filter by type', () => {
        const citation = createMockCitation({ type: 'case' });
        
        expect(matchesCitationFilter(citation, { type: 'case' })).toBe(true);
        expect(matchesCitationFilter(citation, { type: 'statute' })).toBe(false);
    });

    it('should filter by jurisdiction', () => {
        const citation = createMockCitation({ jurisdiction: 'Federal' });
        
        expect(matchesCitationFilter(citation, { jurisdiction: 'Federal' })).toBe(true);
        expect(matchesCitationFilter(citation, { jurisdiction: 'California' })).toBe(false);
    });

    it('should filter by category', () => {
        const citation = createMockCitation({ category: 'Constitutional Law' });
        
        expect(matchesCitationFilter(citation, { category: 'Constitutional Law' })).toBe(true);
        expect(matchesCitationFilter(citation, { category: 'Contract Law' })).toBe(false);
    });

    it('should filter by court', () => {
        const citation = createMockCitation({ court: 'Supreme Court of the United States' });
        
        expect(matchesCitationFilter(citation, { court: 'Supreme Court of the United States' })).toBe(true);
        expect(matchesCitationFilter(citation, { court: 'U.S. Court of Appeals for the Ninth Circuit' })).toBe(false);
    });

    it('should filter by year range', () => {
        const citation = createMockCitation({ year: 1954 });
        
        expect(matchesCitationFilter(citation, { yearStart: 1950 })).toBe(true);
        expect(matchesCitationFilter(citation, { yearStart: 1960 })).toBe(false);
        expect(matchesCitationFilter(citation, { yearEnd: 1960 })).toBe(true);
        expect(matchesCitationFilter(citation, { yearEnd: 1950 })).toBe(false);
    });

    it('should filter by tags (any match)', () => {
        const citation = createMockCitation({ tags: ['civil rights', 'education'] });
        
        expect(matchesCitationFilter(citation, { tags: ['civil rights'] })).toBe(true);
        expect(matchesCitationFilter(citation, { tags: ['civil rights', 'criminal'] })).toBe(true); // civil rights matches
        expect(matchesCitationFilter(citation, { tags: ['criminal', 'tax'] })).toBe(false);
    });

    it('should filter by verified status', () => {
        const verifiedCitation = createMockCitation({ isVerified: true });
        const unverifiedCitation = createMockCitation({ isVerified: false });
        
        expect(matchesCitationFilter(verifiedCitation, { isVerified: true })).toBe(true);
        expect(matchesCitationFilter(verifiedCitation, { isVerified: false })).toBe(false);
        expect(matchesCitationFilter(unverifiedCitation, { isVerified: false })).toBe(true);
    });

    it('should filter by search query in title', () => {
        const citation = createMockCitation({ title: 'Brown v. Board of Education' });
        
        expect(matchesCitationFilter(citation, { searchQuery: 'brown' })).toBe(true);
        expect(matchesCitationFilter(citation, { searchQuery: 'BOARD' })).toBe(true); // case insensitive
        expect(matchesCitationFilter(citation, { searchQuery: 'roe' })).toBe(false);
    });

    it('should filter by search query in citation string', () => {
        const citation = createMockCitation({ citation: '347 U.S. 483' });
        
        expect(matchesCitationFilter(citation, { searchQuery: '347' })).toBe(true);
        expect(matchesCitationFilter(citation, { searchQuery: 'F.3d' })).toBe(false);
    });

    it('should filter by search query in tags', () => {
        const citation = createMockCitation({ tags: ['landmark', 'civil rights'] });
        
        expect(matchesCitationFilter(citation, { searchQuery: 'landmark' })).toBe(true);
        expect(matchesCitationFilter(citation, { searchQuery: 'criminal' })).toBe(false);
    });

    it('should combine multiple filters (AND logic)', () => {
        const citation = createMockCitation({
            type: 'case',
            jurisdiction: 'Federal',
            category: 'Constitutional Law',
        });
        
        expect(matchesCitationFilter(citation, { 
            type: 'case',
            jurisdiction: 'Federal',
        })).toBe(true);
        
        expect(matchesCitationFilter(citation, { 
            type: 'case',
            jurisdiction: 'California', // doesn't match
        })).toBe(false);
    });
});

// ============================================
// Tests: sortCitations
// ============================================

describe('sortCitations', () => {
    it('should sort by title ascending', () => {
        const sorted = sortCitations(mockCitations, { field: 'title', direction: 'asc' });
        
        expect(sorted[0].title).toBe('Alpha Case');
        expect(sorted[1].title).toBe('Beta Case');
        expect(sorted[4].title).toBe('Gamma Case');
    });

    it('should sort by title descending', () => {
        const sorted = sortCitations(mockCitations, { field: 'title', direction: 'desc' });
        
        expect(sorted[0].title).toBe('Gamma Case');
        expect(sorted[4].title).toBe('Alpha Case');
    });

    it('should sort by year ascending', () => {
        const sorted = sortCitations(mockCitations, { field: 'year', direction: 'asc' });
        
        expect(sorted[0].year).toBe(1950);
        expect(sorted[4].year).toBe(1990);
    });

    it('should sort by year descending', () => {
        const sorted = sortCitations(mockCitations, { field: 'year', direction: 'desc' });
        
        expect(sorted[0].year).toBe(1990);
        expect(sorted[4].year).toBe(1950);
    });

    it('should sort by usage count descending', () => {
        const sorted = sortCitations(mockCitations, { field: 'usageCount', direction: 'desc' });
        
        expect(sorted[0].usageCount).toBe(50);
        expect(sorted[1].usageCount).toBe(40);
        expect(sorted[4].usageCount).toBe(10);
    });

    it('should sort by created date', () => {
        const citations = [
            createMockCitation({ id: '1', createdAt: '2024-01-15T00:00:00Z' }),
            createMockCitation({ id: '2', createdAt: '2024-01-10T00:00:00Z' }),
            createMockCitation({ id: '3', createdAt: '2024-01-20T00:00:00Z' }),
        ];
        
        const sorted = sortCitations(citations, { field: 'createdAt', direction: 'desc' });
        
        expect(sorted[0].id).toBe('3');
        expect(sorted[1].id).toBe('1');
        expect(sorted[2].id).toBe('2');
    });

    it('should not mutate original array', () => {
        const original = [...mockCitations];
        sortCitations(mockCitations, { field: 'title', direction: 'desc' });
        
        expect(mockCitations[0]).toBe(original[0]);
    });

    it('should handle citations without year', () => {
        const citations = [
            createMockCitation({ id: '1', year: 1950 }),
            createMockCitation({ id: '2', year: undefined }),
            createMockCitation({ id: '3', year: 1970 }),
        ];
        
        const sorted = sortCitations(citations, { field: 'year', direction: 'asc' });
        
        // Citation without year should come first (year = 0)
        expect(sorted[0].id).toBe('2');
        expect(sorted[1].id).toBe('1');
        expect(sorted[2].id).toBe('3');
    });
});

// ============================================
// Tests: getUniqueCitationTags
// ============================================

describe('getUniqueCitationTags', () => {
    it('should return unique tags from all citations', () => {
        const citations = [
            createMockCitation({ tags: ['tag1', 'tag2'] }),
            createMockCitation({ tags: ['tag2', 'tag3'] }),
            createMockCitation({ tags: ['tag1', 'tag4'] }),
        ];
        
        const tags = getUniqueCitationTags(citations);
        
        expect(tags).toHaveLength(4);
        expect(tags).toContain('tag1');
        expect(tags).toContain('tag2');
        expect(tags).toContain('tag3');
        expect(tags).toContain('tag4');
    });

    it('should return sorted tags', () => {
        const citations = [
            createMockCitation({ tags: ['zebra', 'apple'] }),
            createMockCitation({ tags: ['banana'] }),
        ];
        
        const tags = getUniqueCitationTags(citations);
        
        expect(tags[0]).toBe('apple');
        expect(tags[1]).toBe('banana');
        expect(tags[2]).toBe('zebra');
    });

    it('should return empty array for citations with no tags', () => {
        const citations = [
            createMockCitation({ tags: [] }),
            createMockCitation({ tags: [] }),
        ];
        
        const tags = getUniqueCitationTags(citations);
        
        expect(tags).toHaveLength(0);
    });

    it('should return empty array for empty citation list', () => {
        const tags = getUniqueCitationTags([]);
        expect(tags).toHaveLength(0);
    });
});

// ============================================
// Tests: Constants
// ============================================

describe('Constants', () => {
    it('should have citation types', () => {
        expect(CITATION_TYPES.length).toBe(6);
        expect(CITATION_TYPES.map(t => t.value)).toContain('case');
        expect(CITATION_TYPES.map(t => t.value)).toContain('statute');
        expect(CITATION_TYPES.map(t => t.value)).toContain('regulation');
    });

    it('should have legal categories', () => {
        expect(LEGAL_CATEGORIES.length).toBeGreaterThan(20);
        expect(LEGAL_CATEGORIES).toContain('Constitutional Law');
        expect(LEGAL_CATEGORIES).toContain('Contract Law');
        expect(LEGAL_CATEGORIES).toContain('Criminal Law');
    });

    it('should have jurisdictions', () => {
        expect(JURISDICTIONS.length).toBeGreaterThan(50);
        expect(JURISDICTIONS).toContain('Federal');
        expect(JURISDICTIONS).toContain('California');
        expect(JURISDICTIONS).toContain('New York');
    });

    it('should have federal reporters', () => {
        expect(FEDERAL_REPORTERS.length).toBeGreaterThan(10);
        expect(FEDERAL_REPORTERS).toContain('U.S.');
        expect(FEDERAL_REPORTERS).toContain('F.3d');
        expect(FEDERAL_REPORTERS).toContain('S. Ct.');
    });

    it('should have court abbreviations', () => {
        expect(COURTS.federal.length).toBeGreaterThan(10);
        expect(COURTS.abbreviations['U.S. Court of Appeals for the Ninth Circuit']).toBe('9th Cir.');
        expect(COURTS.abbreviations['Supreme Court of the United States']).toBe('');
    });
});

