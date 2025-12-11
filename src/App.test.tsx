import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { AppRoutes } from './App';
import App from './App';

describe('App Routing', () => {
    it('renders Dashboard by default', () => {
        render(
            <Provider store={store}>
                <App />
            </Provider>
        );
        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
        expect(screen.getByText(/Welcome to LexForge/i)).toBeInTheDocument();
    });

    it('renders Login page on /login', () => {
        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={['/login']}>
                    <AppRoutes />
                </MemoryRouter>
            </Provider>
        );
        expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
    });
});
