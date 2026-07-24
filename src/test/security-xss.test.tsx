import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import DOMPurify from 'dompurify';
import { citationToHtml } from '../utils/citationFormatter';
import { safeHref } from '../utils/safeHref';
import type { Citation } from '../utils/citationTypes';

// ============================================
// Test Data
// ============================================

const IMG_PAYLOAD = '<img src=x onerror="window.__xss=1">';
const SCRIPT_PAYLOAD = '<script>window.__xss=1</script>';

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
// Tests: dangerouslySetInnerHTML sinks must sanitize
// ============================================

describe('XSS sinks are sanitized before dangerouslySetInnerHTML', () => {
    it('strips onerror attributes from untrusted HTML content (img payload)', () => {
        const { container } = render(
            // eslint-disable-next-line react/no-danger
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(IMG_PAYLOAD) }} />
        );

        expect(container.querySelector('[onerror]')).toBeNull();
        expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
    });

    it('strips script elements from untrusted HTML content', () => {
        const { container } = render(
            // eslint-disable-next-line react/no-danger
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(SCRIPT_PAYLOAD) }} />
        );

        expect(container.querySelector('script')).toBeNull();
    });

    it('un-sanitized rendering (regression guard showing the raw sink is unsafe) still contains onerror', () => {
        // This documents the vulnerability: raw content, without sanitization,
        // retains the dangerous attribute. Sanitized output (above) must not.
        const div = document.createElement('div');
        div.innerHTML = IMG_PAYLOAD;
        expect(div.querySelector('[onerror]')).not.toBeNull();
    });
});

// ============================================
// Tests: citationToHtml must escape interpolated fields
// ============================================

describe('citationToHtml escapes interpolated citation fields', () => {
    it('escapes an XSS payload injected via the parenthetical field', () => {
        const citation = createMockCitation({
            parenthetical: '"><img src=x onerror=alert(1)>',
        });

        const html = citationToHtml(citation);

        expect(html).not.toContain('<img');
        expect(html.toLowerCase()).not.toContain('onerror=');
    });

    it('still italicizes the case name with a literal <em> tag', () => {
        const citation = createMockCitation();
        const html = citationToHtml(citation);
        expect(html).toContain('<em>Brown v. Board of Education</em>');
    });
});

// ============================================
// Tests: safeHref blocks non-http(s) URLs
// ============================================

describe('safeHref', () => {
    it('returns undefined for javascript: URLs', () => {
        expect(safeHref('javascript:alert(1)')).toBeUndefined();
    });

    it('returns undefined for data: URLs', () => {
        expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    });

    it('returns the url for http(s) URLs', () => {
        expect(safeHref('https://example.com')).toBe('https://example.com');
        expect(safeHref('http://example.com')).toBe('http://example.com');
    });

    it('returns undefined for an undefined input', () => {
        expect(safeHref(undefined)).toBeUndefined();
    });
});
