import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './App';
import App from './App';

describe('App Routing', () => {
    it('renders Dashboard by default', () => {
        render(<App />); // Tests the full App with BrowserRouter
        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
        expect(screen.getByText(/Welcome to LexForge/i)).toBeInTheDocument();
    });

    it('renders Login page on /login', () => {
        render(
            <MemoryRouter initialEntries={['/login']}>
                <AppRoutes />
            </MemoryRouter>
        );
        expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
    });
});
