/**
 * Court Rules Database
 * Pre-defined formatting rules for various federal and state courts.
 */

import type { CourtFormattingRules, DocumentCategory } from './courtFormattingTypes';

// ============================================
// Federal Courts
// ============================================

export const FEDERAL_RULES: CourtFormattingRules[] = [
    // U.S. Supreme Court
    {
        id: 'scotus',
        courtName: 'Supreme Court of the United States',
        courtLevel: 'supreme',
        jurisdiction: 'Federal',
        localRulesCitation: 'Sup. Ct. R. 33',
        font: {
            family: ['Century Schoolbook'],
            sizeBody: 12,
            sizeFootnotes: 10,
            lineHeight: 2,
        },
        margins: {
            top: 0.75,
            bottom: 0.75,
            left: 0.75,
            right: 0.75,
        },
        page: {
            size: 'letter',
            orientation: 'portrait',
            numbering: 'bottom-center',
            numberingStartPage: 2,
        },
        caption: {
            format: 'federal',
            includeCourtName: true,
            includeCaseNumber: true,
            includeJudgeName: false,
            includeDepartment: false,
            partyFormat: 'v',
            allCaps: true,
        },
        signature: {
            format: 'block',
            includeBarNumber: true,
            includeAddress: true,
            includePhone: true,
            includeEmail: true,
            includeFax: false,
        },
        tableOfContents: {
            required: true,
            format: 'dotted',
            includePageNumbers: true,
        },
        tableOfAuthorities: {
            required: true,
            categorize: true,
            categories: ['Cases', 'Constitutional Provisions', 'Statutes', 'Rules', 'Other Authorities'],
            format: 'bluebook',
        },
        certificateOfService: {
            required: true,
            format: 'certificate',
            methods: ['mail', 'personal'],
        },
        wordCount: {
            hasLimit: true,
            maxWords: 15000,
            excludeCaption: true,
            excludeTOC: true,
            excludeTOA: true,
            excludeSignature: true,
            excludeCertificate: true,
            requireDeclaration: true,
        },
        additionalRequirements: [
            'Booklet format required for merits briefs',
            'Cover color varies by brief type',
        ],
        lastUpdated: '2024-01-01',
        sourceUrl: 'https://www.supremecourt.gov/filingandrules/rules_guidance.aspx',
    },

    // Ninth Circuit Court of Appeals
    {
        id: '9th-circuit',
        courtName: 'United States Court of Appeals for the Ninth Circuit',
        courtLevel: 'appellate',
        jurisdiction: '9th Circuit',
        localRulesCitation: '9th Cir. R. 32-1',
        font: {
            family: ['Times New Roman', 'Arial', 'Courier New'],
            sizeBody: 14,
            sizeFootnotes: 12,
            lineHeight: 2,
        },
        margins: {
            top: 1,
            bottom: 1,
            left: 1,
            right: 1,
        },
        page: {
            size: 'letter',
            orientation: 'portrait',
            numbering: 'bottom-center',
            numberingStartPage: 1,
        },
        caption: {
            format: 'federal',
            includeCourtName: true,
            includeCaseNumber: true,
            includeJudgeName: false,
            includeDepartment: false,
            partyFormat: 'v',
            allCaps: true,
        },
        signature: {
            format: 'block',
            includeBarNumber: true,
            includeAddress: true,
            includePhone: true,
            includeEmail: true,
            includeFax: false,
        },
        tableOfContents: {
            required: true,
            format: 'dotted',
            includePageNumbers: true,
        },
        tableOfAuthorities: {
            required: true,
            categorize: true,
            categories: ['Cases', 'Statutes', 'Other Authorities'],
            format: 'bluebook',
        },
        certificateOfService: {
            required: true,
            format: 'certificate',
            methods: ['ecf', 'mail'],
        },
        wordCount: {
            hasLimit: true,
            maxWords: 14000,
            excludeCaption: true,
            excludeTOC: true,
            excludeTOA: true,
            excludeSignature: true,
            excludeCertificate: true,
            requireDeclaration: true,
        },
        lastUpdated: '2024-01-01',
        sourceUrl: 'https://www.ca9.uscourts.gov/rules/',
    },

    // Northern District of California
    {
        id: 'ndcal',
        courtName: 'United States District Court for the Northern District of California',
        courtLevel: 'district',
        jurisdiction: 'N.D. Cal.',
        localRulesCitation: 'N.D. Cal. L.R. 3-4',
        font: {
            family: ['Times New Roman', 'Arial', 'Courier New'],
            sizeBody: 12,
            sizeFootnotes: 10,
            lineHeight: 2,
        },
        margins: {
            top: 1,
            bottom: 1,
            left: 1,
            right: 1,
        },
        page: {
            size: 'letter',
            orientation: 'portrait',
            numbering: 'bottom-center',
            numberingStartPage: 2,
            maxPages: 25,
        },
        caption: {
            format: 'federal',
            includeCourtName: true,
            includeCaseNumber: true,
            includeJudgeName: true,
            includeDepartment: false,
            partyFormat: 'v',
            allCaps: true,
        },
        signature: {
            format: 'block',
            includeBarNumber: true,
            includeAddress: true,
            includePhone: true,
            includeEmail: true,
            includeFax: false,
        },
        certificateOfService: {
            required: true,
            format: 'certificate',
            methods: ['ecf'],
        },
        wordCount: {
            hasLimit: false,
            excludeCaption: true,
            excludeTOC: true,
            excludeTOA: true,
            excludeSignature: true,
            excludeCertificate: true,
            requireDeclaration: false,
        },
        documentOverrides: {
            motion: {
                page: {
                    size: 'letter',
                    orientation: 'portrait',
                    numbering: 'bottom-center',
                    numberingStartPage: 2,
                    maxPages: 25,
                },
            },
            brief: {
                page: {
                    size: 'letter',
                    orientation: 'portrait',
                    numbering: 'bottom-center',
                    numberingStartPage: 2,
                    maxPages: 35,
                },
            },
        } as Record<DocumentCategory, Partial<CourtFormattingRules>>,
        additionalRequirements: [
            'ECF filing required for all documents',
            'Proposed orders must be submitted in Word format',
        ],
        lastUpdated: '2024-01-01',
        sourceUrl: 'https://www.cand.uscourts.gov/rules/',
    },

    // Southern District of New York
    {
        id: 'sdny',
        courtName: 'United States District Court for the Southern District of New York',
        courtLevel: 'district',
        jurisdiction: 'S.D.N.Y.',
        localRulesCitation: 'S.D.N.Y. L.R. 11.1',
        font: {
            family: ['Times New Roman', 'Arial', 'Courier New'],
            sizeBody: 12,
            sizeFootnotes: 10,
            lineHeight: 2,
        },
        margins: {
            top: 1,
            bottom: 1,
            left: 1.5,
            right: 1,
        },
        page: {
            size: 'letter',
            orientation: 'portrait',
            numbering: 'bottom-center',
            numberingStartPage: 2,
            maxPages: 25,
        },
        caption: {
            format: 'federal',
            includeCourtName: true,
            includeCaseNumber: true,
            includeJudgeName: true,
            includeDepartment: false,
            partyFormat: 'v',
            allCaps: true,
        },
        signature: {
            format: 'block',
            includeBarNumber: true,
            includeAddress: true,
            includePhone: true,
            includeEmail: true,
            includeFax: true,
        },
        certificateOfService: {
            required: true,
            format: 'certificate',
            methods: ['ecf', 'mail'],
        },
        wordCount: {
            hasLimit: false,
            excludeCaption: true,
            excludeTOC: true,
            excludeTOA: true,
            excludeSignature: true,
            excludeCertificate: true,
            requireDeclaration: false,
        },
        lastUpdated: '2024-01-01',
        sourceUrl: 'https://www.nysd.uscourts.gov/local-rules',
    },

    // Central District of California
    {
        id: 'cdcal',
        courtName: 'United States District Court for the Central District of California',
        courtLevel: 'district',
        jurisdiction: 'C.D. Cal.',
        localRulesCitation: 'C.D. Cal. L.R. 11-3',
        font: {
            family: ['Times New Roman', 'Arial', 'Courier New'],
            sizeBody: 12,
            sizeFootnotes: 10,
            lineHeight: 2,
        },
        margins: {
            top: 1,
            bottom: 1,
            left: 1,
            right: 1,
        },
        page: {
            size: 'letter',
            orientation: 'portrait',
            numbering: 'bottom-center',
            numberingStartPage: 2,
            maxPages: 25,
        },
        caption: {
            format: 'federal',
            includeCourtName: true,
            includeCaseNumber: true,
            includeJudgeName: true,
            includeDepartment: false,
            partyFormat: 'v',
            allCaps: true,
        },
        signature: {
            format: 'block',
            includeBarNumber: true,
            includeAddress: true,
            includePhone: true,
            includeEmail: true,
            includeFax: false,
        },
        certificateOfService: {
            required: true,
            format: 'certificate',
            methods: ['ecf'],
        },
        wordCount: {
            hasLimit: false,
            excludeCaption: true,
            excludeTOC: true,
            excludeTOA: true,
            excludeSignature: true,
            excludeCertificate: true,
            requireDeclaration: false,
        },
        lastUpdated: '2024-01-01',
        sourceUrl: 'https://www.cacd.uscourts.gov/court-procedures/local-rules',
    },

    // District of Delaware
    {
        id: 'dde',
        courtName: 'United States District Court for the District of Delaware',
        courtLevel: 'district',
        jurisdiction: 'D. Del.',
        localRulesCitation: 'D. Del. L.R. 7.1.3',
        font: {
            family: ['Times New Roman', 'Arial', 'Courier New'],
            sizeBody: 12,
            sizeFootnotes: 10,
            lineHeight: 2,
        },
        margins: {
            top: 1,
            bottom: 1,
            left: 1,
            right: 1,
        },
        page: {
            size: 'letter',
            orientation: 'portrait',
            numbering: 'bottom-center',
            numberingStartPage: 2,
            maxPages: 30,
        },
        caption: {
            format: 'federal',
            includeCourtName: true,
            includeCaseNumber: true,
            includeJudgeName: true,
            includeDepartment: false,
            partyFormat: 'v',
            allCaps: true,
        },
        signature: {
            format: 'block',
            includeBarNumber: true,
            includeAddress: true,
            includePhone: true,
            includeEmail: true,
            includeFax: false,
        },
        certificateOfService: {
            required: true,
            format: 'certificate',
            methods: ['ecf', 'email'],
        },
        wordCount: {
            hasLimit: false,
            excludeCaption: true,
            excludeTOC: true,
            excludeTOA: true,
            excludeSignature: true,
            excludeCertificate: true,
            requireDeclaration: false,
        },
        lastUpdated: '2024-01-01',
        sourceUrl: 'https://www.ded.uscourts.gov/local-rules',
    },
];

