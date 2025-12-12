/**
 * Caption Templates
 * Pre-defined caption templates for different court jurisdictions.
 */

import type { CaptionData, CourtFormattingRules } from './courtFormattingTypes';
import { formatPartyName, getPartySeparator } from './courtFormattingTypes';

// ============================================
// Types
// ============================================

export interface CaptionTemplate {
    id: string;
    name: string;
    jurisdictions: string[];
    generateCaption: (data: CaptionData, rules: CourtFormattingRules) => string;
}

// ============================================
// Federal Templates
// ============================================

/**
 * Standard Federal District Court Caption
 */
export function generateFederalDistrictCaption(data: CaptionData, rules: CourtFormattingRules): string {
    const lines: string[] = [];
    const captionRules = rules.caption;
    
    // Court header
    lines.push(`<div class="caption-header">`);
    lines.push(`<div class="court-name">${data.courtName.toUpperCase()}</div>`);
    if (data.courtDivision) {
        lines.push(`<div class="court-division">${data.courtDivision.toUpperCase()}</div>`);
    }
    lines.push(`</div>`);
    
    // Caption box - two column layout
    lines.push(`<div class="caption-box">`);
    
    // Left side - parties
    lines.push(`<div class="caption-parties">`);
    
    // Plaintiffs
    const leadPlaintiffs = data.plaintiffs.filter(p => p.isLeadParty);
    const hasMorePlaintiffs = data.plaintiffs.length > leadPlaintiffs.length;
    
    leadPlaintiffs.forEach((plaintiff, i) => {
        const name = formatPartyName(plaintiff.name, captionRules.allCaps);
        lines.push(`<div class="party-name">${name}${i < leadPlaintiffs.length - 1 || hasMorePlaintiffs ? ',' : ''}</div>`);
    });
    
    if (hasMorePlaintiffs) {
        lines.push(`<div class="party-etal">et al.,</div>`);
    }
    
    const plaintiffRole = capitalizeRole(data.plaintiffs[0]?.role || 'plaintiff');
    lines.push(`<div class="party-role">${plaintiffRole}${data.plaintiffs.length > 1 ? 's' : ''},</div>`);
    
    // Separator
    lines.push(`<div class="party-vs">${getPartySeparator(captionRules.partyFormat)}</div>`);
    
    // Defendants
    const leadDefendants = data.defendants.filter(p => p.isLeadParty);
    const hasMoreDefendants = data.defendants.length > leadDefendants.length;
    
    leadDefendants.forEach((defendant, i) => {
        const name = formatPartyName(defendant.name, captionRules.allCaps);
        lines.push(`<div class="party-name">${name}${i < leadDefendants.length - 1 || hasMoreDefendants ? ',' : ''}</div>`);
    });
    
    if (hasMoreDefendants) {
        lines.push(`<div class="party-etal">et al.,</div>`);
    }
    
    const defendantRole = capitalizeRole(data.defendants[0]?.role || 'defendant');
    lines.push(`<div class="party-role">${defendantRole}${data.defendants.length > 1 ? 's' : ''}.</div>`);
    
    lines.push(`</div>`); // end parties
    
    // Right side - case info
    lines.push(`<div class="caption-info">`);
    lines.push(`<div class="case-number">Case No. ${data.caseNumber}</div>`);
    if (data.judgeName && captionRules.includeJudgeName) {
        lines.push(`<div class="judge-assigned">Hon. ${data.judgeName}</div>`);
    }
    lines.push(`<div class="document-title">${data.documentTitle.toUpperCase()}</div>`);
    
    if (data.hearingDate) {
        lines.push(`<div class="hearing-info">`);
        lines.push(`<div>Date: ${data.hearingDate}</div>`);
        if (data.hearingTime) {
            lines.push(`<div>Time: ${data.hearingTime}</div>`);
        }
        if (data.hearingLocation) {
            lines.push(`<div>Dept: ${data.hearingLocation}</div>`);
        }
        lines.push(`</div>`);
    }
    
    lines.push(`</div>`); // end info
    lines.push(`</div>`); // end caption-box
    
    return `<div class="caption federal-district">${lines.join('\n')}</div>`;
}

