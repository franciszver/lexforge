/**
 * Document Formatter Service
 * Formats legal documents according to court-specific rules.
 */

import type {
    CourtFormattingRules,
    CaptionData,
    AttorneyInfo,
    ServiceInfo,
    FormattedDocument,
    ComplianceResult,
    ComplianceViolation,
    ComplianceWarning,
    DocumentCategory,
} from './courtFormattingTypes';
import {
    inchesToCss,
    pointsToCss,
    formatPartyName,
    getPartySeparator,
    calculateWordCount,
    estimatePageCount,
} from './courtFormattingTypes';
import { format } from 'date-fns';

// ============================================
// Caption Generation
// ============================================

/**
 * Generate a formatted caption for a legal document
 */
export function generateCaption(
    data: CaptionData,
    rules: CourtFormattingRules
): string {
    const lines: string[] = [];
    const captionRules = rules.caption;
    
    // Court name
    if (captionRules.includeCourtName) {
        lines.push(`<div class="caption-court">${data.courtName.toUpperCase()}</div>`);
    }
    
    // Division/Department
    if (data.courtDivision) {
        lines.push(`<div class="caption-division">${data.courtDivision}</div>`);
    }
    if (captionRules.includeDepartment && data.department) {
        lines.push(`<div class="caption-department">Department ${data.department}</div>`);
    }
    
    // Parties block
    lines.push('<div class="caption-parties">');
    
    // Plaintiffs/Petitioners
    const plaintiffNames = data.plaintiffs
        .filter(p => p.isLeadParty)
        .map(p => formatPartyName(p.name, captionRules.allCaps));
    
    if (plaintiffNames.length > 0) {
        lines.push(`<div class="party-block plaintiff">`);
        plaintiffNames.forEach((name, i) => {
            lines.push(`<div class="party-name">${name}${i < plaintiffNames.length - 1 ? ',' : ''}</div>`);
        });
        if (data.plaintiffs.length > plaintiffNames.length) {
            lines.push(`<div class="party-etal">et al.,</div>`);
        }
        const plaintiffRole = data.plaintiffs[0]?.role || 'plaintiff';
        lines.push(`<div class="party-role">${capitalizeRole(plaintiffRole)}${data.plaintiffs.length > 1 ? 's' : ''},</div>`);
        lines.push('</div>');
    }
    
    // Separator
    lines.push(`<div class="party-separator">${getPartySeparator(captionRules.partyFormat)}</div>`);
    
    // Defendants/Respondents
    const defendantNames = data.defendants
        .filter(p => p.isLeadParty)
        .map(p => formatPartyName(p.name, captionRules.allCaps));
    
    if (defendantNames.length > 0) {
        lines.push(`<div class="party-block defendant">`);
        defendantNames.forEach((name, i) => {
            lines.push(`<div class="party-name">${name}${i < defendantNames.length - 1 ? ',' : ''}</div>`);
        });
        if (data.defendants.length > defendantNames.length) {
            lines.push(`<div class="party-etal">et al.,</div>`);
        }
        const defendantRole = data.defendants[0]?.role || 'defendant';
        lines.push(`<div class="party-role">${capitalizeRole(defendantRole)}${data.defendants.length > 1 ? 's' : ''}.</div>`);
        lines.push('</div>');
    }
    
    lines.push('</div>'); // end caption-parties
    
    // Case number and judge
    lines.push('<div class="caption-case-info">');
    if (captionRules.includeCaseNumber) {
        lines.push(`<div class="case-number">Case No. ${data.caseNumber}</div>`);
    }
    if (captionRules.includeJudgeName && data.judgeName) {
        lines.push(`<div class="judge-name">Hon. ${data.judgeName}</div>`);
    }
    lines.push('</div>');
    
    // Document title
    lines.push(`<div class="document-title">${data.documentTitle.toUpperCase()}</div>`);
    
    // Hearing info
    if (data.hearingDate) {
        lines.push('<div class="hearing-info">');
        lines.push(`<div>Date: ${data.hearingDate}</div>`);
        if (data.hearingTime) {
            lines.push(`<div>Time: ${data.hearingTime}</div>`);
        }
        if (data.hearingLocation) {
            lines.push(`<div>Location: ${data.hearingLocation}</div>`);
        }
        lines.push('</div>');
    }
    
    return `<div class="caption">${lines.join('\n')}</div>`;
}