// ============================================
// State Courts - California
// ============================================

export const CALIFORNIA_RULES: CourtFormattingRules[] = [
    // California Supreme Court
    {
        id: 'ca-supreme',
        courtName: 'Supreme Court of California',
        courtLevel: 'state_supreme',
        jurisdiction: 'California',
        localRulesCitation: 'Cal. Rules of Court 8.204',
        font: {
            family: ['Times New Roman', 'Arial', 'Courier New'],
            sizeBody: 13,
            sizeFootnotes: 11,
            lineHeight: 1.5,
        },
        margins: {
            top: 1.5,
            bottom: 1,
            left: 1.5,
            right: 1,
        },
        page: {
            size: 'letter',
            orientation: 'portrait',
            numbering: 'bottom-center',
            numberingStartPage: 1,
        },
        caption: {
            format: 'state',
            includeCourtName: true,
            includeCaseNumber: true,
            includeJudgeName: false,
            includeDepartment: false,
            partyFormat: 'v',
            allCaps: true,
        },
        signature: {
            format: 'block',
            includeBarNumber: true,
            includeAddress: true,
            includePhone: true,
            includeEmail: true,
            includeFax: false,
        },
        tableOfContents: {
            required: true,
            format: 'dotted',
            includePageNumbers: true,
        },
        tableOfAuthorities: {
            required: true,
            categorize: true,
            categories: ['Cases', 'Statutes', 'Constitutional Provisions', 'Rules', 'Other Authorities'],
            format: 'bluebook',
        },
        certificateOfService: {
            required: true,
            format: 'declaration',
            methods: ['mail', 'email', 'personal'],
        },
        wordCount: {
            hasLimit: true,
            maxWords: 14000,
            excludeCaption: true,
            excludeTOC: true,
            excludeTOA: true,
            excludeSignature: true,
            excludeCertificate: true,
            requireDeclaration: true,
        },
        lastUpdated: '2024-01-01',
        sourceUrl: 'https://www.courts.ca.gov/cms/rules/index.cfm?title=eight',
    },

    // California Court of Appeal
    {
        id: 'ca-appeal',
        courtName: 'California Court of Appeal',
        courtLevel: 'state_appellate',
        jurisdiction: 'California',
        localRulesCitation: 'Cal. Rules of Court 8.204',
        font: {
            family: ['Times New Roman', 'Arial', 'Courier New'],
            sizeBody: 13,
            sizeFootnotes: 11,
            lineHeight: 1.5,
        },
        margins: {
            top: 1.5,
            bottom: 1,
            left: 1.5,
            right: 1,
        },
        page: {
            size: 'letter',
            orientation: 'portrait',
            numbering: 'bottom-center',
            numberingStartPage: 1,
        },
        caption: {
            format: 'state',
            includeCourtName: true,
            includeCaseNumber: true,
            includeJudgeName: false,
            includeDepartment: false,
            partyFormat: 'v',
            allCaps: true,
        },
        signature: {
            format: 'block',
            includeBarNumber: true,
            includeAddress: true,
            includePhone: true,
            includeEmail: true,
            includeFax: false,
        },
        tableOfContents: {
            required: true,
            format: 'dotted',
            includePageNumbers: true,
        },
        tableOfAuthorities: {
            required: true,
            categorize: true,
            categories: ['Cases', 'Statutes', 'Other Authorities'],
            format: 'bluebook',
        },
        certificateOfService: {
            required: true,
            format: 'declaration',
            methods: ['mail', 'email'],
        },
        wordCount: {
            hasLimit: true,
            maxWords: 14000,
            excludeCaption: true,
            excludeTOC: true,
            excludeTOA: true,
            excludeSignature: true,
            excludeCertificate: true,
            requireDeclaration: true,
        },
        lastUpdated: '2024-01-01',
        sourceUrl: 'https://www.courts.ca.gov/cms/rules/index.cfm?title=eight',
    },

    // California Superior Court (Los Angeles)
    {
        id: 'ca-lasc',
        courtName: 'Superior Court of California, County of Los Angeles',
        courtLevel: 'state_trial',
        jurisdiction: 'California - Los Angeles',
        localRulesCitation: 'LASC Local Rule 3.3',
        font: {
            family: ['Times New Roman', 'Arial', 'Courier New'],
            sizeBody: 12,
            sizeFootnotes: 10,
            lineHeight: 2,
        },
        margins: {
            top: 1,
            bottom: 0.5,
            left: 1,
            right: 0.5,
        },
        page: {
            size: 'letter',
            orientation: 'portrait',
            numbering: 'bottom-center',
            numberingStartPage: 1,
            maxPages: 20,
        },
        caption: {
            format: 'state',
            includeCourtName: true,
            includeCaseNumber: true,
            includeJudgeName: true,
            includeDepartment: true,
            partyFormat: 'v',
            allCaps: true,
        },
        signature: {
            format: 'block',
            includeBarNumber: true,
            includeAddress: true,
            includePhone: true,
            includeEmail: true,
            includeFax: true,
        },
        certificateOfService: {
            required: true,
            format: 'declaration',
            methods: ['mail', 'email', 'personal'],
        },
        wordCount: {
            hasLimit: false,
            excludeCaption: true,
            excludeTOC: true,
            excludeTOA: true,
            excludeSignature: true,
            excludeCertificate: true,
            requireDeclaration: false,
        },
        additionalRequirements: [
            'Line numbers required on left margin',
            'First page must include attorney information at top left',
        ],
        lastUpdated: '2024-01-01',
        sourceUrl: 'https://www.lacourt.org/forms/localrules',
    },
];

