/**
 * ClauseManager Component
 * Admin interface for managing the clause library.
 */

import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Plus,
    Edit2,
    Trash2,
    Save,
    X,
    Search,
    Copy,
    Eye,
    EyeOff,
    RefreshCw,
    Tag,
    MapPin,
    FileText,
} from 'lucide-react';
import type { Clause, ClauseVariation } from '../utils/clauseTypes';
import {
    CLAUSE_CATEGORIES,
    JURISDICTIONS,
    DOCUMENT_TYPES,
} from '../utils/clauseTypes';
import {
    createClause as createClauseService,
    updateClause as updateClauseService,
    deleteClause as deleteClauseService,
    searchClauses,
    getCategories,
    type Clause as ServiceClause,
} from '../utils/clauseService';

// Helper to map service clause to component clause
function mapToClause(sc: ServiceClause): Clause {
    return {
        id: sc.id,
        title: sc.title,
        content: sc.content,
        description: sc.description,
        category: sc.category,
        subcategory: sc.subcategory,
        tags: sc.tags || [],
        jurisdiction: sc.jurisdiction,
        documentTypes: sc.documentTypes || [],
        usageCount: sc.usageCount,
        lastUsedAt: sc.lastUsedAt,
        variations: sc.variations || [],
        // Cast placeholders to the expected type - the data is compatible
        placeholders: (sc.placeholders || []) as unknown as Clause['placeholders'],
        isPublished: true,
        isFavorite: false,
        createdAt: sc.createdAt,
        updatedAt: sc.updatedAt,
    };
}

