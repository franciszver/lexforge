import { describe, it, expect } from 'vitest';
import {
    resolvePlaceholders,
    resolveTemplate,
    validatePlaceholderValues,
    evaluateSectionConditions,
    generatePreview,
    getMissingRequiredPlaceholders,
    createInitialValues,
    mergeIntakeData,
} from './placeholderResolver';
import {
    PlaceholderDefinition,
    PlaceholderValues,
    TemplateSection,
    SectionCondition,
    extractPlaceholders,
    hasPlaceholders,
} from './templateTypes';

// ============================================
// Test Data
// ============================================

const samplePlaceholders: PlaceholderDefinition[] = [
    {
        name: 'client_name',
        type: 'text',
        label: 'Client Name',
        required: true,
    },
    {
        name: 'case_number',
        type: 'text',
        label: 'Case Number',
        required: false,
        defaultValue: 'TBD',
    },
    {
        name: 'amount',
        type: 'currency',
        label: 'Amount',
        required: true,
        validation: { min: 0, max: 1000000 },
    },
    {
        name: 'filing_date',
        type: 'date',
        label: 'Filing Date',
        required: false,
    },
    {
        name: 'case_type',
        type: 'select',
        label: 'Case Type',
        required: true,
        options: [
            { value: 'civil', label: 'Civil' },
            { value: 'criminal', label: 'Criminal' },
            { value: 'family', label: 'Family' },
        ],
    },
    {
        name: 'email',
        type: 'email',
        label: 'Email Address',
        required: false,
    },
    {
        name: 'is_urgent',
        type: 'boolean',
        label: 'Is Urgent',
        required: false,
    },
];

const sampleSections: TemplateSection[] = [
    {
        id: '1',
        name: 'Header',
        content: '<h1>Case: {{case_number}}</h1>',
        order: 0,
        isRequired: true,
    },
    {
        id: '2',
        name: 'Client Info',
        content: '<p>Client: {{client_name}}</p><p>Email: {{email}}</p>',
        order: 1,
        isRequired: true,
    },
    {
        id: '3',
        name: 'Amount Section',
        content: '<p>Amount: {{amount}}</p>',
        order: 2,
        isRequired: false,
        conditions: [
            { placeholderName: 'amount', operator: 'isNotEmpty' },
        ],
    },
];

// ============================================
// Tests: extractPlaceholders
// ============================================

describe('extractPlaceholders', () => {
    it('should extract single placeholder', () => {
        const result = extractPlaceholders('Hello {{name}}!');
        expect(result).toEqual(['name']);
    });

    it('should extract multiple placeholders', () => {
        const result = extractPlaceholders('{{greeting}} {{name}}, your case is {{case_number}}.');
        expect(result).toEqual(['greeting', 'name', 'case_number']);
    });

    it('should return empty array for no placeholders', () => {
        const result = extractPlaceholders('No placeholders here.');
        expect(result).toEqual([]);
    });

    it('should handle duplicate placeholders', () => {
        const result = extractPlaceholders('{{name}} and {{name}} again');
        expect(result).toEqual(['name']); // Should be unique
    });

    it('should handle underscores in placeholder names', () => {
        const result = extractPlaceholders('{{client_full_name}}');
        expect(result).toEqual(['client_full_name']);
    });

    it('should handle numbers in placeholder names', () => {
        const result = extractPlaceholders('{{item1}} and {{item2}}');
        expect(result).toEqual(['item1', 'item2']);
    });
});

describe('hasPlaceholders', () => {
    it('should return true when placeholders exist', () => {
        expect(hasPlaceholders('Hello {{name}}!')).toBe(true);
    });

    it('should return false when no placeholders', () => {
        expect(hasPlaceholders('No placeholders here.')).toBe(false);
    });
});

// ============================================
// Tests: resolvePlaceholders
// ============================================

