/**
 * PlaceholderResolver Service
 * Resolves placeholders in templates with provided values.
 */

import { format as formatDate, parseISO } from 'date-fns';
import {
    PlaceholderDefinition,
    PlaceholderValues,
    ResolutionResult,
    ValidationResult,
    ValidationError,
    TemplateSection,
    SectionCondition,
    PLACEHOLDER_REGEX,
    extractPlaceholders,
} from './templateTypes';

// ============================================
// Formatting Utilities
// ============================================

/**
 * Format a value based on placeholder type
 */
function formatValue(
    value: string | number | boolean | string[] | null | undefined,
    definition?: PlaceholderDefinition
): string {
    if (value === null || value === undefined || value === '') {
        return definition?.defaultValue?.toString() || '';
    }

    const type = definition?.type || 'text';

    switch (type) {
        case 'date':
            try {
                const date = typeof value === 'string' ? parseISO(value) : new Date(value as number);
                return formatDate(date, 'MMMM d, yyyy');
            } catch {
                return String(value);
            }

        case 'currency':
            const num = typeof value === 'number' ? value : parseFloat(String(value));
            if (isNaN(num)) return String(value);
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(num);

        case 'number':
            const numVal = typeof value === 'number' ? value : parseFloat(String(value));
            if (isNaN(numVal)) return String(value);
            return new Intl.NumberFormat('en-US').format(numVal);

        case 'boolean':
            return value === true || value === 'true' || value === 'yes' ? 'Yes' : 'No';

        case 'multiselect':
            if (Array.isArray(value)) {
                return value.join(', ');
            }
            return String(value);

        case 'select':
            // If options are defined, use the label instead of value
            if (definition?.options) {
                const option = definition.options.find(o => o.value === value);
                return option?.label || String(value);
            }
            return String(value);

        case 'phone':
            // Basic US phone formatting
            const phone = String(value).replace(/\D/g, '');
            if (phone.length === 10) {
                return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
            }
            return String(value);

        default:
            return String(value);
    }
}

// ============================================
// Validation
// ============================================

/**
 * Validate placeholder values against their definitions
 */
