import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { Plus, ArrowLeft, Edit2, Trash2, X, FileText, Users, Settings, BarChart3 } from 'lucide-react';

// Lazy client initialization to avoid "Amplify not configured" errors
let _client: ReturnType<typeof generateClient<Schema>> | null = null;
function getClient() {
    if (!_client) {
        _client = generateClient<Schema>();
    }
    return _client;
}

interface Template {
    id: string;
    name: string;
    category: string;
    skeletonContent: string;
}

/**
 * Admin Console
 * Manage templates, users, and system configuration.
 * Now integrated with DynamoDB for template CRUD.
 */
export const Admin = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Modal state
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [templateForm, setTemplateForm] = useState({
        name: '',
        category: 'Demand Letter',
        skeletonContent: '',
    });

    // Load templates on mount
    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const { data, errors } = await getClient().models.Template.list();
            if (errors) {
                console.error('Error loading templates:', errors);
            } else {
                setTemplates((data || []).map(t => ({
                    id: t.id,
                    name: t.name || 'Untitled',
                    category: t.category,
                    skeletonContent: t.skeletonContent || '',
                })));
            }
        } catch (error) {
            console.error('Error loading templates:', error);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleCreateTemplate = useCallback(async () => {
        setSaving(true);
        try {
            const { data, errors } = await getClient().models.Template.create({
                name: templateForm.name,
                category: templateForm.category,
                skeletonContent: templateForm.skeletonContent,
                defaultMetadata: {},
            });

            if (errors) {
                console.error('Error creating template:', errors);
                alert('Failed to create template. You may not have admin permissions.');
            } else if (data) {
                setTemplates([...templates, {
                    id: data.id,
                    name: data.name || 'Untitled',
                    category: data.category,
                    skeletonContent: data.skeletonContent || '',
                }]);
                setShowTemplateModal(false);
                setTemplateForm({ name: '', category: 'Demand Letter', skeletonContent: '' });
            }
        } catch (error) {
            console.error('Error creating template:', error);
            alert('Failed to create template. You may not have admin permissions.');
        } finally {
            setSaving(false);
        }
    }, [templateForm, templates]);

    const handleUpdateTemplate = useCallback(async () => {
        if (!editingTemplate) return;
        
        setSaving(true);
        try {
            const { data, errors } = await getClient().models.Template.update({
                id: editingTemplate.id,
                name: templateForm.name,
                category: templateForm.category,
                skeletonContent: templateForm.skeletonContent,
            });

            if (errors) {
                console.error('Error updating template:', errors);
                alert('Failed to update template.');
            } else if (data) {
                setTemplates(templates.map(t => t.id === editingTemplate.id ? {
                    ...t,
                    name: data.name || 'Untitled',
                    category: data.category,
                    skeletonContent: data.skeletonContent || '',
                } : t));
                setShowTemplateModal(false);
                setEditingTemplate(null);
                setTemplateForm({ name: '', category: 'Demand Letter', skeletonContent: '' });
            }
        } catch (error) {
            console.error('Error updating template:', error);
            alert('Failed to update template.');
        } finally {
            setSaving(false);
        }
    }, [editingTemplate, templateForm, templates]);

    const handleDeleteTemplate = useCallback(async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            const { errors } = await getClient().models.Template.delete({ id });
            if (errors) {
                console.error('Error deleting template:', errors);
                alert('Failed to delete template. You may not have admin permissions.');
            } else {
                setTemplates(templates.filter(t => t.id !== id));
            }
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Failed to delete template.');
        }
    }, [templates]);

    const openCreateModal = () => {
        setEditingTemplate(null);
        setTemplateForm({ name: '', category: 'Demand Letter', skeletonContent: '' });
        setShowTemplateModal(true);
    };

    const openEditModal = (template: Template) => {
        setEditingTemplate(template);
        setTemplateForm({
            name: template.name,
            category: template.category,
            skeletonContent: template.skeletonContent,
        });
        setShowTemplateModal(true);
    };

    const categories = [
        'Demand Letter',
        'Cease and Desist',
        'Settlement Agreement',
        'Contract',
        'Motion',
        'Legal Memorandum',
        'Brief',
        'Client Letter',
        'Opinion Letter',
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="btn-ghost">
                            <ArrowLeft className="w-5 h-5 mr-2" />
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
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary-600" />
                                <h2 className="text-lg font-semibold text-slate-900">Templates</h2>
                            </div>
                            <button onClick={openCreateModal} className="btn-primary btn-sm">
                                <Plus className="w-4 h-4 mr-1" />
                                New Template
                            </button>
                        </div>

                        {loadingTemplates ? (
                            <div className="text-center py-8">
                                <span className="spinner w-6 h-6 text-primary-600" />
                                <p className="text-sm text-slate-500 mt-2">Loading templates...</p>
                            </div>
                        ) : templates.length === 0 ? (
                            <div className="text-center py-8">
                                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm text-slate-500">No templates yet</p>
                                <button onClick={openCreateModal} className="btn-primary btn-sm mt-3">
                                    Create First Template
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-80 overflow-auto">
                                {templates.map((t) => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{t.name}</p>
                                            <p className="text-xs text-slate-500">{t.category}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openEditModal(t)}
                                                className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-white rounded"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTemplate(t.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Users Card (placeholder - would need Cognito integration) */}
                    <div className="card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-primary-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Users</h2>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">
                            User management is handled through AWS Cognito.
                        </p>
                        <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-xs text-slate-500">
                                To manage users, access the AWS Cognito Console for your user pool.
                            </p>
                        </div>
                    </div>

                    {/* Statistics Card */}
                    <div className="card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-5 h-5 text-primary-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Usage Statistics</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-sm text-slate-500">Templates</p>
                                <p className="text-2xl font-bold text-slate-900">{templates.length}</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-sm text-slate-500">Categories</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {new Set(templates.map(t => t.category)).size}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* AI Configuration Card */}
                    <div className="card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Settings className="w-5 h-5 text-primary-600" />
                            <h2 className="text-lg font-semibold text-slate-900">AI Configuration</h2>
                        </div>

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
                                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                                    <option value="gpt-4o">GPT-4o</option>
                                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-200">
                            <p className="text-xs text-slate-500">
                                AI settings are configured via environment variables in AWS.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Template Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-slate-900">
                                    {editingTemplate ? 'Edit Template' : 'New Template'}
                                </h2>
                                <button
                                    onClick={() => setShowTemplateModal(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="label">Template Name</label>
                                <input
                                    type="text"
                                    value={templateForm.name}
                                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                                    className="input"
                                    placeholder="e.g., Standard Demand Letter"
                                />
                            </div>

                            <div>
                                <label className="label">Category</label>
                                <select
                                    value={templateForm.category}
                                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                                    className="input"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Template Content (HTML)</label>
                                <textarea
                                    value={templateForm.skeletonContent}
                                    onChange={(e) => setTemplateForm({ ...templateForm, skeletonContent: e.target.value })}
                                    className="input min-h-[200px] font-mono text-sm"
                                    placeholder="<h1>Document Title</h1><p>Template content...</p>"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 flex gap-3">
                            <button
                                onClick={() => setShowTemplateModal(false)}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                                disabled={saving || !templateForm.name.trim()}
                                className="btn-primary flex-1"
                            >
                                {saving ? (
                                    <>
                                        <span className="spinner mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    editingTemplate ? 'Update Template' : 'Create Template'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
