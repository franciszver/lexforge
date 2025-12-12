/**
 * Argument Service
 * Provides client-side functions for interacting with the argument generation system.
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type {
    ArgumentOutline,
    ArgumentGenerationInput,
    ArgumentGenerationOutput,
    CounterArgument,
    CoherenceAnalysis,
    Argument,
} from './argumentTypes';

// Lazy client initialization
let _client: ReturnType<typeof generateClient<Schema>> | null = null;

function getClient() {
    if (!_client) {
        _client = generateClient<Schema>();
    }
    return _client;
}

// ============================================
// Main API Functions
// ============================================

/**
 * Generate a complete argument outline from input
 */
export async function generateArgumentOutline(
    input: ArgumentGenerationInput
): Promise<ArgumentGenerationOutput> {
    const client = getClient();
    
    try {
        const { data, errors } = await client.queries.generateArguments({
            mode: 'generate',
            facts: JSON.stringify(input.facts),
            keyFacts: input.keyFacts ? JSON.stringify(input.keyFacts) : undefined,
            legalPrinciples: JSON.stringify(input.legalPrinciples),
            jurisdiction: input.jurisdiction,
            documentType: input.documentType,
            practiceArea: input.practiceArea,
            desiredOutcome: input.desiredOutcome,
            clientPosition: input.clientPosition,
            opposingArguments: input.opposingArguments ? JSON.stringify(input.opposingArguments) : undefined,
            constraints: input.constraints ? JSON.stringify(input.constraints) : undefined,
            tone: input.tone,
        });

        if (errors) {
            console.error('Error generating arguments:', errors);
            throw new Error(errors.map(e => e.message).join(', '));
        }

        const result = data as { success: boolean; outline?: ArgumentOutline; error?: string };
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to generate arguments');
        }

        return {
            outline: result.outline!,
            warnings: [],
            suggestedCitations: [],
            suggestedClauses: [],
        };
    } catch (error) {
        console.error('Error in generateArgumentOutline:', error);
        throw error;
    }
}

/**
 * Generate counter-arguments for an existing argument
 */
export async function generateCounterArguments(
    argument: string | ArgumentOutline,
    jurisdiction?: string,
    documentType?: string
): Promise<CounterArgument[]> {
    const client = getClient();
    
    try {
        const isOutline = typeof argument !== 'string';
        
        const { data, errors } = await client.queries.generateArguments({
            mode: 'counter',
            existingArgument: isOutline ? undefined : argument,
            existingOutline: isOutline ? JSON.stringify(argument) : undefined,
            jurisdiction,
            documentType,
        });

        if (errors) {
            console.error('Error generating counter-arguments:', errors);
            throw new Error(errors.map(e => e.message).join(', '));
        }

        const result = data as { success: boolean; counterArguments?: CounterArgument[]; error?: string };
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to generate counter-arguments');
        }

        return result.counterArguments || [];
    } catch (error) {
        console.error('Error in generateCounterArguments:', error);
        throw error;
    }
}

/**
 * Analyze the coherence of an argument outline
 */
export async function analyzeCoherence(
    outline: ArgumentOutline
): Promise<CoherenceAnalysis> {
    const client = getClient();
    
    try {
        const { data, errors } = await client.queries.generateArguments({
            mode: 'analyze',
            existingOutline: JSON.stringify(outline),
        });

        if (errors) {
            console.error('Error analyzing coherence:', errors);
            throw new Error(errors.map(e => e.message).join(', '));
        }

        const result = data as { success: boolean; analysis?: CoherenceAnalysis; error?: string };
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to analyze coherence');
        }

        return result.analysis!;
    } catch (error) {
        console.error('Error in analyzeCoherence:', error);
        throw error;
    }
}

/**
 * Strengthen an existing argument outline
 */
export async function strengthenArgument(
    outline: ArgumentOutline,
    focusAreas?: string[]
): Promise<ArgumentOutline> {
    const client = getClient();
    
    try {
        const { data, errors } = await client.queries.generateArguments({
            mode: 'strengthen',
            existingOutline: JSON.stringify(outline),
            constraints: focusAreas ? JSON.stringify(focusAreas) : undefined,
            jurisdiction: outline.jurisdiction,
        });

        if (errors) {
            console.error('Error strengthening argument:', errors);
            throw new Error(errors.map(e => e.message).join(', '));
        }

        const result = data as { success: boolean; outline?: ArgumentOutline; error?: string };
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to strengthen argument');
        }

        return result.outline!;
    } catch (error) {
        console.error('Error in strengthenArgument:', error);
        throw error;
    }
}

// ============================================
// Local Storage for Drafts
// ============================================

const DRAFTS_KEY = 'lexforge_argument_drafts';

/**
 * Save argument outline draft to local storage
 */
export function saveArgumentDraft(outline: ArgumentOutline): void {
    try {
        const drafts = getArgumentDrafts();
        const existingIndex = drafts.findIndex(d => d.id === outline.id);
        
        if (existingIndex >= 0) {
            drafts[existingIndex] = outline;
        } else {
            drafts.unshift(outline);
        }
        
        // Keep only last 10 drafts
        const trimmed = drafts.slice(0, 10);
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(trimmed));
    } catch (error) {
        console.error('Error saving argument draft:', error);
    }
}

/**
 * Get all argument outline drafts from local storage
 */
