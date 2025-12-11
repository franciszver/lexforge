import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { store } from '../store';
import { Dashboard, Login, Intake, Editor, Admin } from './index';

// Helper to wrap components with required providers
const renderWithProviders = (component: React.ReactNode) => {
    return render(
        <Provider store={store}>
            <MemoryRouter>
                {component}
            </MemoryRouter>
        </Provider>
    );
};

describe('Page Components', () => {
    it('renders Dashboard correctly', () => {
        renderWithProviders(<Dashboard />);
        expect(screen.getByRole('heading', { name: /Dashboard/i })).toBeInTheDocument();
    });

    it('renders Login correctly', () => {
        renderWithProviders(<Login />);
        expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
    });

    it('renders Intake correctly', () => {
        renderWithProviders(<Intake />);
        expect(screen.getByRole('heading', { name: /Let's start your draft/i })).toBeInTheDocument();
    });

    it('renders Editor correctly', () => {
        renderWithProviders(<Editor />);
        // Editor header says "LexForge // Draft"
        expect(screen.getByText(/LexForge \/\/ Draft/i)).toBeInTheDocument();
        // Check for AI trigger button
        expect(screen.getByTitle(/Generate Suggestions/i)).toBeInTheDocument();
        // Check for Export button
        expect(screen.getByTitle(/Export to Word/i)).toBeInTheDocument();
    });

    it('renders Admin correctly', () => {
        renderWithProviders(<Admin />);
        // Check for the main branding header
        expect(screen.getByText(/LexForge/i)).toBeInTheDocument();
        expect(screen.getByText(/Admin/i)).toBeInTheDocument();

        // Default tab is Template Management
        expect(screen.getByRole('heading', { name: /Template Management/i })).toBeInTheDocument();
    });

    it('switches tabs in Admin', () => {
        renderWithProviders(<Admin />);
        const userTab = screen.getByText(/User Management/i);
        fireEvent.click(userTab);
        expect(screen.getByRole('heading', { name: /User Directory/i })).toBeInTheDocument();
    });
});