describe('resolvePlaceholders', () => {
    it('should resolve simple text placeholders', () => {
        const content = 'Hello {{client_name}}!';
        const values: PlaceholderValues = { client_name: 'John Doe' };
        
        const result = resolvePlaceholders(content, values, samplePlaceholders);
        
        expect(result.content).toBe('Hello John Doe!');
        expect(result.unresolvedPlaceholders).toHaveLength(0);
    });

    it('should track unresolved placeholders without defaults', () => {
        const content = 'Hello {{client_name}}, amount {{amount}}!';
        const values: PlaceholderValues = { client_name: 'John Doe' };
        
        // Using amount which has no default value
        const result = resolvePlaceholders(content, values, samplePlaceholders);
        
        expect(result.content).toContain('John Doe');
        expect(result.content).toContain('{{amount}}'); // Unresolved kept as-is (no default)
        expect(result.unresolvedPlaceholders).toContain('amount');
    });

    it('should use default values for unresolved placeholders', () => {
        const content = 'Case: {{case_number}}';
        const values: PlaceholderValues = {};
        
        const result = resolvePlaceholders(content, values, samplePlaceholders);
        
        expect(result.content).toBe('Case: TBD');
        expect(result.unresolvedPlaceholders).toHaveLength(0);
    });

    it('should format currency values', () => {
        const content = 'Amount: {{amount}}';
        const values: PlaceholderValues = { amount: 1234.56 };
        
        const result = resolvePlaceholders(content, values, samplePlaceholders);
        
        expect(result.content).toBe('Amount: $1,234.56');
    });

    it('should format date values', () => {
        const content = 'Filed on {{filing_date}}';
        const values: PlaceholderValues = { filing_date: '2024-03-15' };
        
        const result = resolvePlaceholders(content, values, samplePlaceholders);
        
        expect(result.content).toContain('March 15, 2024');
    });

    it('should format boolean values', () => {
        const content = 'Urgent: {{is_urgent}}';
        const values: PlaceholderValues = { is_urgent: true };
        
        const result = resolvePlaceholders(content, values, samplePlaceholders);
        
        expect(result.content).toBe('Urgent: Yes');
    });

    it('should use select option labels', () => {
        const content = 'Type: {{case_type}}';
        const values: PlaceholderValues = { case_type: 'civil' };
        
        const result = resolvePlaceholders(content, values, samplePlaceholders);
        
        expect(result.content).toBe('Type: Civil');
    });

    it('should warn about undefined placeholders', () => {
        const content = 'Hello {{unknown_placeholder}}!';
        const values: PlaceholderValues = { unknown_placeholder: 'test' };
        
        const result = resolvePlaceholders(content, values, samplePlaceholders);
        
        expect(result.warnings).toContain('Placeholder {{unknown_placeholder}} is used but not defined');
    });
});

// ============================================
// Tests: validatePlaceholderValues
// ============================================

describe('validatePlaceholderValues', () => {
    it('should pass validation for valid values', () => {
        const values: PlaceholderValues = {
            client_name: 'John Doe',
            amount: 500,
            case_type: 'civil',
        };
        
        const result = validatePlaceholderValues(values, samplePlaceholders);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', () => {
        const values: PlaceholderValues = {
            client_name: 'John Doe',
            // Missing: amount, case_type
        };
        
        const result = validatePlaceholderValues(values, samplePlaceholders);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.placeholderName === 'amount')).toBe(true);
        expect(result.errors.some(e => e.placeholderName === 'case_type')).toBe(true);
    });

    it('should validate email format', () => {
        const values: PlaceholderValues = {
            client_name: 'John',
            amount: 100,
            case_type: 'civil',
            email: 'invalid-email',
        };
        
        const result = validatePlaceholderValues(values, samplePlaceholders);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.placeholderName === 'email')).toBe(true);
    });

    it('should validate number range', () => {
        const values: PlaceholderValues = {
            client_name: 'John',
            amount: 2000000, // Exceeds max of 1000000
            case_type: 'civil',
        };
        
        const result = validatePlaceholderValues(values, samplePlaceholders);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.placeholderName === 'amount')).toBe(true);
    });

    it('should validate select options', () => {
        const values: PlaceholderValues = {
            client_name: 'John',
            amount: 100,
            case_type: 'invalid_type',
        };
        
        const result = validatePlaceholderValues(values, samplePlaceholders);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.placeholderName === 'case_type')).toBe(true);
    });

    it('should skip validation for optional empty fields', () => {
        const values: PlaceholderValues = {
            client_name: 'John',
            amount: 100,
            case_type: 'civil',
            email: '', // Optional and empty
        };
        
        const result = validatePlaceholderValues(values, samplePlaceholders);
        
        expect(result.isValid).toBe(true);
    });
});

