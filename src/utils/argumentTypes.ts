/**
 * Argument Generation Types
 * Defines the structure for AI-powered legal argument building.
 */

// ============================================
// Core Types
// ============================================

export type ArgumentType = 
    | 'legal'           // Pure legal argument based on law/precedent
    | 'factual'         // Argument based on facts of the case
    | 'policy'          // Policy-based argument
    | 'equitable'       // Equity/fairness argument
    | 'procedural'      // Procedural argument
    | 'statutory'       // Statutory interpretation
    | 'constitutional'; // Constitutional argument

export type ArgumentStrength = 'strong' | 'moderate' | 'weak';

export interface LegalPrinciple {
    id: string;
    name: string;
    description: string;
    citations: string[];
    jurisdiction?: string;
}

export interface SupportingPoint {
    id: string;
    text: string;
    type: 'fact' | 'law' | 'precedent' | 'policy' | 'logic';
    strength: ArgumentStrength;
    citations?: string[];
    clauseId?: string;  // Reference to clause library
}

export interface CounterArgument {
    id: string;
    text: string;
    strength: ArgumentStrength;
    rebuttal?: string;
    rebuttalStrength?: ArgumentStrength;
}

export interface Argument {
    id: string;
    type: ArgumentType;
    title: string;
    thesis: string;                    // Main argument statement
    supportingPoints: SupportingPoint[];
    counterArguments: CounterArgument[];
    conclusion: string;
    strength: ArgumentStrength;
    confidenceScore: number;           // 0-1 AI confidence
    citations: string[];
    relatedClauseIds?: string[];       // Links to clause library
    order: number;                     // Position in argument structure
}

export interface ArgumentOutline {
    id: string;
    title: string;
    description?: string;
    documentType: string;
    jurisdiction?: string;
    category?: string;
    
    // Core elements
    introduction: string;
    arguments: Argument[];
    conclusion: string;
    
    // Metadata
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    
    // AI analysis
    overallStrength: ArgumentStrength;
    coherenceScore: number;            // 0-1 how well arguments flow
    completenessScore: number;         // 0-1 coverage of relevant issues
    suggestions?: string[];            // AI suggestions for improvement
}

// ============================================
// Input Types for Argument Generation
// ============================================

export interface ArgumentGenerationInput {
    // Case facts
    facts: string[];
    keyFacts?: string[];               // Highlighted important facts
    
    // Legal context
    legalPrinciples: string[];         // Relevant legal principles/rules
    jurisdiction: string;
    documentType: string;
    practiceArea?: string;
    
    // Desired outcome
    desiredOutcome: string;
    clientPosition: 'plaintiff' | 'defendant' | 'petitioner' | 'respondent' | 'appellant' | 'appellee';
    
    // Optional context
    opposingArguments?: string[];      // Known opposing arguments to address
    constraints?: string[];            // Any constraints (e.g., "avoid constitutional arguments")
    tone?: 'aggressive' | 'moderate' | 'conservative';
}

export interface ArgumentGenerationOutput {
    outline: ArgumentOutline;
    alternativeApproaches?: ArgumentOutline[];
    warnings?: string[];               // Potential weaknesses or risks
    suggestedCitations?: string[];     // Citations to research
    suggestedClauses?: string[];       // Clause IDs to consider
}

// ============================================
// Argument Templates
// ============================================

export interface ArgumentTemplate {
    id: string;
    name: string;
    description: string;
    documentType: string;
    category: string;
    
    // Template structure
    structure: ArgumentTemplateSection[];
    
    // Metadata
    usageCount: number;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ArgumentTemplateSection {
    id: string;
    name: string;
    type: 'introduction' | 'argument' | 'counter' | 'rebuttal' | 'conclusion';
    order: number;
    promptGuidance: string;            // AI prompt guidance for this section
    requiredElements?: string[];       // Elements that must be included
    suggestedLength?: 'short' | 'medium' | 'long';
}

// ============================================
// Coherence Analysis
// ============================================

export interface CoherenceAnalysis {
    overallScore: number;              // 0-1
    
    // Breakdown
    logicalFlow: number;               // Arguments build on each other
    factConsistency: number;           // Facts used consistently
    citationSupport: number;           // Claims backed by citations
    counterArgumentCoverage: number;   // Addresses likely counter-arguments
    conclusionAlignment: number;       // Conclusion follows from arguments
    