/**
 * Generate a signature block
 */
export function generateSignatureBlock(
    attorney: AttorneyInfo,
    rules: CourtFormattingRules
): string {
    const sigRules = rules.signature;
    const lines: string[] = [];
    
    lines.push('<div class="signature-block">');
    
    // Respectfully submitted
    lines.push('<div class="signature-intro">Respectfully submitted,</div>');
    
    // Signature line
    lines.push('<div class="signature-line">');
    lines.push('<div class="signature-placeholder">_______________________________</div>');
    lines.push(`<div class="signature-name">${attorney.name}</div>`);
    lines.push('</div>');
    
    // Attorney info
    lines.push('<div class="attorney-info">');
    
    if (sigRules.includeBarNumber) {
        lines.push(`<div>${attorney.barState} Bar No. ${attorney.barNumber}</div>`);
    }
    
    if (attorney.firmName) {
        lines.push(`<div class="firm-name">${attorney.firmName}</div>`);
    }
    
    if (sigRules.includeAddress) {
        attorney.address.forEach(line => {
            lines.push(`<div>${line}</div>`);
        });
    }
    
    if (sigRules.includePhone) {
        lines.push(`<div>Telephone: ${attorney.phone}</div>`);
    }
    
    if (sigRules.includeFax && attorney.fax) {
        lines.push(`<div>Facsimile: ${attorney.fax}</div>`);
    }
    
    if (sigRules.includeEmail) {
        lines.push(`<div>Email: ${attorney.email}</div>`);
    }
    
    lines.push(`<div class="representing">Attorney for ${attorney.representingParty}</div>`);
    
    lines.push('</div>'); // end attorney-info
    lines.push('</div>'); // end signature-block
    
    return lines.join('\n');
}

/**
 * Generate a certificate of service
 */