// Wrapper functions
async function createClause(data: Omit<Clause, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<Clause | null> {
    try {
        // Convert placeholders to service format
        const serviceData = {
            ...data,
            placeholders: data.placeholders as unknown as ServiceClause['placeholders'],
        };
        const result = await createClauseService(serviceData);
        return mapToClause(result);
    } catch (error) {
        console.error('Error creating clause:', error);
        return null;
    }
}

async function updateClause(id: string, data: Partial<Clause>): Promise<Clause | null> {
    try {
        // Convert placeholders to service format
        const serviceData = {
            ...data,
            placeholders: data.placeholders as unknown as ServiceClause['placeholders'],
        };
        const result = await updateClauseService(id, serviceData);
        return mapToClause(result);
    } catch (error) {
        console.error('Error updating clause:', error);
        return null;
    }
}

async function deleteClause(id: string): Promise<boolean> {
    try {
        await deleteClauseService(id);
        return true;
    } catch (error) {
        console.error('Error deleting clause:', error);
        return false;
    }
}

async function getAllClauses(): Promise<Clause[]> {
    const results = await searchClauses({ limit: 200 });
    return results.map(mapToClause);
}

async function getClauseCategoryCounts(): Promise<{ category: string; count: number }[]> {
    const categories = await getCategories();
    return categories.map(c => ({ category: c.name, count: c.count }));
}

// ============================================
// Sub-Components
// ============================================

interface ClauseFormProps {
    clause?: Clause;
    onSave: (clause: Omit<Clause, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
    onCancel: () => void;
}

function ClauseForm({ clause, onSave, onCancel }: ClauseFormProps) {
    const [title, setTitle] = useState(clause?.title || '');
    const [description, setDescription] = useState(clause?.description || '');
    const [category, setCategory] = useState(clause?.category || CLAUSE_CATEGORIES[0]);
    const [subcategory, setSubcategory] = useState(clause?.subcategory || '');
    const [jurisdiction, setJurisdiction] = useState(clause?.jurisdiction || '');
    const [documentTypes, setDocumentTypes] = useState<string[]>(clause?.documentTypes || []);
    const [tags, setTags] = useState<string[]>(clause?.tags || []);
    const [tagInput, setTagInput] = useState('');
    const [variations, setVariations] = useState<ClauseVariation[]>(clause?.variations || []);
    const [isPublished, setIsPublished] = useState(clause?.isPublished ?? true);
    const [notes, setNotes] = useState(clause?.notes || '');

    const editor = useEditor({
        extensions: [StarterKit],
        content: clause?.content || '<p>Enter clause content here...</p>',
    });

    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const handleAddVariation = () => {
        setVariations([...variations, { jurisdiction: '', content: '', notes: '' }]);
    };

    const handleUpdateVariation = (index: number, updates: Partial<ClauseVariation>) => {
        const newVariations = [...variations];
        newVariations[index] = { ...newVariations[index], ...updates };
        setVariations(newVariations);
    };

    const handleRemoveVariation = (index: number) => {
        setVariations(variations.filter((_, i) => i !== index));
    };

    const handleToggleDocType = (docType: string) => {
        if (documentTypes.includes(docType)) {
            setDocumentTypes(documentTypes.filter(t => t !== docType));
        } else {
            setDocumentTypes([...documentTypes, docType]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !editor?.getHTML()) return;

        onSave({
            title: title.trim(),
            content: editor.getHTML(),
            description: description.trim() || undefined,
            category,
            subcategory: subcategory.trim() || undefined,
            tags,
            jurisdiction: jurisdiction || undefined,
            documentTypes,
            lastUsedAt: clause?.lastUsedAt,
            variations: variations.filter(v => v.jurisdiction && v.content),
            author: clause?.author,
            isPublished,
            notes: notes.trim() || undefined,
            placeholders: clause?.placeholders || [],
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="label">Title *</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="input"
                        placeholder="e.g., Standard Indemnification Clause"
                        required
                    />
                </div>
                <div className="col-span-2">
                    <label className="label">Description</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="input"
                        placeholder="Brief description for search results"
                    />
                </div>
            </div>

            {/* Category & Jurisdiction */}
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="label">Category *</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="input"
                        required
                    >
                        {CLAUSE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="label">Subcategory</label>
                    <input
                        type="text"
                        value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)}
                        className="input"
                        placeholder="e.g., Mutual"
                    />
                </div>
                <div>
                    <label className="label">Default Jurisdiction</label>
                    <select
                        value={jurisdiction}
                        onChange={(e) => setJurisdiction(e.target.value)}
                        className="input"
                    >
                        <option value="">General (No Specific)</option>
                        {JURISDICTIONS.map((j) => (
                            <option key={j} value={j}>{j}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content Editor */}
            <div>
                <label className="label">Content *</label>
                <div className="border border-slate-200 rounded-lg p-4 min-h-[200px] prose prose-sm max-w-none">
                    <EditorContent editor={editor} />
                </div>
            </div>

            {/* Document Types */}
            <div>
                <label className="label">Compatible Document Types</label>
                <div className="flex flex-wrap gap-2 mt-2">
                    {DOCUMENT_TYPES.map((docType) => (
                        <button
                            key={docType}
                            type="button"
                            onClick={() => handleToggleDocType(docType)}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                documentTypes.includes(docType)
                                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            {docType}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tags */}
            <div>
                <label className="label">Tags</label>
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        className="input flex-1"
                        placeholder="Add a tag..."
                    />
                    <button type="button" onClick={handleAddTag} className="btn-ghost btn-sm">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm"
                            >
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTag(tag)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Jurisdiction Variations */}
            <div>
                <div className="flex items-center justify-between">
                    <label className="label">Jurisdiction Variations</label>
                    <button type="button" onClick={handleAddVariation} className="btn-ghost btn-xs">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Variation
                    </button>
                </div>
                {variations.length > 0 && (
                    <div className="space-y-4 mt-3">
                        {variations.map((variation, index) => (
                            <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                <div className="flex items-center justify-between mb-3">
                                    <select
                                        value={variation.jurisdiction}
                                        onChange={(e) => handleUpdateVariation(index, { jurisdiction: e.target.value })}
                                        className="input input-sm w-48"
                                    >
                                        <option value="">Select Jurisdiction</option>
                                        {JURISDICTIONS.map((j) => (
                                            <option key={j} value={j}>{j}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveVariation(index)}
                                        className="btn-ghost btn-xs text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <textarea
                                    value={variation.content}
                                    onChange={(e) => handleUpdateVariation(index, { content: e.target.value })}
                                    className="input min-h-[100px] mb-2"
                                    placeholder="Variation content (HTML)"
                                />
                                <input
                                    type="text"
                                    value={variation.notes || ''}
                                    onChange={(e) => handleUpdateVariation(index, { notes: e.target.value })}
                                    className="input input-sm"
                                    placeholder="Notes about this variation"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">Internal Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="input min-h-[80px]"
                        placeholder="Internal notes (not visible to users)"
                    />
                </div>
                <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            checked={isPublished}
                            onChange={(e) => setIsPublished(e.target.checked)}
                            className="rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-700">Published (visible to users)</span>
                    </label>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={onCancel} className="btn-ghost">
                    Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={!title.trim()}>
                    <Save className="w-4 h-4 mr-1" />
                    {clause ? 'Update Clause' : 'Create Clause'}
                </button>
            </div>
        </form>
    );
}

// ============================================
// Main Component
// ============================================

export function ClauseManager() {
    const [clauses, setClauses] = useState<Clause[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [categoryCounts, setCategoryCounts] = useState<{ category: string; count: number }[]>([]);
    
    // Modal state
    const [showForm, setShowForm] = useState(false);
    const [editingClause, setEditingClause] = useState<Clause | undefined>();
    const [saving, setSaving] = useState(false);

    // Load clauses
    const loadClauses = useCallback(async () => {
        setLoading(true);
        try {
            const [allClauses, counts] = await Promise.all([
                getAllClauses(),
                getClauseCategoryCounts(),
            ]);
            setClauses(allClauses);
            setCategoryCounts(counts);
        } catch (error) {
            console.error('Error loading clauses:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadClauses();
    }, [loadClauses]);

    // Filter clauses
    const filteredClauses = clauses.filter(clause => {
        if (selectedCategory && clause.category !== selectedCategory) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                clause.title.toLowerCase().includes(query) ||
                clause.description?.toLowerCase().includes(query) ||
                clause.tags.some(t => t.toLowerCase().includes(query))
            );
        }
        return true;
    });

    // Handlers
    const handleCreate = () => {
        setEditingClause(undefined);
        setShowForm(true);
    };

    const handleEdit = (clause: Clause) => {
        setEditingClause(clause);
        setShowForm(true);
    };

    const handleDelete = async (clause: Clause) => {
        if (!confirm(`Are you sure you want to delete "${clause.title}"?`)) return;

        const success = await deleteClause(clause.id);
        if (success) {
            setClauses(clauses.filter(c => c.id !== clause.id));
        } else {
            alert('Failed to delete clause');
        }
    };

    const handleSave = async (clauseData: Omit<Clause, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
        setSaving(true);
        try {
            if (editingClause) {
                const updated = await updateClause(editingClause.id, clauseData);
                if (updated) {
                    setClauses(clauses.map(c => c.id === editingClause.id ? updated : c));
                    setShowForm(false);
                } else {
                    alert('Failed to update clause');
                }
            } else {
                const created = await createClause(clauseData);
                if (created) {
                    setClauses([...clauses, created]);
                    setShowForm(false);
                } else {
                    alert('Failed to create clause');
                }
            }
        } catch (error) {
            console.error('Error saving clause:', error);
            alert('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const handleDuplicate = async (clause: Clause) => {
        // Destructure to exclude fields that createClause doesn't accept
        const { id, createdAt, updatedAt, usageCount, ...clauseData } = clause;
        const duplicated = await createClause({
            ...clauseData,
            title: `${clause.title} (Copy)`,
            lastUsedAt: undefined,
        });
        if (duplicated) {
            setClauses([...clauses, duplicated]);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Clause Management</h2>
                    <p className="text-sm text-slate-500">{clauses.length} clauses in library</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadClauses} className="btn-ghost btn-sm" disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={handleCreate} className="btn-primary btn-sm">
                        <Plus className="w-4 h-4 mr-1" />
                        New Clause
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search clauses..."
                        className="input pl-9"
                    />
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="input w-48"
                >
                    <option value="">All Categories</option>
                    {categoryCounts.map(({ category, count }) => (
                        <option key={category} value={category}>
                            {category} ({count})
                        </option>
                    ))}
                </select>
            </div>

            {/* Clause List */}
            {loading ? (
                <div className="text-center py-12">
                    <span className="spinner w-8 h-8 text-primary-600" />
                    <p className="text-sm text-slate-500 mt-3">Loading clauses...</p>
                </div>
            ) : filteredClauses.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <FileText className="w-12 h-12 mx-auto text-slate-300" />
                    <p className="text-sm text-slate-500 mt-3">
                        {searchQuery || selectedCategory ? 'No clauses match your search' : 'No clauses yet'}
                    </p>
                    {!searchQuery && !selectedCategory && (
                        <button onClick={handleCreate} className="text-sm text-primary-600 hover:text-primary-700 mt-2">
                            Create your first clause
                        </button>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 font-medium text-slate-500">Title</th>
                                <th className="text-left py-3 px-4 font-medium text-slate-500">Category</th>
                                <th className="text-left py-3 px-4 font-medium text-slate-500">Jurisdiction</th>
                                <th className="text-center py-3 px-4 font-medium text-slate-500">Usage</th>
                                <th className="text-center py-3 px-4 font-medium text-slate-500">Status</th>
                                <th className="text-right py-3 px-4 font-medium text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClauses.map((clause) => (
                                <tr key={clause.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-4">
                                        <div>
                                            <p className="font-medium text-slate-900">{clause.title}</p>
                                            <p className="text-xs text-slate-500 truncate max-w-xs">
                                                {clause.description || 'No description'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 rounded">
                                            <Tag className="w-3 h-3" />
                                            {clause.category}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        {clause.jurisdiction ? (
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">
                                                <MapPin className="w-3 h-3" />
                                                {clause.jurisdiction}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400">General</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className="text-slate-600">{clause.usageCount}</span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {clause.isPublished ? (
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-50 text-green-600 rounded">
                                                <Eye className="w-3 h-3" />
                                                Published
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded">
                                                <EyeOff className="w-3 h-3" />
                                                Draft
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleEdit(clause)}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDuplicate(clause)}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                                title="Duplicate"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(clause)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
                            <h3 className="text-lg font-semibold text-slate-900">
                                {editingClause ? 'Edit Clause' : 'New Clause'}
                            </h3>
                            <button
                                onClick={() => setShowForm(false)}
                                className="btn-ghost btn-sm"
                                disabled={saving}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6">
                            <ClauseForm
                                clause={editingClause}
                                onSave={handleSave}
                                onCancel={() => setShowForm(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClauseManager;

