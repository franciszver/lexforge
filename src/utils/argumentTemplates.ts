/**
 * Argument Templates
 * Pre-defined argument structures for common legal scenarios.
 */

import type { ArgumentTemplate, ArgumentTemplateSection } from './argumentTypes';

// ============================================
// Template Definitions
// ============================================

export const ARGUMENT_TEMPLATES: ArgumentTemplate[] = [
    // Motion to Dismiss
    {
        id: 'mtd-12b6',
        name: 'Motion to Dismiss (12(b)(6))',
        description: 'Federal Rule of Civil Procedure 12(b)(6) motion for failure to state a claim',
        documentType: 'Motion to Dismiss',
        category: 'Civil Procedure',
        structure: [
            {
                id: 'intro',
                name: 'Introduction',
                type: 'introduction',
                order: 0,
                promptGuidance: 'Briefly introduce the motion, identify the parties, and state the relief sought.',
                requiredElements: ['Party identification', 'Relief sought', 'Legal standard preview'],
                suggestedLength: 'short',
            },
            {
                id: 'legal-standard',
                name: 'Legal Standard',
                type: 'argument',
                order: 1,
                promptGuidance: 'Set forth the legal standard for a 12(b)(6) motion. Cite Twombly and Iqbal.',
                requiredElements: ['12(b)(6) standard', 'Twombly/Iqbal plausibility', 'Court deference rules'],
                suggestedLength: 'medium',
            },
            {
                id: 'arg-1',
                name: 'Failure to State a Claim',
                type: 'argument',
                order: 2,
                promptGuidance: 'Argue why the complaint fails to state a plausible claim. Address specific elements missing.',
                requiredElements: ['Missing elements', 'Conclusory allegations', 'Factual deficiencies'],
                suggestedLength: 'long',
            },
            {
                id: 'arg-2',
                name: 'Alternative Grounds',
                type: 'argument',
                order: 3,
                promptGuidance: 'Present any alternative grounds for dismissal (immunity, statute of limitations, etc.).',
                suggestedLength: 'medium',
            },
            {
                id: 'counter',
                name: 'Anticipated Opposition',
                type: 'counter',
                order: 4,
                promptGuidance: 'Address likely arguments from the opposing party and explain why they fail.',
                suggestedLength: 'medium',
            },
            {
                id: 'conclusion',
                name: 'Conclusion',
                type: 'conclusion',
                order: 5,
                promptGuidance: 'Summarize arguments and request dismissal with or without prejudice.',
                requiredElements: ['Summary', 'Prayer for relief', 'With/without prejudice request'],
                suggestedLength: 'short',
            },
        ],
        usageCount: 0,
        isPublished: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    
    // Summary Judgment Motion
    {
        id: 'msj-standard',
        name: 'Motion for Summary Judgment',
        description: 'Standard motion for summary judgment under Rule 56',
        documentType: 'Summary Judgment Motion',
        category: 'Civil Procedure',
        structure: [
            {
                id: 'intro',
                name: 'Introduction',
                type: 'introduction',
                order: 0,
                promptGuidance: 'Introduce the motion, identify undisputed facts, and preview winning arguments.',
                requiredElements: ['Party identification', 'Nature of claims', 'Preview of undisputed facts'],
                suggestedLength: 'short',
            },
            {
                id: 'facts',
                name: 'Statement of Undisputed Facts',
                type: 'argument',
                order: 1,
                promptGuidance: 'Present numbered undisputed material facts with citations to the record.',
                requiredElements: ['Numbered facts', 'Record citations', 'Materiality'],
                suggestedLength: 'long',
            },
            {
                id: 'legal-standard',
                name: 'Legal Standard',
                type: 'argument',
                order: 2,
                promptGuidance: 'Set forth the summary judgment standard under Rule 56.',
                requiredElements: ['Rule 56 standard', 'No genuine dispute', 'Moving party burden'],
                suggestedLength: 'medium',
            },
            {
                id: 'arg-main',
                name: 'Argument: Entitlement to Judgment',
                type: 'argument',
                order: 3,
                promptGuidance: 'Argue why the undisputed facts entitle movant to judgment as a matter of law.',
                requiredElements: ['Apply law to facts', 'Element-by-element analysis', 'Record citations'],
                suggestedLength: 'long',
            },
            {
                id: 'counter',
                name: 'No Genuine Dispute Exists',
                type: 'counter',
                order: 4,
                promptGuidance: 'Address why any disputes raised by the non-movant are not genuine or material.',
                suggestedLength: 'medium',
            },
            {
                id: 'conclusion',
                name: 'Conclusion',
                type: 'conclusion',
                order: 5,
                promptGuidance: 'Request entry of summary judgment.',
                requiredElements: ['Summary', 'Prayer for relief'],
                suggestedLength: 'short',
            },
        ],
        usageCount: 0,
        isPublished: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    
    // Appellate Brief
    {
        id: 'appellate-brief',
        name: 'Appellate Brief',
        description: 'Standard structure for appellate briefs',
        documentType: 'Appellate Brief',
        category: 'Appeals',
        structure: [
            {
                id: 'issues',
                name: 'Statement of Issues',
                type: 'introduction',
                order: 0,
                promptGuidance: 'Present the issues on appeal in question form, framed favorably.',
                requiredElements: ['Issues presented', 'Standard of review preview'],
                suggestedLength: 'short',
            },
            {
                id: 'facts',
                name: 'Statement of the Case',
                type: 'argument',
                order: 1,
                promptGuidance: 'Provide procedural history and relevant facts with record citations.',
                requiredElements: ['Procedural history', 'Relevant facts', 'Record citations'],
                suggestedLength: 'long',
            },
            {
                id: 'standard',
                name: 'Standard of Review',
                type: 'argument',
                order: 2,
                promptGuidance: 'State the applicable standard of review for each issue.',
                requiredElements: ['De novo / abuse of discretion / clear error', 'Authority'],
                suggestedLength: 'short',
            },
            {
                id: 'arg-1',
                name: 'Argument I',
                type: 'argument',
                order: 3,
                promptGuidance: 'Present first argument with point heading, analysis, and authority.',
                requiredElements: ['Point heading', 'Legal analysis', 'Application to facts'],
                suggestedLength: 'long',
            },
            {
                id: 'arg-2',
                name: 'Argument II',
                type: 'argument',
                order: 4,
                promptGuidance: 'Present second argument with point heading, analysis, and authority.',
                suggestedLength: 'long',
            },
            {
                id: 'conclusion',
                name: 'Conclusion',
                type: 'conclusion',
                order: 5,
                promptGuidance: 'Request specific relief (reversal, remand, affirmance).',
                requiredElements: ['Summary', 'Specific relief requested'],
                suggestedLength: 'short',
            },
        ],
        usageCount: 0,
        isPublished: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    
    // Contract Breach Demand Letter
    {
        id: 'demand-breach',
        name: 'Breach of Contract Demand',
        description: 'Demand letter for breach of contract claims',
        documentType: 'Demand Letter',
        category: 'Contracts',
        structure: [
            {
                id: 'intro',
                name: 'Introduction',
                type: 'introduction',
                order: 0,
                promptGuidance: 'Identify the parties, the contract, and state this is a demand for breach.',
                requiredElements: ['Party identification', 'Contract identification', 'Purpose statement'],
                suggestedLength: 'short',
            },
            {
                id: 'background',
                name: 'Factual Background',
                type: 'argument',
                order: 1,
                promptGuidance: 'Describe the contract terms and the breaching conduct.',
                requiredElements: ['Contract terms', 'Performance history', 'Breach description'],
                suggestedLength: 'medium',
            },
            {
                id: 'legal',
                name: 'Legal Analysis',
                type: 'argument',
                order: 2,
                promptGuidance: 'Explain why the conduct constitutes a breach and the damages caused.',
                requiredElements: ['Breach elements', 'Damages', 'Liability'],
                suggestedLength: 'medium',
            },
            {
                id: 'demand',
                name: 'Demand',
                type: 'conclusion',
                order: 3,
                promptGuidance: 'State specific demands and deadline for compliance.',
                requiredElements: ['Specific demands', 'Deadline', 'Consequences of non-compliance'],
                suggestedLength: 'short',
            },
        ],
        usageCount: 0,
        isPublished: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    
    // Personal Injury Complaint
    {
        id: 'pi-complaint',
        name: 'Personal Injury Complaint',
        description: 'Negligence-based personal injury complaint',
        documentType: 'Complaint',
        category: 'Torts',
        structure: [
            {
                id: 'parties',
                name: 'Parties & Jurisdiction',
                type: 'introduction',
                order: 0,
                promptGuidance: 'Identify parties and establish jurisdiction and venue.',
                requiredElements: ['Plaintiff identification', 'Defendant identification', 'Jurisdiction basis', 'Venue'],
                suggestedLength: 'short',
            },
            {
                id: 'facts',
                name: 'General Allegations',
                type: 'argument',
                order: 1,
                promptGuidance: 'Allege facts showing duty, breach, causation, and damages.',
                requiredElements: ['Duty', 'Breach', 'Causation', 'Damages'],
                suggestedLength: 'long',
            },
            {
                id: 'negligence',
                name: 'First Cause of Action: Negligence',
                type: 'argument',
                order: 2,
                promptGuidance: 'Plead negligence cause of action with specific elements.',
                requiredElements: ['Incorporate general allegations', 'Negligence elements', 'Proximate cause'],
                suggestedLength: 'medium',
            },
            {
                id: 'damages',
                name: 'Damages',
                type: 'argument',
                order: 3,
                promptGuidance: 'Detail all categories of damages sought.',
                requiredElements: ['Economic damages', 'Non-economic damages', 'Future damages'],
                suggestedLength: 'medium',
            },
            {
                id: 'prayer',
                name: 'Prayer for Relief',
                type: 'conclusion',
                order: 4,
                promptGuidance: 'Request specific monetary and equitable relief.',
                requiredElements: ['Compensatory damages', 'Punitive damages if applicable', 'Costs and fees', 'Jury demand'],
                suggestedLength: 'short',
            },
        ],
        usageCount: 0,
        isPublished: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    
    // Employment Discrimination Brief
    {
        id: 'emp-discrimination',
        name: 'Employment Discrimination Brief',
        description: 'Brief structure for Title VII and similar claims',
        documentType: 'Brief',
        category: 'Employment Law',
        structure: [
            {
                id: 'intro',
                name: 'Introduction',
                type: 'introduction',
                order: 0,
                promptGuidance: 'Introduce the claim type and preview the evidence of discrimination.',
                requiredElements: ['Claim type', 'Protected class', 'Adverse action overview'],
                suggestedLength: 'short',
            },
            {
                id: 'facts',
                name: 'Statement of Facts',
                type: 'argument',
                order: 1,
                promptGuidance: 'Present facts showing discriminatory treatment.',
                requiredElements: ['Employment history', 'Adverse action', 'Comparator evidence', 'Timeline'],
                suggestedLength: 'long',
            },
            {
                id: 'prima-facie',
                name: 'Prima Facie Case',
                type: 'argument',
                order: 2,
                promptGuidance: 'Establish the prima facie elements under McDonnell Douglas or direct evidence.',
                requiredElements: ['Protected class', 'Qualification', 'Adverse action', 'Inference of discrimination'],
                suggestedLength: 'medium',
            },
            {
                id: 'pretext',
                name: 'Pretext Analysis',
                type: 'argument',
                order: 3,
                promptGuidance: 'Show that employer\'s stated reason is pretextual.',
                requiredElements: ['Legitimate reason proffered', 'Evidence of pretext', 'Shifting explanations'],
                suggestedLength: 'long',
            },
            {
                id: 'counter',
                name: 'Rebuttal of Defenses',
                type: 'counter',
                order: 4,
                promptGuidance: 'Address anticipated employer defenses.',
                suggestedLength: 'medium',
            },
            {
                id: 'conclusion',
                name: 'Conclusion',
                type: 'conclusion',
                order: 5,
                promptGuidance: 'Request appropriate relief for discrimination claims.',
                requiredElements: ['Summary', 'Back pay', 'Front pay', 'Compensatory damages', 'Attorney fees'],
                suggestedLength: 'short',
            },
        ],
        usageCount: 0,
        isPublished: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    
    // Settlement Proposal
    {
        id: 'settlement-proposal',
        name: 'Settlement Proposal',
        description: 'Structure for proposing settlement terms',
        documentType: 'Settlement Proposal',
        category: 'Negotiation',
        structure: [
            {
                id: 'intro',
                name: 'Introduction',
                type: 'introduction',
                order: 0,
                promptGuidance: 'Express interest in resolution and reference prior discussions.',
                requiredElements: ['Good faith statement', 'Case reference', 'Purpose'],
                suggestedLength: 'short',
            },
            {
                id: 'liability',
                name: 'Liability Analysis',
                type: 'argument',
                order: 1,
                promptGuidance: 'Summarize the strength of liability claims.',
                requiredElements: ['Key liability facts', 'Strength assessment', 'Risk factors'],
                suggestedLength: 'medium',
            },
            {
                id: 'damages',
                name: 'Damages Analysis',
                type: 'argument',
                order: 2,
                promptGuidance: 'Calculate and justify damages demand.',
                requiredElements: ['Economic damages', 'Non-economic damages', 'Calculation basis'],
                suggestedLength: 'medium',
            },
            {
                id: 'proposal',
                name: 'Settlement Terms',
                type: 'conclusion',
                order: 3,
                promptGuidance: 'State specific settlement terms and conditions.',
                requiredElements: ['Monetary terms', 'Non-monetary terms', 'Release scope', 'Timeline'],
                suggestedLength: 'medium',
            },
        ],
        usageCount: 0,
        isPublished: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

// ============================================
// Template Functions
// ============================================

/**
 * Get all available argument templates
 */
export function getArgumentTemplates(): ArgumentTemplate[] {
    return ARGUMENT_TEMPLATES;
}

/**
 * Get templates by document type
 */
export function getTemplatesByDocumentType(documentType: string): ArgumentTemplate[] {
    return ARGUMENT_TEMPLATES.filter(t => t.documentType === documentType);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): ArgumentTemplate[] {
    return ARGUMENT_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get a specific template by ID
 */
export function getTemplateById(id: string): ArgumentTemplate | undefined {
    return ARGUMENT_TEMPLATES.find(t => t.id === id);
}

/**
 * Get unique document types from templates
 */
export function getTemplateDocumentTypes(): string[] {
    return [...new Set(ARGUMENT_TEMPLATES.map(t => t.documentType))];
}

/**
 * Get unique categories from templates
 */
export function getTemplateCategories(): string[] {
    return [...new Set(ARGUMENT_TEMPLATES.map(t => t.category))];
}

/**
 * Generate prompt guidance for AI based on template section
 */
export function getSectionPromptGuidance(section: ArgumentTemplateSection): string {
    let guidance = section.promptGuidance;
    
    if (section.requiredElements?.length) {
        guidance += `\n\nRequired elements to include:\n${section.requiredElements.map(e => `- ${e}`).join('\n')}`;
    }
    
    if (section.suggestedLength) {
        const lengthGuide: Record<string, string> = {
            short: '1-2 paragraphs',
            medium: '3-5 paragraphs',
            long: '5+ paragraphs',
        };
        guidance += `\n\nSuggested length: ${lengthGuide[section.suggestedLength]}`;
    }
    
    return guidance;
}

/**
 * Get template section by type
 */
export function getTemplateSectionsByType(
    template: ArgumentTemplate,
    type: ArgumentTemplateSection['type']
): ArgumentTemplateSection[] {
    return template.structure.filter(s => s.type === type);
}

/**
 * Search templates
 */
export function searchTemplates(query: string): ArgumentTemplate[] {
    const lowerQuery = query.toLowerCase();
    return ARGUMENT_TEMPLATES.filter(t => 
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.documentType.toLowerCase().includes(lowerQuery) ||
        t.category.toLowerCase().includes(lowerQuery)
    );
}

