import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import intakeReducer from '../features/intakeSlice';
import editorReducer from '../features/editorSlice';
import { Intake } from './Intake';

// Mock useNavigate
const mockedUseNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockedUseNavigate,
    };
});

const renderWithRedux = (component: React.ReactNode) => {
    const store = configureStore({
        reducer: {
            intake: intakeReducer,
            editor: editorReducer,
        },
    });
    return render(
        <Provider store={store}>
            <MemoryRouter>
                {component}
            </MemoryRouter>
        </Provider>
    );
};

describe('Intake Workflow', () => {
    it('completes the full intake wizard flow', async () => {
        renderWithRedux(<Intake />);

        // STEP 1: Jurisdiction & Practice
        expect(screen.getByText(/Jurisdiction & Practice/i)).toBeInTheDocument();
        fireEvent.click(screen.getByText('California')); // Select Jurisdiction
        // Check if Redux updated? (Implicitly checked by navigating, or we could spy on dispatch, 
        // but UI behavior is better: "Continue" moves to next step)

        fireEvent.click(screen.getByText(/Continue/i));

        // STEP 2: Document Type
        expect(screen.getByText(/Document Type/i)).toBeInTheDocument();
        fireEvent.click(screen.getByText('Demand Letter')); // Select Doc Type

        fireEvent.click(screen.getByText(/Continue/i));

        // STEP 3: Specifics
        expect(screen.getByText(/Specifics/i)).toBeInTheDocument();

        const opponentInput = screen.getByPlaceholderText(/e.g. Acme Corp/i);
        fireEvent.change(opponentInput, { target: { value: 'Bad Guy Inc.' } });

        const goalInput = screen.getByPlaceholderText(/Describe the desired outcome/i);
        fireEvent.change(goalInput, { target: { value: 'Get my money back' } });

        // Submit
        const generateBtn = screen.getByText(/Generate Draft/i);
        fireEvent.click(generateBtn);

        // Verify Navigation
        expect(mockedUseNavigate).toHaveBeenCalledWith(expect.stringMatching(/\/draft\/\d+/));
    });

    it('updates practice area selection', () => {
        renderWithRedux(<Intake />);
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'Real Estate' } });
        expect(select).toHaveValue('Real Estate');
    });
});
