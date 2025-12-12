import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    outlineToHtml,
    exportOutlineToJson,
    importOutlineFromJson,
    calculateCompletenessScore,
    reorderArguments,
    addArgumentToOutline,
    removeArgumentFromOutline,
    updateArgumentInOutline,
} from './argumentService';
import type { ArgumentOutline, Argument, SupportingPoint, CounterArgument } from './argumentTypes';

// Helper to create a mock argument
const createMockArgument = (overrides: Partial<Argument> = {}): Argument => ({
    id: 'arg-1',
    type: 'legal',
    title: 'Test Argument',
    thesis: 'This is a test thesis.',
    supportingPoints: [
        { id: 'sp-1', text: 'Supporting point 1', type: 'fact', strength: 'strong' },
        { id: 'sp-2', text: 'Supporting point 2', type: 'law', strength: 'moderate', citations: ['Case v. Case'] },
    ],
    counterArguments: [
        { id: 'ca-1', text: 'Counter argument', strength: 'moderate', rebuttal: 'Rebuttal text' },
    ],
    conclusion: 'Argument conclusion.',
    strength: 'strong',
    confidenceScore: 0.85,
    citations: ['Citation 1', 'Citation 2'],
    order: 0,
    ...overrides,
});

// Helper to create a mock outline
const createMockOutline = (overrides: Partial<ArgumentOutline> = {}): ArgumentOutline => ({
    id: 'outline-1',
    title: 'Test Outline',
    description: 'Test description',
    documentType: 'Brief',
    jurisdiction: 'Federal',
    introduction: 'Introduction paragraph.',
    arguments: [createMockArgument()],
    conclusion: 'Overall conclusion.',
    overallStrength: 'strong',
    coherenceScore: 0.8,
    completenessScore: 0.75,
    suggestions: ['Suggestion 1'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
});

describe('argumentService', () => {
    describe('outlineToHtml', () => {
        it('should convert outline to HTML', () => {
            const outline = createMockOutline();
            const html = outlineToHtml(outline);
            
            expect(html).toContain('<h1>Test Outline</h1>');
            expect(html).toContain('<h2>Introduction</h2>');
            expect(html).toContain('Introduction paragraph.');
            expect(html).toContain('<h2>1. Test Argument</h2>');
            expect(html).toContain('This is a test thesis.');
            expect(html).toContain('Supporting Points');
            expect(html).toContain('Supporting point 1');
            expect(html).toContain('Counter argument');
            expect(html).toContain('Rebuttal text');
            expect(html).toContain('<h2>Conclusion</h2>');
            expect(html).toContain('Overall conclusion.');
        });

        it('should include citations in supporting points', () => {
            const outline = createMockOutline();
            const html = outlineToHtml(outline);
            
            expect(html).toContain('Case v. Case');
        });

        it('should handle outline without introduction', () => {
            const outline = createMockOutline({ introduction: '' });
            const html = outlineToHtml(outline);
            
            expect(html).not.toContain('<h2>Introduction</h2>');
        });

        it('should handle outline without conclusion', () => {
            const outline = createMockOutline({ conclusion: '' });
            const html = outlineToHtml(outline);
            
            // Should still have the argument conclusions, just not overall conclusion
            expect(html).toContain('Argument conclusion.');
        });

        it('should handle multiple arguments', () => {
            const outline = createMockOutline({
                arguments: [
                    createMockArgument({ id: 'arg-1', title: 'First Argument', order: 0 }),
                    createMockArgument({ id: 'arg-2', title: 'Second Argument', order: 1 }),
                ],
            });
            const html = outlineToHtml(outline);
            
            expect(html).toContain('<h2>1. First Argument</h2>');
            expect(html).toContain('<h2>2. Second Argument</h2>');
        });
    });

    describe('exportOutlineToJson', () => {
        it('should export outline to JSON string', () => {
            const outline = createMockOutline();
            const json = exportOutlineToJson(outline);
            
            expect(typeof json).toBe('string');
            const parsed = JSON.parse(json);
            expect(parsed.id).toBe(outline.id);
            expect(parsed.title).toBe(outline.title);
        });

        it('should format JSON with indentation', () => {
            const outline = createMockOutline();
            const json = exportOutlineToJson(outline);
            
            expect(json).toContain('\n');
            expect(json).toContain('  ');
        });
    });

    describe('importOutlineFromJson', () => {
        it('should import valid JSON outline', () => {
            const outline = createMockOutline();
            const json = exportOutlineToJson(outline);
            const imported = importOutlineFromJson(json);
            
            expect(imported).not.toBeNull();
            expect(imported?.id).toBe(outline.id);
            expect(imported?.title).toBe(outline.title);
            expect(imported?.arguments.length).toBe(outline.arguments.length);
        });

        it('should return null for invalid JSON', () => {
            const result = importOutlineFromJson('not valid json');
            expect(result).toBeNull();
        });

        it('should return null for JSON without required fields', () => {
            const result = importOutlineFromJson('{"foo": "bar"}');
            expect(result).toBeNull();
        });

        it('should return null for JSON with arguments that is not an array', () => {
            const result = importOutlineFromJson('{"id": "1", "title": "Test", "arguments": "not an array"}');
            expect(result).toBeNull();
        });
    });

    describe('calculateCompletenessScore', () => {
        it('should return 0 for empty outline', () => {
            const outline = createMockOutline({
                title: '',
                introduction: '',
                conclusion: '',
                arguments: [],
            });
            const score = calculateCompletenessScore(outline);
            expect(score).toBe(0);
        });

        it('should return high score for complete outline', () => {
            const outline = createMockOutline({
                title: 'Title',
                introduction: 'Intro',
                conclusion: 'Conclusion',
                arguments: [
                    createMockArgument({
                        thesis: 'Thesis',
                        supportingPoints: [
                            { id: 'sp-1', text: 'Point 1', type: 'fact', strength: 'strong' },
                            { id: 'sp-2', text: 'Point 2', type: 'law', strength: 'strong' },
                        ],
                        counterArguments: [
                            { id: 'ca-1', text: 'Counter', strength: 'moderate' },
                        ],
                    }),
                    createMockArgument({
                        id: 'arg-2',
                        thesis: 'Thesis 2',
                        supportingPoints: [
                            { id: 'sp-3', text: 'Point 3', type: 'fact', strength: 'strong' },
                            { id: 'sp-4', text: 'Point 4', type: 'law', strength: 'strong' },
                        ],
                        counterArguments: [
                            { id: 'ca-2', text: 'Counter 2', strength: 'moderate' },
                        ],
                    }),
                ],
            });
            const score = calculateCompletenessScore(outline);
            expect(score).toBeGreaterThan(0.8);
        });

        it('should return lower score for incomplete outline', () => {
            const outline = createMockOutline({
                title: 'Title',
                introduction: '',
                conclusion: '',
                arguments: [
                    createMockArgument({
                        thesis: '',
                        supportingPoints: [],
                        counterArguments: [],
                    }),
                ],
            });
            const score = calculateCompletenessScore(outline);
            expect(score).toBeLessThan(0.5);
        });
    });

    describe('reorderArguments', () => {
        it('should move argument up', () => {
            const outline = createMockOutline({
                arguments: [
                    createMockArgument({ id: 'arg-1', title: 'First', order: 0 }),
                    createMockArgument({ id: 'arg-2', title: 'Second', order: 1 }),
                    createMockArgument({ id: 'arg-3', title: 'Third', order: 2 }),
                ],
            });
            
            const reordered = reorderArguments(outline, 2, 0);
            
            expect(reordered.arguments[0].id).toBe('arg-3');
            expect(reordered.arguments[1].id).toBe('arg-1');
            expect(reordered.arguments[2].id).toBe('arg-2');
            expect(reordered.arguments[0].order).toBe(0);
            expect(reordered.arguments[1].order).toBe(1);
            expect(reordered.arguments[2].order).toBe(2);
        });

        it('should move argument down', () => {
            const outline = createMockOutline({
                arguments: [
                    createMockArgument({ id: 'arg-1', title: 'First', order: 0 }),
                    createMockArgument({ id: 'arg-2', title: 'Second', order: 1 }),
                    createMockArgument({ id: 'arg-3', title: 'Third', order: 2 }),
                ],
            });
            
            const reordered = reorderArguments(outline, 0, 2);
            
            expect(reordered.arguments[0].id).toBe('arg-2');
            expect(reordered.arguments[1].id).toBe('arg-3');
            expect(reordered.arguments[2].id).toBe('arg-1');
        });

        it('should not modify original outline', () => {
            const outline = createMockOutline({
                arguments: [
                    createMockArgument({ id: 'arg-1', order: 0 }),
                    createMockArgument({ id: 'arg-2', order: 1 }),
                ],
            });
            
            const reordered = reorderArguments(outline, 0, 1);
            
            expect(outline.arguments[0].id).toBe('arg-1');
            expect(reordered.arguments[0].id).toBe('arg-2');
        });
    });

    describe('addArgumentToOutline', () => {
        it('should add new argument to outline', () => {
            const outline = createMockOutline({
                arguments: [createMockArgument({ id: 'arg-1', order: 0 })],
            });
            const newArg = createMockArgument({ id: 'arg-new', title: 'New Argument' });
            
            const updated = addArgumentToOutline(outline, newArg);
            
            expect(updated.arguments.length).toBe(2);
            expect(updated.arguments[1].id).toBe('arg-new');
            expect(updated.arguments[1].order).toBe(1);
        });

        it('should not modify original outline', () => {
            const outline = createMockOutline({
                arguments: [createMockArgument({ id: 'arg-1', order: 0 })],
            });
            const newArg = createMockArgument({ id: 'arg-new' });
            
            const updated = addArgumentToOutline(outline, newArg);
            
            expect(outline.arguments.length).toBe(1);
            expect(updated.arguments.length).toBe(2);
        });
    });

    describe('removeArgumentFromOutline', () => {
        it('should remove argument from outline', () => {
            const outline = createMockOutline({
                arguments: [
                    createMockArgument({ id: 'arg-1', order: 0 }),
                    createMockArgument({ id: 'arg-2', order: 1 }),
                ],
            });
            
            const updated = removeArgumentFromOutline(outline, 'arg-1');
            
            expect(updated.arguments.length).toBe(1);
            expect(updated.arguments[0].id).toBe('arg-2');
            expect(updated.arguments[0].order).toBe(0);
        });

        it('should not modify original outline', () => {
            const outline = createMockOutline({
                arguments: [
                    createMockArgument({ id: 'arg-1', order: 0 }),
                    createMockArgument({ id: 'arg-2', order: 1 }),
                ],
            });
            
            const updated = removeArgumentFromOutline(outline, 'arg-1');
            
            expect(outline.arguments.length).toBe(2);
            expect(updated.arguments.length).toBe(1);
        });

        it('should handle non-existent argument ID', () => {
            const outline = createMockOutline({
                arguments: [createMockArgument({ id: 'arg-1', order: 0 })],
            });
            
            const updated = removeArgumentFromOutline(outline, 'non-existent');
            
            expect(updated.arguments.length).toBe(1);
        });
    });

    describe('updateArgumentInOutline', () => {
        it('should update existing argument', () => {
            const outline = createMockOutline({
                arguments: [
                    createMockArgument({ id: 'arg-1', title: 'Original Title', order: 0 }),
                ],
            });
            const updatedArg = createMockArgument({ id: 'arg-1', title: 'Updated Title', order: 0 });
            
            const updated = updateArgumentInOutline(outline, updatedArg);
            
            expect(updated.arguments[0].title).toBe('Updated Title');
        });

        it('should not modify original outline', () => {
            const outline = createMockOutline({
                arguments: [createMockArgument({ id: 'arg-1', title: 'Original', order: 0 })],
            });
            const updatedArg = createMockArgument({ id: 'arg-1', title: 'Updated', order: 0 });
            
            const updated = updateArgumentInOutline(outline, updatedArg);
            
            expect(outline.arguments[0].title).toBe('Original');
            expect(updated.arguments[0].title).toBe('Updated');
        });

        it('should not change other arguments', () => {
            const outline = createMockOutline({
                arguments: [
                    createMockArgument({ id: 'arg-1', title: 'First', order: 0 }),
                    createMockArgument({ id: 'arg-2', title: 'Second', order: 1 }),
                ],
            });
            const updatedArg = createMockArgument({ id: 'arg-1', title: 'Updated First', order: 0 });
            
            const updated = updateArgumentInOutline(outline, updatedArg);
            
            expect(updated.arguments[0].title).toBe('Updated First');
            expect(updated.arguments[1].title).toBe('Second');
        });
    });
});

