import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard, Login, Intake, Editor, Admin } from './index';

describe('Page Components', () => {
    it('renders Dashboard correctly', () => {
        render(<Dashboard />);
        expect(screen.getByRole('heading', { name: /Dashboard/i })).toBeInTheDocument();
    });

    it('renders Login correctly', () => {
        render(<Login />);
        expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
    });

    it('renders Intake correctly', () => {
        render(<Intake />);
        expect(screen.getByRole('heading', { name: /Intake Wizard/i })).toBeInTheDocument();
    });

    it('renders Editor correctly', () => {
        render(<Editor />);
        expect(screen.getByRole('heading', { name: /Editor Workspace/i })).toBeInTheDocument();
    });

    it('renders Admin correctly', () => {
        render(<Admin />);
        expect(screen.getByRole('heading', { name: /Admin Console/i })).toBeInTheDocument();
    });
});