// ============================================
// State Courts - New York
// ============================================

export const NEW_YORK_RULES: CourtFormattingRules[] = [
    // New York Court of Appeals
    {
        id: 'ny-appeals',
        courtName: 'New York Court of Appeals',
        courtLevel: 'state_supreme',
        jurisdiction: 'New York',
        localRulesCitation: '22 NYCRR 500.1',
        font: {
            family: ['Times New Roman', 'Arial', 'Courier New'],
            sizeBody: 12,
            sizeFootnotes: 10,
            lineHeight: 2,
        },
        margins: {
            top: 1,
            bottom: 1,
            left: 1,
            right: 1,
        },
        page: {
            size: 'letter',
            orientation: 'portrait',
            numbering: 'bottom-center',
            numberingStartPage: 1,
        },
        caption: {
            format: 'state',
            includeCourtName: true,
            includeCaseNumber: true,
            includeJudgeName: false,
            includeDepartment: false,
            partyFormat: 'v',
            allCaps: true,
        },
        signature: {
            format: 'block',
            includeBarNumber: true,
            includeAddress: true,
            includePhone: true,
            includeEmail: true,
            includeFax: false,
        },
        tableOfContents: {
            required: true,
            format: 'dotted',
            includePageNumbers: true,
        },
        tableOfAuthorities: {
            required: true,
            categorize: true,
            categories: ['Cases', 'Statutes', 'Other Authorities'],
            format: 'bluebook',
        },
        certificateOfService: {
            required: true,
            format: 'affidavit',
            methods: ['mail', 'personal'],
        },
        wordCount: {
            hasLimit: true,
            maxPages: 55,
            excludeCaption: true,
            excludeTOC: true,
            excludeTOA: true,
            excludeSignature: true,
            excludeCertificate: true,
            requireDeclaration: false,
        },
        lastUpdated: '2024-01-01',
        sourceUrl: 'https://www.nycourts.gov/ctapps/forms.htm',
    },

    // New York Supreme Court
    {
        id: 'ny-supreme',
        courtName: 'Supreme Court of the State of New York',
        courtLevel: 'state_trial',
        jurisdiction: 'New York',
        localRulesCitation: '22 NYCRR 202.8',
        font: {
            family: ['Times New Roman', 'Arial', 'Courier New'],
            sizeBody: 12,
            sizeFootnotes: 10,
            lineHeight: 2,
        },
        margins: {
            top: 1,
            bottom: 1,
            left: 1,
            right: 1,
        },
        page: {
            size: 'letter',
            orientation: 'portrait',
            numbering: 'bottom-center',
            numberingStartPage: 1,
        },
        caption: {
            format: 'state',
            includeCourtName: true,
            includeCaseNumber: true,
            includeJudgeName: true,
            includeDepartment: false,
            partyFormat: 'v',
            allCaps: true,
        },
        signature: {
            format: 'block',
            includeBarNumber: true,
            includeAddress: true,
            includePhone: true,
            includeEmail: true,
            includeFax: true,
        },
        certificateOfService: {
            required: true,
            format: 'affidavit',
            methods: ['mail', 'personal', 'overnight'],
        },
        wordCount: {
            hasLimit: false,
            excludeCaption: true,
            excludeTOC: true,
            excludeTOA: true,
            excludeSignature: true,
            excludeCertificate: true,
            requireDeclaration: false,
        },
        lastUpdated: '2024-01-01',
        sourceUrl: 'https://www.nycourts.gov/rules/trialcourts/',
    },
];