export function generateCertificateOfService(
    services: ServiceInfo[],
    declarantName: string,
    rules: CourtFormattingRules
): string {
    const certRules = rules.certificateOfService;
    const lines: string[] = [];
    
    lines.push('<div class="certificate-of-service">');
    
    // Title
    const titleText = certRules.format === 'declaration' 
        ? 'PROOF OF SERVICE' 
        : certRules.format === 'affidavit'
            ? 'AFFIDAVIT OF SERVICE'
            : 'CERTIFICATE OF SERVICE';
    
    lines.push(`<div class="cert-title">${titleText}</div>`);
    
    // Opening
    if (certRules.format === 'declaration') {
        lines.push('<div class="cert-opening">');
        lines.push(`<p>I, ${declarantName}, declare as follows:</p>`);
        lines.push('</div>');
    } else if (certRules.format === 'affidavit') {
        lines.push('<div class="cert-opening">');
        lines.push('<p>STATE OF ____________</p>');
        lines.push('<p>COUNTY OF ____________</p>');
        lines.push(`<p>${declarantName}, being duly sworn, deposes and says:</p>`);
        lines.push('</div>');
    } else {
        lines.push('<div class="cert-opening">');
        lines.push(`<p>I hereby certify that on ${format(new Date(), 'MMMM d, yyyy')}, I served the foregoing document on the following parties:</p>`);
        lines.push('</div>');
    }
    
    // Service details
    lines.push('<div class="service-details">');
    services.forEach((service, index) => {
        lines.push(`<div class="service-item">`);
        lines.push(`<p><strong>${index + 1}. ${service.recipientName}</strong></p>`);
        
        if (service.recipientAddress) {
            lines.push(`<p class="address">${service.recipientAddress}</p>`);
        }
        
        const methodText = getServiceMethodText(service.method);
        lines.push(`<p class="method">via ${methodText}</p>`);
        
        if (service.recipientEmail && service.method === 'email') {
            lines.push(`<p class="email">${service.recipientEmail}</p>`);
        }
        
        lines.push('</div>');
    });
    lines.push('</div>');
    
    // Closing
    if (certRules.format === 'declaration') {
        lines.push('<div class="cert-closing">');
        lines.push('<p>I declare under penalty of perjury under the laws of the United States of America that the foregoing is true and correct.</p>');
        lines.push(`<p>Executed on ${format(new Date(), 'MMMM d, yyyy')}.</p>`);
        lines.push('<div class="signature-line">');
        lines.push('<div class="signature-placeholder">_______________________________</div>');
        lines.push(`<div class="signature-name">${declarantName}</div>`);
        lines.push('</div>');
        lines.push('</div>');
    } else if (certRules.format === 'affidavit') {
        lines.push('<div class="cert-closing">');
        lines.push('<div class="signature-line">');
        lines.push('<div class="signature-placeholder">_______________________________</div>');
        lines.push(`<div class="signature-name">${declarantName}</div>`);
        lines.push('</div>');
        lines.push('<p>Subscribed and sworn to before me this ____ day of ____________, 20____.</p>');
        lines.push('<div class="notary-line">');
        lines.push('<div class="signature-placeholder">_______________________________</div>');
        lines.push('<div class="notary-title">Notary Public</div>');
        lines.push('</div>');
        lines.push('</div>');
    } else {
        lines.push('<div class="cert-closing">');
        lines.push('<div class="signature-line">');
        lines.push('<div class="signature-placeholder">_______________________________</div>');
        lines.push(`<div class="signature-name">${declarantName}</div>`);
        lines.push('</div>');
        lines.push('</div>');
    }
    
    lines.push('</div>'); // end certificate-of-service
    
    return lines.join('\n');
}

/**
 * Generate table of contents
 */
export function generateTableOfContents(
    headings: { text: string; page: number; level: number }[],
    rules: CourtFormattingRules
): string {
    const tocRules = rules.tableOfContents;
    if (!tocRules?.required) return '';
    
    const lines: string[] = [];
    lines.push('<div class="table-of-contents">');
    lines.push('<div class="toc-title">TABLE OF CONTENTS</div>');
    lines.push('<div class="toc-entries">');
    
    headings.forEach(heading => {
        const indent = heading.level > 1 ? `margin-left: ${(heading.level - 1) * 20}px;` : '';
        const dots = tocRules.format === 'dotted' ? '<span class="toc-dots"></span>' : '';
        const pageNum = tocRules.includePageNumbers ? `<span class="toc-page">${heading.page}</span>` : '';
        
        lines.push(`<div class="toc-entry level-${heading.level}" style="${indent}">`);
        lines.push(`<span class="toc-text">${heading.text}</span>`);
        lines.push(dots);
        lines.push(pageNum);
        lines.push('</div>');
    });
    
    lines.push('</div>');
    lines.push('</div>');
    
    return lines.join('\n');
}

/**
 * Generate table of authorities
 */
