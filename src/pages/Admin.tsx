import { useState } from 'react';
import { Users, FileText, Plus, Trash2, Edit } from 'lucide-react';

// Mock Data (until backend connected)
const initialTemplates = [
    { id: '1', name: 'Standard Demand Letter', category: 'Demand Letter', content: '<p>Dear Sir/Madam...</p>' },
    { id: '2', name: 'NY Settlement Agreement', category: 'Settlement', content: '<p>This Settlement Agreement...</p>' },
];

const initialUsers = [
    { id: '1', email: 'attorney@lexforge.com', role: 'Admin', lastActive: '2023-10-25' },
    { id: '2', email: 'paralegal@lexforge.com', role: 'User', lastActive: '2023-10-24' },
];

export const Admin = () => {
    const [activeTab, setActiveTab] = useState<'templates' | 'users'>('templates');
    const [templates, setTemplates] = useState(initialTemplates);


    const handleDeleteTemplate = (id: string) => {
        if (confirm('Are you sure you want to delete this template?')) {
            setTemplates(templates.filter(t => t.id !== id));
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-app)] flex">
            {/* Sidebar Nav */}
            <aside className="w-64 bg-[var(--bg-surface)] border-r border-[var(--border-strong)] p-6 flex flex-col">
                <h1 className="text-xl font-serif font-bold mb-8 flex items-center gap-2">
                    LexForge <span className="text-[var(--primary-brand)] text-xs font-sans uppercase tracking-widest mt-1">Admin</span>
                </h1>

                <nav className="space-y-2 flex-1">
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'templates'
                            ? 'bg-[var(--bg-surface-hover)] text-[var(--primary-brand)] font-medium'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                            }`}
                    >
                        <FileText size={18} /> Templates
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'users'
                            ? 'bg-[var(--bg-surface-hover)] text-[var(--primary-brand)] font-medium'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                            }`}
                    >
                        <Users size={18} /> User Management
                    </button>
                </nav>

                <div className="text-xs text-[var(--text-tertiary)]">v0.1.0 Alpha</div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold">
                        {activeTab === 'templates' ? 'Template Management' : 'User Directory'}
                    </h2>
                    {activeTab === 'templates' && (
                        <button className="px-4 py-2 bg-[var(--primary-brand)] hover:bg-[var(--primary-brand-hover)] text-white rounded-lg flex items-center gap-2 text-sm font-medium">
                            <Plus size={16} /> New Template
                        </button>
                    )}
                </header>

                {activeTab === 'templates' && (
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl overflow-hidden glass-panel">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 font-medium">Template Name</th>
                                    <th className="p-4 font-medium">Category</th>
                                    <th className="p-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {templates.map((t) => (
                                    <tr key={t.id} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                                        <td className="p-4 font-medium">{t.name}</td>
                                        <td className="p-4 text-[var(--text-secondary)]">
                                            <span className="px-2 py-1 rounded bg-[var(--bg-app)] border border-[var(--border-subtle)] text-xs">
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className="p-4 flex justify-end gap-2">
                                            <button className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary-brand)] rounded hover:bg-[var(--bg-app)]">
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTemplate(t.id)}
                                                className="p-2 text-[var(--text-secondary)] hover:text-[var(--status-error)] rounded hover:bg-[var(--bg-app)]"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl overflow-hidden glass-panel">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 font-medium">Email</th>
                                    <th className="p-4 font-medium">Role</th>
                                    <th className="p-4 font-medium">Last Active</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {initialUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                                        <td className="p-4 font-medium">{u.email}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'Admin' ? 'bg-purple-900 text-purple-200' : 'bg-gray-800 text-gray-300'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-[var(--text-tertiary)] text-sm">{u.lastActive}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
};