export function validatePlaceholderValues(
    values: PlaceholderValues,
    definitions: PlaceholderDefinition[]
): ValidationResult {
    const errors: ValidationError[] = [];

    for (const def of definitions) {
        const value = values[def.name];
        const hasValue = value !== null && value !== undefined && value !== '';

        // Check required
        if (def.required && !hasValue) {
            errors.push({
                placeholderName: def.name,
                message: `${def.label} is required`,
                type: 'required',
            });
            continue;
        }

        // Skip validation if no value and not required
        if (!hasValue) continue;

        // Type validation
        switch (def.type) {
            case 'email':
                if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    errors.push({
                        placeholderName: def.name,
                        message: `${def.label} must be a valid email address`,
                        type: 'type',
                    });
                }
                break;

            case 'number':
            case 'currency':
                const numVal = typeof value === 'number' ? value : parseFloat(String(value));
                if (isNaN(numVal)) {
                    errors.push({
                        placeholderName: def.name,
                        message: `${def.label} must be a valid number`,
                        type: 'type',
                    });
                } else {
                    if (def.validation?.min !== undefined && numVal < def.validation.min) {
                        errors.push({
                            placeholderName: def.name,
                            message: def.validation.message || `${def.label} must be at least ${def.validation.min}`,
                            type: 'validation',
                        });
                    }
                    if (def.validation?.max !== undefined && numVal > def.validation.max) {
                        errors.push({
                            placeholderName: def.name,
                            message: def.validation.message || `${def.label} must be at most ${def.validation.max}`,
                            type: 'validation',
                        });
                    }
                }
                break;

            case 'date':
                try {
                    const date = typeof value === 'string' ? parseISO(value) : new Date(value as number);
                    if (isNaN(date.getTime())) throw new Error('Invalid date');
                } catch {
                    errors.push({
                        placeholderName: def.name,
                        message: `${def.label} must be a valid date`,
                        type: 'type',
                    });
                }
                break;

            case 'select':
                if (def.options && !def.options.some(o => o.value === value)) {
                    errors.push({
                        placeholderName: def.name,
                        message: `${def.label} must be one of the available options`,
                        type: 'validation',
                    });
                }
                break;

            case 'multiselect':
                if (Array.isArray(value) && def.options) {
                    const invalidValues = value.filter(v => !def.options!.some(o => o.value === v));
                    if (invalidValues.length > 0) {
                        errors.push({
                            placeholderName: def.name,
                            message: `${def.label} contains invalid options: ${invalidValues.join(', ')}`,
                            type: 'validation',
                        });
                    }
                }
                break;
        }

        // String validation
        if (typeof value === 'string' && def.validation) {
            if (def.validation.minLength && value.length < def.validation.minLength) {
                errors.push({
                    placeholderName: def.name,
                    message: def.validation.message || `${def.label} must be at least ${def.validation.minLength} characters`,
                    type: 'validation',
                });
            }
            if (def.validation.maxLength && value.length > def.validation.maxLength) {
                errors.push({
                    placeholderName: def.name,
                    message: def.validation.message || `${def.label} must be at most ${def.validation.maxLength} characters`,
                    type: 'validation',
                });
            }
            if (def.validation.pattern) {
                const regex = new RegExp(def.validation.pattern);
                if (!regex.test(value)) {
                    errors.push({
                        placeholderName: def.name,
                        message: def.validation.message || `${def.label} format is invalid`,
                        type: 'validation',
                    });
                }
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

// ============================================
// Section Conditions
// ============================================

/**
 * Evaluate if a section should be displayed based on conditions
 */
export function evaluateSectionConditions(
    conditions: SectionCondition[] | undefined,
    values: PlaceholderValues
): boolean {
    if (!conditions || conditions.length === 0) {
        return true; // No conditions means always show
    }

    // All conditions must be true (AND logic)
    return conditions.every(condition => {
        const value = values[condition.placeholderName];

        switch (condition.operator) {
            case 'equals':
                return value === condition.value;
            case 'notEquals':
                return value !== condition.value;
            case 'contains':
                if (typeof value === 'string') {
                    return value.includes(String(condition.value));
                }
                if (Array.isArray(value)) {
                    return value.includes(String(condition.value));
                }
                return false;
            case 'isEmpty':
                return value === null || value === undefined || value === '' || 
                    (Array.isArray(value) && value.length === 0);
            case 'isNotEmpty':
                return value !== null && value !== undefined && value !== '' &&
                    !(Array.isArray(value) && value.length === 0);
            default:
                return true;
        }
    });
}

// ============================================
// Main Resolver
// ============================================

/**
 * Resolve placeholders in content with provided values
 */
export function resolvePlaceholders(
    content: string,
    values: PlaceholderValues,
    definitions?: PlaceholderDefinition[]
): ResolutionResult {
    const unresolvedPlaceholders: string[] = [];
    const warnings: string[] = [];
    const definitionMap = new Map(definitions?.map(d => [d.name, d]) || []);

    // Extract all placeholders from content
    const placeholdersInContent = extractPlaceholders(content);

    // Check for placeholders without definitions
    if (definitions) {
        const definedNames = new Set(definitions.map(d => d.name));
        for (const name of placeholdersInContent) {
            if (!definedNames.has(name)) {
                warnings.push(`Placeholder {{${name}}} is used but not defined`);
            }
        }
    }

    // Replace placeholders with values
    const resolvedContent = content.replace(PLACEHOLDER_REGEX, (match, name) => {
        const value = values[name];
        const definition = definitionMap.get(name);

        if (value === null || value === undefined) {
            // Check for default value
            if (definition?.defaultValue !== undefined) {
                return formatValue(definition.defaultValue, definition);
            }
            unresolvedPlaceholders.push(name);
            return match; // Keep original placeholder
        }

        return formatValue(value, definition);
    });

    return {
        content: resolvedContent,
        unresolvedPlaceholders,
        warnings,
    };
}

/**
 * Resolve a full template with sections
 */
export function resolveTemplate(
    sections: TemplateSection[],
    values: PlaceholderValues,
    definitions?: PlaceholderDefinition[]
): ResolutionResult {
    const allUnresolved: string[] = [];
    const allWarnings: string[] = [];
    const resolvedSections: string[] = [];

    // Sort sections by order
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

    for (const section of sortedSections) {
        // Check if section should be displayed
        if (!evaluateSectionConditions(section.conditions, values)) {
            continue;
        }

        const result = resolvePlaceholders(section.content, values, definitions);
        resolvedSections.push(result.content);
        allUnresolved.push(...result.unresolvedPlaceholders);
        allWarnings.push(...result.warnings);
    }

    return {
        content: resolvedSections.join('\n'),
        unresolvedPlaceholders: [...new Set(allUnresolved)],
        warnings: [...new Set(allWarnings)],
    };
}

/**
 * Generate a preview with highlighted placeholders
 */
export function generatePreview(
    content: string,
    values: PlaceholderValues,
    definitions?: PlaceholderDefinition[]
): string {
    const definitionMap = new Map(definitions?.map(d => [d.name, d]) || []);

    return content.replace(PLACEHOLDER_REGEX, (match, name) => {
        const value = values[name];
        const definition = definitionMap.get(name);

        if (value === null || value === undefined) {
            // Highlight unresolved placeholders
            const label = definition?.label || name;
            return `<span class="placeholder-unresolved" data-placeholder="${name}">[${label}]</span>`;
        }

        // Highlight resolved values
        const formattedValue = formatValue(value, definition);
        return `<span class="placeholder-resolved" data-placeholder="${name}">${formattedValue}</span>`;
    });
}

/**
 * Get all required placeholders that are missing values
 */
export function getMissingRequiredPlaceholders(
    definitions: PlaceholderDefinition[],
    values: PlaceholderValues
): PlaceholderDefinition[] {
    return definitions.filter(def => {
        if (!def.required) return false;
        const value = values[def.name];
        return value === null || value === undefined || value === '';
    });
}

/**
 * Create initial values from definitions (using defaults)
 */
export function createInitialValues(
    definitions: PlaceholderDefinition[]
): PlaceholderValues {
    const values: PlaceholderValues = {};
    
    for (const def of definitions) {
        if (def.defaultValue !== undefined) {
            values[def.name] = def.defaultValue;
        } else {
            values[def.name] = null;
        }
    }

    return values;
}

/**
 * Merge intake data into placeholder values
 * Maps intake form fields to placeholder names
 */
export function mergeIntakeData(
    values: PlaceholderValues,
    intakeData: Record<string, unknown>,
    fieldMapping?: Record<string, string> // { intakeField: placeholderName }
): PlaceholderValues {
    const merged = { ...values };

    for (const [intakeField, intakeValue] of Object.entries(intakeData)) {
        const placeholderName = fieldMapping?.[intakeField] || intakeField;
        
        // Only set if not already set or if placeholder exists
        if (merged[placeholderName] === null || merged[placeholderName] === undefined) {
            merged[placeholderName] = intakeValue as string | number | boolean | string[] | null;
        }
    }

    return merged;
}

