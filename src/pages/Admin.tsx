import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { 
    Plus, ArrowLeft, Edit2, Trash2, X, FileText, Users, Settings, 
    BarChart3, TrendingUp, Clock, Sparkles, FileCheck, FilePen
} from 'lucide-react';

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

interface DraftStats {
    total: number;
    byStatus: { draft: number; review: number; final: number };
    byDocType: Record<string, number>;
    recentDrafts: Array<{
        id: string;
        title: string;
        status: string;
        createdAt: string;
        docType: string;
    }>;
}

/**
 * Admin Console
 * Manage templates, users, system configuration, and view activity statistics.
 * Integrated with DynamoDB for template CRUD and analytics.
 */
export const Admin = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Activity stats state
    const [draftStats, setDraftStats] = useState<DraftStats>({
        total: 0,
        byStatus: { draft: 0, review: 0, final: 0 },
        byDocType: {},
        recentDrafts: [],
    });
    const [loadingStats, setLoadingStats] = useState(true);
    
    // Modal state
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [templateForm, setTemplateForm] = useState({
        name: '',
        category: 'Demand Letter',
        skeletonContent: '',
    });

    // Load templates and stats on mount
    useEffect(() => {
        loadTemplates();
        loadDraftStats();
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

    const loadDraftStats = async () => {
        setLoadingStats(true);
        try {
            // Note: This requires admin permissions to read all drafts
            const { data: drafts, errors } = await getClient().models.Draft.list();
            
            if (errors) {
                console.error('Error loading draft stats:', errors);
                // If not admin, show empty stats
                setDraftStats({
                    total: 0,
                    byStatus: { draft: 0, review: 0, final: 0 },
                    byDocType: {},
                    recentDrafts: [],
                });
                return;
            }

            const allDrafts = drafts || [];
            
            // Calculate statistics
            const byStatus = { draft: 0, review: 0, final: 0 };
            const byDocType: Record<string, number> = {};
            
            allDrafts.forEach(draft => {
                // Count by status
                const status = (draft.status as 'draft' | 'review' | 'final') || 'draft';
                byStatus[status] = (byStatus[status] || 0) + 1;
                
                // Count by doc type from metadata
                try {
                    const metadata = typeof draft.metadata === 'string' 
                        ? JSON.parse(draft.metadata) 
                        : (draft.metadata || {});
                    const docType = metadata.docType || 'Unknown';
                    byDocType[docType] = (byDocType[docType] || 0) + 1;
                } catch {
                    byDocType['Unknown'] = (byDocType['Unknown'] || 0) + 1;
                }
            });
            
            // Get recent drafts (last 5)
            const recentDrafts = allDrafts
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                .slice(0, 5)
                .map(draft => {
                    let docType = 'Unknown';
                    try {
                        const metadata = typeof draft.metadata === 'string' 
                            ? JSON.parse(draft.metadata) 
                            : (draft.metadata || {});
                        docType = metadata.docType || 'Unknown';
                    } catch {
                        // ignore
                    }
                    return {
                        id: draft.id,
                        title: draft.title || 'Untitled',
                        status: draft.status || 'draft',
                        createdAt: draft.createdAt || new Date().toISOString(),
                        docType,
                    };
                });
            
            setDraftStats({
                total: allDrafts.length,
                byStatus,
                byDocType,
                recentDrafts,
            });
        } catch (error) {
            console.error('Error loading draft stats:', error);
        } finally {
            setLoadingStats(false);
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

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'final': return 'bg-green-100 text-green-700';
            case 'review': return 'bg-amber-100 text-amber-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="btn-ghost">
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Back to Dashboard
                        </button>
                        <h1 className="text-xl font-semibold text-slate-900">Admin Console</h1>
                    </div>
                    <button 
                        onClick={() => { loadTemplates(); loadDraftStats(); }} 
                        className="btn-ghost btn-sm"
                    >
                        Refresh Data
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto p-6">
                {/* Stats Overview Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {loadingStats ? '-' : draftStats.total}
                                </p>
                                <p className="text-xs text-slate-500">Total Documents</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <FilePen className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {loadingStats ? '-' : draftStats.byStatus.draft}
                                </p>
                                <p className="text-xs text-slate-500">In Draft</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {loadingStats ? '-' : draftStats.byStatus.review}
                                </p>
                                <p className="text-xs text-slate-500">In Review</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <FileCheck className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {loadingStats ? '-' : draftStats.byStatus.final}
                                </p>
                                <p className="text-xs text-slate-500">Finalized</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Templates & Users */}
                    <div className="lg:col-span-2 space-y-6">
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
                                <div className="space-y-2 max-h-64 overflow-auto">
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

                        {/* Document Types Distribution */}
                        <div className="card p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="w-5 h-5 text-primary-600" />
                                <h2 className="text-lg font-semibold text-slate-900">Documents by Type</h2>
                            </div>

                            {loadingStats ? (
                                <div className="text-center py-8">
                                    <span className="spinner w-6 h-6 text-primary-600" />
                                </div>
                            ) : Object.keys(draftStats.byDocType).length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">No documents yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {Object.entries(draftStats.byDocType)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([docType, count]) => {
                                            const percentage = draftStats.total > 0 
                                                ? Math.round((count / draftStats.total) * 100) 
                                                : 0;
                                            return (
                                                <div key={docType}>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-slate-700">{docType}</span>
                                                        <span className="text-slate-500">{count} ({percentage}%)</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-primary-500 rounded-full transition-all"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>

                        {/* Users & AI Config Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Users Card */}
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
                                        Access the AWS Cognito Console to manage users, groups, and permissions.
                                    </p>
                                </div>
                            </div>

                            {/* AI Configuration Card */}
                            <div className="card p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles className="w-5 h-5 text-primary-600" />
                                    <h2 className="text-lg font-semibold text-slate-900">AI Config</h2>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                        <span className="text-sm text-slate-600">Provider</span>
                                        <span className="text-sm font-medium text-slate-900">OpenAI</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                        <span className="text-sm text-slate-600">Model</span>
                                        <span className="text-sm font-medium text-slate-900">GPT-4o Mini</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                        <span className="text-sm text-slate-600">Search</span>
                                        <span className="text-sm font-medium text-slate-900">Brave API</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Recent Activity */}
                    <div className="space-y-6">
                        {/* Recent Activity */}
                        <div className="card p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="w-5 h-5 text-primary-600" />
                                <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
                            </div>

                            {loadingStats ? (
                                <div className="text-center py-8">
                                    <span className="spinner w-6 h-6 text-primary-600" />
                                </div>
                            ) : draftStats.recentDrafts.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
                            ) : (
                                <div className="space-y-3">
                                    {draftStats.recentDrafts.map((draft) => (
                                        <div 
                                            key={draft.id}
                                            className="p-3 bg-slate-50 rounded-lg"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-slate-900 truncate">
                                                        {draft.title}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{draft.docType}</p>
                                                </div>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(draft.status)}`}>
                                                    {draft.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2">
                                                {formatDate(draft.createdAt)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Stats */}
                        <div className="card p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Settings className="w-5 h-5 text-primary-600" />
                                <h2 className="text-lg font-semibold text-slate-900">System Info</h2>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600">Templates</span>
                                    <span className="text-sm font-medium text-slate-900">{templates.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600">Categories</span>
                                    <span className="text-sm font-medium text-slate-900">
                                        {new Set(templates.map(t => t.category)).size}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600">Doc Types Used</span>
                                    <span className="text-sm font-medium text-slate-900">
                                        {Object.keys(draftStats.byDocType).length}
                                    </span>
                                </div>
                            </div>
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
