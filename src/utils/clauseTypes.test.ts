import { describe, it, expect } from 'vitest';
import {
    Clause,
    ClauseFilter,
    ClauseSort,
    matchesFilter,
    sortClauses,
    getUniqueTags,
    getClauseForJurisdiction,
    CLAUSE_CATEGORIES,
    JURISDICTIONS,
    DOCUMENT_TYPES,
} from './clauseTypes';

// ============================================
// Test Data
// ============================================

const createMockClause = (overrides: Partial<Clause> = {}): Clause => ({
    id: 'clause-1',
    title: 'Standard Indemnification',
    content: '<p>Party A shall indemnify Party B...</p>',
    description: 'Standard indemnification clause for contracts',
    category: 'Indemnification',
    subcategory: 'Mutual',
    tags: ['standard', 'contract', 'business'],
    jurisdiction: 'California',
    documentTypes: ['Contract', 'Agreement'],
    usageCount: 10,
    lastUsedAt: '2024-01-15T10:00:00Z',
    variations: [
        { jurisdiction: 'New York', content: '<p>NY specific content...</p>', notes: 'NY version' },
        { jurisdiction: 'Texas', content: '<p>TX specific content...</p>' },
    ],
    author: 'admin',
    isPublished: true,
    isFavorite: false,
    notes: 'Internal notes',
    placeholders: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    ...overrides,
});

const mockClauses: Clause[] = [
    createMockClause({ id: 'clause-1', title: 'Alpha Clause', category: 'Indemnification', usageCount: 50 }),
    createMockClause({ id: 'clause-2', title: 'Beta Clause', category: 'Confidentiality', usageCount: 30, jurisdiction: 'New York' }),
    createMockClause({ id: 'clause-3', title: 'Gamma Clause', category: 'Termination', usageCount: 20, tags: ['enterprise'] }),
    createMockClause({ id: 'clause-4', title: 'Delta Clause', category: 'Indemnification', usageCount: 10, isPublished: false }),
    createMockClause({ id: 'clause-5', title: 'Epsilon Clause', category: 'Confidentiality', usageCount: 40, documentTypes: ['NDA'] }),
];

// ============================================
// Tests: matchesFilter
// ============================================