/**
 * Federal Appellate Court Caption
 */
export function generateFederalAppellateCaption(data: CaptionData, rules: CourtFormattingRules): string {
    const lines: string[] = [];
    const captionRules = rules.caption;
    
    // Court header centered
    lines.push(`<div class="caption-header centered">`);
    lines.push(`<div class="court-name">${data.courtName.toUpperCase()}</div>`);
    lines.push(`</div>`);
    
    // Case number centered
    lines.push(`<div class="case-number-line centered">No. ${data.caseNumber}</div>`);
    
    // Parties block
    lines.push(`<div class="caption-parties-block">`);
    
    // Appellants (former plaintiffs or defendants depending on who appealed)
    data.plaintiffs.filter(p => p.isLeadParty).forEach((party) => {
        const name = formatPartyName(party.name, captionRules.allCaps);
        lines.push(`<div class="party-line">${name},</div>`);
    });
    if (data.plaintiffs.length > data.plaintiffs.filter(p => p.isLeadParty).length) {
        lines.push(`<div class="party-line">et al.,</div>`);
    }
    
    const appellantRole = capitalizeRole(data.plaintiffs[0]?.role || 'appellant');
    lines.push(`<div class="party-role-line">${appellantRole}${data.plaintiffs.length > 1 ? 's' : ''}-${data.plaintiffs[0]?.role === 'cross-appellant' ? 'Cross-Appellees' : 'Appellees'},</div>`);
    
    // v.
    lines.push(`<div class="vs-line centered">${getPartySeparator(captionRules.partyFormat)}</div>`);
    
    // Appellees
    data.defendants.filter(p => p.isLeadParty).forEach((party) => {
        const name = formatPartyName(party.name, captionRules.allCaps);
        lines.push(`<div class="party-line">${name},</div>`);
    });
    if (data.defendants.length > data.defendants.filter(p => p.isLeadParty).length) {
        lines.push(`<div class="party-line">et al.,</div>`);
    }
    
    const appelleeRole = capitalizeRole(data.defendants[0]?.role || 'appellee');
    lines.push(`<div class="party-role-line">${appelleeRole}${data.defendants.length > 1 ? 's' : ''}.</div>`);
    
    lines.push(`</div>`); // end parties block
    
    // Document title centered
    lines.push(`<div class="document-title-section centered">`);
    lines.push(`<div class="document-title">${data.documentTitle.toUpperCase()}</div>`);
    lines.push(`</div>`);
    
    return `<div class="caption federal-appellate">${lines.join('\n')}</div>`;
}

// ============================================
// California Templates
// ============================================

/**
 * California Superior Court Caption
 * Includes line numbers and specific formatting
 */
