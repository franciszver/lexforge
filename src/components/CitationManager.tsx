/**
 * CitationManager Component
 * Admin interface for managing the citation library.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    Save,
    X,
    Search,
    Copy,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    BookOpen,
    Scale,
    FileText,
    Gavel,
    Globe,
    BookMarked,
} from 'lucide-react';
import {
    Citation,
    CitationType,
    CITATION_TYPES,
    LEGAL_CATEGORIES,
    JURISDICTIONS,
    FEDERAL_REPORTERS,
    COURTS,
} from '../utils/citationTypes';
import {
    createCitation,
    updateCitation,
    deleteCitation,
    getAllCitations,
    getCitationTypeCounts,
} from '../utils/citationService';
import { buildCitationString, parseCitationString, validateCitation } from '../utils/citationFormatter';

// ============================================
// Type Icons
// ============================================

const TYPE_ICONS: Record<CitationType, React.ComponentType<{ className?: string }>> = {
    case: Gavel,
    statute: BookOpen,
    regulation: FileText,
    constitution: Scale,
    secondary: BookMarked,
    treaty: Globe,
};

// ============================================
// Sub-Components
// ============================================

interface CitationFormProps {
    citation?: Citation;
    onSave: (citation: Omit<Citation, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
    onCancel: () => void;
}

function CitationForm({ citation, onSave, onCancel }: CitationFormProps) {
    const [type, setType] = useState<CitationType>(citation?.type || 'case');
    const [title, setTitle] = useState(citation?.title || '');
    const [citationStr, setCitationStr] = useState(citation?.citation || '');
    const [court, setCourt] = useState(citation?.court || '');
    const [year, setYear] = useState<number | ''>(citation?.year || '');
    const [volume, setVolume] = useState(citation?.volume || '');
    const [reporter, setReporter] = useState(citation?.reporter || '');
    const [page, setPage] = useState(citation?.page || '');
    const [pinpoint, setPinpoint] = useState(citation?.pinpoint || '');
    const [jurisdiction, setJurisdiction] = useState(citation?.jurisdiction || '');
    const [codeTitle, setCodeTitle] = useState(citation?.codeTitle || '');
    const [section, setSection] = useState(citation?.section || '');
    const [subdivision, setSubdivision] = useState(citation?.subdivision || '');
    const [shortForm, setShortForm] = useState(citation?.shortForm || '');
    const [parenthetical, setParenthetical] = useState(citation?.parenthetical || '');
    const [url, setUrl] = useState(citation?.url || '');
    const [category, setCategory] = useState(citation?.category || '');
    const [tags, setTags] = useState<string[]>(citation?.tags || []);
    const [tagInput, setTagInput] = useState('');
    const [notes, setNotes] = useState(citation?.notes || '');
    const [isVerified, setIsVerified] = useState(citation?.isVerified || false);
    const [errors, setErrors] = useState<string[]>([]);

    // Auto-build citation string when components change
    useEffect(() => {
        if (type === 'case' && title && (volume || reporter || page)) {
            const built = buildCitationString({
                type,
                title,
                volume,
                reporter,
                page,
                court,
                year: year || undefined,
            });
            if (built && built !== citationStr) {
                setCitationStr(built);
            }
        } else if ((type === 'statute' || type === 'regulation') && codeTitle && section) {
            const built = buildCitationString({
                type,
                codeTitle,
                section,
                subdivision,
                year: year || undefined,
            });
            if (built && built !== citationStr) {
                setCitationStr(built);
            }
        }
    }, [type, title, volume, reporter, page, court, year, codeTitle, section, subdivision]);

    // Parse citation string to extract components
    const handleParseCitation = () => {
        if (!citationStr) return;
        const parsed = parseCitationString(citationStr);
        if (parsed.type) setType(parsed.type as CitationType);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.volume) setVolume(parsed.volume);
        if (parsed.reporter) setReporter(parsed.reporter);
        if (parsed.page) setPage(parsed.page);
        if (parsed.pinpoint) setPinpoint(parsed.pinpoint);
        if (parsed.court) setCourt(parsed.court);
        if (parsed.year) setYear(parsed.year);
        if (parsed.codeTitle) setCodeTitle(parsed.codeTitle);
        if (parsed.section) setSection(parsed.section);
        if (parsed.subdivision) setSubdivision(parsed.subdivision);
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const citationData = {
            title: title.trim(),
            citation: citationStr.trim(),
            type,
            court: court || undefined,
            year: year || undefined,
            volume: volume || undefined,
            reporter: reporter || undefined,
            page: page || undefined,
            pinpoint: pinpoint || undefined,
            jurisdiction: jurisdiction || undefined,
            codeTitle: codeTitle || undefined,
            section: section || undefined,
            subdivision: subdivision || undefined,
            shortForm: shortForm || undefined,
            parenthetical: parenthetical || undefined,
            url: url || undefined,
            category: category || undefined,
            tags,
            notes: notes || undefined,
            isVerified,
            lastUsedAt: citation?.lastUsedAt,
            createdBy: citation?.createdBy,
        };

        const validation = validateCitation(citationData);
        if (!validation.valid) {
            setErrors(validation.errors);
            return;
        }

        setErrors([]);
        onSave(citationData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Errors */}
            {errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 font-medium mb-1">
                        <AlertCircle className="w-4 h-4" />
                        Please fix the following errors:
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-700">
                        {errors.map((error, i) => (
                            <li key={i}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Citation Type */}
            <div>
                <label className="label">Citation Type *</label>
                <div className="grid grid-cols-3 gap-2">
                    {CITATION_TYPES.map((t) => {
                        const Icon = TYPE_ICONS[t.value];
                        return (
                            <button
                                key={t.value}
                                type="button"
                                onClick={() => setType(t.value)}
                                className={`p-3 rounded-lg border text-left transition-colors ${
                                    type === t.value
                                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                                        : 'border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <Icon className="w-5 h-5 mb-1" />
                                <div className="font-medium text-sm">{t.label}</div>
                                <div className="text-xs text-slate-500">{t.description}</div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Quick Parse */}
            <div>
                <label className="label">Full Citation String *</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={citationStr}
                        onChange={(e) => setCitationStr(e.target.value)}
                        className="input flex-1"
                        placeholder="e.g., Brown v. Board of Education, 347 U.S. 483 (1954)"
                        required
                    />
                    <button
                        type="button"
                        onClick={handleParseCitation}
                        className="btn-ghost btn-sm"
                        title="Parse citation to extract components"
                    >
                        Parse
                    </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    Enter the full citation and click Parse to auto-fill fields
                </p>
            </div>

            {/* Title */}
            <div>
                <label className="label">
                    {type === 'case' ? 'Case Name' : 'Title'} *
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input"
                    placeholder={type === 'case' ? 'e.g., Brown v. Board of Education' : 'e.g., Civil Rights Act'}
                    required
                />
            </div>

            {/* Case-specific fields */}
            {type === 'case' && (
                <>
                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <label className="label">Volume</label>
                            <input
                                type="text"
                                value={volume}
                                onChange={(e) => setVolume(e.target.value)}
                                className="input"
                                placeholder="347"
                            />
                        </div>
                        <div>
                            <label className="label">Reporter</label>
                            <select
                                value={reporter}
                                onChange={(e) => setReporter(e.target.value)}
                                className="input"
                            >
                                <option value="">Select...</option>
                                {FEDERAL_REPORTERS.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Page</label>
                            <input
                                type="text"
                                value={page}
                                onChange={(e) => setPage(e.target.value)}
                                className="input"
                                placeholder="483"
                            />
                        </div>
                        <div>
                            <label className="label">Pinpoint</label>
                            <input
                                type="text"
                                value={pinpoint}
                                onChange={(e) => setPinpoint(e.target.value)}
                                className="input"
                                placeholder="495"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Court</label>
                            <select
                                value={court}
                                onChange={(e) => setCourt(e.target.value)}
                                className="input"
                            >
                                <option value="">Select...</option>
                                {COURTS.federal.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Year</label>
                            <input
                                type="number"
                                value={year}
                                onChange={(e) => setYear(e.target.value ? parseInt(e.target.value, 10) : '')}
                                className="input"
                                placeholder="1954"
                                min="1700"
                                max={new Date().getFullYear()}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Statute/Regulation fields */}
            {(type === 'statute' || type === 'regulation') && (
                <>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="label">Code Title</label>
                            <input
                                type="text"
                                value={codeTitle}
                                onChange={(e) => setCodeTitle(e.target.value)}
                                className="input"
                                placeholder="e.g., 42 U.S.C."
                            />
                        </div>
                        <div>
                            <label className="label">Section</label>
                            <input
                                type="text"
                                value={section}
                                onChange={(e) => setSection(e.target.value)}
                                className="input"
                                placeholder="e.g., 1983"
                            />
                        </div>
                        <div>
                            <label className="label">Subdivision</label>
                            <input
                                type="text"
                                value={subdivision}
                                onChange={(e) => setSubdivision(e.target.value)}
                                className="input"
                                placeholder="e.g., a, b(1)"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Jurisdiction</label>
                            <select
                                value={jurisdiction}
                                onChange={(e) => setJurisdiction(e.target.value)}
                                className="input"
                            >
                                <option value="">Select...</option>
                                {JURISDICTIONS.map((j) => (
                                    <option key={j} value={j}>{j}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Year</label>
                            <input
                                type="number"
                                value={year}
                                onChange={(e) => setYear(e.target.value ? parseInt(e.target.value, 10) : '')}
                                className="input"
                                min="1700"
                                max={new Date().getFullYear()}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Additional fields */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">Short Form</label>
                    <input
                        type="text"
                        value={shortForm}
                        onChange={(e) => setShortForm(e.target.value)}
                        className="input"
                        placeholder="e.g., Brown, 347 U.S. at 495"
                    />
                </div>
                <div>
                    <label className="label">Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="input"
                    >
                        <option value="">Select...</option>
                        {LEGAL_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="label">Parenthetical</label>
                <input
                    type="text"
                    value={parenthetical}
                    onChange={(e) => setParenthetical(e.target.value)}
                    className="input"
                    placeholder="e.g., holding that separate but equal is unconstitutional"
                />
            </div>

            <div>
                <label className="label">URL</label>
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="input"
                    placeholder="https://..."
                />
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

            {/* Notes & Verified */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="input min-h-[80px]"
                        placeholder="Internal notes..."
                    />
                </div>
                <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            checked={isVerified}
                            onChange={(e) => setIsVerified(e.target.checked)}
                            className="rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-700">Verified (citation has been checked)</span>
                    </label>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={onCancel} className="btn-ghost">
                    Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={!title.trim() || !citationStr.trim()}>
                    <Save className="w-4 h-4 mr-1" />
                    {citation ? 'Update Citation' : 'Create Citation'}
                </button>
            </div>
        </form>
    );
}

// ============================================
// Main Component
// ============================================

export function CitationManager() {
    const [citations, setCitations] = useState<Citation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [typeCounts, setTypeCounts] = useState<{ type: string; count: number }[]>([]);

    // Modal state
    const [showForm, setShowForm] = useState(false);
    const [editingCitation, setEditingCitation] = useState<Citation | undefined>();
    const [saving, setSaving] = useState(false);

    // Load citations
    const loadCitations = useCallback(async () => {
        setLoading(true);
        try {
            const [allCitations, counts] = await Promise.all([
                getAllCitations(),
                getCitationTypeCounts(),
            ]);
            setCitations(allCitations);
            setTypeCounts(counts);
        } catch (error) {
            console.error('Error loading citations:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCitations();
    }, [loadCitations]);

    // Filter citations
    const filteredCitations = citations.filter(citation => {
        if (selectedType && citation.type !== selectedType) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                citation.title.toLowerCase().includes(query) ||
                citation.citation.toLowerCase().includes(query) ||
                citation.category?.toLowerCase().includes(query) ||
                citation.tags.some(t => t.toLowerCase().includes(query))
            );
        }
        return true;
    });

    // Handlers
    const handleCreate = () => {
        setEditingCitation(undefined);
        setShowForm(true);
    };

    const handleEdit = (citation: Citation) => {
        setEditingCitation(citation);
        setShowForm(true);
    };

    const handleDelete = async (citation: Citation) => {
        if (!confirm(`Are you sure you want to delete "${citation.title}"?`)) return;

        const success = await deleteCitation(citation.id);
        if (success) {
            setCitations(citations.filter(c => c.id !== citation.id));
        } else {
            alert('Failed to delete citation');
        }
    };

    const handleSave = async (citationData: Omit<Citation, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
        setSaving(true);
        try {
            if (editingCitation) {
                const updated = await updateCitation(editingCitation.id, citationData);
                if (updated) {
                    setCitations(citations.map(c => c.id === editingCitation.id ? updated : c));
                    setShowForm(false);
                } else {
                    alert('Failed to update citation');
                }
            } else {
                const created = await createCitation(citationData);
                if (created) {
                    setCitations([...citations, created]);
                    setShowForm(false);
                } else {
                    alert('Failed to create citation');
                }
            }
        } catch (error) {
            console.error('Error saving citation:', error);
            alert('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const handleDuplicate = async (citation: Citation) => {
        const { id, createdAt, updatedAt, usageCount, ...citationData } = citation;
        const duplicated = await createCitation({
            ...citationData,
            title: `${citation.title} (Copy)`,
            lastUsedAt: undefined,
        });
        if (duplicated) {
            setCitations([...citations, duplicated]);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Citation Management</h2>
                    <p className="text-sm text-slate-500">{citations.length} citations in library</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadCitations} className="btn-ghost btn-sm" disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={handleCreate} className="btn-primary btn-sm">
                        <Plus className="w-4 h-4 mr-1" />
                        New Citation
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
                        placeholder="Search citations..."
                        className="input pl-9"
                    />
                </div>
                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="input w-48"
                >
                    <option value="">All Types</option>
                    {typeCounts.map(({ type, count }) => (
                        <option key={type} value={type}>
                            {CITATION_TYPES.find(t => t.value === type)?.label || type} ({count})
                        </option>
                    ))}
                </select>
            </div>

            {/* Citation List */}
            {loading ? (
                <div className="text-center py-12">
                    <span className="spinner w-8 h-8 text-primary-600" />
                    <p className="text-sm text-slate-500 mt-3">Loading citations...</p>
                </div>
            ) : filteredCitations.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
                    <p className="text-sm text-slate-500 mt-3">
                        {searchQuery || selectedType ? 'No citations match your search' : 'No citations yet'}
                    </p>
                    {!searchQuery && !selectedType && (
                        <button onClick={handleCreate} className="text-sm text-primary-600 hover:text-primary-700 mt-2">
                            Add your first citation
                        </button>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 font-medium text-slate-500">Citation</th>
                                <th className="text-left py-3 px-4 font-medium text-slate-500">Type</th>
                                <th className="text-left py-3 px-4 font-medium text-slate-500">Category</th>
                                <th className="text-center py-3 px-4 font-medium text-slate-500">Year</th>
                                <th className="text-center py-3 px-4 font-medium text-slate-500">Verified</th>
                                <th className="text-center py-3 px-4 font-medium text-slate-500">Usage</th>
                                <th className="text-right py-3 px-4 font-medium text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCitations.map((citation) => {
                                const TypeIcon = TYPE_ICONS[citation.type];
                                return (
                                    <tr key={citation.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                            <div className="max-w-md">
                                                <p className="font-medium text-slate-900 truncate">{citation.title}</p>
                                                <p className="text-xs text-slate-500 truncate">{citation.citation}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 rounded">
                                                <TypeIcon className="w-3 h-3" />
                                                {CITATION_TYPES.find(t => t.value === citation.type)?.label}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-slate-600">{citation.category || '-'}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-slate-600">{citation.year || '-'}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {citation.isVerified ? (
                                                <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4 text-slate-300 mx-auto" />
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-slate-600">{citation.usageCount}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-1">
                                                {citation.url && (
                                                    <a
                                                        href={citation.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                                        title="Open URL"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(citation)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDuplicate(citation)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                                    title="Duplicate"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(citation)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
                            <h3 className="text-lg font-semibold text-slate-900">
                                {editingCitation ? 'Edit Citation' : 'New Citation'}
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
                            <CitationForm
                                citation={editingCitation}
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

export default CitationManager;

