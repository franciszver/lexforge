import { describe, it, expect } from 'vitest';
import {
    formatCitation,
    buildCitationString,
    parseCitationString,
    validateCitation,
    citationToHtml,
} from './citationFormatter';
import { Citation } from './citationTypes';

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
    volume: '347',
    reporter: 'U.S.',
    page: '483',
    pinpoint: '495',
    tags: [],
    usageCount: 0,
    isVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
});

// ============================================
// Tests: formatCitation
// ============================================

describe('formatCitation', () => {
    describe('Bluebook Style - Cases', () => {
        it('should format a Supreme Court case correctly', () => {
            const citation = createMockCitation();
            const formatted = formatCitation(citation, 'bluebook');
            
            expect(formatted.full).toContain('Brown v. Board of Education');
            expect(formatted.full).toContain('347 U.S. 483');
            expect(formatted.full).toContain('1954');
        });

        it('should format case with pinpoint citation', () => {
            const citation = createMockCitation({ pinpoint: '495' });
            const formatted = formatCitation(citation, 'bluebook');
            
            expect(formatted.full).toContain('495');
        });

        it('should format case with parenthetical', () => {
            const citation = createMockCitation({
                parenthetical: 'holding that separate but equal is unconstitutional',
            });
            const formatted = formatCitation(citation, 'bluebook');
            
            expect(formatted.full).toContain('holding that separate but equal is unconstitutional');
        });

        it('should generate short form citation', () => {
            const citation = createMockCitation();
            const formatted = formatCitation(citation, 'bluebook');
            
            expect(formatted.short).toBeTruthy();
            expect(formatted.short.length).toBeLessThan(formatted.full.length);
        });

        it('should format Circuit Court case with court designation', () => {
            const citation = createMockCitation({
                title: 'Smith v. Jones',
                citation: 'Smith v. Jones, 500 F.3d 100 (9th Cir. 2020)',
                court: 'U.S. Court of Appeals for the Ninth Circuit',
                year: 2020,
                volume: '500',
                reporter: 'F.3d',
                page: '100',
            });
            const formatted = formatCitation(citation, 'bluebook');
            
            expect(formatted.full).toContain('9th Cir.');
            expect(formatted.full).toContain('2020');
        });
    });

    describe('Bluebook Style - Statutes', () => {
        it('should format a U.S.C. citation', () => {
            const citation = createMockCitation({
                type: 'statute',
                title: 'Civil Rights Act',
                citation: '42 U.S.C. 1983',
                codeTitle: '42 U.S.C.',
                section: '1983',
                year: 2023,
            });
            const formatted = formatCitation(citation, 'bluebook');
            
            expect(formatted.full).toContain('42 U.S.C.');
            expect(formatted.full).toContain('1983');
        });

        it('should format statute with subdivision', () => {
            const citation = createMockCitation({
                type: 'statute',
                title: 'Tax Code',
                citation: '26 U.S.C. 501(c)(3)',
                codeTitle: '26 U.S.C.',
                section: '501',
                subdivision: 'c)(3',
            });
            const formatted = formatCitation(citation, 'bluebook');
            
            expect(formatted.full).toContain('501');
        });
    });

    describe('Bluebook Style - Regulations', () => {
        it('should format a C.F.R. citation', () => {
            const citation = createMockCitation({
                type: 'regulation',
                title: 'Environmental Protection',
                citation: '40 C.F.R. 60.1',
                codeTitle: '40 C.F.R.',
                section: '60.1',
            });
            const formatted = formatCitation(citation, 'bluebook');
            
            expect(formatted.full).toContain('40 C.F.R.');
            expect(formatted.full).toContain('60.1');
        });
    });

    describe('ALWD Style', () => {
        it('should format case similarly to Bluebook', () => {
            const citation = createMockCitation();
            const bluebook = formatCitation(citation, 'bluebook');
            const alwd = formatCitation(citation, 'alwd');
            
            // ALWD is similar to Bluebook for basic cases
            expect(alwd.full).toContain('Brown v. Board of Education');
            expect(alwd.full).toContain('347 U.S. 483');
        });
    });

    describe('Fallback', () => {
        it('should return original citation for unknown types', () => {
            const citation = createMockCitation({
                type: 'treaty',
                citation: 'Some Treaty Citation',
            });
            const formatted = formatCitation(citation, 'bluebook');
            
            expect(formatted.full).toBe('Some Treaty Citation');
        });
    });
});

// ============================================
// Tests: buildCitationString
// ============================================