export function generateCaliforniaSuperiorCaption(data: CaptionData, rules: CourtFormattingRules): string {
    const lines: string[] = [];
    const captionRules = rules.caption;
    
    // Attorney info header (lines 1-8 typically)
    lines.push(`<div class="attorney-header">`);
    lines.push(`<!-- Attorney information goes here -->`);
    lines.push(`</div>`);
    
    // Court header
    lines.push(`<div class="caption-header">`);
    lines.push(`<div class="court-name">${data.courtName.toUpperCase()}</div>`);
    if (data.courtDivision) {
        lines.push(`<div class="court-division">COUNTY OF ${data.courtDivision.toUpperCase()}</div>`);
    }
    lines.push(`</div>`);
    
    // Caption table - California uses bordered box
    lines.push(`<table class="caption-table" border="1" cellpadding="10">`);
    lines.push(`<tr>`);
    
    // Left cell - parties
    lines.push(`<td class="parties-cell" width="50%">`);
    
    // Plaintiffs
    data.plaintiffs.filter(p => p.isLeadParty).forEach((party) => {
        const name = formatPartyName(party.name, captionRules.allCaps);
        lines.push(`<div>${name},</div>`);
    });
    if (data.plaintiffs.length > data.plaintiffs.filter(p => p.isLeadParty).length) {
        lines.push(`<div>et al.,</div>`);
    }
    
    lines.push(`<div style="margin-left: 2em;">Plaintiff${data.plaintiffs.length > 1 ? 's' : ''},</div>`);
    lines.push(`<div style="text-align: center; margin: 0.5em 0;">${getPartySeparator(captionRules.partyFormat)}</div>`);
    
    // Defendants
    data.defendants.filter(p => p.isLeadParty).forEach((party) => {
        const name = formatPartyName(party.name, captionRules.allCaps);
        lines.push(`<div>${name},</div>`);
    });
    if (data.defendants.length > data.defendants.filter(p => p.isLeadParty).length) {
        lines.push(`<div>et al.,</div>`);
    }
    
    lines.push(`<div style="margin-left: 2em;">Defendant${data.defendants.length > 1 ? 's' : ''}.</div>`);
    lines.push(`</td>`);
    
    // Right cell - case info
    lines.push(`<td class="info-cell" valign="top">`);
    lines.push(`<div class="case-number">Case No. ${data.caseNumber}</div>`);
    
    if (data.department && captionRules.includeDepartment) {
        lines.push(`<div class="department">Dept. ${data.department}</div>`);
    }
    
    if (data.judgeName && captionRules.includeJudgeName) {
        lines.push(`<div class="judge">Assigned to Hon. ${data.judgeName}</div>`);
    }
    
    lines.push(`<div class="document-title" style="margin-top: 1em; font-weight: bold;">${data.documentTitle.toUpperCase()}</div>`);
    
    if (data.hearingDate) {
        lines.push(`<div class="hearing-info" style="margin-top: 1em;">`);
        lines.push(`<div>Date: ${data.hearingDate}</div>`);
        if (data.hearingTime) {
            lines.push(`<div>Time: ${data.hearingTime}</div>`);
        }
        if (data.hearingLocation) {
            lines.push(`<div>Dept: ${data.hearingLocation}</div>`);
        }
        lines.push(`</div>`);
    }
    
    lines.push(`</td>`);
    lines.push(`</tr>`);
    lines.push(`</table>`);
    
    return `<div class="caption california-superior">${lines.join('\n')}</div>`;
}

/**
 * California Court of Appeal Caption
 */
