/**
 * Unit tests for Court Formatting Types
 */

import { describe, it, expect } from 'vitest';
import {
    getDefaultFederalFont,
    getDefaultFederalMargins,
    getDefaultPageRequirements,
    inchesToCss,
    pointsToCss,
    formatPartyName,
    getPartySeparator,
    calculateWordCount,
    estimatePageCount,
    COURT_LEVELS,
    DOCUMENT_CATEGORIES,
    SERVICE_METHODS,
    STANDARD_FONTS,
} from './courtFormattingTypes';

describe('Court Formatting Types', () => {
    describe('getDefaultFederalFont', () => {
        it('should return default federal font settings', () => {
            const font = getDefaultFederalFont();
            
            expect(font.family).toContain('Times New Roman');
            expect(font.sizeBody).toBe(12);
            expect(font.sizeFootnotes).toBe(10);
            expect(font.lineHeight).toBe(2);
        });
    });

    describe('getDefaultFederalMargins', () => {
        it('should return 1 inch margins', () => {
            const margins = getDefaultFederalMargins();
            
            expect(margins.top).toBe(1);
            expect(margins.bottom).toBe(1);
            expect(margins.left).toBe(1);
            expect(margins.right).toBe(1);
        });
    });

    describe('getDefaultPageRequirements', () => {
        it('should return standard letter page settings', () => {
            const page = getDefaultPageRequirements();
            
            expect(page.size).toBe('letter');
            expect(page.orientation).toBe('portrait');
            expect(page.numbering).toBe('bottom-center');
            expect(page.numberingStartPage).toBe(2);
        });
    });

    describe('inchesToCss', () => {
        it('should convert inches to CSS inch units', () => {
            expect(inchesToCss(1)).toBe('1in');
            expect(inchesToCss(1.5)).toBe('1.5in');
            expect(inchesToCss(0.75)).toBe('0.75in');
        });
    });

    describe('pointsToCss', () => {
        it('should convert points to CSS point units', () => {
            expect(pointsToCss(12)).toBe('12pt');
            expect(pointsToCss(10)).toBe('10pt');
            expect(pointsToCss(14)).toBe('14pt');
        });
    });

    describe('formatPartyName', () => {
        it('should convert to uppercase when allCaps is true', () => {
            expect(formatPartyName('John Doe', true)).toBe('JOHN DOE');
            expect(formatPartyName('ABC Corporation', true)).toBe('ABC CORPORATION');
        });

        it('should preserve case when allCaps is false', () => {
            expect(formatPartyName('John Doe', false)).toBe('John Doe');
            expect(formatPartyName('ABC Corporation', false)).toBe('ABC Corporation');
        });
    });

    describe('getPartySeparator', () => {
        it('should return correct separator for each format', () => {
            expect(getPartySeparator('v')).toBe('v.');
            expect(getPartySeparator('vs')).toBe('vs.');
            expect(getPartySeparator('versus')).toBe('versus');
        });
    });

    describe('calculateWordCount', () => {
        it('should count words in plain text', () => {
            expect(calculateWordCount('Hello world')).toBe(2);
            expect(calculateWordCount('One two three four five')).toBe(5);
        });

        it('should strip HTML tags before counting', () => {
            expect(calculateWordCount('<p>Hello world</p>')).toBe(2);
            expect(calculateWordCount('<div><p>One</p><p>Two</p></div>')).toBe(2);
        });

        it('should handle empty content', () => {
            expect(calculateWordCount('')).toBe(0);
            expect(calculateWordCount('<p></p>')).toBe(0);
        });

        it('should normalize whitespace', () => {
            expect(calculateWordCount('Hello    world')).toBe(2);
            expect(calculateWordCount('  One  two  three  ')).toBe(3);
        });

        it('should handle complex HTML', () => {
            const html = '<h1>Title</h1><p>This is a <strong>bold</strong> statement.</p>';
            expect(calculateWordCount(html)).toBe(6); // Title This is a bold statement
        });
    });

    describe('estimatePageCount', () => {
        it('should estimate pages based on word count', () => {
            expect(estimatePageCount(250)).toBe(1);
            expect(estimatePageCount(500)).toBe(2);
            expect(estimatePageCount(750)).toBe(3);
        });

        it('should round up partial pages', () => {
            expect(estimatePageCount(251)).toBe(2);
            expect(estimatePageCount(100)).toBe(1);
        });

        it('should use custom words per page', () => {
            expect(estimatePageCount(300, 300)).toBe(1);
            expect(estimatePageCount(600, 300)).toBe(2);
        });
    });

    describe('Constants', () => {
        it('should have valid court levels', () => {
            expect(COURT_LEVELS.length).toBeGreaterThan(0);
            expect(COURT_LEVELS.find(l => l.value === 'supreme')).toBeTruthy();
            expect(COURT_LEVELS.find(l => l.value === 'district')).toBeTruthy();
        });

        it('should have valid document categories', () => {
            expect(DOCUMENT_CATEGORIES.length).toBeGreaterThan(0);
            expect(DOCUMENT_CATEGORIES.find(c => c.value === 'motion')).toBeTruthy();
            expect(DOCUMENT_CATEGORIES.find(c => c.value === 'brief')).toBeTruthy();
        });

        it('should have valid service methods', () => {
            expect(SERVICE_METHODS.length).toBeGreaterThan(0);
            expect(SERVICE_METHODS.find(m => m.value === 'ecf')).toBeTruthy();
            expect(SERVICE_METHODS.find(m => m.value === 'mail')).toBeTruthy();
        });

        it('should have standard fonts', () => {
            expect(STANDARD_FONTS).toContain('Times New Roman');
            expect(STANDARD_FONTS).toContain('Arial');
        });
    });
});