// ============================================
// State Courts - Texas
// ============================================

export const TEXAS_RULES: CourtFormattingRules[] = [
    // Texas Supreme Court
    {
        id: 'tx-supreme',
        courtName: 'Supreme Court of Texas',
        courtLevel: 'state_supreme',
        jurisdiction: 'Texas',
        localRulesCitation: 'Tex. R. App. P. 9',
        font: {
            family: ['Times New Roman', 'Arial', 'Courier New'],
            sizeBody: 14,
            sizeFootnotes: 12,
            lineHeight: 2,
        },
        margins: {
            top: 1,
            bottom: 1,
            left: 1,
            right: 1,
        },
        page: {
            size: 'letter',
            orientation: 'portrait',
            numbering: 'bottom-center',
            numberingStartPage: 1,
        },
        caption: {
            format: 'state',
            includeCourtName: true,
            includeCaseNumber: true,
            includeJudgeName: false,
            includeDepartment: false,
            partyFormat: 'v',
            allCaps: true,
        },
        signature: {
            format: 'block',
            includeBarNumber: true,
            includeAddress: true,
            includePhone: true,
            includeEmail: true,
            includeFax: true,
        },
        tableOfContents: {
            required: true,
            format: 'dotted',
            includePageNumbers: true,
        },
        tableOfAuthorities: {
            required: true,
            categorize: true,
            categories: ['Cases', 'Statutes', 'Other Authorities'],
            format: 'bluebook',
        },
        certificateOfService: {
            required: true,
            format: 'certificate',
            methods: ['ecf', 'mail'],
        },
        wordCount: {
            hasLimit: true,
            maxWords: 15000,
            excludeCaption: true,
            excludeTOC: true,
            excludeTOA: true,
            excludeSignature: true,
            excludeCertificate: true,
            requireDeclaration: true,
        },
        lastUpdated: '2024-01-01',
        sourceUrl: 'https://www.txcourts.gov/rules-forms/rules-standards/',
    },
];