describe('matchesFilter', () => {
    it('should match clause with no filter', () => {
        const clause = createMockClause();
        const filter: ClauseFilter = {};
        expect(matchesFilter(clause, filter)).toBe(true);
    });

    it('should filter by category', () => {
        const clause = createMockClause({ category: 'Indemnification' });
        
        expect(matchesFilter(clause, { category: 'Indemnification' })).toBe(true);
        expect(matchesFilter(clause, { category: 'Confidentiality' })).toBe(false);
    });

    it('should filter by subcategory', () => {
        const clause = createMockClause({ subcategory: 'Mutual' });
        
        expect(matchesFilter(clause, { subcategory: 'Mutual' })).toBe(true);
        expect(matchesFilter(clause, { subcategory: 'One-way' })).toBe(false);
    });

    it('should filter by jurisdiction', () => {
        const clause = createMockClause({ jurisdiction: 'California' });
        
        expect(matchesFilter(clause, { jurisdiction: 'California' })).toBe(true);
        expect(matchesFilter(clause, { jurisdiction: 'New York' })).toBe(false);
    });

    it('should filter by document type', () => {
        const clause = createMockClause({ documentTypes: ['Contract', 'Agreement'] });
        
        expect(matchesFilter(clause, { documentType: 'Contract' })).toBe(true);
        expect(matchesFilter(clause, { documentType: 'NDA' })).toBe(false);
    });

    it('should filter by tags (any match)', () => {
        const clause = createMockClause({ tags: ['standard', 'contract', 'business'] });
        
        expect(matchesFilter(clause, { tags: ['standard'] })).toBe(true);
        expect(matchesFilter(clause, { tags: ['standard', 'enterprise'] })).toBe(true); // standard matches
        expect(matchesFilter(clause, { tags: ['enterprise', 'custom'] })).toBe(false);
    });

    it('should filter by published status', () => {
        const publishedClause = createMockClause({ isPublished: true });
        const draftClause = createMockClause({ isPublished: false });
        
        expect(matchesFilter(publishedClause, { isPublished: true })).toBe(true);
        expect(matchesFilter(publishedClause, { isPublished: false })).toBe(false);
        expect(matchesFilter(draftClause, { isPublished: false })).toBe(true);
    });

    it('should filter by favorite status', () => {
        const favoriteClause = createMockClause({ isFavorite: true });
        const regularClause = createMockClause({ isFavorite: false });
        
        expect(matchesFilter(favoriteClause, { isFavorite: true })).toBe(true);
        expect(matchesFilter(regularClause, { isFavorite: true })).toBe(false);
    });

    it('should filter by search query in title', () => {
        const clause = createMockClause({ title: 'Standard Indemnification Clause' });
        
        expect(matchesFilter(clause, { searchQuery: 'indemnification' })).toBe(true);
        expect(matchesFilter(clause, { searchQuery: 'STANDARD' })).toBe(true); // case insensitive
        expect(matchesFilter(clause, { searchQuery: 'confidentiality' })).toBe(false);
    });

    it('should filter by search query in description', () => {
        const clause = createMockClause({ description: 'Protects against liability claims' });
        
        expect(matchesFilter(clause, { searchQuery: 'liability' })).toBe(true);
        expect(matchesFilter(clause, { searchQuery: 'intellectual property' })).toBe(false);
    });

    it('should filter by search query in tags', () => {
        const clause = createMockClause({ tags: ['enterprise', 'premium'] });
        
        expect(matchesFilter(clause, { searchQuery: 'enterprise' })).toBe(true);
        expect(matchesFilter(clause, { searchQuery: 'basic' })).toBe(false);
    });

    it('should combine multiple filters (AND logic)', () => {
        const clause = createMockClause({
            category: 'Indemnification',
            jurisdiction: 'California',
            isPublished: true,
        });
        
        expect(matchesFilter(clause, { 
            category: 'Indemnification',
            jurisdiction: 'California',
        })).toBe(true);
        
        expect(matchesFilter(clause, { 
            category: 'Indemnification',
            jurisdiction: 'New York', // doesn't match
        })).toBe(false);
    });
});

// ============================================
// Tests: sortClauses
// ============================================

describe('sortClauses', () => {
    it('should sort by title ascending', () => {
        const sorted = sortClauses(mockClauses, { field: 'title', direction: 'asc' });
        
        expect(sorted[0].title).toBe('Alpha Clause');
        expect(sorted[1].title).toBe('Beta Clause');
        expect(sorted[2].title).toBe('Delta Clause');
        expect(sorted[3].title).toBe('Epsilon Clause');
        expect(sorted[4].title).toBe('Gamma Clause');
    });

    it('should sort by title descending', () => {
        const sorted = sortClauses(mockClauses, { field: 'title', direction: 'desc' });
        
        expect(sorted[0].title).toBe('Gamma Clause');
        expect(sorted[1].title).toBe('Epsilon Clause');
        expect(sorted[4].title).toBe('Alpha Clause');
    });

    it('should sort by category', () => {
        const sorted = sortClauses(mockClauses, { field: 'category', direction: 'asc' });
        
        expect(sorted[0].category).toBe('Confidentiality');
        expect(sorted[1].category).toBe('Confidentiality');
        expect(sorted[4].category).toBe('Termination');
    });

    it('should sort by usage count descending', () => {
        const sorted = sortClauses(mockClauses, { field: 'usageCount', direction: 'desc' });
        
        expect(sorted[0].usageCount).toBe(50);
        expect(sorted[1].usageCount).toBe(40);
        expect(sorted[4].usageCount).toBe(10);
    });

    it('should sort by usage count ascending', () => {
        const sorted = sortClauses(mockClauses, { field: 'usageCount', direction: 'asc' });
        
        expect(sorted[0].usageCount).toBe(10);
        expect(sorted[4].usageCount).toBe(50);
    });

    it('should sort by created date', () => {
        const clauses = [
            createMockClause({ id: '1', createdAt: '2024-01-15T00:00:00Z' }),
            createMockClause({ id: '2', createdAt: '2024-01-10T00:00:00Z' }),
            createMockClause({ id: '3', createdAt: '2024-01-20T00:00:00Z' }),
        ];
        
        const sorted = sortClauses(clauses, { field: 'createdAt', direction: 'desc' });
        
        expect(sorted[0].id).toBe('3');
        expect(sorted[1].id).toBe('1');
        expect(sorted[2].id).toBe('2');
    });

    it('should not mutate original array', () => {
        const original = [...mockClauses];
        sortClauses(mockClauses, { field: 'title', direction: 'desc' });
        
        expect(mockClauses[0]).toBe(original[0]);
    });
});

