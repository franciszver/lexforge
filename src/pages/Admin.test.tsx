import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Admin } from './Admin';

describe('Admin Page Interactions', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('deletes a template when confirmed', () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

        render(<Admin />);

        // Find the button with the label we are about to add
        const deleteBtns = screen.getAllByLabelText('Delete Template');
        expect(deleteBtns.length).toBeGreaterThan(0);

        const initialCount = deleteBtns.length;

        // Click the first one
        fireEvent.click(deleteBtns[0]);

        expect(confirmSpy).toHaveBeenCalled();

        // After delete, one less template triggers a re-render
        // However, "Delete Template" buttons will decrease by 1
        const remainingBtns = screen.getAllByLabelText('Delete Template');
        expect(remainingBtns).toHaveLength(initialCount - 1);
    });

    it('does not delete when cancelled', () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);

        render(<Admin />);

        const deleteBtns = screen.getAllByLabelText('Delete Template');
        const initialCount = deleteBtns.length;

        fireEvent.click(deleteBtns[0]);

        expect(confirmSpy).toHaveBeenCalled();
        const remainingBtns = screen.getAllByLabelText('Delete Template');
        expect(remainingBtns).toHaveLength(initialCount);
    });
});
