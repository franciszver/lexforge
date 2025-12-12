/**
 * Template System Types
 * Defines the structure for placeholders, sections, and variables in templates.
 */

// ============================================
// Placeholder Types
// ============================================

export type PlaceholderType = 
    | 'text'       // Simple text input
    | 'number'     // Numeric input
    | 'date'       // Date picker
    | 'currency'   // Currency amount
    | 'select'     // Dropdown selection
    | 'multiselect'// Multiple selection
    | 'textarea'   // Multi-line text
    | 'boolean'    // Yes/No checkbox
    | 'email'      // Email validation
    | 'phone'      // Phone number
    | 'address';   // Full address

export interface PlaceholderOption {
    value: string;
    label: string;
}

export interface PlaceholderDefinition {
    name: string;           // Unique identifier, used in {{name}} syntax
    type: PlaceholderType;
    label: string;          // Human-readable label
    description?: string;   // Help text
    required: boolean;
    defaultValue?: string | number | boolean | string[];
    options?: PlaceholderOption[]; // For select/multiselect types
    validation?: {
        minLength?: number;
        maxLength?: number;
        min?: number;
        max?: number;
        pattern?: string;   // Regex pattern
        message?: string;   // Custom validation message
    };
    group?: string;         // For grouping related placeholders
    order?: number;         // Display order within group
}

// ============================================
// Section Types
// ============================================

export interface TemplateSection {
    id: string;
    name: string;
    description?: string;
    content: string;        // HTML content with placeholders
    order: number;
    isRequired: boolean;
    isCollapsible?: boolean;
    defaultExpanded?: boolean;
    conditions?: SectionCondition[]; // Conditional display
}

export interface SectionCondition {
    placeholderName: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'isEmpty' | 'isNotEmpty';
    value?: string | number | boolean;
}

// ============================================
// Variable Types
// ============================================

export interface VariableDefinition {
    type: PlaceholderType;
    defaultValue?: string | number | boolean | string[];
    computed?: boolean;     // If true, value is computed from other variables
    formula?: string;       // Computation formula (e.g., "{{amount}} * 0.1")
    format?: string;        // Display format (e.g., "MM/DD/YYYY" for dates)
}

export type VariableMap = Record<string, VariableDefinition>;

// ============================================
// Template Types
// ============================================

export interface EnhancedTemplate {
    id: string;
    name: string;
    category: string;
    skeletonContent: string;
    placeholders: PlaceholderDefinition[];
    sections: TemplateSection[];
    variables: VariableMap;
    version: number;
    isPublished: boolean;
    publishedAt?: string;
    parentTemplateId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface TemplateVersion {
    id: string;
    templateId: string;
    version: number;
    name: string;
    category: string;
    skeletonContent: string;
    placeholders: PlaceholderDefinition[];
    sections: TemplateSection[];
    variables: VariableMap;
    createdBy: string;
    changeNotes?: string;
    createdAt: string;
}

// ============================================
// Resolution Types
// ============================================

export type PlaceholderValues = Record<string, string | number | boolean | string[] | null>;

export interface ResolutionResult {
    content: string;
    unresolvedPlaceholders: string[];
    warnings: string[];
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export interface ValidationError {
    placeholderName: string;
    message: string;
    type: 'required' | 'type' | 'validation' | 'format';
}

// ============================================
// Placeholder Extraction
// ============================================

// Regex to match {{placeholder_name}} syntax
export const PLACEHOLDER_REGEX = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

/**
 * Extract all placeholder names from template content
 */
export function extractPlaceholders(content: string): string[] {
    const matches = content.matchAll(PLACEHOLDER_REGEX);
    const placeholders = new Set<string>();
    for (const match of matches) {
        placeholders.add(match[1]);
    }
    return Array.from(placeholders);
}

/**
 * Check if a string contains placeholders
 */
export function hasPlaceholders(content: string): boolean {
    // Use a new regex instance to avoid issues with lastIndex on global regex
    const regex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/;
    return regex.test(content);
}

