/**
 * Court Formatting Types
 * Defines court-specific formatting rules for legal documents.
 */

// ============================================
// Core Types
// ============================================

export type CourtLevel = 'supreme' | 'appellate' | 'district' | 'bankruptcy' | 'magistrate' | 'state_supreme' | 'state_appellate' | 'state_trial';

export type DocumentCategory = 'motion' | 'brief' | 'complaint' | 'answer' | 'memorandum' | 'declaration' | 'affidavit' | 'notice' | 'order' | 'judgment';

export interface FontRequirements {
    family: string[];                    // Allowed font families
    sizeBody: number;                    // Body text size in points
    sizeFootnotes: number;               // Footnote size in points
    lineHeight: number;                  // Line height multiplier (e.g., 2 for double-spaced)
}

export interface MarginRequirements {
    top: number;                         // Top margin in inches
    bottom: number;                      // Bottom margin in inches
    left: number;                        // Left margin in inches
    right: number;                       // Right margin in inches
    binding?: number;                    // Additional binding margin if required
}

export interface PageRequirements {
    size: 'letter' | 'legal' | 'a4';
    orientation: 'portrait' | 'landscape';
    numbering: 'bottom-center' | 'bottom-right' | 'top-right' | 'none';
    numberingStartPage: number;          // Which page to start numbering (usually 2)
    maxPages?: number;                   // Page limit if any
}

export interface CaptionRequirements {
    format: 'federal' | 'state' | 'custom';
    includeCourtName: boolean;
    includeCaseNumber: boolean;
    includeJudgeName: boolean;
    includeDepartment: boolean;
    partyFormat: 'v' | 'vs' | 'versus';
    allCaps: boolean;                    // Whether party names should be ALL CAPS
}

export interface SignatureRequirements {
    format: 'block' | 'centered' | 'right-aligned';
    includeBarNumber: boolean;
    includeAddress: boolean;
    includePhone: boolean;
    includeEmail: boolean;
    includeFax: boolean;
}

export interface TableOfContentsRequirements {
    required: boolean;
    format: 'dotted' | 'plain' | 'lined';
    includePageNumbers: boolean;
}

export interface TableOfAuthoritiesRequirements {
    required: boolean;
    categorize: boolean;                 // Group by type (cases, statutes, etc.)
    categories: string[];                // Order of categories
    format: 'bluebook' | 'alwd' | 'court-specific';
}

export interface CertificateOfServiceRequirements {
    required: boolean;
    format: 'declaration' | 'certificate' | 'affidavit';
    methods: string[];                   // Allowed service methods
}

export interface WordCountRequirements {
    hasLimit: boolean;
    maxWords?: number;
    maxPages?: number;
    excludeCaption: boolean;
    excludeTOC: boolean;
    excludeTOA: boolean;
    excludeSignature: boolean;
    excludeCertificate: boolean;
    requireDeclaration: boolean;         // Must declare word count
}

// ============================================
// Court Rules
// ============================================

export interface CourtFormattingRules {
    id: string;
    courtName: string;
    courtLevel: CourtLevel;
    jurisdiction: string;                // e.g., 'Federal', 'California', '9th Circuit'
    localRulesCitation?: string;         // e.g., 'N.D. Cal. L.R. 3-4'
    
    // Document requirements
    font: FontRequirements;
    margins: MarginRequirements;
    page: PageRequirements;
    caption: CaptionRequirements;
    signature: SignatureRequirements;
    
    // Optional components
    tableOfContents?: TableOfContentsRequirements;
    tableOfAuthorities?: TableOfAuthoritiesRequirements;
    certificateOfService: CertificateOfServiceRequirements;
    wordCount?: WordCountRequirements;
    
    // Document-specific overrides
    documentOverrides?: Record<DocumentCategory, Partial<CourtFormattingRules>>;
    
    // Additional requirements
    additionalRequirements?: string[];   // Free-form additional rules
    
    // Metadata
    lastUpdated: string;
    sourceUrl?: string;
}

// ============================================
// Caption Data
// ============================================

export interface PartyInfo {
    name: string;
    role: 'plaintiff' | 'defendant' | 'petitioner' | 'respondent' | 'appellant' | 'appellee' | 'cross-appellant' | 'cross-appellee' | 'intervenor' | 'third-party';
    isLeadParty: boolean;
}

export interface CaptionData {
    courtName: string;
    courtDivision?: string;
    department?: string;
    judgeName?: string;
    caseNumber: string;
    plaintiffs: PartyInfo[];
    defendants: PartyInfo[];
    documentTitle: string;
    hearingDate?: string;
    hearingTime?: string;
    hearingLocation?: string;
}

// ============================================
// Formatted Document
// ============================================

export interface FormattedDocument {
    caption: string;
    tableOfContents?: string;
    tableOfAuthorities?: string;
    body: string;
    signature: string;
    certificateOfService?: string;
    
