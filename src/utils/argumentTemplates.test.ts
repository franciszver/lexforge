import { describe, it, expect } from 'vitest';
import {
    ARGUMENT_TEMPLATES,
    getArgumentTemplates,
    getTemplatesByDocumentType,
    getTemplatesByCategory,
    getTemplateById,
    getTemplateDocumentTypes,
    getTemplateCategories,
    getSectionPromptGuidance,
    getTemplateSectionsByType,
    searchTemplates,
} from './argumentTemplates';
import type { ArgumentTemplate, ArgumentTemplateSection } from './argumentTypes';

describe('argumentTemplates', () => {
    describe('ARGUMENT_TEMPLATES', () => {
        it('should contain at least 5 templates', () => {
            expect(ARGUMENT_TEMPLATES.length).toBeGreaterThanOrEqual(5);
        });

        it('should have valid structure for each template', () => {
            ARGUMENT_TEMPLATES.forEach(template => {
                expect(template.id).toBeTruthy();
                expect(template.name).toBeTruthy();
                expect(template.description).toBeTruthy();
                expect(template.documentType).toBeTruthy();
                expect(template.category).toBeTruthy();
                expect(Array.isArray(template.structure)).toBe(true);
                expect(template.structure.length).toBeGreaterThan(0);
            });
        });

        it('should have valid structure sections', () => {
            ARGUMENT_TEMPLATES.forEach(template => {
                template.structure.forEach((section, index) => {
                    expect(section.id).toBeTruthy();
                    expect(section.name).toBeTruthy();
                    expect(['introduction', 'argument', 'counter', 'rebuttal', 'conclusion']).toContain(section.type);
                    expect(section.order).toBe(index);
                    expect(section.promptGuidance).toBeTruthy();
                });
            });
        });
    });

    describe('getArgumentTemplates', () => {
        it('should return all templates', () => {
            const templates = getArgumentTemplates();
            expect(templates).toEqual(ARGUMENT_TEMPLATES);
        });
    });

    describe('getTemplatesByDocumentType', () => {
        it('should filter templates by document type', () => {
            const motionTemplates = getTemplatesByDocumentType('Motion to Dismiss');
            expect(motionTemplates.length).toBeGreaterThan(0);
            motionTemplates.forEach(t => {
                expect(t.documentType).toBe('Motion to Dismiss');
            });
        });

        it('should return empty array for unknown document type', () => {
            const templates = getTemplatesByDocumentType('Unknown Type');
            expect(templates).toEqual([]);
        });
    });

    describe('getTemplatesByCategory', () => {
        it('should filter templates by category', () => {
            const civilProcTemplates = getTemplatesByCategory('Civil Procedure');
            expect(civilProcTemplates.length).toBeGreaterThan(0);
            civilProcTemplates.forEach(t => {
                expect(t.category).toBe('Civil Procedure');
            });
        });

        it('should return empty array for unknown category', () => {
            const templates = getTemplatesByCategory('Unknown Category');
            expect(templates).toEqual([]);
        });
    });

    describe('getTemplateById', () => {
        it('should return template by ID', () => {
            const template = getTemplateById('mtd-12b6');
            expect(template).toBeDefined();
            expect(template?.id).toBe('mtd-12b6');
            expect(template?.name).toBe('Motion to Dismiss (12(b)(6))');
        });

        it('should return undefined for unknown ID', () => {
            const template = getTemplateById('unknown-id');
            expect(template).toBeUndefined();
        });
    });

    describe('getTemplateDocumentTypes', () => {
        it('should return unique document types', () => {
            const docTypes = getTemplateDocumentTypes();
            expect(Array.isArray(docTypes)).toBe(true);
            expect(docTypes.length).toBeGreaterThan(0);
            // Check uniqueness
            const unique = [...new Set(docTypes)];
            expect(docTypes.length).toBe(unique.length);
        });

        it('should include common document types', () => {
            const docTypes = getTemplateDocumentTypes();
            expect(docTypes).toContain('Motion to Dismiss');
            expect(docTypes).toContain('Brief');
        });
    });

    describe('getTemplateCategories', () => {
        it('should return unique categories', () => {
            const categories = getTemplateCategories();
            expect(Array.isArray(categories)).toBe(true);
            expect(categories.length).toBeGreaterThan(0);
            // Check uniqueness
            const unique = [...new Set(categories)];
            expect(categories.length).toBe(unique.length);
        });

        it('should include common categories', () => {
            const categories = getTemplateCategories();
            expect(categories).toContain('Civil Procedure');
        });
    });

    describe('getSectionPromptGuidance', () => {
        it('should return prompt guidance', () => {
            const section: ArgumentTemplateSection = {
                id: 'test',
                name: 'Test Section',
                type: 'argument',
                order: 0,
                promptGuidance: 'Test guidance',
            };
            const guidance = getSectionPromptGuidance(section);
            expect(guidance).toContain('Test guidance');
        });

        it('should include required elements if present', () => {
            const section: ArgumentTemplateSection = {
                id: 'test',
                name: 'Test Section',
                type: 'argument',
                order: 0,
                promptGuidance: 'Test guidance',
                requiredElements: ['Element 1', 'Element 2'],
            };
            const guidance = getSectionPromptGuidance(section);
            expect(guidance).toContain('Required elements');
            expect(guidance).toContain('Element 1');
            expect(guidance).toContain('Element 2');
        });

        it('should include suggested length if present', () => {
            const section: ArgumentTemplateSection = {
                id: 'test',
                name: 'Test Section',
                type: 'argument',
                order: 0,
                promptGuidance: 'Test guidance',
                suggestedLength: 'medium',
            };
            const guidance = getSectionPromptGuidance(section);
            expect(guidance).toContain('Suggested length');
            expect(guidance).toContain('3-5 paragraphs');
        });
    });

    describe('getTemplateSectionsByType', () => {
        it('should return sections of specified type', () => {
            const template = ARGUMENT_TEMPLATES[0];
            const introSections = getTemplateSectionsByType(template, 'introduction');
            introSections.forEach(s => {
                expect(s.type).toBe('introduction');
            });
        });

        it('should return empty array if no sections match', () => {
            const template: ArgumentTemplate = {
                id: 'test',
                name: 'Test',
                description: 'Test',
                documentType: 'Test',
                category: 'Test',
                structure: [
                    { id: 'arg1', name: 'Arg 1', type: 'argument', order: 0, promptGuidance: 'Test' },
                ],
                usageCount: 0,
                isPublished: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            const introSections = getTemplateSectionsByType(template, 'introduction');
            expect(introSections).toEqual([]);
        });
    });

    describe('searchTemplates', () => {
        it('should find templates by name', () => {
            const results = searchTemplates('Motion to Dismiss');
            expect(results.length).toBeGreaterThan(0);
            expect(results.some(t => t.name.includes('Motion to Dismiss'))).toBe(true);
        });

        it('should find templates by description', () => {
            const results = searchTemplates('12(b)(6)');
            expect(results.length).toBeGreaterThan(0);
        });

        it('should find templates by document type', () => {
            const results = searchTemplates('Appellate Brief');
            expect(results.length).toBeGreaterThan(0);
        });

        it('should find templates by category', () => {
            const results = searchTemplates('Employment');
            expect(results.length).toBeGreaterThan(0);
        });

        it('should be case insensitive', () => {
            const resultsLower = searchTemplates('motion');
            const resultsUpper = searchTemplates('MOTION');
            expect(resultsLower.length).toBe(resultsUpper.length);
        });

        it('should return empty array for no matches', () => {
            const results = searchTemplates('xyznonexistent');
            expect(results).toEqual([]);
        });
    });
});