describe('buildCitationString', () => {
    it('should build case citation from components', () => {
        const result = buildCitationString({
            type: 'case',
            title: 'Roe v. Wade',
            volume: '410',
            reporter: 'U.S.',
            page: '113',
            year: 1973,
        });
        
        expect(result).toContain('Roe v. Wade');
        expect(result).toContain('410 U.S. 113');
        expect(result).toContain('1973');
    });

    it('should build statute citation from components', () => {
        const result = buildCitationString({
            type: 'statute',
            codeTitle: '42 U.S.C.',
            section: '1983',
        });
        
        expect(result).toContain('42 U.S.C.');
        expect(result).toContain('1983');
    });

    it('should build statute citation with year', () => {
        const result = buildCitationString({
            type: 'statute',
            codeTitle: '42 U.S.C.',
            section: '1983',
            year: 2023,
        });
        
        expect(result).toContain('2023');
    });

    it('should build regulation citation', () => {
        const result = buildCitationString({
            type: 'regulation',
            codeTitle: '40 C.F.R.',
            section: '60.1',
        });
        
        expect(result).toContain('40 C.F.R.');
        expect(result).toContain('60.1');
    });

    it('should return empty for missing components', () => {
        const result = buildCitationString({
            type: 'case',
        });
        
        expect(result).toBe('');
    });
});

// ============================================
// Tests: parseCitationString
// ============================================

describe('parseCitationString', () => {
    it('should parse a case citation', () => {
        const result = parseCitationString('Brown v. Board of Education, 347 U.S. 483 (1954)');
        
        expect(result.type).toBe('case');
        expect(result.title).toBe('Brown v. Board of Education');
        expect(result.volume).toBe('347');
        expect(result.reporter).toBe('U.S.');
        expect(result.page).toBe('483');
        expect(result.year).toBe(1954);
    });

    it('should parse a federal circuit case citation', () => {
        const result = parseCitationString('Smith v. Jones, 500 F.3d 100 (9th Cir. 2020)');
        
        expect(result.type).toBe('case');
        expect(result.title).toBe('Smith v. Jones');
        expect(result.volume).toBe('500');
        expect(result.reporter).toBe('F.3d');
        expect(result.page).toBe('100');
        expect(result.court).toBe('9th Cir.');
        expect(result.year).toBe(2020);
    });

    it('should parse a U.S.C. citation', () => {
        const result = parseCitationString('42 U.S.C. 1983');
        
        expect(result.type).toBe('statute');
        expect(result.codeTitle).toBe('42 U.S.C.');
        expect(result.section).toBe('1983');
    });

    it('should parse a C.F.R. citation', () => {
        const result = parseCitationString('40 C.F.R. 60.1');
        
        expect(result.type).toBe('regulation');
        expect(result.codeTitle).toBe('40 C.F.R.');
        expect(result.section).toBe('60.1');
    });

    it('should detect constitutional citations', () => {
        const result = parseCitationString('U.S. Const. art. I, Section 8');
        
        expect(result.type).toBe('constitution');
    });

    it('should default to secondary for unknown formats', () => {
        const result = parseCitationString('Some Random Text');
        
        expect(result.type).toBe('secondary');
    });
});

// ============================================
// Tests: validateCitation
// ============================================

describe('validateCitation', () => {
    it('should validate a complete citation', () => {
        const citation = createMockCitation();
        const result = validateCitation(citation);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should require title', () => {
        const result = validateCitation({
            citation: 'Some citation',
            type: 'case',
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Title is required');
    });

    it('should require citation string', () => {
        const result = validateCitation({
            title: 'Some Title',
            type: 'case',
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Citation string is required');
    });

    it('should require type', () => {
        const result = validateCitation({
            title: 'Some Title',
            citation: 'Some citation',
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Citation type is required');
    });

    it('should warn about missing year for cases', () => {
        const result = validateCitation({
            title: 'Some Title',
            citation: 'Some citation',
            type: 'case',
        });
        
        expect(result.errors).toContain('Year is recommended for case citations');
    });
});

// ============================================
// Tests: citationToHtml
// ============================================

describe('citationToHtml', () => {
    it('should italicize case names', () => {
        const citation = createMockCitation({
            title: 'Brown v. Board of Education',
        });
        const html = citationToHtml(citation, 'bluebook');
        
        expect(html).toContain('<em>Brown v. Board of Education</em>');
    });

    it('should not italicize non-case citations', () => {
        const citation = createMockCitation({
            type: 'statute',
            title: 'Civil Rights Act',
            citation: '42 U.S.C. 1983',
        });
        const html = citationToHtml(citation, 'bluebook');
        
        expect(html).not.toContain('<em>');
    });
});

