import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Admin Console
 * Manage templates, users, and system configuration.
 * Styled to match DraftWise theming.
 */

// Mock Data
const initialTemplates = [
    { id: '1', name: 'Standard Demand Letter', category: 'Demand Letter', content: '<p>Dear Sir/Madam...</p>' },
    { id: '2', name: 'NY Settlement Agreement', category: 'Settlement', content: '<p>This Settlement Agreement...</p>' },
];

const initialUsers = [
    { id: '1', email: 'attorney@lexforge.com', role: 'Admin', lastActive: '2023-10-25' },
    { id: '2', email: 'paralegal@lexforge.com', role: 'User', lastActive: '2023-10-24' },
];

export const Admin = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'templates' | 'users' | 'settings'>('templates');
    const [templates, setTemplates] = useState(initialTemplates);
    const [saving, setSaving] = useState(false);

    const handleDeleteTemplate = (id: string) => {
        if (confirm('Are you sure you want to delete this template?')) {
            setTemplates(templates.filter(t => t.id !== id));
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="btn-ghost"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Dashboard
                        </button>
                        <h1 className="text-xl font-semibold text-slate-900">Admin Console</h1>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-6xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Templates Card */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Templates</h2>
                            <button className="btn-primary btn-sm">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                New Template
                            </button>
                        </div>

                        <div className="space-y-2">
                            {templates.map((t) => (
                                <div
                                    key={t.id}
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{t.name}</p>
                                        <p className="text-xs text-slate-500">{t.category}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-white rounded">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTemplate(t.id)}
                                            className="p-1.5 text-slate-400 hover:text-danger-600 hover:bg-white rounded"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Users Card */}
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Users</h2>

                        <div className="space-y-2">
                            {initialUsers.map((u) => (
                                <div
                                    key={u.id}
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{u.email}</p>
                                        <p className="text-xs text-slate-500">Last active: {u.lastActive}</p>
                                    </div>
                                    <span className={`badge ${u.role === 'Admin' ? 'badge-primary' : 'badge-slate'}`}>
                                        {u.role}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Statistics Card */}
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Usage Statistics</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-sm text-slate-500">Total Documents</p>
                                <p className="text-2xl font-bold text-slate-900">0</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-sm text-slate-500">Active Users</p>
                                <p className="text-2xl font-bold text-slate-900">2</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-sm text-slate-500">Templates</p>
                                <p className="text-2xl font-bold text-slate-900">{templates.length}</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-sm text-slate-500">AI Requests</p>
                                <p className="text-2xl font-bold text-slate-900">0</p>
                                <p className="text-xs text-slate-400">this month</p>
                            </div>
                        </div>
                    </div>

                    {/* AI Configuration Card */}
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Configuration</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="label">Preferred Provider</label>
                                <select className="input">
                                    <option value="openai">OpenAI</option>
                                    <option value="openrouter">OpenRouter</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Preferred Model</label>
                                <select className="input">
                                    <option value="gpt-4o">GPT-4o</option>
                                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Data Retention (Days)</label>
                                <input
                                    type="number"
                                    className="input"
                                    defaultValue={30}
                                    min="1"
                                    max="365"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Documents will be automatically purged after this period
                                </p>
                            </div>
                        </div>

                        {/* Save button */}
                        <div className="mt-6 pt-4 border-t border-slate-200">
                            <button
                                onClick={async () => {
                                    setSaving(true);
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    setSaving(false);
                                }}
                                disabled={saving}
                                className="btn-primary w-full"
                            >
                                {saving ? (
                                    <>
                                        <span className="spinner mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Configuration'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