    // Metadata
    wordCount: number;
    pageCount: number;
    compliance: ComplianceResult;
}

export interface ComplianceResult {
    isCompliant: boolean;
    violations: ComplianceViolation[];
    warnings: ComplianceWarning[];
}

export interface ComplianceViolation {
    rule: string;
    description: string;
    location?: string;
    severity: 'error' | 'warning';
    suggestion?: string;
}

export interface ComplianceWarning {
    rule: string;
    description: string;
    suggestion?: string;
}

// ============================================
// Signature Block Data
// ============================================

export interface AttorneyInfo {
    name: string;
    barNumber: string;
    barState: string;
    firmName?: string;
    address: string[];
    phone: string;
    fax?: string;
    email: string;
    representingParty: string;
}

// ============================================
// Service Info
// ============================================

export interface ServiceInfo {
    method: 'ecf' | 'email' | 'mail' | 'personal' | 'overnight' | 'fax';
    recipientName: string;
    recipientAddress?: string;
    recipientEmail?: string;
    date: string;
}

// ============================================
// Constants
// ============================================

export const COURT_LEVELS: { value: CourtLevel; label: string }[] = [
    { value: 'supreme', label: 'U.S. Supreme Court' },
    { value: 'appellate', label: 'U.S. Court of Appeals' },
    { value: 'district', label: 'U.S. District Court' },
    { value: 'bankruptcy', label: 'U.S. Bankruptcy Court' },
    { value: 'magistrate', label: 'U.S. Magistrate Judge' },
    { value: 'state_supreme', label: 'State Supreme Court' },
    { value: 'state_appellate', label: 'State Court of Appeals' },
    { value: 'state_trial', label: 'State Trial Court' },
];

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
    { value: 'motion', label: 'Motion' },
    { value: 'brief', label: 'Brief' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'answer', label: 'Answer' },
    { value: 'memorandum', label: 'Memorandum' },
    { value: 'declaration', label: 'Declaration' },
    { value: 'affidavit', label: 'Affidavit' },
    { value: 'notice', label: 'Notice' },
    { value: 'order', label: 'Order' },
    { value: 'judgment', label: 'Judgment' },
];

export const SERVICE_METHODS: { value: ServiceInfo['method']; label: string }[] = [
    { value: 'ecf', label: 'CM/ECF Electronic Filing' },
    { value: 'email', label: 'Email' },
    { value: 'mail', label: 'U.S. Mail' },
    { value: 'personal', label: 'Personal Service' },
    { value: 'overnight', label: 'Overnight Delivery' },
    { value: 'fax', label: 'Facsimile' },
];

export const STANDARD_FONTS = [
    'Times New Roman',
    'Arial',
    'Courier New',
    'Century Schoolbook',
    'Garamond',
    'Book Antiqua',
];

// ============================================
// Helper Functions
// ============================================

/**
 * Get default font requirements for federal courts
 */
export function getDefaultFederalFont(): FontRequirements {
    return {
        family: ['Times New Roman', 'Arial', 'Courier New'],
        sizeBody: 12,
        sizeFootnotes: 10,
        lineHeight: 2,
    };
}

/**
 * Get default margin requirements for federal courts
 */
export function getDefaultFederalMargins(): MarginRequirements {
    return {
        top: 1,
        bottom: 1,
        left: 1,
        right: 1,
    };
}

/**
 * Get default page requirements
 */
export function getDefaultPageRequirements(): PageRequirements {
    return {
        size: 'letter',
        orientation: 'portrait',
        numbering: 'bottom-center',
        numberingStartPage: 2,
    };
}

/**
 * Convert inches to CSS units
 */
export function inchesToCss(inches: number): string {
    return `${inches}in`;
}

/**
 * Convert points to CSS units
 */
export function pointsToCss(points: number): string {
    return `${points}pt`;
}

/**
 * Format party name according to rules
 */
export function formatPartyName(name: string, allCaps: boolean): string {
    return allCaps ? name.toUpperCase() : name;
}

/**
 * Get party separator based on format
 */
export function getPartySeparator(format: CaptionRequirements['partyFormat']): string {
    switch (format) {
        case 'v':
            return 'v.';
        case 'vs':
            return 'vs.';
        case 'versus':
            return 'versus';
        default:
            return 'v.';
    }
}

/**
 * Calculate word count from HTML content
 */
export function calculateWordCount(html: string): number {
    // Strip HTML tags
    const text = html.replace(/<[^>]*>/g, ' ');
    // Normalize whitespace
    const normalized = text.replace(/\s+/g, ' ').trim();
    // Count words
    return normalized ? normalized.split(' ').length : 0;
}

/**
 * Estimate page count from word count
 */
export function estimatePageCount(wordCount: number, wordsPerPage: number = 250): number {
    return Math.ceil(wordCount / wordsPerPage);
}

