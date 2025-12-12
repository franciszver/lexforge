import { describe, it, expect } from 'vitest';
import {
    calculateArgumentStrength,
    calculateOutlineStrength,
    getStrengthColor,
    formatConfidence,
    generateId,
    type SupportingPoint,
    type Argument,
    type ArgumentStrength,
} from './argumentTypes';

describe('argumentTypes', () => {
    describe('calculateArgumentStrength', () => {
        it('should return "weak" for empty points array', () => {
            expect(calculateArgumentStrength([])).toBe('weak');
        });

        it('should return "strong" when all points are strong', () => {
            const points: SupportingPoint[] = [
                { id: '1', text: 'Point 1', type: 'fact', strength: 'strong' },
                { id: '2', text: 'Point 2', type: 'law', strength: 'strong' },
            ];
            expect(calculateArgumentStrength(points)).toBe('strong');
        });

        it('should return "weak" when all points are weak', () => {
            const points: SupportingPoint[] = [
                { id: '1', text: 'Point 1', type: 'fact', strength: 'weak' },
                { id: '2', text: 'Point 2', type: 'law', strength: 'weak' },
            ];
            expect(calculateArgumentStrength(points)).toBe('weak');
        });

        it('should return "moderate" for mixed strength points', () => {
            const points: SupportingPoint[] = [
                { id: '1', text: 'Point 1', type: 'fact', strength: 'strong' },
                { id: '2', text: 'Point 2', type: 'law', strength: 'weak' },
            ];
            expect(calculateArgumentStrength(points)).toBe('moderate');
        });

        it('should return "moderate" when all points are moderate', () => {
            const points: SupportingPoint[] = [
                { id: '1', text: 'Point 1', type: 'fact', strength: 'moderate' },
                { id: '2', text: 'Point 2', type: 'law', strength: 'moderate' },
            ];
            expect(calculateArgumentStrength(points)).toBe('moderate');
        });

        it('should correctly calculate with majority strong', () => {
            const points: SupportingPoint[] = [
                { id: '1', text: 'Point 1', type: 'fact', strength: 'strong' },
                { id: '2', text: 'Point 2', type: 'law', strength: 'strong' },
                { id: '3', text: 'Point 3', type: 'precedent', strength: 'moderate' },
            ];
            expect(calculateArgumentStrength(points)).toBe('strong');
        });
    });

    describe('calculateOutlineStrength', () => {
        const createArgument = (strength: ArgumentStrength): Argument => ({
            id: generateId(),
            type: 'legal',
            title: 'Test Argument',
            thesis: 'Test thesis',
            supportingPoints: [],
            counterArguments: [],
            conclusion: 'Test conclusion',
            strength,
            confidenceScore: 0.8,
            citations: [],
            order: 0,
        });

        it('should return "weak" for empty arguments array', () => {
            expect(calculateOutlineStrength([])).toBe('weak');
        });

        it('should return "strong" when all arguments are strong', () => {
            const arguments_ = [createArgument('strong'), createArgument('strong')];
            expect(calculateOutlineStrength(arguments_)).toBe('strong');
        });

        it('should return "weak" when all arguments are weak', () => {
            const arguments_ = [createArgument('weak'), createArgument('weak')];
            expect(calculateOutlineStrength(arguments_)).toBe('weak');
        });

        it('should return "moderate" for mixed strength arguments', () => {
            const arguments_ = [createArgument('strong'), createArgument('weak')];
            expect(calculateOutlineStrength(arguments_)).toBe('moderate');
        });
    });

    describe('getStrengthColor', () => {
        it('should return green for strong', () => {
            expect(getStrengthColor('strong')).toBe('text-green-600 bg-green-50');
        });

        it('should return amber for moderate', () => {
            expect(getStrengthColor('moderate')).toBe('text-amber-600 bg-amber-50');
        });

        it('should return red for weak', () => {
            expect(getStrengthColor('weak')).toBe('text-red-600 bg-red-50');
        });
    });

    describe('formatConfidence', () => {
        it('should format 1.0 as 100%', () => {
            expect(formatConfidence(1.0)).toBe('100%');
        });

        it('should format 0.5 as 50%', () => {
            expect(formatConfidence(0.5)).toBe('50%');
        });

        it('should format 0.0 as 0%', () => {
            expect(formatConfidence(0.0)).toBe('0%');
        });

        it('should round 0.756 to 76%', () => {
            expect(formatConfidence(0.756)).toBe('76%');
        });

        it('should round 0.754 to 75%', () => {
            expect(formatConfidence(0.754)).toBe('75%');
        });
    });

    describe('generateId', () => {
        it('should generate unique IDs', () => {
            const id1 = generateId();
            const id2 = generateId();
            expect(id1).not.toBe(id2);
        });

        it('should generate IDs starting with "arg-"', () => {
            const id = generateId();
            expect(id.startsWith('arg-')).toBe(true);
        });

        it('should generate IDs of reasonable length', () => {
            const id = generateId();
            expect(id.length).toBeGreaterThan(10);
            expect(id.length).toBeLessThan(50);
        });
    });
});