export function generateCaliforniaAppellateCaption(data: CaptionData, rules: CourtFormattingRules): string {
    const lines: string[] = [];
    const captionRules = rules.caption;
    
    // Court header
    lines.push(`<div class="caption-header centered">`);
    lines.push(`<div class="court-name">IN THE COURT OF APPEAL OF THE STATE OF CALIFORNIA</div>`);
    if (data.courtDivision) {
        lines.push(`<div class="court-division">${data.courtDivision.toUpperCase()} APPELLATE DISTRICT</div>`);
    }
    lines.push(`</div>`);
    
    // Case number
    lines.push(`<div class="case-number-block centered">`);
    lines.push(`<div class="case-number">${data.caseNumber}</div>`);
    lines.push(`</div>`);
    
    // Parties block (centered)
    lines.push(`<div class="parties-block centered">`);
    
    data.plaintiffs.filter(p => p.isLeadParty).forEach(party => {
        const name = formatPartyName(party.name, captionRules.allCaps);
        lines.push(`<div>${name},</div>`);
    });
    
    const appellantRole = data.plaintiffs[0]?.role || 'appellant';
    lines.push(`<div class="role-line">${capitalizeRole(appellantRole)}${data.plaintiffs.length > 1 ? 's' : ''},</div>`);
    
    lines.push(`<div class="vs-line">${getPartySeparator(captionRules.partyFormat)}</div>`);
    
    data.defendants.filter(p => p.isLeadParty).forEach(party => {
        const name = formatPartyName(party.name, captionRules.allCaps);
        lines.push(`<div>${name},</div>`);
    });
    
    const respondentRole = data.defendants[0]?.role || 'respondent';
    lines.push(`<div class="role-line">${capitalizeRole(respondentRole)}${data.defendants.length > 1 ? 's' : ''}.</div>`);
    
    lines.push(`</div>`);
    
    // Document title
    lines.push(`<div class="document-title-block centered">`);
    lines.push(`<div class="document-title">${data.documentTitle.toUpperCase()}</div>`);
    lines.push(`</div>`);
    
    // Appeal from Superior Court notice
    lines.push(`<div class="appeal-notice centered">`);
    lines.push(`<div class="appeal-from">On Appeal from the Superior Court of ${data.courtDivision || '____________'} County</div>`);
    if (data.judgeName) {
        lines.push(`<div class="lower-court-judge">Hon. ${data.judgeName}, Judge</div>`);
    }
    lines.push(`</div>`);
    
    return `<div class="caption california-appellate">${lines.join('\n')}</div>`;
}

// ============================================
// New York Templates
// ============================================

/**
 * New York Supreme Court Caption
 */
export function generateNewYorkSupremeCaption(data: CaptionData, rules: CourtFormattingRules): string {
    const lines: string[] = [];
    const captionRules = rules.caption;
    
    // Venue header
    lines.push(`<div class="venue-header">`);
    lines.push(`<div class="state-line">${data.courtName.toUpperCase()}</div>`);
    if (data.courtDivision) {
        lines.push(`<div class="county-line">COUNTY OF ${data.courtDivision.toUpperCase()}</div>`);
    }
    lines.push(`</div>`);
    
    // Dashed line
    lines.push(`<div class="caption-separator">-------------------------------------------------------x</div>`);
    
    // Parties section
    lines.push(`<div class="parties-section">`);
    
    // Plaintiffs
    data.plaintiffs.filter(p => p.isLeadParty).forEach((party) => {
        const name = formatPartyName(party.name, captionRules.allCaps);
        lines.push(`<div class="party-line">${name},</div>`);
    });
    
    const plaintiffRole = capitalizeRole(data.plaintiffs[0]?.role || 'plaintiff');
    lines.push(`<div class="role-line" style="margin-left: 4em;">${plaintiffRole}${data.plaintiffs.length > 1 ? 's' : ''},</div>`);
    
    // vs. with index number
    lines.push(`<div class="vs-section">`);
    lines.push(`<span class="vs-text">- against -</span>`);
    lines.push(`<span class="index-number">Index No. ${data.caseNumber}</span>`);
    lines.push(`</div>`);
    
    // Defendants
    data.defendants.filter(p => p.isLeadParty).forEach((party) => {
        const name = formatPartyName(party.name, captionRules.allCaps);
        lines.push(`<div class="party-line">${name},</div>`);
    });
    
    const defendantRole = capitalizeRole(data.defendants[0]?.role || 'defendant');
    lines.push(`<div class="role-line" style="margin-left: 4em;">${defendantRole}${data.defendants.length > 1 ? 's' : ''}.</div>`);
    
    lines.push(`</div>`);
    
    // Closing dashed line
    lines.push(`<div class="caption-separator">-------------------------------------------------------x</div>`);
    
    // Document title
    lines.push(`<div class="document-title-block centered">`);
    lines.push(`<div class="document-title">${data.documentTitle.toUpperCase()}</div>`);
    lines.push(`</div>`);
    
    return `<div class="caption new-york-supreme">${lines.join('\n')}</div>`;
}

// ============================================
// Texas Templates
// ============================================

/**
 * Texas State Court Caption
 */
