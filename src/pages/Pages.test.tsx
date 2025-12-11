import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    });

    it('renders Admin correctly', () => {
        renderWithProviders(<Admin />);
        expect(screen.getByRole('heading', { name: /Admin Console/i })).toBeInTheDocument();
    });
});