    // Issues found
    issues: CoherenceIssue[];
    
    // Suggestions
    suggestions: string[];
}

export interface CoherenceIssue {
    type: 'gap' | 'contradiction' | 'unsupported' | 'weak_link' | 'missing_counter';
    severity: 'high' | 'medium' | 'low';
    location: string;                  // Which argument/section
    description: string;
    suggestion?: string;
}

// ============================================
// Constants
// ============================================

export const ARGUMENT_TYPES: { value: ArgumentType; label: string; description: string }[] = [
    { value: 'legal', label: 'Legal', description: 'Based on legal rules and precedent' },
    { value: 'factual', label: 'Factual', description: 'Based on case facts' },
    { value: 'policy', label: 'Policy', description: 'Based on policy considerations' },
    { value: 'equitable', label: 'Equitable', description: 'Based on fairness and equity' },
    { value: 'procedural', label: 'Procedural', description: 'Based on procedural rules' },
    { value: 'statutory', label: 'Statutory', description: 'Based on statutory interpretation' },
    { value: 'constitutional', label: 'Constitutional', description: 'Based on constitutional provisions' },
];

export const CLIENT_POSITIONS = [
    { value: 'plaintiff', label: 'Plaintiff' },
    { value: 'defendant', label: 'Defendant' },
    { value: 'petitioner', label: 'Petitioner' },
    { value: 'respondent', label: 'Respondent' },
    { value: 'appellant', label: 'Appellant' },
    { value: 'appellee', label: 'Appellee' },
] as const;

export const PRACTICE_AREAS = [
    'Civil Litigation',
    'Criminal Defense',
    'Criminal Prosecution',
    'Corporate Law',
    'Employment Law',
    'Family Law',
    'Immigration Law',
    'Intellectual Property',
    'Personal Injury',
    'Real Estate',
    'Tax Law',
    'Bankruptcy',
    'Environmental Law',
    'Healthcare Law',
    'Securities Law',
    'Antitrust',
    'Administrative Law',
    'Constitutional Law',
    'Contract Law',
    'Tort Law',
] as const;

export const DOCUMENT_TYPES_FOR_ARGUMENTS = [
    'Motion',
    'Brief',
    'Memorandum of Law',
    'Opposition',
    'Reply Brief',
    'Appellate Brief',
    'Trial Brief',
    'Summary Judgment Motion',
    'Motion to Dismiss',
    'Complaint',
    'Answer',
    'Demand Letter',
    'Settlement Proposal',
] as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate overall argument strength from supporting points
 */
export function calculateArgumentStrength(points: SupportingPoint[]): ArgumentStrength {
    if (points.length === 0) return 'weak';
    
    const strengthValues: Record<ArgumentStrength, number> = {
        strong: 3,
        moderate: 2,
        weak: 1,
    };
    
    const total = points.reduce((sum, p) => sum + strengthValues[p.strength], 0);
    const average = total / points.length;
    
    if (average >= 2.5) return 'strong';
    if (average >= 1.5) return 'moderate';
    return 'weak';
}

/**
 * Calculate overall outline strength
 */
export function calculateOutlineStrength(arguments_: Argument[]): ArgumentStrength {
    if (arguments_.length === 0) return 'weak';
    
    const strengthValues: Record<ArgumentStrength, number> = {
        strong: 3,
        moderate: 2,
        weak: 1,
    };
    
    const total = arguments_.reduce((sum, a) => sum + strengthValues[a.strength], 0);
    const average = total / arguments_.length;
    
    if (average >= 2.5) return 'strong';
    if (average >= 1.5) return 'moderate';
    return 'weak';
}

/**
 * Get strength color class
 */
export function getStrengthColor(strength: ArgumentStrength): string {
    switch (strength) {
        case 'strong':
            return 'text-green-600 bg-green-50';
        case 'moderate':
            return 'text-amber-600 bg-amber-50';
        case 'weak':
            return 'text-red-600 bg-red-50';
    }
}

/**
 * Format confidence score as percentage
 */
export function formatConfidence(score: number): string {
    return `${Math.round(score * 100)}%`;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
    return `arg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