export function generateTableOfAuthorities(
    citations: { text: string; pages: number[]; category: string }[],
    rules: CourtFormattingRules
): string {
    const toaRules = rules.tableOfAuthorities;
    if (!toaRules?.required) return '';
    
    const lines: string[] = [];
    lines.push('<div class="table-of-authorities">');
    lines.push('<div class="toa-title">TABLE OF AUTHORITIES</div>');
    
    if (toaRules.categorize) {
        // Group by category
        const byCategory: Record<string, typeof citations> = {};
        citations.forEach(cit => {
            if (!byCategory[cit.category]) {
                byCategory[cit.category] = [];
            }
            byCategory[cit.category].push(cit);
        });
        
        // Output in category order
        toaRules.categories.forEach(category => {
            if (byCategory[category]?.length) {
                lines.push(`<div class="toa-category">`);
                lines.push(`<div class="toa-category-title">${category}</div>`);
                byCategory[category].forEach(cit => {
                    lines.push(`<div class="toa-entry">`);
                    lines.push(`<span class="toa-citation">${cit.text}</span>`);
                    lines.push(`<span class="toa-dots"></span>`);
                    lines.push(`<span class="toa-pages">${cit.pages.join(', ')}</span>`);
                    lines.push('</div>');
                });
                lines.push('</div>');
            }
        });
    } else {
        // Flat list
        citations.forEach(cit => {
            lines.push(`<div class="toa-entry">`);
            lines.push(`<span class="toa-citation">${cit.text}</span>`);
            lines.push(`<span class="toa-dots"></span>`);
            lines.push(`<span class="toa-pages">${cit.pages.join(', ')}</span>`);
            lines.push('</div>');
        });
    }
    
    lines.push('</div>');
    
    return lines.join('\n');
}

// ============================================
// CSS Generation
// ============================================

/**
 * Generate CSS styles for a document based on court rules
 */
export function generateDocumentStyles(rules: CourtFormattingRules): string {
    const { font, margins, page } = rules;
    
    return `
        @page {
            size: ${page.size} ${page.orientation};
            margin: ${inchesToCss(margins.top)} ${inchesToCss(margins.right)} ${inchesToCss(margins.bottom)} ${inchesToCss(margins.left)};
        }
        
        body {
            font-family: ${font.family.map(f => `"${f}"`).join(', ')}, serif;
            font-size: ${pointsToCss(font.sizeBody)};
            line-height: ${font.lineHeight};
            margin: 0;
            padding: 0;
        }
        
        .caption {
            text-align: center;
            margin-bottom: 2em;
        }
        
        .caption-court {
            font-weight: bold;
            margin-bottom: 1em;
        }
        
        .caption-parties {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin: 1em 0;
            border: 1px solid black;
            padding: 1em;
            width: 50%;
            margin-left: auto;
            margin-right: auto;
        }
        
        .party-block {
            margin: 0.5em 0;
        }
        
        .party-separator {
            margin: 0.5em 0;
            font-weight: bold;
        }
        
        .caption-case-info {
            text-align: right;
            position: absolute;
            right: ${inchesToCss(margins.right)};
            top: ${inchesToCss(margins.top)};
        }
        
        .document-title {
            font-weight: bold;
            text-align: center;
            margin-top: 1em;
            text-decoration: underline;
        }
        
        .signature-block {
            margin-top: 3em;
            page-break-inside: avoid;
        }
        
        .signature-intro {
            margin-bottom: 3em;
        }
        
        .signature-line {
            margin-bottom: 1em;
        }
        
        .signature-placeholder {
            margin-bottom: 0.25em;
        }
        
        .attorney-info {
            margin-top: 1em;
        }
        
        .certificate-of-service {
            page-break-before: always;
            margin-top: 2em;
        }
        
        .cert-title {
            font-weight: bold;
            text-align: center;
            margin-bottom: 1em;
            text-decoration: underline;
        }
        
        .service-item {
            margin: 1em 0;
            margin-left: 2em;
        }
        
        .table-of-contents,
        .table-of-authorities {
            page-break-after: always;
        }
        
        .toc-title,
        .toa-title {
            font-weight: bold;
            text-align: center;
            margin-bottom: 1em;
        }
        
        .toc-entry,
        .toa-entry {
            display: flex;
            justify-content: space-between;
            margin: 0.25em 0;
        }
        
        .toc-dots,
        .toa-dots {
            flex: 1;
            border-bottom: 1px dotted black;
            margin: 0 0.5em;
            margin-bottom: 0.25em;
        }
        
        .toa-category {
            margin-bottom: 1em;
        }
        
        .toa-category-title {
            font-weight: bold;
            font-style: italic;
            margin-bottom: 0.5em;
        }
        
        h1, h2, h3, h4 {
            page-break-after: avoid;
        }
        
        p {
            text-indent: 0.5in;
            margin: 0;
            margin-bottom: ${font.lineHeight === 2 ? '0' : '1em'};
        }
        
        .no-indent {
            text-indent: 0;
        }
        
        blockquote {
            margin: 1em 0.5in;
            font-size: ${pointsToCss(font.sizeBody - 1)};
        }
        
        .footnote {
            font-size: ${pointsToCss(font.sizeFootnotes)};
        }
        
        @media print {
            .page-number {
                position: fixed;
                ${page.numbering === 'bottom-center' ? 'bottom: 0.5in; left: 50%; transform: translateX(-50%);' : ''}
                ${page.numbering === 'bottom-right' ? 'bottom: 0.5in; right: ' + inchesToCss(margins.right) + ';' : ''}
                ${page.numbering === 'top-right' ? 'top: 0.5in; right: ' + inchesToCss(margins.right) + ';' : ''}
            }
        }
    `;
}