// ============================================
// Tests: evaluateSectionConditions
// ============================================

describe('evaluateSectionConditions', () => {
    it('should return true when no conditions', () => {
        const result = evaluateSectionConditions(undefined, {});
        expect(result).toBe(true);
    });

    it('should return true when empty conditions', () => {
        const result = evaluateSectionConditions([], {});
        expect(result).toBe(true);
    });

    it('should evaluate equals condition', () => {
        const conditions: SectionCondition[] = [
            { placeholderName: 'status', operator: 'equals', value: 'active' },
        ];
        
        expect(evaluateSectionConditions(conditions, { status: 'active' })).toBe(true);
        expect(evaluateSectionConditions(conditions, { status: 'inactive' })).toBe(false);
    });

    it('should evaluate notEquals condition', () => {
        const conditions: SectionCondition[] = [
            { placeholderName: 'status', operator: 'notEquals', value: 'deleted' },
        ];
        
        expect(evaluateSectionConditions(conditions, { status: 'active' })).toBe(true);
        expect(evaluateSectionConditions(conditions, { status: 'deleted' })).toBe(false);
    });

    it('should evaluate isNotEmpty condition', () => {
        const conditions: SectionCondition[] = [
            { placeholderName: 'amount', operator: 'isNotEmpty' },
        ];
        
        expect(evaluateSectionConditions(conditions, { amount: 100 })).toBe(true);
        expect(evaluateSectionConditions(conditions, { amount: null })).toBe(false);
        expect(evaluateSectionConditions(conditions, { amount: '' })).toBe(false);
    });

    it('should evaluate isEmpty condition', () => {
        const conditions: SectionCondition[] = [
            { placeholderName: 'notes', operator: 'isEmpty' },
        ];
        
        expect(evaluateSectionConditions(conditions, { notes: null })).toBe(true);
        expect(evaluateSectionConditions(conditions, { notes: '' })).toBe(true);
        expect(evaluateSectionConditions(conditions, { notes: 'some text' })).toBe(false);
    });

    it('should evaluate contains condition for strings', () => {
        const conditions: SectionCondition[] = [
            { placeholderName: 'description', operator: 'contains', value: 'urgent' },
        ];
        
        expect(evaluateSectionConditions(conditions, { description: 'This is urgent!' })).toBe(true);
        expect(evaluateSectionConditions(conditions, { description: 'Normal case' })).toBe(false);
    });

    it('should evaluate multiple conditions (AND logic)', () => {
        const conditions: SectionCondition[] = [
            { placeholderName: 'status', operator: 'equals', value: 'active' },
            { placeholderName: 'amount', operator: 'isNotEmpty' },
        ];
        
        expect(evaluateSectionConditions(conditions, { status: 'active', amount: 100 })).toBe(true);
        expect(evaluateSectionConditions(conditions, { status: 'active', amount: null })).toBe(false);
        expect(evaluateSectionConditions(conditions, { status: 'inactive', amount: 100 })).toBe(false);
    });
});

// ============================================
// Tests: resolveTemplate
// ============================================

