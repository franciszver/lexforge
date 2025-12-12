/**
 * PlaceholderForm Component
 * Form for filling in placeholder values when using a template.
 */

import { useState, useMemo, useCallback } from 'react';
import {
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
    AlertCircle,
    Check,
    Info,
} from 'lucide-react';
import type {
    PlaceholderDefinition,
    PlaceholderType,
    PlaceholderValues,
} from '../utils/templateTypes';
import {
    validatePlaceholderValues,
    getMissingRequiredPlaceholders,
} from '../utils/placeholderResolver';

// ============================================
// Constants
// ============================================

const TYPE_ICONS: Record<PlaceholderType, React.ComponentType<{ className?: string }>> = {
    text: Type,
    number: Hash,
    date: Calendar,
    currency: DollarSign,
    select: List,
    multiselect: List,
    textarea: AlignLeft,
    boolean: CheckSquare,
    email: Mail,
    phone: Phone,
    address: MapPin,
};

// ============================================
// Sub-Components
// ============================================

interface PlaceholderInputProps {
    definition: PlaceholderDefinition;
    value: string | number | boolean | string[] | null;
    onChange: (value: string | number | boolean | string[] | null) => void;
    error?: string;
}

function PlaceholderInput({ definition, value, onChange, error }: PlaceholderInputProps) {
    const Icon = TYPE_ICONS[definition.type] || Type;

    const renderInput = () => {
        switch (definition.type) {
            case 'textarea':
                return (
                    <textarea
                        value={String(value || '')}
                        onChange={(e) => onChange(e.target.value)}
                        className={`input min-h-[100px] ${error ? 'border-red-500' : ''}`}
                        placeholder={definition.description || `Enter ${definition.label.toLowerCase()}`}
                        minLength={definition.validation?.minLength}
                        maxLength={definition.validation?.maxLength}
                    />
                );

            case 'number':
                return (
                    <input
                        type="number"
                        value={value !== null && value !== undefined ? String(value) : ''}
                        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        className={`input ${error ? 'border-red-500' : ''}`}
                        placeholder={definition.description || `Enter ${definition.label.toLowerCase()}`}
                        min={definition.validation?.min}
                        max={definition.validation?.max}
                    />
                );

            case 'currency':
                return (
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                        <input
                            type="number"
                            step="0.01"
                            value={value !== null && value !== undefined ? String(value) : ''}
                            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            className={`input pl-7 ${error ? 'border-red-500' : ''}`}
                            placeholder="0.00"
                            min={definition.validation?.min}
                            max={definition.validation?.max}
                        />
                    </div>
                );

            case 'date':
                return (
                    <input
                        type="date"
                        value={String(value || '')}
                        onChange={(e) => onChange(e.target.value)}
                        className={`input ${error ? 'border-red-500' : ''}`}
                    />
                );

            case 'select':
                return (
                    <select
                        value={String(value || '')}
                        onChange={(e) => onChange(e.target.value)}
                        className={`input ${error ? 'border-red-500' : ''}`}
                    >
                        <option value="">Select {definition.label.toLowerCase()}...</option>
                        {definition.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );

            case 'multiselect':
                const selectedValues = Array.isArray(value) ? value : [];
                return (
                    <div className="space-y-2">
                        {definition.options?.map((opt) => (
                            <label key={opt.value} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(opt.value)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            onChange([...selectedValues, opt.value]);
                                        } else {
                                            onChange(selectedValues.filter((v) => v !== opt.value));
                                        }
                                    }}
                                    className="rounded border-slate-300"
                                />
                                <span className="text-sm text-slate-700">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'boolean':
                return (
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                name={definition.name}
                                checked={value === true || value === 'true'}
                                onChange={() => onChange(true)}
                                className="text-primary-600"
                            />
                            <span className="text-sm text-slate-700">Yes</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                name={definition.name}
                                checked={value === false || value === 'false'}
                                onChange={() => onChange(false)}
                                className="text-primary-600"
                            />
                            <span className="text-sm text-slate-700">No</span>
                        </label>
                    </div>
                );

            case 'email':
                return (
                    <input
                        type="email"
                        value={String(value || '')}
                        onChange={(e) => onChange(e.target.value)}
                        className={`input ${error ? 'border-red-500' : ''}`}
                        placeholder={definition.description || 'email@example.com'}
                    />
                );

            case 'phone':
                return (
                    <input
                        type="tel"
                        value={String(value || '')}
                        onChange={(e) => onChange(e.target.value)}
                        className={`input ${error ? 'border-red-500' : ''}`}
                        placeholder={definition.description || '(555) 555-5555'}
                    />
                );

            case 'address':
                return (
                    <textarea
                        value={String(value || '')}
                        onChange={(e) => onChange(e.target.value)}
                        className={`input min-h-[80px] ${error ? 'border-red-500' : ''}`}
                        placeholder={definition.description || 'Enter full address'}
                    />
                );

            default: // text
                return (
                    <input
                        type="text"
                        value={String(value || '')}
                        onChange={(e) => onChange(e.target.value)}
                        className={`input ${error ? 'border-red-500' : ''}`}
                        placeholder={definition.description || `Enter ${definition.label.toLowerCase()}`}
                        minLength={definition.validation?.minLength}
                        maxLength={definition.validation?.maxLength}
                    />
                );
        }
    };

    return (
        <div className="space-y-1">
            <label className="label flex items-center gap-1">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                {definition.label}
                {definition.required && <span className="text-red-500">*</span>}
            </label>
            {renderInput()}
            {definition.description && !error && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    {definition.description}
                </p>
            )}
            {error && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </p>
            )}
        </div>
    );
}