// ============================================
// Tests: getUniqueTags
// ============================================

describe('getUniqueTags', () => {
    it('should return unique tags from all clauses', () => {
        const clauses = [
            createMockClause({ tags: ['tag1', 'tag2'] }),
            createMockClause({ tags: ['tag2', 'tag3'] }),
            createMockClause({ tags: ['tag1', 'tag4'] }),
        ];
        
        const tags = getUniqueTags(clauses);
        
        expect(tags).toHaveLength(4);
        expect(tags).toContain('tag1');
        expect(tags).toContain('tag2');
        expect(tags).toContain('tag3');
        expect(tags).toContain('tag4');
    });

    it('should return sorted tags', () => {
        const clauses = [
            createMockClause({ tags: ['zebra', 'apple'] }),
            createMockClause({ tags: ['banana'] }),
        ];
        
        const tags = getUniqueTags(clauses);
        
        expect(tags[0]).toBe('apple');
        expect(tags[1]).toBe('banana');
        expect(tags[2]).toBe('zebra');
    });

    it('should return empty array for clauses with no tags', () => {
        const clauses = [
            createMockClause({ tags: [] }),
            createMockClause({ tags: [] }),
        ];
        
        const tags = getUniqueTags(clauses);
        
        expect(tags).toHaveLength(0);
    });

    it('should return empty array for empty clause list', () => {
        const tags = getUniqueTags([]);
        expect(tags).toHaveLength(0);
    });
});

// ============================================
// Tests: getClauseForJurisdiction
// ============================================

describe('getClauseForJurisdiction', () => {
    it('should return variation content when jurisdiction matches', () => {
        const clause = createMockClause({
            content: '<p>Default content</p>',
            variations: [
                { jurisdiction: 'New York', content: '<p>NY specific</p>' },
                { jurisdiction: 'Texas', content: '<p>TX specific</p>' },
            ],
        });
        
        const content = getClauseForJurisdiction(clause, 'New York');
        
        expect(content).toBe('<p>NY specific</p>');
    });

    it('should return default content when no variation matches', () => {
        const clause = createMockClause({
            content: '<p>Default content</p>',
            variations: [
                { jurisdiction: 'New York', content: '<p>NY specific</p>' },
            ],
        });
        
        const content = getClauseForJurisdiction(clause, 'California');
        
        expect(content).toBe('<p>Default content</p>');
    });

    it('should return default content when no variations exist', () => {
        const clause = createMockClause({
            content: '<p>Default content</p>',
            variations: [],
        });
        
        const content = getClauseForJurisdiction(clause, 'New York');
        
        expect(content).toBe('<p>Default content</p>');
    });
});

// ============================================
// Tests: Constants
// ============================================

describe('Constants', () => {
    it('should have clause categories', () => {
        expect(CLAUSE_CATEGORIES.length).toBeGreaterThan(10);
        expect(CLAUSE_CATEGORIES).toContain('Indemnification');
        expect(CLAUSE_CATEGORIES).toContain('Confidentiality');
        expect(CLAUSE_CATEGORIES).toContain('Termination');
    });

    it('should have jurisdictions', () => {
        expect(JURISDICTIONS.length).toBeGreaterThan(50);
        expect(JURISDICTIONS).toContain('Federal');
        expect(JURISDICTIONS).toContain('California');
        expect(JURISDICTIONS).toContain('New York');
    });

    it('should have document types', () => {
        expect(DOCUMENT_TYPES.length).toBeGreaterThan(10);
        expect(DOCUMENT_TYPES).toContain('Contract');
        expect(DOCUMENT_TYPES).toContain('NDA');
        expect(DOCUMENT_TYPES).toContain('Agreement');
    });
});

