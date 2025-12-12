/**
 * Unit tests for Document Formatter Service
 */

import { describe, it, expect } from 'vitest';
import {
    generateCaption,
    generateSignatureBlock,
    generateCertificateOfService,
    generateTableOfContents,
    generateTableOfAuthorities,
    generateDocumentStyles,
    validateCompliance,
    formatDocument,
    generateFullHtml,
    extractHeadings,
    generateWordCountDeclaration,
} from './documentFormatter';
import type { CaptionData, AttorneyInfo, ServiceInfo, CourtFormattingRules } from './courtFormattingTypes';
import { getCourtById } from './courtRulesDatabase';

// Helper to get a sample court for testing
const getSampleCourt = (): CourtFormattingRules => {
    return getCourtById('ndcal')!;
};

// Sample caption data
const getSampleCaptionData = (): CaptionData => ({
    courtName: 'United States District Court for the Northern District of California',
    caseNumber: '3:24-cv-01234-JST',
    plaintiffs: [
        { name: 'ABC Corporation', role: 'plaintiff', isLeadParty: true },
        { name: 'Jane Smith', role: 'plaintiff', isLeadParty: false },
    ],
    defendants: [
        { name: 'XYZ Industries', role: 'defendant', isLeadParty: true },
    ],
    documentTitle: 'Motion for Summary Judgment',
    judgeName: 'Jon S. Tigar',
});

// Sample attorney info
const getSampleAttorney = (): AttorneyInfo => ({
    name: 'John Doe',
    barNumber: '123456',
    barState: 'California',
    firmName: 'Doe & Associates LLP',
    address: ['123 Main Street, Suite 100', 'San Francisco, CA 94102'],
    phone: '(415) 555-1234',
    fax: '(415) 555-1235',
    email: 'jdoe@doelaw.com',
    representingParty: 'Plaintiff ABC Corporation',
});

// Sample service info
const getSampleServices = (): ServiceInfo[] => [
    {
        method: 'ecf',
        recipientName: 'Jane Attorney',
        recipientEmail: 'jattorney@lawfirm.com',
        date: '2024-01-15',
    },
];