describe('resolveTemplate', () => {
    it('should resolve all sections in order', () => {
        const values: PlaceholderValues = {
            case_number: '12345',
            client_name: 'John Doe',
            email: 'john@example.com',
            amount: 1000,
        };
        
        const result = resolveTemplate(sampleSections, values, samplePlaceholders);
        
        expect(result.content).toContain('Case: 12345');
        expect(result.content).toContain('Client: John Doe');
        expect(result.content).toContain('Amount: $1,000.00');
    });

    it('should skip sections with unmet conditions', () => {
        const values: PlaceholderValues = {
            case_number: '12345',
            client_name: 'John Doe',
            email: 'john@example.com',
            amount: null, // Amount is empty, so section should be skipped
        };
        
        const result = resolveTemplate(sampleSections, values, samplePlaceholders);
        
        expect(result.content).toContain('Case: 12345');
        expect(result.content).toContain('Client: John Doe');
        expect(result.content).not.toContain('Amount:');
    });
});

// ============================================
// Tests: generatePreview
// ============================================

describe('generatePreview', () => {
    it('should highlight resolved placeholders', () => {
        const content = 'Hello {{client_name}}!';
        const values: PlaceholderValues = { client_name: 'John Doe' };
        
        const result = generatePreview(content, values, samplePlaceholders);
        
        expect(result).toContain('class="placeholder-resolved"');
        expect(result).toContain('John Doe');
    });

    it('should highlight unresolved placeholders', () => {
        const content = 'Hello {{client_name}}!';
        const values: PlaceholderValues = {};
        
        const result = generatePreview(content, values, samplePlaceholders);
        
        expect(result).toContain('class="placeholder-unresolved"');
        expect(result).toContain('[Client Name]');
    });
});

// ============================================
// Tests: Helper Functions
// ============================================

describe('getMissingRequiredPlaceholders', () => {
    it('should return missing required placeholders', () => {
        const values: PlaceholderValues = { client_name: 'John' };
        
        const result = getMissingRequiredPlaceholders(samplePlaceholders, values);
        
        expect(result.some(p => p.name === 'amount')).toBe(true);
        expect(result.some(p => p.name === 'case_type')).toBe(true);
        expect(result.some(p => p.name === 'client_name')).toBe(false);
    });

    it('should return empty array when all required filled', () => {
        const values: PlaceholderValues = {
            client_name: 'John',
            amount: 100,
            case_type: 'civil',
        };
        
        const result = getMissingRequiredPlaceholders(samplePlaceholders, values);
        
        expect(result).toHaveLength(0);
    });
});

describe('createInitialValues', () => {
    it('should create initial values from definitions', () => {
        const result = createInitialValues(samplePlaceholders);
        
        expect(result.case_number).toBe('TBD'); // Has default
        expect(result.client_name).toBeNull(); // No default
        expect(result.amount).toBeNull();
    });
});

describe('mergeIntakeData', () => {
    it('should merge intake data into values', () => {
        const values: PlaceholderValues = { existing: 'value' };
        const intakeData = { client_name: 'Jane Doe', amount: 500 };
        
        const result = mergeIntakeData(values, intakeData);
        
        expect(result.existing).toBe('value');
        expect(result.client_name).toBe('Jane Doe');
        expect(result.amount).toBe(500);
    });

    it('should use field mapping', () => {
        const values: PlaceholderValues = {};
        const intakeData = { clientFullName: 'Jane Doe' };
        const mapping = { clientFullName: 'client_name' };
        
        const result = mergeIntakeData(values, intakeData, mapping);
        
        expect(result.client_name).toBe('Jane Doe');
    });

    it('should not overwrite existing values', () => {
        const values: PlaceholderValues = { client_name: 'John Doe' };
        const intakeData = { client_name: 'Jane Doe' };
        
        const result = mergeIntakeData(values, intakeData);
        
        expect(result.client_name).toBe('John Doe'); // Original preserved
    });
});