export function generateTexasCaption(data: CaptionData, rules: CourtFormattingRules): string {
    const lines: string[] = [];
    const captionRules = rules.caption;
    
    // Cause number at top right
    lines.push(`<div class="cause-number-header" style="text-align: right;">`);
    lines.push(`<div class="cause-number">CAUSE NO. ${data.caseNumber}</div>`);
    lines.push(`</div>`);
    
    // Parties with § separator column
    lines.push(`<table class="caption-table" width="100%">`);
    lines.push(`<tr>`);
    
    // Left column - plaintiffs
    lines.push(`<td width="45%">`);
    data.plaintiffs.filter(p => p.isLeadParty).forEach((party) => {
        const name = formatPartyName(party.name, captionRules.allCaps);
        lines.push(`<div>${name},</div>`);
    });
    if (data.plaintiffs.length > data.plaintiffs.filter(p => p.isLeadParty).length) {
        lines.push(`<div>et al.,</div>`);
    }
    const plaintiffRole = capitalizeRole(data.plaintiffs[0]?.role || 'plaintiff');
    lines.push(`<div style="margin-top: 0.5em; margin-left: 2em;">${plaintiffRole}${data.plaintiffs.length > 1 ? 's' : ''}</div>`);
    lines.push(`</td>`);
    
    // Middle column - section symbols
    lines.push(`<td width="10%" style="text-align: center; vertical-align: middle;">`);
    lines.push(`<div>&sect;</div>`);
    lines.push(`<div>&sect;</div>`);
    lines.push(`<div>&sect;</div>`);
    lines.push(`<div>&sect;</div>`);
    lines.push(`<div>&sect;</div>`);
    lines.push(`</td>`);
    
    // Right column - court info
    lines.push(`<td width="45%">`);
    lines.push(`<div>IN THE ${data.courtDivision || 'DISTRICT'} COURT</div>`);
    lines.push(`<div>&nbsp;</div>`);
    if (data.department) {
        lines.push(`<div>${data.department.toUpperCase()} JUDICIAL DISTRICT</div>`);
    }
    lines.push(`<div>&nbsp;</div>`);
    lines.push(`<div>${data.courtDivision?.toUpperCase() || '____________'} COUNTY, TEXAS</div>`);
    lines.push(`</td>`);
    
    lines.push(`</tr>`);
    lines.push(`</table>`);
    
    // VS and defendants
    lines.push(`<table class="caption-table" width="100%">`);
    lines.push(`<tr>`);
    
    lines.push(`<td width="45%">`);
    lines.push(`<div style="text-align: center; margin: 0.5em 0;">${getPartySeparator(captionRules.partyFormat).toUpperCase()}</div>`);
    data.defendants.filter(p => p.isLeadParty).forEach((party) => {
        const name = formatPartyName(party.name, captionRules.allCaps);
        lines.push(`<div>${name},</div>`);
    });
    if (data.defendants.length > data.defendants.filter(p => p.isLeadParty).length) {
        lines.push(`<div>et al.,</div>`);
    }
    const defendantRole = capitalizeRole(data.defendants[0]?.role || 'defendant');
    lines.push(`<div style="margin-top: 0.5em; margin-left: 2em;">${defendantRole}${data.defendants.length > 1 ? 's' : ''}</div>`);
    lines.push(`</td>`);
    
    lines.push(`<td width="55%"></td>`);
    
    lines.push(`</tr>`);
    lines.push(`</table>`);
    
    // Document title
    lines.push(`<div class="document-title-block centered" style="margin-top: 2em;">`);
    lines.push(`<div class="document-title">${data.documentTitle.toUpperCase()}</div>`);
    lines.push(`</div>`);
    
    return `<div class="caption texas">${lines.join('\n')}</div>`;
}

// ============================================
// Template Registry
// ============================================