describe('Document Formatter', () => {
    describe('generateCaption', () => {
        it('should generate caption with court name', () => {
            const court = getSampleCourt();
            const data = getSampleCaptionData();
            const caption = generateCaption(data, court);

            expect(caption).toContain(data.courtName.toUpperCase());
        });

        it('should include case number', () => {
            const court = getSampleCourt();
            const data = getSampleCaptionData();
            const caption = generateCaption(data, court);

            expect(caption).toContain(data.caseNumber);
        });

        it('should include plaintiff names', () => {
            const court = getSampleCourt();
            const data = getSampleCaptionData();
            const caption = generateCaption(data, court);

            expect(caption).toContain('ABC CORPORATION');
        });

        it('should include defendant names', () => {
            const court = getSampleCourt();
            const data = getSampleCaptionData();
            const caption = generateCaption(data, court);

            expect(caption).toContain('XYZ INDUSTRIES');
        });

        it('should include document title', () => {
            const court = getSampleCourt();
            const data = getSampleCaptionData();
            const caption = generateCaption(data, court);

            expect(caption).toContain(data.documentTitle.toUpperCase());
        });

        it('should include judge name when required', () => {
            const court = getSampleCourt();
            const data = getSampleCaptionData();
            const caption = generateCaption(data, court);

            expect(caption).toContain(data.judgeName);
        });
    });

    describe('generateSignatureBlock', () => {
        it('should include attorney name', () => {
            const court = getSampleCourt();
            const attorney = getSampleAttorney();
            const signature = generateSignatureBlock(attorney, court);

            expect(signature).toContain(attorney.name);
        });

        it('should include bar number', () => {
            const court = getSampleCourt();
            const attorney = getSampleAttorney();
            const signature = generateSignatureBlock(attorney, court);

            expect(signature).toContain(attorney.barNumber);
        });

        it('should include firm name', () => {
            const court = getSampleCourt();
            const attorney = getSampleAttorney();
            const signature = generateSignatureBlock(attorney, court);

            expect(signature).toContain(attorney.firmName);
        });

        it('should include contact information', () => {
            const court = getSampleCourt();
            const attorney = getSampleAttorney();
            const signature = generateSignatureBlock(attorney, court);

            expect(signature).toContain(attorney.phone);
            expect(signature).toContain(attorney.email);
        });

        it('should include representing party', () => {
            const court = getSampleCourt();
            const attorney = getSampleAttorney();
            const signature = generateSignatureBlock(attorney, court);

            expect(signature).toContain(attorney.representingParty);
        });
    });

    describe('generateCertificateOfService', () => {
        it('should include service method', () => {
            const court = getSampleCourt();
            const services = getSampleServices();
            const cert = generateCertificateOfService(services, 'John Doe', court);

            expect(cert).toContain('CM/ECF');
        });

        it('should include recipient name', () => {
            const court = getSampleCourt();
            const services = getSampleServices();
            const cert = generateCertificateOfService(services, 'John Doe', court);

            expect(cert).toContain('Jane Attorney');
        });

        it('should include declarant name', () => {
            const court = getSampleCourt();
            const services = getSampleServices();
            const cert = generateCertificateOfService(services, 'John Doe', court);

            expect(cert).toContain('John Doe');
        });
    });

    describe('generateTableOfContents', () => {
        it('should generate TOC when required', () => {
            const court = getCourtById('scotus')!; // SCOTUS requires TOC
            const headings = [
                { text: 'Introduction', page: 1, level: 1 },
                { text: 'Statement of Facts', page: 3, level: 1 },
                { text: 'Argument', page: 5, level: 1 },
            ];
            const toc = generateTableOfContents(headings, court);

            expect(toc).toContain('TABLE OF CONTENTS');
            expect(toc).toContain('Introduction');
            expect(toc).toContain('Statement of Facts');
        });

        it('should return empty string when not required', () => {
            const court = getSampleCourt();
            // N.D. Cal. doesn't require TOC by default
            const headings = [{ text: 'Test', page: 1, level: 1 }];
            const toc = generateTableOfContents(headings, court);

            expect(toc).toBe('');
        });
    });

    describe('generateTableOfAuthorities', () => {
        it('should generate TOA when required', () => {
            const court = getCourtById('scotus')!; // SCOTUS requires TOA
            const citations = [
                { text: 'Brown v. Board of Education, 347 U.S. 483 (1954)', pages: [5, 10], category: 'Cases' },
                { text: '42 U.S.C. 1983', pages: [7], category: 'Statutes' },
            ];
            const toa = generateTableOfAuthorities(citations, court);

            expect(toa).toContain('TABLE OF AUTHORITIES');
            expect(toa).toContain('Brown v. Board');
        });

        it('should categorize citations', () => {
            const court = getCourtById('scotus')!;
            const citations = [
                { text: 'Case Citation', pages: [1], category: 'Cases' },
                { text: 'Statute Citation', pages: [2], category: 'Statutes' },
            ];
            const toa = generateTableOfAuthorities(citations, court);

            expect(toa).toContain('Cases');
            expect(toa).toContain('Statutes');
        });
    });

    describe('generateDocumentStyles', () => {
        it('should include font settings', () => {
            const court = getSampleCourt();
            const styles = generateDocumentStyles(court);

            expect(styles).toContain('font-family');
            expect(styles).toContain('Times New Roman');
        });

        it('should include margin settings', () => {
            const court = getSampleCourt();
            const styles = generateDocumentStyles(court);

            expect(styles).toContain('margin');
        });

        it('should include page settings', () => {
            const court = getSampleCourt();
            const styles = generateDocumentStyles(court);

            expect(styles).toContain('@page');
            expect(styles).toContain('letter');
        });
    });

    describe('validateCompliance', () => {
        it('should pass for compliant document', () => {
            const court = getSampleCourt();
            const content = '<p>Respectfully submitted,</p><p>Some content here</p><div>CERTIFICATE OF SERVICE</div>';
            const result = validateCompliance(content, court);

            // N.D. Cal. doesn't have word limits by default, with cert of service it should pass
            expect(result.violations.filter(v => v.severity === 'error').length).toBe(0);
        });

        it('should detect missing certificate of service', () => {
            const court = getSampleCourt();
            const content = '<p>Just some content without certificate</p>';
            const result = validateCompliance(content, court);

            expect(result.violations.some(v => v.rule === 'Certificate of Service')).toBe(true);
        });

        it('should detect word limit violations', () => {
            const court = getCourtById('scotus')!; // Has 15000 word limit
            // Create content with >15000 words
            const longContent = Array(20000).fill('word').join(' ');
            const result = validateCompliance(longContent, court);

            expect(result.violations.some(v => v.rule === 'Word Count')).toBe(true);
        });

        it('should warn about double spaces', () => {
            const court = getSampleCourt();
            const content = '<p>This has  double spaces.</p>';
            const result = validateCompliance(content, court);

            expect(result.warnings.some(w => w.description.includes('double spaces'))).toBe(true);
        });

        it('should warn about missing signature block', () => {
            const court = getSampleCourt();
            const content = '<p>Content without signature</p>';
            const result = validateCompliance(content, court);

            expect(result.warnings.some(w => w.rule === 'Signature Block')).toBe(true);
        });
    });

    describe('formatDocument', () => {
        it('should format complete document', () => {
            const court = getSampleCourt();
            const body = '<p>This is the document body content.</p>';
            const caption = getSampleCaptionData();
            const attorney = getSampleAttorney();
            const services = getSampleServices();

            const formatted = formatDocument(body, caption, attorney, services, court);

            expect(formatted.caption).toBeTruthy();
            expect(formatted.body).toBe(body);
            expect(formatted.signature).toBeTruthy();
            expect(formatted.wordCount).toBeGreaterThan(0);
            expect(formatted.compliance).toBeTruthy();
        });

        it('should calculate word count', () => {
            const court = getSampleCourt();
            const body = '<p>One two three four five six seven eight nine ten.</p>';
            const caption = getSampleCaptionData();
            const attorney = getSampleAttorney();
            const services = getSampleServices();

            const formatted = formatDocument(body, caption, attorney, services, court);

            expect(formatted.wordCount).toBe(10);
        });

        it('should estimate page count', () => {
            const court = getSampleCourt();
            const body = Array(500).fill('<p>word</p>').join('');
            const caption = getSampleCaptionData();
            const attorney = getSampleAttorney();
            const services = getSampleServices();

            const formatted = formatDocument(body, caption, attorney, services, court);

            expect(formatted.pageCount).toBeGreaterThan(0);
        });
    });

    describe('generateFullHtml', () => {
        it('should generate complete HTML document', () => {
            const court = getSampleCourt();
            const body = '<p>Document content</p>';
            const caption = getSampleCaptionData();
            const attorney = getSampleAttorney();
            const services = getSampleServices();

            const formatted = formatDocument(body, caption, attorney, services, court);
            const html = generateFullHtml(formatted, court, 'Test Document');

            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('<title>Test Document</title>');
            expect(html).toContain('<style>');
            expect(html).toContain('Document content');
        });
    });

    describe('extractHeadings', () => {
        it('should extract H1-H4 headings', () => {
            const html = '<h1>First</h1><h2>Second</h2><h3>Third</h3><h4>Fourth</h4>';
            const headings = extractHeadings(html);

            expect(headings.length).toBe(4);
            expect(headings[0].text).toBe('First');
            expect(headings[0].level).toBe(1);
        });

        it('should handle multiple headings of same level', () => {
            const html = '<h1>One</h1><h1>Two</h1><h1>Three</h1>';
            const headings = extractHeadings(html);

            expect(headings.length).toBe(3);
        });

        it('should return empty array for no headings', () => {
            const html = '<p>No headings here</p>';
            const headings = extractHeadings(html);

            expect(headings.length).toBe(0);
        });
    });

    describe('generateWordCountDeclaration', () => {
        it('should generate declaration when required', () => {
            const court = getCourtById('scotus')!;
            const declaration = generateWordCountDeclaration(10000, court);

            expect(declaration).toContain('10,000');
            expect(declaration).toContain('word');
        });

        it('should return empty when not required', () => {
            const court = getSampleCourt(); // N.D. Cal. doesn't require declaration
            const declaration = generateWordCountDeclaration(5000, court);

            expect(declaration).toBe('');
        });
    });
});