export function getArgumentDrafts(): ArgumentOutline[] {
    try {
        const stored = localStorage.getItem(DRAFTS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading argument drafts:', error);
        return [];
    }
}

/**
 * Delete argument draft from local storage
 */
export function deleteArgumentDraft(id: string): void {
    try {
        const drafts = getArgumentDrafts();
        const filtered = drafts.filter(d => d.id !== id);
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error('Error deleting argument draft:', error);
    }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Convert argument outline to document content (HTML)
 */
export function outlineToHtml(outline: ArgumentOutline): string {
    const sections: string[] = [];
    
    // Title
    sections.push(`<h1>${outline.title}</h1>`);
    
    // Introduction
    if (outline.introduction) {
        sections.push(`<h2>Introduction</h2>`);
        sections.push(`<p>${outline.introduction}</p>`);
    }
    
    // Arguments
    outline.arguments.forEach((arg, index) => {
        sections.push(`<h2>${index + 1}. ${arg.title}</h2>`);
        sections.push(`<p><strong>Thesis:</strong> ${arg.thesis}</p>`);
        
        // Supporting points
        if (arg.supportingPoints.length > 0) {
            sections.push(`<h3>Supporting Points</h3>`);
            sections.push('<ul>');
            arg.supportingPoints.forEach(point => {
                let pointHtml = `<li>${point.text}`;
                if (point.citations?.length) {
                    pointHtml += ` <em>(${point.citations.join('; ')})</em>`;
                }
                pointHtml += '</li>';
                sections.push(pointHtml);
            });
            sections.push('</ul>');
        }
        
        // Counter-arguments and rebuttals
        if (arg.counterArguments.length > 0) {
            sections.push(`<h3>Anticipated Counter-Arguments</h3>`);
            arg.counterArguments.forEach(counter => {
                sections.push(`<p><strong>Counter:</strong> ${counter.text}</p>`);
                if (counter.rebuttal) {
                    sections.push(`<p><strong>Rebuttal:</strong> ${counter.rebuttal}</p>`);
                }
            });
        }
        
        // Argument conclusion
        if (arg.conclusion) {
            sections.push(`<p>${arg.conclusion}</p>`);
        }
    });
    
    // Overall conclusion
    if (outline.conclusion) {
        sections.push(`<h2>Conclusion</h2>`);
        sections.push(`<p>${outline.conclusion}</p>`);
    }
    
    return sections.join('\n');
}

/**
 * Export argument outline to JSON
 */
export function exportOutlineToJson(outline: ArgumentOutline): string {
    return JSON.stringify(outline, null, 2);
}

/**
 * Import argument outline from JSON
 */
export function importOutlineFromJson(json: string): ArgumentOutline | null {
    try {
        const parsed = JSON.parse(json);
        // Basic validation
        if (!parsed.id || !parsed.title || !Array.isArray(parsed.arguments)) {
            throw new Error('Invalid outline structure');
        }
        return parsed as ArgumentOutline;
    } catch (error) {
        console.error('Error importing outline:', error);
        return null;
    }
}

/**
 * Calculate completeness score for an outline
 */
export function calculateCompletenessScore(outline: ArgumentOutline): number {
    let score = 0;
    let total = 0;
    
    // Has title
    total += 1;
    if (outline.title) score += 1;
    
    // Has introduction
    total += 1;
    if (outline.introduction) score += 1;
    
    // Has conclusion
    total += 1;
    if (outline.conclusion) score += 1;
    
    // Has at least 2 arguments
    total += 1;
    if (outline.arguments.length >= 2) score += 1;
    
    // Each argument has thesis
    outline.arguments.forEach(arg => {
        total += 1;
        if (arg.thesis) score += 1;
        
        // Each argument has at least 2 supporting points
        total += 1;
        if (arg.supportingPoints.length >= 2) score += 1;
        
        // Each argument has at least 1 counter-argument
        total += 1;
        if (arg.counterArguments.length >= 1) score += 1;
    });
    
    return total > 0 ? score / total : 0;
}

/**
 * Reorder arguments in outline
 */
export function reorderArguments(outline: ArgumentOutline, fromIndex: number, toIndex: number): ArgumentOutline {
    const newArguments = [...outline.arguments];
    const [removed] = newArguments.splice(fromIndex, 1);
    newArguments.splice(toIndex, 0, removed);
    
    // Update order values
    newArguments.forEach((arg, index) => {
        arg.order = index;
    });
    
    return {
        ...outline,
        arguments: newArguments,
    };
}

/**
 * Add new argument to outline
 */
export function addArgumentToOutline(outline: ArgumentOutline, argument: Argument): ArgumentOutline {
    return {
        ...outline,
        arguments: [...outline.arguments, { ...argument, order: outline.arguments.length }],
    };
}

/**
 * Remove argument from outline
 */
export function removeArgumentFromOutline(outline: ArgumentOutline, argumentId: string): ArgumentOutline {
    const newArguments = outline.arguments.filter(a => a.id !== argumentId);
    newArguments.forEach((arg, index) => {
        arg.order = index;
    });
    
    return {
        ...outline,
        arguments: newArguments,
    };
}

/**
 * Update argument in outline
 */
export function updateArgumentInOutline(outline: ArgumentOutline, updatedArgument: Argument): ArgumentOutline {
    return {
        ...outline,
        arguments: outline.arguments.map(a => 
            a.id === updatedArgument.id ? updatedArgument : a
        ),
    };
}

