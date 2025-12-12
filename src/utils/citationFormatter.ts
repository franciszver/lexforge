/**
 * Citation Formatter
 * Formats legal citations according to Bluebook and other styles.
 */

import type {
    Citation,
    CitationStyle,
    FormattedCitation,
} from './citationTypes';
import { COURTS } from './citationTypes';

// ============================================
// Bluebook Formatting
// ============================================

/**
 * Format a case citation in Bluebook style
 * Rule 10: Cases
 */
function formatBluebookCase(citation: Citation): FormattedCitation {
    // Case name (italicized in full form)
    const caseName = citation.title;
    
    // Volume, reporter, page
    let reporterCite = '';
    if (citation.volume && citation.reporter && citation.page) {
        reporterCite = `${citation.volume} ${citation.reporter} ${citation.page}`;
    } else {
        reporterCite = citation.citation;
    }
    
    // Pinpoint
    const pinpoint = citation.pinpoint ? `, ${citation.pinpoint}` : '';
    
    // Court and year parenthetical
    let courtYear = '';
    if (citation.court && citation.year) {
        const courtAbbr = COURTS.abbreviations[citation.court] || citation.court;
        // Supreme Court doesn't need court designation
        if (citation.reporter === 'U.S.' || courtAbbr === '') {
            courtYear = `(${citation.year})`;
        } else {
            courtYear = `(${courtAbbr} ${citation.year})`;
        }
    } else if (citation.year) {
        courtYear = `(${citation.year})`;
    }
    
    // Explanatory parenthetical
    const parenthetical = citation.parenthetical ? ` (${citation.parenthetical})` : '';
    
    // Full citation
    const full = `${caseName}, ${reporterCite}${pinpoint} ${courtYear}${parenthetical}`.trim();
    
    // Short form (for subsequent references)
    const shortName = getShortCaseName(caseName);
    const short = citation.shortForm || `${shortName}, ${citation.volume || ''} ${citation.reporter || ''} at ${citation.pinpoint || citation.page || ''}`.trim();
    
    // Footnote format (same as full for Bluebook)
    const footnote = full;
    
    // Bibliography/Table of Authorities
    const bibliography = full;
    
    return { full, short, footnote, bibliography };
}

/**
 * Format a statute citation in Bluebook style
 * Rule 12: Statutes
 */
function formatBluebookStatute(citation: Citation): FormattedCitation {
    let full = '';
    
    if (citation.codeTitle && citation.section) {
        // Standard code citation: 42 U.S.C. Section 1983
        full = `${citation.codeTitle} ${citation.section}`;
        if (citation.subdivision) {
            full += `(${citation.subdivision})`;
        }
        if (citation.year) {
            full += ` (${citation.year})`;
        }
    } else {
        full = citation.citation;
    }
    
    const short = citation.shortForm || full;
    const footnote = full;
    const bibliography = full;
    
    return { full, short, footnote, bibliography };
}

/**
 * Format a regulation citation in Bluebook style
 * Rule 14: Administrative and Executive Materials
 */
function formatBluebookRegulation(citation: Citation): FormattedCitation {
    let full = '';
    
    if (citation.codeTitle && citation.section) {
        full = `${citation.codeTitle} ${citation.section}`;
        if (citation.year) {
            full += ` (${citation.year})`;
        }
    } else {
        full = citation.citation;
    }
    
    const short = citation.shortForm || full;
    const footnote = full;
    const bibliography = full;
    
    return { full, short, footnote, bibliography };
}

/**
 * Format a constitutional citation in Bluebook style
 * Rule 11: Constitutions
 */
function formatBluebookConstitution(citation: Citation): FormattedCitation {
    // Constitutional citations are typically in small caps
    // e.g., U.S. CONST. art. I, Section 8, cl. 3
    const full = citation.citation;
    const short = citation.shortForm || full;
    const footnote = full;
    const bibliography = full;
    
    return { full, short, footnote, bibliography };
}

/**
 * Format a secondary source citation in Bluebook style
 * Rules 15-18: Books, Periodicals, etc.
 */
function formatBluebookSecondary(citation: Citation): FormattedCitation {
    // Secondary sources vary widely, use stored citation
    const full = citation.citation;
    const short = citation.shortForm || getShortSecondaryForm(citation);
    const footnote = full;
    const bibliography = full;
    
    return { full, short, footnote, bibliography };
}

/**
 * Format a treaty citation in Bluebook style
 * Rule 21: International Materials
 */
function formatBluebookTreaty(citation: Citation): FormattedCitation {
    const full = citation.citation;
    const short = citation.shortForm || citation.title;
    const footnote = full;
    const bibliography = full;
    
    return { full, short, footnote, bibliography };
}

// ============================================
// ALWD Formatting
// ============================================

/**
 * Format a case citation in ALWD style
 * Similar to Bluebook but with some differences
 */
function formatALWDCase(citation: Citation): FormattedCitation {
    // ALWD is similar to Bluebook for most cases
    const bluebook = formatBluebookCase(citation);
    
    // ALWD uses underlines instead of italics for case names in some contexts
    // For our purposes, we'll use the same format
    return bluebook;
}

