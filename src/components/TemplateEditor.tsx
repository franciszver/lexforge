/**
 * TemplateEditor Component
 * Visual editor for creating and editing templates with placeholder support.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Save,
    Eye,
    EyeOff,
    Plus,
    Trash2,
    GripVertical,
    ChevronDown,
    ChevronUp,
    Settings,
    Type,
    Hash,
    Calendar,
    DollarSign,
    List,
    CheckSquare,
    Mail,
    Phone,
    MapPin,
    AlignLeft,
    X,
    Copy,
    FileText,
} from 'lucide-react';
import type {
    PlaceholderDefinition,
    PlaceholderType,
    PlaceholderOption,
    TemplateSection,
    VariableMap,
    PlaceholderValues,
} from '../utils/templateTypes';
import { extractPlaceholders } from '../utils/templateTypes';
import {
    generatePreview,
    createInitialValues,
    validatePlaceholderValues,
} from '../utils/placeholderResolver';

// ============================================
// Constants
// ============================================

const PLACEHOLDER_TYPE_CONFIG: Record<PlaceholderType, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
    text: { icon: Type, label: 'Text' },
    number: { icon: Hash, label: 'Number' },
    date: { icon: Calendar, label: 'Date' },
    currency: { icon: DollarSign, label: 'Currency' },
    select: { icon: List, label: 'Dropdown' },
    multiselect: { icon: List, label: 'Multi-Select' },
    textarea: { icon: AlignLeft, label: 'Multi-Line Text' },
    boolean: { icon: CheckSquare, label: 'Yes/No' },
    email: { icon: Mail, label: 'Email' },
    phone: { icon: Phone, label: 'Phone' },
    address: { icon: MapPin, label: 'Address' },
};

const DEFAULT_PLACEHOLDER: Omit<PlaceholderDefinition, 'name'> = {
    type: 'text',
    label: '',
    required: false,
};

// ============================================
// Sub-Components
// ============================================

interface PlaceholderEditorProps {
    placeholder: PlaceholderDefinition;
    onChange: (updated: PlaceholderDefinition) => void;
    onDelete: () => void;
    onInsert: () => void;
}

function PlaceholderEditor({ placeholder, onChange, onDelete, onInsert }: PlaceholderEditorProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [optionInput, setOptionInput] = useState('');

    const handleAddOption = () => {
        if (!optionInput.trim()) return;
        const newOption: PlaceholderOption = {
            value: optionInput.toLowerCase().replace(/\s+/g, '_'),
            label: optionInput.trim(),
        };
        onChange({
            ...placeholder,
            options: [...(placeholder.options || []), newOption],
        });
        setOptionInput('');
    };

    const handleRemoveOption = (index: number) => {
        const newOptions = [...(placeholder.options || [])];
        newOptions.splice(index, 1);
        onChange({ ...placeholder, options: newOptions });
    };

    const TypeIcon = PLACEHOLDER_TYPE_CONFIG[placeholder.type]?.icon || Type;

    return (
        <div className="border border-slate-200 rounded-lg bg-white">
            {/* Header */}
            <div className="flex items-center gap-2 p-3 border-b border-slate-100">
                <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                <TypeIcon className="w-4 h-4 text-slate-500" />
                <span className="flex-1 font-medium text-sm text-slate-900">
                    {placeholder.label || placeholder.name || 'New Placeholder'}
                </span>
                <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                    {`{{${placeholder.name}}}`}
                </code>
                <button
                    onClick={onInsert}
                    className="btn-ghost btn-xs"
                    title="Insert into editor"
                >
                    <Copy className="w-3 h-3" />
                </button>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="btn-ghost btn-xs"
                >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={onDelete} className="btn-ghost btn-xs text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Expanded Editor */}
            {isExpanded && (
                <div className="p-4 space-y-4">
                    {/* Basic Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Variable Name</label>
                            <input
                                type="text"
                                value={placeholder.name}
                                onChange={(e) => onChange({ ...placeholder, name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                                className="input"
                                placeholder="client_name"
                            />
                        </div>
                        <div>
                            <label className="label">Display Label</label>
                            <input
                                type="text"
                                value={placeholder.label}
                                onChange={(e) => onChange({ ...placeholder, label: e.target.value })}
                                className="input"
                                placeholder="Client Name"
                            />
                        </div>
                    </div>

                    {/* Type Selection */}
                    <div>
                        <label className="label">Type</label>
                        <select
                            value={placeholder.type}
                            onChange={(e) => onChange({ ...placeholder, type: e.target.value as PlaceholderType })}
                            className="input"
                        >
                            {Object.entries(PLACEHOLDER_TYPE_CONFIG).map(([type, config]) => (
                                <option key={type} value={type}>{config.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="label">Description (Help Text)</label>
                        <input
                            type="text"
                            value={placeholder.description || ''}
                            onChange={(e) => onChange({ ...placeholder, description: e.target.value })}
                            className="input"
                            placeholder="Enter the full legal name of the client"
                        />
                    </div>

                    {/* Required & Default */}
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={placeholder.required}
                                onChange={(e) => onChange({ ...placeholder, required: e.target.checked })}
                                className="rounded border-slate-300"
                            />
                            <span className="text-sm text-slate-700">Required</span>
                        </label>
                        <div className="flex-1">
                            <input
                                type="text"
                                value={String(placeholder.defaultValue || '')}
                                onChange={(e) => onChange({ ...placeholder, defaultValue: e.target.value })}
                                className="input"
                                placeholder="Default value (optional)"
                            />
                        </div>
                    </div>

                    {/* Options for select/multiselect */}
                    {(placeholder.type === 'select' || placeholder.type === 'multiselect') && (
                        <div>
                            <label className="label">Options</label>
                            <div className="space-y-2">
                                {placeholder.options?.map((opt, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={opt.label}
                                            onChange={(e) => {
                                                const newOptions = [...(placeholder.options || [])];
                                                newOptions[idx] = { ...opt, label: e.target.value };
                                                onChange({ ...placeholder, options: newOptions });
                                            }}
                                            className="input flex-1"
                                        />
                                        <button
                                            onClick={() => handleRemoveOption(idx)}
                                            className="btn-ghost btn-xs text-red-500"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={optionInput}
                                        onChange={(e) => setOptionInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                                        className="input flex-1"
                                        placeholder="Add option..."
                                    />
                                    <button onClick={handleAddOption} className="btn-primary btn-sm">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Validation for text/number */}
                    {(placeholder.type === 'text' || placeholder.type === 'textarea') && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Min Length</label>
                                <input
                                    type="number"
                                    value={placeholder.validation?.minLength || ''}
                                    onChange={(e) => onChange({
                                        ...placeholder,
                                        validation: { ...placeholder.validation, minLength: parseInt(e.target.value) || undefined }
                                    })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="label">Max Length</label>
                                <input
                                    type="number"
                                    value={placeholder.validation?.maxLength || ''}
                                    onChange={(e) => onChange({
                                        ...placeholder,
                                        validation: { ...placeholder.validation, maxLength: parseInt(e.target.value) || undefined }
                                    })}
                                    className="input"
                                />
                            </div>
                        </div>
                    )}

                    {(placeholder.type === 'number' || placeholder.type === 'currency') && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Minimum</label>
                                <input
                                    type="number"
                                    value={placeholder.validation?.min || ''}
                                    onChange={(e) => onChange({
                                        ...placeholder,
                                        validation: { ...placeholder.validation, min: parseFloat(e.target.value) || undefined }
                                    })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="label">Maximum</label>
                                <input
                                    type="number"
                                    value={placeholder.validation?.max || ''}
                                    onChange={(e) => onChange({
                                        ...placeholder,
                                        validation: { ...placeholder.validation, max: parseFloat(e.target.value) || undefined }
                                    })}
                                    className="input"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

interface SectionEditorProps {
    section: TemplateSection;
    onChange: (updated: TemplateSection) => void;
    onDelete: () => void;
    placeholders: PlaceholderDefinition[];
}

function SectionEditor({ section, onChange, onDelete, placeholders }: SectionEditorProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const editor = useEditor({
        extensions: [StarterKit],
        content: section.content,
        onUpdate: ({ editor }) => {
            onChange({ ...section, content: editor.getHTML() });
        },
    });

    const insertPlaceholder = useCallback((name: string) => {
        if (editor) {
            editor.chain().focus().insertContent(`{{${name}}}`).run();
        }
    }, [editor]);

    return (
        <div className="border border-slate-200 rounded-lg bg-white">
            {/* Header */}
            <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-slate-50">
                <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                <FileText className="w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    value={section.name}
                    onChange={(e) => onChange({ ...section, name: e.target.value })}
                    className="flex-1 bg-transparent border-0 text-sm font-medium text-slate-900 focus:outline-none"
                    placeholder="Section Name"
                />
                <label className="flex items-center gap-1 text-xs text-slate-500">
                    <input
                        type="checkbox"
                        checked={section.isRequired}
                        onChange={(e) => onChange({ ...section, isRequired: e.target.checked })}
                        className="rounded border-slate-300"
                    />
                    Required
                </label>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="btn-ghost btn-xs"
                >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={onDelete} className="btn-ghost btn-xs text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="p-4">
                    {/* Placeholder Quick Insert */}
                    {placeholders.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1">
                            <span className="text-xs text-slate-500 mr-2">Insert:</span>
                            {placeholders.map((ph) => (
                                <button
                                    key={ph.name}
                                    onClick={() => insertPlaceholder(ph.name)}
                                    className="text-xs px-2 py-0.5 bg-primary-50 text-primary-700 rounded hover:bg-primary-100"
                                >
                                    {`{{${ph.name}}}`}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* TipTap Editor */}
                    <div className="prose prose-sm max-w-none border border-slate-200 rounded-lg p-3 min-h-[150px]">
                        <EditorContent editor={editor} />
                    </div>

                    {/* Section Description */}
                    <div className="mt-3">
                        <input
                            type="text"
                            value={section.description || ''}
                            onChange={(e) => onChange({ ...section, description: e.target.value })}
                            className="input text-sm"
                            placeholder="Section description (optional)"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// Main Component
// ============================================

interface TemplateEditorProps {
    initialTemplate?: {
        id?: string;
        name: string;
        category: string;
        skeletonContent: string;
        placeholders: PlaceholderDefinition[];
        sections: TemplateSection[];
        variables: VariableMap;
        version?: number;
    };
    onSave: (template: {
        name: string;
        category: string;
        skeletonContent: string;
        placeholders: PlaceholderDefinition[];
        sections: TemplateSection[];
        variables: VariableMap;
    }) => void;
    onCancel?: () => void;
    categories?: string[];
}

export function TemplateEditor({
    initialTemplate,
    onSave,
    onCancel,
    categories = ['Demand Letter', 'Contract', 'Brief', 'Motion', 'Agreement', 'Other'],
}: TemplateEditorProps) {
    // State
    const [name, setName] = useState(initialTemplate?.name || '');
    const [category, setCategory] = useState(initialTemplate?.category || categories[0]);
    const [placeholders, setPlaceholders] = useState<PlaceholderDefinition[]>(
        initialTemplate?.placeholders || []
    );
    const [sections, setSections] = useState<TemplateSection[]>(
        initialTemplate?.sections || [
            { id: '1', name: 'Main Content', content: '', order: 0, isRequired: true },
        ]
    );
    const [showPreview, setShowPreview] = useState(false);
    const [previewValues, setPreviewValues] = useState<PlaceholderValues>({});
    const [activeTab, setActiveTab] = useState<'content' | 'placeholders' | 'settings'>('content');

    // Initialize preview values when placeholders change
    useEffect(() => {
        setPreviewValues(createInitialValues(placeholders));
    }, [placeholders]);

    // Combined content from all sections
    const combinedContent = useMemo(() => {
        return sections
            .sort((a, b) => a.order - b.order)
            .map(s => s.content)
            .join('\n');
    }, [sections]);

    // Preview content
    const previewContent = useMemo(() => {
        if (!showPreview) return '';
        return generatePreview(combinedContent, previewValues, placeholders);
    }, [showPreview, combinedContent, previewValues, placeholders]);

    // Validation
    const validation = useMemo(() => {
        return validatePlaceholderValues(previewValues, placeholders);
    }, [previewValues, placeholders]);

    // Placeholder handlers
    const handleAddPlaceholder = useCallback(() => {
        const newName = `placeholder_${placeholders.length + 1}`;
        setPlaceholders([
            ...placeholders,
            { ...DEFAULT_PLACEHOLDER, name: newName, label: `Placeholder ${placeholders.length + 1}` },
        ]);
    }, [placeholders]);

    const handleUpdatePlaceholder = useCallback((index: number, updated: PlaceholderDefinition) => {
        const newPlaceholders = [...placeholders];
        newPlaceholders[index] = updated;
        setPlaceholders(newPlaceholders);
    }, [placeholders]);

    const handleDeletePlaceholder = useCallback((index: number) => {
        const newPlaceholders = [...placeholders];
        newPlaceholders.splice(index, 1);
        setPlaceholders(newPlaceholders);
    }, [placeholders]);

    // Section handlers
    const handleAddSection = useCallback(() => {
        const newId = String(Date.now());
        setSections([
            ...sections,
            {
                id: newId,
                name: `Section ${sections.length + 1}`,
                content: '',
                order: sections.length,
                isRequired: false,
            },
        ]);
    }, [sections]);

    const handleUpdateSection = useCallback((index: number, updated: TemplateSection) => {
        const newSections = [...sections];
        newSections[index] = updated;
        setSections(newSections);
    }, [sections]);

    const handleDeleteSection = useCallback((index: number) => {
        if (sections.length <= 1) return; // Keep at least one section
        const newSections = [...sections];
        newSections.splice(index, 1);
        setSections(newSections);
    }, [sections]);

    // Save handler
    const handleSave = useCallback(() => {
        // Build variables from placeholders
        const variables: VariableMap = {};
        for (const ph of placeholders) {
            variables[ph.name] = {
                type: ph.type,
                defaultValue: ph.defaultValue,
            };
        }

        onSave({
            name,
            category,
            skeletonContent: combinedContent,
            placeholders,
            sections,
            variables,
        });
    }, [name, category, combinedContent, placeholders, sections, onSave]);

    // Insert placeholder into first section editor
    const handleInsertPlaceholder = useCallback((placeholderName: string) => {
        // This will be handled by the section editor
        navigator.clipboard.writeText(`{{${placeholderName}}}`);
    }, []);

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-slate-900">
                            {initialTemplate?.id ? 'Edit Template' : 'New Template'}
                        </h2>
                        {initialTemplate?.version && (
                            <span className="text-sm text-slate-500">v{initialTemplate.version}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={`btn-ghost btn-sm ${showPreview ? 'text-primary-600' : ''}`}
                        >
                            {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                            {showPreview ? 'Hide Preview' : 'Preview'}
                        </button>
                        {onCancel && (
                            <button onClick={onCancel} className="btn-ghost btn-sm">
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={!name.trim()}
                            className="btn-primary btn-sm"
                        >
                            <Save className="w-4 h-4 mr-1" />
                            Save Template
                        </button>
                    </div>
                </div>

                {/* Template Name & Category */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                        <label className="label">Template Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input"
                            placeholder="e.g., Standard Demand Letter"
                        />
                    </div>
                    <div>
                        <label className="label">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="input"
                        >
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-4 flex gap-1 border-b border-slate-200">
                    {[
                        { id: 'content', label: 'Content', icon: FileText },
                        { id: 'placeholders', label: 'Placeholders', icon: Type },
                        { id: 'settings', label: 'Settings', icon: Settings },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                                    activeTab === tab.id
                                        ? 'text-primary-600 border-b-2 border-primary-600'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                {tab.id === 'placeholders' && placeholders.length > 0 && (
                                    <span className="ml-1 text-xs bg-slate-100 px-1.5 rounded-full">
                                        {placeholders.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex">
                {/* Editor Panel */}
                <div className={`flex-1 overflow-y-auto p-6 ${showPreview ? 'w-1/2' : ''}`}>
                    {/* Content Tab */}
                    {activeTab === 'content' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-900">Sections</h3>
                                <button onClick={handleAddSection} className="btn-ghost btn-sm">
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Section
                                </button>
                            </div>
                            <div className="space-y-4">
                                {sections.map((section, index) => (
                                    <SectionEditor
                                        key={section.id}
                                        section={section}
                                        onChange={(updated) => handleUpdateSection(index, updated)}
                                        onDelete={() => handleDeleteSection(index)}
                                        placeholders={placeholders}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Placeholders Tab */}
                    {activeTab === 'placeholders' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-900">Placeholders</h3>
                                <button onClick={handleAddPlaceholder} className="btn-primary btn-sm">
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Placeholder
                                </button>
                            </div>
                            {placeholders.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Type className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                    <p className="text-sm">No placeholders defined yet.</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Add placeholders to create dynamic fields in your template.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {placeholders.map((placeholder, index) => (
                                        <PlaceholderEditor
                                            key={placeholder.name}
                                            placeholder={placeholder}
                                            onChange={(updated) => handleUpdatePlaceholder(index, updated)}
                                            onDelete={() => handleDeletePlaceholder(index)}
                                            onInsert={() => handleInsertPlaceholder(placeholder.name)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            <div className="card p-6">
                                <h3 className="text-sm font-semibold text-slate-900 mb-4">Template Settings</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Default Jurisdiction</label>
                                        <select className="input">
                                            <option value="">None</option>
                                            <option value="federal">Federal</option>
                                            <option value="california">California</option>
                                            <option value="new_york">New York</option>
                                            <option value="texas">Texas</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2">
                                            <input type="checkbox" className="rounded border-slate-300" />
                                            <span className="text-sm text-slate-700">Require all placeholders before export</span>
                                        </label>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2">
                                            <input type="checkbox" className="rounded border-slate-300" />
                                            <span className="text-sm text-slate-700">Enable AI suggestions for this template</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="card p-6">
                                <h3 className="text-sm font-semibold text-slate-900 mb-4">Detected Placeholders</h3>
                                <p className="text-sm text-slate-500 mb-3">
                                    These placeholders were found in your content:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {extractPlaceholders(combinedContent).map((name) => {
                                        const isDefined = placeholders.some(p => p.name === name);
                                        return (
                                            <span
                                                key={name}
                                                className={`text-xs px-2 py-1 rounded ${
                                                    isDefined
                                                        ? 'bg-green-50 text-green-700'
                                                        : 'bg-amber-50 text-amber-700'
                                                }`}
                                            >
                                                {`{{${name}}}`}
                                                {!isDefined && ' (undefined)'}
                                            </span>
                                        );
                                    })}
                                    {extractPlaceholders(combinedContent).length === 0 && (
                                        <span className="text-sm text-slate-400">No placeholders found</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Preview Panel */}
                {showPreview && (
                    <div className="w-1/2 border-l border-slate-200 bg-white overflow-y-auto">
                        <div className="p-6">
                            <h3 className="text-sm font-semibold text-slate-900 mb-4">Preview</h3>
                            
                            {/* Preview Values Input */}
                            {placeholders.length > 0 && (
                                <div className="mb-6 space-y-3">
                                    <p className="text-xs text-slate-500">Enter sample values to preview:</p>
                                    {placeholders.map((ph) => (
                                        <div key={ph.name} className="flex items-center gap-2">
                                            <label className="text-xs text-slate-600 w-32 truncate" title={ph.label}>
                                                {ph.label}:
                                            </label>
                                            <input
                                                type={ph.type === 'number' || ph.type === 'currency' ? 'number' : 'text'}
                                                value={String(previewValues[ph.name] || '')}
                                                onChange={(e) => setPreviewValues({
                                                    ...previewValues,
                                                    [ph.name]: e.target.value,
                                                })}
                                                className="input input-sm flex-1"
                                                placeholder={ph.label}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Validation Errors */}
                            {!validation.isValid && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm font-medium text-red-800 mb-2">Validation Errors:</p>
                                    <ul className="text-xs text-red-700 space-y-1">
                                        {validation.errors.map((err, idx) => (
                                            <li key={idx}>{err.message}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Preview Content */}
                            <div 
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: previewContent }}
                            />

                            {/* Placeholder Styling */}
                            <style>{`
                                .placeholder-unresolved {
                                    background-color: #fef3c7;
                                    color: #92400e;
                                    padding: 0 4px;
                                    border-radius: 2px;
                                    font-style: italic;
                                }
                                .placeholder-resolved {
                                    background-color: #d1fae5;
                                    color: #065f46;
                                    padding: 0 4px;
                                    border-radius: 2px;
                                }
                            `}</style>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TemplateEditor;

