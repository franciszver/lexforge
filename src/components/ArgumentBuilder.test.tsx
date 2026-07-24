import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArgumentCard } from './ArgumentBuilder';
import type { Argument } from '../utils/argumentTypes';

const mockArgument: Argument = {
    id: 'arg-1',
    type: 'legal',
    title: 'Test Argument',
    thesis: 'This is the thesis.',
    supportingPoints: [],
    counterArguments: [],
    conclusion: '',
    strength: 'strong',
    confidenceScore: 0.8,
    citations: [],
    order: 0,
};

describe('ArgumentCard', () => {
    it('does not render an Edit button when onEdit is not provided', () => {
        render(
            <ArgumentCard
                argument={mockArgument}
                index={0}
                onDelete={vi.fn()}
                expanded={false}
                onToggleExpand={vi.fn()}
            />
        );

        expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
    });

    it('renders an Edit button when onEdit is provided', () => {
        render(
            <ArgumentCard
                argument={mockArgument}
                index={0}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
                expanded={false}
                onToggleExpand={vi.fn()}
            />
        );

        expect(screen.getByTitle('Edit')).toBeInTheDocument();
    });
});