function formatALWDStatute(citation: Citation): FormattedCitation {
    return formatBluebookStatute(citation);
}

function formatALWDRegulation(citation: Citation): FormattedCitation {
    return formatBluebookRegulation(citation);
}

function formatALWDConstitution(citation: Citation): FormattedCitation {
    return formatBluebookConstitution(citation);
}

function formatALWDSecondary(citation: Citation): FormattedCitation {
    return formatBluebookSecondary(citation);
}

function formatALWDTreaty(citation: Citation): FormattedCitation {
    return formatBluebookTreaty(citation);
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get short form of case name
 * Typically the first party name or a distinctive word
 */
function getShortCaseName(fullName: string): string {
    // Remove "v." or "vs." and take first party
    const parts = fullName.split(/\s+v\.?\s+/i);
    if (parts.length > 1) {
        // Get first distinctive word from first party
        const firstParty = parts[0].trim();
        // Remove common words
        const words = firstParty.split(/\s+/).filter(w => 
            !['the', 'a', 'an', 'in', 're', 'matter', 'of', 'estate'].includes(w.toLowerCase())
        );
        return words[0] || firstParty;
    }
    return fullName;
}

/**
 * Get short form for secondary sources
 */
function getShortSecondaryForm(citation: Citation): string {
    // Use author's last name if available, otherwise title
    const title = citation.title;
    // If title is short enough, use it
    if (title.length <= 30) {
        return title;
    }
    // Otherwise truncate
    return title.substring(0, 27) + '...';
}

// ============================================
// Main Formatting Function
// ============================================

/**
 * Format a citation according to the specified style
 */
export function formatCitation(citation: Citation, style: CitationStyle = 'bluebook'): FormattedCitation {
    const formatters: Record<CitationStyle, Record<string, (c: Citation) => FormattedCitation>> = {
        bluebook: {
            case: formatBluebookCase,
            statute: formatBluebookStatute,
            regulation: formatBluebookRegulation,
            constitution: formatBluebookConstitution,
            secondary: formatBluebookSecondary,
            treaty: formatBluebookTreaty,
        },
        alwd: {
            case: formatALWDCase,
            statute: formatALWDStatute,
            regulation: formatALWDRegulation,
            constitution: formatALWDConstitution,
            secondary: formatALWDSecondary,
            treaty: formatALWDTreaty,
        },
        // Chicago, APA, MLA would follow similar patterns
        chicago: {
            case: formatBluebookCase, // Fallback to Bluebook
            statute: formatBluebookStatute,
            regulation: formatBluebookRegulation,
            constitution: formatBluebookConstitution,
            secondary: formatBluebookSecondary,
            treaty: formatBluebookTreaty,
        },
        apa: {
            case: formatBluebookCase,
            statute: formatBluebookStatute,
            regulation: formatBluebookRegulation,
            constitution: formatBluebookConstitution,
            secondary: formatBluebookSecondary,
            treaty: formatBluebookTreaty,
        },
        mla: {
            case: formatBluebookCase,
            statute: formatBluebookStatute,
            regulation: formatBluebookRegulation,
            constitution: formatBluebookConstitution,
            secondary: formatBluebookSecondary,
            treaty: formatBluebookTreaty,
        },
    };
    
    const formatter = formatters[style]?.[citation.type];
    if (formatter) {
        return formatter(citation);
    }
    
    // Fallback: return the citation as-is
    return {
        full: citation.citation,
        short: citation.shortForm || citation.citation,
        footnote: citation.citation,
        bibliography: citation.citation,
    };
}

/**
 * Generate a citation string from citation components
 * Useful for building citations from form input
 */
export function buildCitationString(citation: Partial<Citation>): string {
    switch (citation.type) {
        case 'case':
            return buildCaseCitation(citation);
        case 'statute':
            return buildStatuteCitation(citation);
        case 'regulation':
            return buildRegulationCitation(citation);
        case 'constitution':
            return citation.citation || '';
        case 'secondary':
            return citation.citation || '';
        case 'treaty':
            return citation.citation || '';
        default:
            return citation.citation || '';
    }
}

function buildCaseCitation(citation: Partial<Citation>): string {
    const parts: string[] = [];
    
    if (citation.title) {
        parts.push(citation.title);
    }
    
    if (citation.volume && citation.reporter && citation.page) {
        parts.push(`${citation.volume} ${citation.reporter} ${citation.page}`);
    }
    
    if (citation.court && citation.year) {
        const courtAbbr = COURTS.abbreviations[citation.court] || '';
        if (courtAbbr) {
            parts.push(`(${courtAbbr} ${citation.year})`);
        } else {
            parts.push(`(${citation.year})`);
        }
    } else if (citation.year) {
        parts.push(`(${citation.year})`);
    }
    
    return parts.join(', ');
}

function buildStatuteCitation(citation: Partial<Citation>): string {
    let result = '';
    
    if (citation.codeTitle && citation.section) {
        result = `${citation.codeTitle} ${citation.section}`;
        if (citation.subdivision) {
            result += `(${citation.subdivision})`;
        }
        if (citation.year) {
            result += ` (${citation.year})`;
        }
    } else if (citation.citation) {
        result = citation.citation;
    }
    
    return result;
}

function buildRegulationCitation(citation: Partial<Citation>): string {
    let result = '';
    
    if (citation.codeTitle && citation.section) {
        result = `${citation.codeTitle} ${citation.section}`;
        if (citation.year) {
            result += ` (${citation.year})`;
        }
    } else if (citation.citation) {
        result = citation.citation;
    }
    
    return result;
}

/**
 * Parse a citation string to extract components
 * Useful for auto-detecting citation format
 */
export function parseCitationString(citationStr: string): Partial<Citation> {
    const result: Partial<Citation> = {
        citation: citationStr,
    };
    
    // Try to detect case citation pattern with court: Name v. Name, Volume Reporter Page (Court Year)
    // Reporter pattern handles formats like "U.S.", "F.3d", "Cal. App. 4th"
    const caseWithCourtPattern = /^(.+?),\s*(\d+)\s+([A-Za-z0-9.]+(?:\s+[A-Za-z0-9.]+)*?)\s+(\d+)(?:,\s*(\d+))?\s*\((.+?)\s+(\d{4})\)$/;
    const caseWithCourtMatch = citationStr.match(caseWithCourtPattern);
    if (caseWithCourtMatch) {
        result.type = 'case';
        result.title = caseWithCourtMatch[1].trim();
        result.volume = caseWithCourtMatch[2];
        result.reporter = caseWithCourtMatch[3].trim();
        result.page = caseWithCourtMatch[4];
        result.pinpoint = caseWithCourtMatch[5];
        result.court = caseWithCourtMatch[6].trim();
        result.year = parseInt(caseWithCourtMatch[7], 10);
        return result;
    }
    
    // Try simpler case pattern for Supreme Court: Name v. Name, Volume Reporter Page (Year)
    const simpleCasePattern = /^(.+?),\s*(\d+)\s+([A-Za-z0-9.]+(?:\s+[A-Za-z0-9.]+)*?)\s+(\d+)(?:,\s*(\d+))?\s*\((\d{4})\)$/;
    const simpleCaseMatch = citationStr.match(simpleCasePattern);
    if (simpleCaseMatch) {
        result.type = 'case';
        result.title = simpleCaseMatch[1].trim();
        result.volume = simpleCaseMatch[2];
        result.reporter = simpleCaseMatch[3].trim();
        result.page = simpleCaseMatch[4];
        result.pinpoint = simpleCaseMatch[5];
        result.year = parseInt(simpleCaseMatch[6], 10);
        return result;
    }
    
    // Try to detect U.S.C. pattern: Title U.S.C. Section Number
    const uscPattern = /^(\d+)\s+(U\.S\.C\.[AS]?)\s*[Section]*\s*(\d+[a-z]?)(?:\(([^)]+)\))?(?:\s*\((\d{4})\))?$/i;
    const uscMatch = citationStr.match(uscPattern);
    if (uscMatch) {
        result.type = 'statute';
        result.codeTitle = `${uscMatch[1]} ${uscMatch[2]}`;
        result.section = uscMatch[3];
        result.subdivision = uscMatch[4];
        result.year = uscMatch[5] ? parseInt(uscMatch[5], 10) : undefined;
        return result;
    }
    
    // Try to detect C.F.R. pattern: Title C.F.R. Section Number
    const cfrPattern = /^(\d+)\s+(C\.F\.R\.)\s*[Section]*\s*(\d+(?:\.\d+)?)(?:\s*\((\d{4})\))?$/i;
    const cfrMatch = citationStr.match(cfrPattern);
    if (cfrMatch) {
        result.type = 'regulation';
        result.codeTitle = `${cfrMatch[1]} ${cfrMatch[2]}`;
        result.section = cfrMatch[3];
        result.year = cfrMatch[4] ? parseInt(cfrMatch[4], 10) : undefined;
        return result;
    }
    
    // Try to detect constitution pattern
    if (citationStr.toLowerCase().includes('const.') || citationStr.toLowerCase().includes('constitution')) {
        result.type = 'constitution';
        return result;
    }
    
    // Default: treat as secondary source
    result.type = 'secondary';
    return result;
}

/**
 * Validate a citation for completeness
 */
export function validateCitation(citation: Partial<Citation>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!citation.title || citation.title.trim() === '') {
        errors.push('Title is required');
    }
    
    if (!citation.citation || citation.citation.trim() === '') {
        errors.push('Citation string is required');
    }
    
    if (!citation.type) {
        errors.push('Citation type is required');
    }
    
    if (citation.type === 'case') {
        if (!citation.year) {
            errors.push('Year is recommended for case citations');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Generate HTML for displaying a formatted citation
 */
export function citationToHtml(citation: Citation, style: CitationStyle = 'bluebook'): string {
    const formatted = formatCitation(citation, style);
    
    // For cases, italicize the case name
    if (citation.type === 'case') {
        const caseName = citation.title;
        return formatted.full.replace(caseName, `<em>${caseName}</em>`);
    }
    
    return formatted.full;
}