// ============================================
// Combined Database
// ============================================

export const ALL_COURT_RULES: CourtFormattingRules[] = [
    ...FEDERAL_RULES,
    ...CALIFORNIA_RULES,
    ...NEW_YORK_RULES,
    ...TEXAS_RULES,
];

// ============================================
// Lookup Functions
// ============================================

/**
 * Get all available courts
 */
export function getAllCourts(): CourtFormattingRules[] {
    return ALL_COURT_RULES;
}

/**
 * Get court by ID
 */
export function getCourtById(id: string): CourtFormattingRules | undefined {
    return ALL_COURT_RULES.find(c => c.id === id);
}

/**
 * Get courts by jurisdiction
 */
export function getCourtsByJurisdiction(jurisdiction: string): CourtFormattingRules[] {
    return ALL_COURT_RULES.filter(c => 
        c.jurisdiction.toLowerCase().includes(jurisdiction.toLowerCase())
    );
}

/**
 * Get courts by level
 */
export function getCourtsByLevel(level: CourtFormattingRules['courtLevel']): CourtFormattingRules[] {
    return ALL_COURT_RULES.filter(c => c.courtLevel === level);
}

/**
 * Get federal courts
 */
export function getFederalCourts(): CourtFormattingRules[] {
    return FEDERAL_RULES;
}

/**
 * Get state courts
 */
export function getStateCourts(): CourtFormattingRules[] {
    return [...CALIFORNIA_RULES, ...NEW_YORK_RULES, ...TEXAS_RULES];
}

/**
 * Search courts by name
 */
export function searchCourts(query: string): CourtFormattingRules[] {
    const lowerQuery = query.toLowerCase();
    return ALL_COURT_RULES.filter(c => 
        c.courtName.toLowerCase().includes(lowerQuery) ||
        c.jurisdiction.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Get unique jurisdictions
 */
export function getJurisdictions(): string[] {
    return [...new Set(ALL_COURT_RULES.map(c => c.jurisdiction))];
}