// ============================================
// Compliance Validation
// ============================================

/**
 * Validate document compliance with court rules
 */
export function validateCompliance(
    content: string,
    rules: CourtFormattingRules,
    documentType?: DocumentCategory
): ComplianceResult {
    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceWarning[] = [];
    
    // Get document-specific rules if available
    const effectiveRules = documentType && rules.documentOverrides?.[documentType]
        ? { ...rules, ...rules.documentOverrides[documentType] }
        : rules;
    
    // Check word count
    const wordCount = calculateWordCount(content);
    if (effectiveRules.wordCount?.hasLimit) {
        if (effectiveRules.wordCount.maxWords && wordCount > effectiveRules.wordCount.maxWords) {
            violations.push({
                rule: 'Word Count',
                description: `Document exceeds word limit of ${effectiveRules.wordCount.maxWords} words (current: ${wordCount})`,
                severity: 'error',
                suggestion: `Reduce content by ${wordCount - effectiveRules.wordCount.maxWords} words`,
            });
        }
        
        if (effectiveRules.wordCount.maxPages) {
            const pageCount = estimatePageCount(wordCount);
            if (pageCount > effectiveRules.wordCount.maxPages) {
                violations.push({
                    rule: 'Page Limit',
                    description: `Document may exceed page limit of ${effectiveRules.wordCount.maxPages} pages (estimated: ${pageCount})`,
                    severity: 'warning',
                    suggestion: 'Review document length',
                });
            }
        }
    }
    
    // Check for required elements
    if (effectiveRules.tableOfContents?.required && !content.includes('TABLE OF CONTENTS')) {
        violations.push({
            rule: 'Table of Contents',
            description: 'Table of Contents is required but not found',
            severity: 'error',
            suggestion: 'Add a Table of Contents',
        });
    }
    
    if (effectiveRules.tableOfAuthorities?.required && !content.includes('TABLE OF AUTHORITIES')) {
        violations.push({
            rule: 'Table of Authorities',
            description: 'Table of Authorities is required but not found',
            severity: 'error',
            suggestion: 'Add a Table of Authorities',
        });
    }
    
    if (effectiveRules.certificateOfService.required) {
        const hasCert = content.includes('CERTIFICATE OF SERVICE') || 
                       content.includes('PROOF OF SERVICE') ||
                       content.includes('AFFIDAVIT OF SERVICE');
        if (!hasCert) {
            violations.push({
                rule: 'Certificate of Service',
                description: 'Certificate/Proof of Service is required but not found',
                severity: 'error',
                suggestion: 'Add a Certificate of Service',
            });
        }
    }
    
    // Check for common issues
    if (content.includes('  ')) {
        warnings.push({
            rule: 'Formatting',
            description: 'Document contains double spaces',
            suggestion: 'Replace double spaces with single spaces',
        });
    }
    
    // Check for signature block
    if (!content.includes('Respectfully submitted') && !content.includes('respectfully submitted')) {
        warnings.push({
            rule: 'Signature Block',
            description: 'No signature block detected',
            suggestion: 'Add a proper signature block',
        });
    }
    
    return {
        isCompliant: violations.filter(v => v.severity === 'error').length === 0,
        violations,
        warnings,
    };
}

