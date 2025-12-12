import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/authSlice';
import { Admin } from './Admin';

// Mock templates data
const mockTemplates = [
    {
        id: 'template-1',
        name: 'Demand Letter Template',
        category: 'Demand Letter',
        skeletonContent: '<h1>Demand Letter</h1>',
    },
    {
        id: 'template-2',
        name: 'Contract Template',
        category: 'Contract',
        skeletonContent: '<h1>Contract</h1>',
    },
];

// Mock Amplify data client
const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('aws-amplify/data', () => ({
    generateClient: () => ({
        models: {
            Template: {
                list: mockList,
                create: mockCreate,
                update: mockUpdate,
                delete: mockDelete,
            },
        },
    }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const renderAdmin = () => {
    const store = configureStore({
        reducer: {
            auth: authReducer,
        },
        preloadedState: {
            auth: {
                isAuthenticated: true,
                email: 'admin@example.com',
                userId: 'admin-123',
                isAdmin: true,
                loading: false,
            },
        },
    });

    return render(
        <Provider store={store}>
            <MemoryRouter>
                <Admin />
            </MemoryRouter>
        </Provider>
    );
};

describe('Admin Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockList.mockResolvedValue({ data: mockTemplates, errors: null });
        mockCreate.mockResolvedValue({ 
            data: { id: 'new-template', name: 'New Template', category: 'Motion', skeletonContent: '' },
            errors: null 
        });
        mockDelete.mockResolvedValue({ errors: null });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders Admin Console header', async () => {
        renderAdmin();
        
        await waitFor(() => {
            expect(screen.getByText('Admin Console')).toBeInTheDocument();
        });
    });

    it('loads and displays templates', async () => {
        renderAdmin();

        await waitFor(() => {
            expect(screen.getByText('Demand Letter Template')).toBeInTheDocument();
            expect(screen.getByText('Contract Template')).toBeInTheDocument();
        });
    });

    it('shows Templates section', async () => {
        renderAdmin();

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /Templates/i })).toBeInTheDocument();
        });
    });

    it('shows New Template button', async () => {
        renderAdmin();

        await waitFor(() => {
            expect(screen.getByText('New Template')).toBeInTheDocument();
        });
    });

    it('opens create template modal when New Template is clicked', async () => {
        renderAdmin();

        await waitFor(() => {
            expect(screen.getByText('New Template')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('New Template'));

        expect(screen.getByRole('heading', { name: 'New Template' })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('e.g., Standard Demand Letter')).toBeInTheDocument();
    });

    it('creates a new template', async () => {
        renderAdmin();

        await waitFor(() => {
            expect(screen.getByText('New Template')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('New Template'));

        const nameInput = screen.getByPlaceholderText('e.g., Standard Demand Letter');
        fireEvent.change(nameInput, { target: { value: 'Test Template' } });

        const createButton = screen.getByRole('button', { name: /Create Template/i });
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(mockCreate).toHaveBeenCalled();
        });
    });

    it('deletes a template when confirmed', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

        renderAdmin();

        await waitFor(() => {
            expect(screen.getByText('Demand Letter Template')).toBeInTheDocument();
        });

        // Find delete buttons (using aria-label or by finding the Trash icon button)
        const deleteButtons = screen.getAllByRole('button').filter(btn => 
            btn.querySelector('svg.lucide-trash-2')
        );
        expect(deleteButtons.length).toBeGreaterThan(0);

        fireEvent.click(deleteButtons[0]);

        expect(confirmSpy).toHaveBeenCalled();

        await waitFor(() => {
            expect(mockDelete).toHaveBeenCalledWith({ id: 'template-1' });
        });
    });

    it('does not delete when cancelled', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);

        renderAdmin();

        await waitFor(() => {
            expect(screen.getByText('Demand Letter Template')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByRole('button').filter(btn => 
            btn.querySelector('svg.lucide-trash-2')
        );
        
        fireEvent.click(deleteButtons[0]);

        expect(confirmSpy).toHaveBeenCalled();
        expect(mockDelete).not.toHaveBeenCalled();
    });

    it('navigates back to dashboard', async () => {
        renderAdmin();

        await waitFor(() => {
            expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Back to Dashboard'));

        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('shows Users section with Cognito info', async () => {
        renderAdmin();

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /Users/i })).toBeInTheDocument();
            expect(screen.getByText(/User management is handled through AWS Cognito/i)).toBeInTheDocument();
        });
    });

    it('shows Usage Statistics section', async () => {
        renderAdmin();

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /Usage Statistics/i })).toBeInTheDocument();
        });
    });

    it('shows AI Configuration section', async () => {
        renderAdmin();

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /AI Configuration/i })).toBeInTheDocument();
        });
    });
});
