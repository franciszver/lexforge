import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionCard } from './SuggestionCard';
import type { Suggestion } from '../types';

describe('SuggestionCard', () => {
    const mockSuggestion: Suggestion = {
        id: '1',
        type: 'tone',
        text: 'Fix this tone',
        replacementText: 'Better tone',
        confidence: 0.95,
        source: 'https://example.com'
    };

    it('renders suggestion details correctly', () => {
        render(
            <SuggestionCard
                suggestion={mockSuggestion}
                onAccept={vi.fn()}
                onDismiss={vi.fn()}
            />
        );

        expect(screen.getByText(/tone check/i)).toBeInTheDocument();
        expect(screen.getByText('Fix this tone')).toBeInTheDocument();
        expect(screen.getByText('Better tone')).toBeInTheDocument();
        expect(screen.getByText('95% Match')).toBeInTheDocument();
        expect(screen.getByText(/example.com/)).toBeInTheDocument();
    });

    it('calls onAccept when accept button is clicked', () => {
        const onAccept = vi.fn();
        render(
            <SuggestionCard
                suggestion={mockSuggestion}
                onAccept={onAccept}
                onDismiss={vi.fn()}
            />
        );

        fireEvent.click(screen.getByText('Accept'));
        expect(onAccept).toHaveBeenCalledWith('1');
    });

    it('calls onDismiss when dismiss button is clicked', () => {
        const onDismiss = vi.fn();
        render(
            <SuggestionCard
                suggestion={mockSuggestion}
                onAccept={vi.fn()}
                onDismiss={onDismiss}
            />
        );

        fireEvent.click(screen.getByText('Dismiss'));
        expect(onDismiss).toHaveBeenCalledWith('1');
    });
});