// ============================================
// Full Document Formatting
// ============================================

/**
 * Format a complete legal document
 */
export function formatDocument(
    body: string,
    captionData: CaptionData,
    attorney: AttorneyInfo,
    services: ServiceInfo[],
    rules: CourtFormattingRules,
    headings?: { text: string; page: number; level: number }[],
    citations?: { text: string; pages: number[]; category: string }[]
): FormattedDocument {
    // Generate components
    const caption = generateCaption(captionData, rules);
    const signature = generateSignatureBlock(attorney, rules);
    const certificate = rules.certificateOfService.required
        ? generateCertificateOfService(services, attorney.name, rules)
        : undefined;
    const toc = headings ? generateTableOfContents(headings, rules) : undefined;
    const toa = citations ? generateTableOfAuthorities(citations, rules) : undefined;
    
    // Calculate word count (excluding caption, TOC, TOA, signature, certificate)
    const wordCount = calculateWordCount(body);
    const pageCount = estimatePageCount(wordCount);
    
    // Validate compliance
    const fullContent = [caption, toc, toa, body, signature, certificate].filter(Boolean).join('\n');
    const compliance = validateCompliance(fullContent, rules);
    
    return {
        caption,
        tableOfContents: toc,
        tableOfAuthorities: toa,
        body,
        signature,
        certificateOfService: certificate,
        wordCount,
        pageCount,
        compliance,
    };
}

/**
 * Generate complete HTML document with styles
 */
export function generateFullHtml(
    formattedDoc: FormattedDocument,
    rules: CourtFormattingRules,
    title: string
): string {
    const styles = generateDocumentStyles(rules);
    
    const sections = [
        formattedDoc.tableOfContents,
        formattedDoc.tableOfAuthorities,
        formattedDoc.caption,
        formattedDoc.body,
        formattedDoc.signature,
        formattedDoc.certificateOfService,
    ].filter(Boolean).join('\n');
    
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>${styles}</style>
</head>
<body>
${sections}
</body>
</html>`;
}

// ============================================
// Helper Functions
// ============================================

function capitalizeRole(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
}

function getServiceMethodText(method: ServiceInfo['method']): string {
    switch (method) {
        case 'ecf':
            return 'the Court\'s CM/ECF electronic filing system';
        case 'email':
            return 'electronic mail';
        case 'mail':
            return 'United States mail, first-class postage prepaid';
        case 'personal':
            return 'personal service';
        case 'overnight':
            return 'overnight delivery service';
        case 'fax':
            return 'facsimile transmission';
        default:
            return method;
    }
}

/**
 * Extract headings from HTML content for TOC generation
 */
export function extractHeadings(html: string): { text: string; page: number; level: number }[] {
    const headings: { text: string; page: number; level: number }[] = [];
    const regex = /<h([1-4])[^>]*>([^<]+)<\/h[1-4]>/gi;
    let match;
    let currentPage = 1;
    
    while ((match = regex.exec(html)) !== null) {
        headings.push({
            level: parseInt(match[1], 10),
            text: match[2].trim(),
            page: currentPage,
        });
    }
    
    return headings;
}

/**
 * Word count declaration text
 */
export function generateWordCountDeclaration(wordCount: number, rules: CourtFormattingRules): string {
    if (!rules.wordCount?.requireDeclaration) return '';
    
    const maxWords = rules.wordCount.maxWords;
    return `<div class="word-count-declaration">
        <p>This document complies with the word limit of ${rules.localRulesCitation || 'applicable rules'} because, excluding the parts of the document exempted, this document contains ${wordCount.toLocaleString()} words${maxWords ? ` (limit: ${maxWords.toLocaleString()})` : ''}.</p>
    </div>`;
}