export const CAPTION_TEMPLATES: CaptionTemplate[] = [
    {
        id: 'federal-district',
        name: 'Federal District Court',
        jurisdictions: ['Federal', 'N.D. Cal.', 'S.D.N.Y.', 'C.D. Cal.', 'D. Del.'],
        generateCaption: generateFederalDistrictCaption,
    },
    {
        id: 'federal-appellate',
        name: 'Federal Court of Appeals',
        jurisdictions: ['9th Circuit', 'Federal'],
        generateCaption: generateFederalAppellateCaption,
    },
    {
        id: 'california-superior',
        name: 'California Superior Court',
        jurisdictions: ['California - Los Angeles', 'California'],
        generateCaption: generateCaliforniaSuperiorCaption,
    },
    {
        id: 'california-appellate',
        name: 'California Court of Appeal',
        jurisdictions: ['California'],
        generateCaption: generateCaliforniaAppellateCaption,
    },
    {
        id: 'new-york-supreme',
        name: 'New York Supreme Court',
        jurisdictions: ['New York'],
        generateCaption: generateNewYorkSupremeCaption,
    },
    {
        id: 'texas',
        name: 'Texas State Courts',
        jurisdictions: ['Texas'],
        generateCaption: generateTexasCaption,
    },
];

/**
 * Get the appropriate caption template for a jurisdiction
 */
export function getCaptionTemplate(jurisdiction: string): CaptionTemplate | undefined {
    return CAPTION_TEMPLATES.find(t => 
        t.jurisdictions.some(j => 
            jurisdiction.toLowerCase().includes(j.toLowerCase()) ||
            j.toLowerCase().includes(jurisdiction.toLowerCase())
        )
    );
}

/**
 * Generate caption using the appropriate template
 */
export function generateCaptionForJurisdiction(
    data: CaptionData,
    rules: CourtFormattingRules
): string {
    const template = getCaptionTemplate(rules.jurisdiction);
    
    if (template) {
        return template.generateCaption(data, rules);
    }
    
    // Default to federal district format
    return generateFederalDistrictCaption(data, rules);
}

// ============================================
// Helper Functions
// ============================================

function capitalizeRole(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1).replace(/-/g, '-');
}

/**
 * Generate CSS for caption templates
 */
export function generateCaptionStyles(): string {
    return `
        .caption {
            margin-bottom: 2em;
        }
        
        .caption-header {
            text-align: center;
            margin-bottom: 1.5em;
        }
        
        .caption-header.centered {
            text-align: center;
        }
        
        .court-name {
            font-weight: bold;
            font-size: 1.1em;
        }
        
        .caption-box {
            display: flex;
            border: 1px solid black;
            margin: 1em 0;
        }
        
        .caption-parties {
            flex: 1;
            padding: 1em;
            border-right: 1px solid black;
        }
        
        .caption-info {
            width: 40%;
            padding: 1em;
        }
        
        .party-name {
            margin: 0.25em 0;
        }
        
        .party-vs {
            text-align: center;
            margin: 0.5em 0;
            font-weight: bold;
        }
        
        .case-number {
            font-weight: bold;
        }
        
        .document-title {
            font-weight: bold;
            text-decoration: underline;
            text-align: center;
            margin-top: 1em;
        }
        
        .caption-separator {
            font-family: monospace;
            margin: 0.5em 0;
        }
        
        .vs-section {
            display: flex;
            justify-content: space-between;
            margin: 1em 0;
        }
        
        /* California specific */
        .california-superior .caption-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .california-superior .parties-cell,
        .california-superior .info-cell {
            vertical-align: top;
            padding: 1em;
        }
        
        /* New York specific */
        .new-york-supreme .vs-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        /* Texas specific */
        .texas .caption-table {
            border-collapse: collapse;
        }
        
        .texas .caption-table td {
            vertical-align: top;
            padding: 0.25em;
        }
        
        .centered {
            text-align: center;
        }
    `;
}