// ============================================
// Main Component
// ============================================

interface PlaceholderFormProps {
    placeholders: PlaceholderDefinition[];
    values: PlaceholderValues;
    onChange: (values: PlaceholderValues) => void;
    onSubmit?: () => void;
    onCancel?: () => void;
    submitLabel?: string;
    showValidation?: boolean;
    compact?: boolean;
}

export function PlaceholderForm({
    placeholders,
    values,
    onChange,
    onSubmit,
    onCancel,
    submitLabel = 'Continue',
    showValidation = true,
    compact = false,
}: PlaceholderFormProps) {
    const [showErrors, setShowErrors] = useState(false);

    // Validation
    const validation = useMemo(() => {
        return validatePlaceholderValues(values, placeholders);
    }, [values, placeholders]);

    const missingRequired = useMemo(() => {
        return getMissingRequiredPlaceholders(placeholders, values);
    }, [placeholders, values]);

    // Group placeholders by their group property
    const groupedPlaceholders = useMemo(() => {
        const groups: Record<string, PlaceholderDefinition[]> = {};
        const ungrouped: PlaceholderDefinition[] = [];

        for (const ph of placeholders) {
            if (ph.group) {
                if (!groups[ph.group]) {
                    groups[ph.group] = [];
                }
                groups[ph.group].push(ph);
            } else {
                ungrouped.push(ph);
            }
        }

        // Sort within groups by order
        for (const group of Object.values(groups)) {
            group.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
        ungrouped.sort((a, b) => (a.order || 0) - (b.order || 0));

        return { groups, ungrouped };
    }, [placeholders]);

    // Handle value change
    const handleValueChange = useCallback(
        (name: string, value: string | number | boolean | string[] | null) => {
            onChange({ ...values, [name]: value });
        },
        [values, onChange]
    );

    // Handle submit
    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            setShowErrors(true);
            
            if (validation.isValid && onSubmit) {
                onSubmit();
            }
        },
        [validation.isValid, onSubmit]
    );

    // Get error for a specific placeholder
    const getError = (name: string): string | undefined => {
        if (!showErrors) return undefined;
        return validation.errors.find((e) => e.placeholderName === name)?.message;
    };

    // Progress indicator
    const totalRequired = placeholders.filter((p) => p.required).length;
    const filledRequired = totalRequired - missingRequired.length;
    const progress = totalRequired > 0 ? Math.round((filledRequired / totalRequired) * 100) : 100;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Progress Bar */}
            {showValidation && totalRequired > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                            {filledRequired} of {totalRequired} required fields completed
                        </span>
                        <span className={progress === 100 ? 'text-green-600' : 'text-slate-500'}>
                            {progress}%
                        </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ${
                                progress === 100 ? 'bg-green-500' : 'bg-primary-500'
                            }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Ungrouped Placeholders */}
            {groupedPlaceholders.ungrouped.length > 0 && (
                <div className={compact ? 'space-y-3' : 'space-y-4'}>
                    {groupedPlaceholders.ungrouped.map((ph) => (
                        <PlaceholderInput
                            key={ph.name}
                            definition={ph}
                            value={values[ph.name]}
                            onChange={(value) => handleValueChange(ph.name, value)}
                            error={getError(ph.name)}
                        />
                    ))}
                </div>
            )}

            {/* Grouped Placeholders */}
            {Object.entries(groupedPlaceholders.groups).map(([groupName, groupPlaceholders]) => (
                <div key={groupName} className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">
                        {groupName}
                    </h4>
                    <div className={compact ? 'space-y-3' : 'space-y-4'}>
                        {groupPlaceholders.map((ph) => (
                            <PlaceholderInput
                                key={ph.name}
                                definition={ph}
                                value={values[ph.name]}
                                onChange={(value) => handleValueChange(ph.name, value)}
                                error={getError(ph.name)}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {/* Empty State */}
            {placeholders.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                    <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="text-sm">No fields required for this template.</p>
                </div>
            )}

            {/* Validation Summary */}
            {showValidation && showErrors && !validation.isValid && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-2 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Please fix the following errors:
                    </p>
                    <ul className="text-xs text-red-700 space-y-1 pl-5 list-disc">
                        {validation.errors.map((err, idx) => (
                            <li key={idx}>{err.message}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Actions */}
            {(onSubmit || onCancel) && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                    {onCancel && (
                        <button type="button" onClick={onCancel} className="btn-ghost">
                            Cancel
                        </button>
                    )}
                    {onSubmit && (
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={showValidation && !validation.isValid && showErrors}
                        >
                            {validation.isValid ? (
                                <>
                                    <Check className="w-4 h-4 mr-1" />
                                    {submitLabel}
                                </>
                            ) : (
                                submitLabel
                            )}
                        </button>
                    )}
                </div>
            )}
        </form>
    );
}

export default PlaceholderForm;

