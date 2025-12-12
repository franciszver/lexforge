/**
 * ArgumentBuilder Component
 * A multi-step wizard for building AI-powered legal arguments.
 */

import { useState, useCallback, useEffect } from 'react';
import {
    ChevronRight,
    ChevronLeft,
    Sparkles,
    FileText,
    Target,
    Scale,
    Shield,
    AlertCircle,
    CheckCircle,
    Loader2,
    Plus,
    Trash2,
    Edit2,
    Download,
    Save,
    ChevronDown,
    ChevronUp,
    Zap,
    TrendingUp,
    BarChart2,
} from 'lucide-react';
import {
    type ArgumentOutline,
    type ArgumentGenerationInput,
    type Argument,
    type CoherenceAnalysis,
    ARGUMENT_TYPES,
    CLIENT_POSITIONS,
    PRACTICE_AREAS,
    DOCUMENT_TYPES_FOR_ARGUMENTS,
    getStrengthColor,
    formatConfidence,
} from '../utils/argumentTypes';
import {
    generateArgumentOutline,
    generateCounterArguments,
    analyzeCoherence,
    strengthenArgument,
    saveArgumentDraft,
    getArgumentDrafts,
    deleteArgumentDraft,
    outlineToHtml,
    exportOutlineToJson,
    calculateCompletenessScore,
    reorderArguments,
    removeArgumentFromOutline,
    updateArgumentInOutline,
} from '../utils/argumentService';
import { JURISDICTIONS } from '../utils/clauseTypes';

// ============================================
// Types
// ============================================

type WizardStep = 'facts' | 'context' | 'generate' | 'review' | 'refine';

interface ArgumentBuilderProps {
    onInsertContent?: (html: string) => void;
    documentType?: string;
    jurisdiction?: string;
    onClose?: () => void;
}

// ============================================
// Sub-Components
// ============================================

interface StepIndicatorProps {
    currentStep: WizardStep;
    steps: { key: WizardStep; label: string; icon: React.ReactNode }[];
}

function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
    const currentIndex = steps.findIndex(s => s.key === currentStep);
    
    return (
        <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => (
                <div key={step.key} className="flex items-center">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        index === currentIndex
                            ? 'bg-primary-100 text-primary-700'
                            : index < currentIndex
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                    }`}>
                        {index < currentIndex ? (
                            <CheckCircle className="w-4 h-4" />
                        ) : (
                            step.icon
                        )}
                        <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                    </div>
                    {index < steps.length - 1 && (
                        <ChevronRight className="w-4 h-4 mx-2 text-slate-400" />
                    )}
                </div>
            ))}
        </div>
    );
}

interface ArgumentCardProps {
    argument: Argument;
    index: number;
    onEdit: (arg: Argument) => void;
    onDelete: (id: string) => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    expanded: boolean;
    onToggleExpand: () => void;
}

function ArgumentCard({
    argument,
    index,
    onEdit,
    onDelete,
    onMoveUp,
    onMoveDown,
    expanded,
    onToggleExpand,
}: ArgumentCardProps) {
    const typeInfo = ARGUMENT_TYPES.find(t => t.value === argument.type);
    
    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 border-b border-slate-200">
                <div className="flex flex-col gap-1">
                    <button
                        onClick={onMoveUp}
                        disabled={!onMoveUp}
                        className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onMoveDown}
                        disabled={!onMoveDown}
                        className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">
                            {index + 1}. {argument.title}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStrengthColor(argument.strength)}`}>
                            {argument.strength}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-slate-200 text-slate-700 rounded-full">
                            {typeInfo?.label || argument.type}
                        </span>
                    </div>
                    <p className="text-sm text-slate-600 truncate mt-1">{argument.thesis}</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                        {formatConfidence(argument.confidenceScore)}
                    </span>
                    <button
                        onClick={() => onEdit(argument)}
                        className="p-1.5 hover:bg-slate-200 rounded"
                        title="Edit"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(argument.id)}
                        className="p-1.5 hover:bg-red-100 text-red-600 rounded"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onToggleExpand}
                        className="p-1.5 hover:bg-slate-200 rounded"
                    >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>
            
            {/* Expanded Content */}
            {expanded && (
                <div className="p-4 space-y-4">
                    {/* Supporting Points */}
                    <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Supporting Points</h4>
                        <div className="space-y-2">
                            {argument.supportingPoints.map((point, idx) => (
                                <div key={point.id} className="flex items-start gap-2 text-sm">
                                    <span className={`mt-1 px-1.5 py-0.5 text-xs rounded ${getStrengthColor(point.strength)}`}>
                                        {point.type}
                                    </span>
                                    <div>
                                        <p className="text-slate-700">{point.text}</p>
                                        {point.citations?.length > 0 && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                Citations: {point.citations.join('; ')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Counter Arguments */}
                    {argument.counterArguments.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Counter-Arguments & Rebuttals</h4>
                            <div className="space-y-3">
                                {argument.counterArguments.map((counter) => (
                                    <div key={counter.id} className="bg-slate-50 p-3 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-sm text-slate-700">{counter.text}</p>
                                                <span className={`inline-block mt-1 px-1.5 py-0.5 text-xs rounded ${getStrengthColor(counter.strength)}`}>
                                                    {counter.strength} counter
                                                </span>
                                            </div>
                                        </div>
                                        {counter.rebuttal && (
                                            <div className="flex items-start gap-2 mt-2 pl-6 border-l-2 border-green-300">
                                                <Shield className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <p className="text-sm text-slate-700">{counter.rebuttal}</p>
                                                    {counter.rebuttalStrength && (
                                                        <span className={`inline-block mt-1 px-1.5 py-0.5 text-xs rounded ${getStrengthColor(counter.rebuttalStrength)}`}>
                                                            {counter.rebuttalStrength} rebuttal
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Conclusion */}
                    {argument.conclusion && (
                        <div>
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Conclusion</h4>
                            <p className="text-sm text-slate-600">{argument.conclusion}</p>
                        </div>
                    )}
                    
                    {/* Citations */}
                    {argument.citations.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Citations</h4>
                            <ul className="text-sm text-slate-600 list-disc list-inside">
                                {argument.citations.map((cit, idx) => (
                                    <li key={idx}>{cit}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

interface CoherenceReportProps {
    analysis: CoherenceAnalysis;
    onClose: () => void;
}

function CoherenceReport({ analysis, onClose }: CoherenceReportProps) {
    const getScoreColor = (score: number) => {
        if (score >= 0.8) return 'text-green-600 bg-green-50';
        if (score >= 0.6) return 'text-amber-600 bg-amber-50';
        return 'text-red-600 bg-red-50';
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-800">Coherence Analysis</h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Overall Score */}
                    <div className="text-center">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-semibold ${getScoreColor(analysis.overallScore)}`}>
                            <BarChart2 className="w-5 h-5" />
                            Overall: {Math.round(analysis.overallScore * 100)}%
                        </div>
                    </div>
                    
                    {/* Score Breakdown */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Logical Flow', value: analysis.logicalFlow },
                            { label: 'Fact Consistency', value: analysis.factConsistency },
                            { label: 'Citation Support', value: analysis.citationSupport },
                            { label: 'Counter-Argument Coverage', value: analysis.counterArgumentCoverage },
                            { label: 'Conclusion Alignment', value: analysis.conclusionAlignment },
                        ].map((item) => (
                            <div key={item.label} className="bg-slate-50 p-3 rounded-lg">
                                <div className="text-sm text-slate-600 mb-1">{item.label}</div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${
                                                item.value >= 0.8 ? 'bg-green-500' :
                                                item.value >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${item.value * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium">{Math.round(item.value * 100)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Issues */}
                    {analysis.issues.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Issues Found</h3>
                            <div className="space-y-2">
                                {analysis.issues.map((issue, idx) => (
                                    <div key={idx} className={`p-3 rounded-lg border ${
                                        issue.severity === 'high' ? 'bg-red-50 border-red-200' :
                                        issue.severity === 'medium' ? 'bg-amber-50 border-amber-200' :
                                        'bg-slate-50 border-slate-200'
                                    }`}>
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className={`w-4 h-4 mt-0.5 ${
                                                issue.severity === 'high' ? 'text-red-500' :
                                                issue.severity === 'medium' ? 'text-amber-500' :
                                                'text-slate-500'
                                            }`} />
                                            <div>
                                                <div className="text-sm font-medium">{issue.type.replace('_', ' ')}</div>
                                                <div className="text-sm text-slate-600">{issue.description}</div>
                                                <div className="text-xs text-slate-500 mt-1">Location: {issue.location}</div>
                                                {issue.suggestion && (
                                                    <div className="text-xs text-green-700 mt-1">
                                                        Suggestion: {issue.suggestion}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Suggestions */}
                    {analysis.suggestions.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Suggestions</h3>
                            <ul className="space-y-2">
                                {analysis.suggestions.map((suggestion, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                        <TrendingUp className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                                        <span>{suggestion}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// Main Component
// ============================================

export function ArgumentBuilder({
    onInsertContent,
    documentType: initialDocType,
    jurisdiction: initialJurisdiction,
    onClose,
}: ArgumentBuilderProps) {
    // Wizard state
    const [currentStep, setCurrentStep] = useState<WizardStep>('facts');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Input state
    const [facts, setFacts] = useState<string[]>(['']);
    const [keyFacts, setKeyFacts] = useState<string[]>([]);
    const [legalPrinciples, setLegalPrinciples] = useState<string[]>(['']);
    const [jurisdiction, setJurisdiction] = useState(initialJurisdiction || 'Federal');
    const [documentType, setDocumentType] = useState(initialDocType || 'Brief');
    const [practiceArea, setPracticeArea] = useState('Civil Litigation');
    const [desiredOutcome, setDesiredOutcome] = useState('');
    const [clientPosition, setClientPosition] = useState<string>('plaintiff');
    const [opposingArguments, setOpposingArguments] = useState<string[]>([]);
    const [constraints, setConstraints] = useState<string[]>([]);
    const [tone, setTone] = useState<'aggressive' | 'moderate' | 'conservative'>('moderate');
    
    // Output state
    const [outline, setOutline] = useState<ArgumentOutline | null>(null);
    const [expandedArgs, setExpandedArgs] = useState<Set<string>>(new Set());
    const [coherenceAnalysis, setCoherenceAnalysis] = useState<CoherenceAnalysis | null>(null);
    const [showCoherenceReport, setShowCoherenceReport] = useState(false);
    
    // Drafts
    const [drafts, setDrafts] = useState<ArgumentOutline[]>([]);
    const [showDrafts, setShowDrafts] = useState(false);
    
    useEffect(() => {
        setDrafts(getArgumentDrafts());
    }, []);
    
    const steps: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
        { key: 'facts', label: 'Facts', icon: <FileText className="w-4 h-4" /> },
        { key: 'context', label: 'Context', icon: <Target className="w-4 h-4" /> },
        { key: 'generate', label: 'Generate', icon: <Sparkles className="w-4 h-4" /> },
        { key: 'review', label: 'Review', icon: <Scale className="w-4 h-4" /> },
        { key: 'refine', label: 'Refine', icon: <Shield className="w-4 h-4" /> },
    ];
    
    // ============================================
    // Handlers
    // ============================================
    
    const addFact = useCallback(() => {
        setFacts(prev => [...prev, '']);
    }, []);
    
    const updateFact = useCallback((index: number, value: string) => {
        setFacts(prev => prev.map((f, i) => i === index ? value : f));
    }, []);
    
    const removeFact = useCallback((index: number) => {
        setFacts(prev => prev.filter((_, i) => i !== index));
    }, []);
    
    const toggleKeyFact = useCallback((fact: string) => {
        setKeyFacts(prev => 
            prev.includes(fact) 
                ? prev.filter(f => f !== fact)
                : [...prev, fact]
        );
    }, []);
    
    const addPrinciple = useCallback(() => {
        setLegalPrinciples(prev => [...prev, '']);
    }, []);
    
    const updatePrinciple = useCallback((index: number, value: string) => {
        setLegalPrinciples(prev => prev.map((p, i) => i === index ? value : p));
    }, []);
    
    const removePrinciple = useCallback((index: number) => {
        setLegalPrinciples(prev => prev.filter((_, i) => i !== index));
    }, []);
    
    const handleGenerate = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const input: ArgumentGenerationInput = {
                facts: facts.filter(f => f.trim()),
                keyFacts: keyFacts.filter(f => f.trim()),
                legalPrinciples: legalPrinciples.filter(p => p.trim()),
                jurisdiction,
                documentType,
                practiceArea,
                desiredOutcome,
                clientPosition: clientPosition as ArgumentGenerationInput['clientPosition'],
                opposingArguments: opposingArguments.filter(a => a.trim()),
                constraints: constraints.filter(c => c.trim()),
                tone,
            };
            
            const result = await generateArgumentOutline(input);
            setOutline(result.outline);
            setCurrentStep('review');
            
            // Auto-expand first argument
            if (result.outline.arguments.length > 0) {
                setExpandedArgs(new Set([result.outline.arguments[0].id]));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate arguments');
        } finally {
            setLoading(false);
        }
    }, [facts, keyFacts, legalPrinciples, jurisdiction, documentType, practiceArea, desiredOutcome, clientPosition, opposingArguments, constraints, tone]);
    
    const handleAnalyzeCoherence = useCallback(async () => {
        if (!outline) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const analysis = await analyzeCoherence(outline);
            setCoherenceAnalysis(analysis);
            setShowCoherenceReport(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to analyze coherence');
        } finally {
            setLoading(false);
        }
    }, [outline]);
    
    const handleStrengthen = useCallback(async () => {
        if (!outline) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const strengthened = await strengthenArgument(outline);
            setOutline(strengthened);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to strengthen argument');
        } finally {
            setLoading(false);
        }
    }, [outline]);
    
    const handleGenerateCounters = useCallback(async (argIndex: number) => {
        if (!outline) return;
        
        const arg = outline.arguments[argIndex];
        setLoading(true);
        setError(null);
        
        try {
            const counters = await generateCounterArguments(arg.thesis, jurisdiction, documentType);
            
            // Merge new counter-arguments
            const updatedArg = {
                ...arg,
                counterArguments: [...arg.counterArguments, ...counters],
            };
            
            setOutline(updateArgumentInOutline(outline, updatedArg));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate counter-arguments');
        } finally {
            setLoading(false);
        }
    }, [outline, jurisdiction, documentType]);
    
    const handleSaveDraft = useCallback(() => {
        if (!outline) return;
        
        const updated = {
            ...outline,
            updatedAt: new Date().toISOString(),
        };
        saveArgumentDraft(updated);
        setOutline(updated);
        setDrafts(getArgumentDrafts());
    }, [outline]);
    
    const handleLoadDraft = useCallback((draft: ArgumentOutline) => {
        setOutline(draft);
        setShowDrafts(false);
        setCurrentStep('review');
    }, []);
    
    const handleDeleteDraft = useCallback((id: string) => {
        deleteArgumentDraft(id);
        setDrafts(getArgumentDrafts());
    }, []);
    
    const handleInsert = useCallback(() => {
        if (!outline || !onInsertContent) return;
        onInsertContent(outlineToHtml(outline));
        onClose?.();
    }, [outline, onInsertContent, onClose]);
    
    const handleExport = useCallback(() => {
        if (!outline) return;
        
        const json = exportOutlineToJson(outline);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `argument-outline-${outline.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [outline]);
    
    const handleMoveArgument = useCallback((fromIndex: number, direction: 'up' | 'down') => {
        if (!outline) return;
        
        const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= outline.arguments.length) return;
        
        setOutline(reorderArguments(outline, fromIndex, toIndex));
    }, [outline]);
    
    const toggleArgumentExpanded = useCallback((id: string) => {
        setExpandedArgs(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);
    
    const handleDeleteArgument = useCallback((id: string) => {
        if (!outline) return;
        setOutline(removeArgumentFromOutline(outline, id));
    }, [outline]);
    
    // ============================================
    // Render Steps
    // ============================================
    
    const renderFactsStep = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Enter Case Facts</h3>
                <p className="text-sm text-slate-600 mb-4">
                    List the relevant facts of your case. Mark key facts that are most important to your argument.
                </p>
                
                <div className="space-y-3">
                    {facts.map((fact, index) => (
                        <div key={index} className="flex items-start gap-2">
                            <button
                                onClick={() => toggleKeyFact(fact)}
                                className={`mt-2 p-1 rounded ${
                                    keyFacts.includes(fact) ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                                }`}
                                title={keyFacts.includes(fact) ? 'Remove from key facts' : 'Mark as key fact'}
                            >
                                <Target className="w-4 h-4" />
                            </button>
                            <textarea
                                value={fact}
                                onChange={(e) => updateFact(index, e.target.value)}
                                className="input flex-1 min-h-[60px]"
                                placeholder={`Fact ${index + 1}...`}
                            />
                            <button
                                onClick={() => removeFact(index)}
                                className="mt-2 p-1.5 hover:bg-red-100 text-red-500 rounded"
                                disabled={facts.length === 1}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                
                <button
                    onClick={addFact}
                    className="mt-3 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                >
                    <Plus className="w-4 h-4" /> Add Fact
                </button>
            </div>
            
            <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Legal Principles</h3>
                <p className="text-sm text-slate-600 mb-4">
                    List the legal rules, statutes, or precedents that apply to your case.
                </p>
                
                <div className="space-y-3">
                    {legalPrinciples.map((principle, index) => (
                        <div key={index} className="flex items-start gap-2">
                            <Scale className="w-4 h-4 mt-3 text-slate-400" />
                            <textarea
                                value={principle}
                                onChange={(e) => updatePrinciple(index, e.target.value)}
                                className="input flex-1 min-h-[60px]"
                                placeholder={`Legal principle or rule ${index + 1}...`}
                            />
                            <button
                                onClick={() => removePrinciple(index)}
                                className="mt-2 p-1.5 hover:bg-red-100 text-red-500 rounded"
                                disabled={legalPrinciples.length === 1}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                
                <button
                    onClick={addPrinciple}
                    className="mt-3 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                >
                    <Plus className="w-4 h-4" /> Add Principle
                </button>
            </div>
        </div>
    );
    
    const renderContextStep = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Document Type</label>
                    <select
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value)}
                        className="input"
                    >
                        {DOCUMENT_TYPES_FOR_ARGUMENTS.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Jurisdiction</label>
                    <select
                        value={jurisdiction}
                        onChange={(e) => setJurisdiction(e.target.value)}
                        className="input"
                    >
                        {JURISDICTIONS.map(j => (
                            <option key={j} value={j}>{j}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Practice Area</label>
                    <select
                        value={practiceArea}
                        onChange={(e) => setPracticeArea(e.target.value)}
                        className="input"
                    >
                        {PRACTICE_AREAS.map(area => (
                            <option key={area} value={area}>{area}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Client Position</label>
                    <select
                        value={clientPosition}
                        onChange={(e) => setClientPosition(e.target.value)}
                        className="input"
                    >
                        {CLIENT_POSITIONS.map(pos => (
                            <option key={pos.value} value={pos.value}>{pos.label}</option>
                        ))}
                    </select>
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Desired Outcome</label>
                <textarea
                    value={desiredOutcome}
                    onChange={(e) => setDesiredOutcome(e.target.value)}
                    className="input min-h-[80px]"
                    placeholder="Describe the outcome you want to achieve..."
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tone</label>
                <div className="flex gap-4">
                    {(['aggressive', 'moderate', 'conservative'] as const).map(t => (
                        <label key={t} className="flex items-center gap-2">
                            <input
                                type="radio"
                                checked={tone === t}
                                onChange={() => setTone(t)}
                                className="radio"
                            />
                            <span className="capitalize">{t}</span>
                        </label>
                    ))}
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Known Opposing Arguments (Optional)
                </label>
                <textarea
                    value={opposingArguments.join('\n')}
                    onChange={(e) => setOpposingArguments(e.target.value.split('\n'))}
                    className="input min-h-[80px]"
                    placeholder="Enter opposing arguments you want to address, one per line..."
                />
            </div>
        </div>
    );
    
    const renderGenerateStep = () => (
        <div className="text-center py-12">
            {loading ? (
                <div className="space-y-4">
                    <Loader2 className="w-12 h-12 mx-auto text-primary-500 animate-spin" />
                    <p className="text-slate-600">Generating legal arguments...</p>
                    <p className="text-sm text-slate-500">This may take a moment.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <Sparkles className="w-16 h-16 mx-auto text-primary-500" />
                    <div>
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">Ready to Generate</h3>
                        <p className="text-slate-600 max-w-md mx-auto">
                            Review your facts and context, then click generate to create your argument outline.
                        </p>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-4 max-w-md mx-auto text-left">
                        <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Facts:</span>
                                <span className="font-medium">{facts.filter(f => f.trim()).length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Key Facts:</span>
                                <span className="font-medium">{keyFacts.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Legal Principles:</span>
                                <span className="font-medium">{legalPrinciples.filter(p => p.trim()).length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Document Type:</span>
                                <span className="font-medium">{documentType}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Jurisdiction:</span>
                                <span className="font-medium">{jurisdiction}</span>
                            </div>
                        </div>
                    </div>
                    
                    <button
                        onClick={handleGenerate}
                        className="btn btn-primary btn-lg"
                    >
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Arguments
                    </button>
                </div>
            )}
            
            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    {error}
                </div>
            )}
        </div>
    );
    
    const renderReviewStep = () => (
        <div className="space-y-6">
            {outline && (
                <>
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xl font-semibold text-slate-800">{outline.title}</h3>
                            {outline.description && (
                                <p className="text-sm text-slate-600 mt-1">{outline.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${getStrengthColor(outline.overallStrength)}`}>
                                    {outline.overallStrength} overall
                                </span>
                                <span className="text-xs text-slate-500">
                                    Completeness: {Math.round(calculateCompletenessScore(outline) * 100)}%
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleAnalyzeCoherence}
                                disabled={loading}
                                className="btn btn-secondary btn-sm"
                            >
                                <BarChart2 className="w-4 h-4 mr-1" />
                                Analyze
                            </button>
                            <button
                                onClick={handleStrengthen}
                                disabled={loading}
                                className="btn btn-secondary btn-sm"
                            >
                                <Zap className="w-4 h-4 mr-1" />
                                Strengthen
                            </button>
                        </div>
                    </div>
                    
                    {/* Introduction */}
                    {outline.introduction && (
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Introduction</h4>
                            <p className="text-sm text-slate-600">{outline.introduction}</p>
                        </div>
                    )}
                    
                    {/* Arguments */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-700">Arguments ({outline.arguments.length})</h4>
                        {outline.arguments.map((arg, index) => (
                            <ArgumentCard
                                key={arg.id}
                                argument={arg}
                                index={index}
                                onEdit={(a) => {/* TODO: Edit modal */}}
                                onDelete={handleDeleteArgument}
                                onMoveUp={index > 0 ? () => handleMoveArgument(index, 'up') : undefined}
                                onMoveDown={index < outline.arguments.length - 1 ? () => handleMoveArgument(index, 'down') : undefined}
                                expanded={expandedArgs.has(arg.id)}
                                onToggleExpand={() => toggleArgumentExpanded(arg.id)}
                            />
                        ))}
                    </div>
                    
                    {/* Conclusion */}
                    {outline.conclusion && (
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Conclusion</h4>
                            <p className="text-sm text-slate-600">{outline.conclusion}</p>
                        </div>
                    )}
                    
                    {/* Suggestions */}
                    {outline.suggestions && outline.suggestions.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                            <h4 className="text-sm font-semibold text-amber-800 mb-2">AI Suggestions</h4>
                            <ul className="space-y-1">
                                {outline.suggestions.map((s, i) => (
                                    <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                                        <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
            
            {loading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                    <span className="ml-2 text-slate-600">Processing...</span>
                </div>
            )}
            
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    {error}
                </div>
            )}
        </div>
    );
    
    const renderRefineStep = () => (
        <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-2">Your Argument is Ready!</h3>
                <p className="text-sm text-green-700">
                    Review the final outline below, then insert it into your document or export for later use.
                </p>
            </div>
            
            {outline && (
                <div className="bg-white border border-slate-200 rounded-lg p-6 prose prose-sm max-w-none">
                    <h1>{outline.title}</h1>
                    
                    {outline.introduction && (
                        <>
                            <h2>Introduction</h2>
                            <p>{outline.introduction}</p>
                        </>
                    )}
                    
                    {outline.arguments.map((arg, index) => (
                        <div key={arg.id}>
                            <h2>{index + 1}. {arg.title}</h2>
                            <p><strong>Thesis:</strong> {arg.thesis}</p>
                            
                            {arg.supportingPoints.length > 0 && (
                                <>
                                    <h3>Supporting Points</h3>
                                    <ul>
                                        {arg.supportingPoints.map(point => (
                                            <li key={point.id}>
                                                {point.text}
                                                {point.citations?.length > 0 && (
                                                    <em> ({point.citations.join('; ')})</em>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            
                            {arg.counterArguments.length > 0 && (
                                <>
                                    <h3>Anticipated Counter-Arguments</h3>
                                    {arg.counterArguments.map(counter => (
                                        <div key={counter.id}>
                                            <p><strong>Counter:</strong> {counter.text}</p>
                                            {counter.rebuttal && (
                                                <p><strong>Rebuttal:</strong> {counter.rebuttal}</p>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}
                            
                            {arg.conclusion && <p>{arg.conclusion}</p>}
                        </div>
                    ))}
                    
                    {outline.conclusion && (
                        <>
                            <h2>Conclusion</h2>
                            <p>{outline.conclusion}</p>
                        </>
                    )}
                </div>
            )}
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSaveDraft}
                        className="btn btn-secondary btn-sm"
                    >
                        <Save className="w-4 h-4 mr-1" />
                        Save Draft
                    </button>
                    <button
                        onClick={handleExport}
                        className="btn btn-secondary btn-sm"
                    >
                        <Download className="w-4 h-4 mr-1" />
                        Export JSON
                    </button>
                </div>
                
                {onInsertContent && (
                    <button
                        onClick={handleInsert}
                        className="btn btn-primary"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Insert into Document
                    </button>
                )}
            </div>
        </div>
    );
    
    // ============================================
    // Main Render
    // ============================================
    
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800">Argument Builder</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowDrafts(!showDrafts)}
                        className="btn btn-secondary btn-sm"
                    >
                        <FileText className="w-4 h-4 mr-1" />
                        Drafts ({drafts.length})
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
            
            {/* Drafts Panel */}
            {showDrafts && (
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Saved Drafts</h3>
                    {drafts.length === 0 ? (
                        <p className="text-sm text-slate-500">No saved drafts</p>
                    ) : (
                        <div className="space-y-2">
                            {drafts.map(draft => (
                                <div key={draft.id} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{draft.title}</div>
                                        <div className="text-xs text-slate-500">
                                            {draft.arguments.length} arguments
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleLoadDraft(draft)}
                                            className="p-1.5 hover:bg-slate-100 rounded text-primary-600"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteDraft(draft.id)}
                                            className="p-1.5 hover:bg-red-100 rounded text-red-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {/* Step Indicator */}
            <div className="px-4 pt-4">
                <StepIndicator currentStep={currentStep} steps={steps} />
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {currentStep === 'facts' && renderFactsStep()}
                {currentStep === 'context' && renderContextStep()}
                {currentStep === 'generate' && renderGenerateStep()}
                {currentStep === 'review' && renderReviewStep()}
                {currentStep === 'refine' && renderRefineStep()}
            </div>
            
            {/* Navigation */}
            <div className="flex items-center justify-between p-4 border-t border-slate-200">
                <button
                    onClick={() => {
                        const currentIndex = steps.findIndex(s => s.key === currentStep);
                        if (currentIndex > 0) {
                            setCurrentStep(steps[currentIndex - 1].key);
                        }
                    }}
                    disabled={currentStep === 'facts'}
                    className="btn btn-secondary"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                </button>
                
                <button
                    onClick={() => {
                        const currentIndex = steps.findIndex(s => s.key === currentStep);
                        if (currentIndex < steps.length - 1) {
                            if (currentStep === 'context') {
                                setCurrentStep('generate');
                            } else if (currentStep === 'review') {
                                setCurrentStep('refine');
                            } else {
                                setCurrentStep(steps[currentIndex + 1].key);
                            }
                        }
                    }}
                    disabled={currentStep === 'refine' || (currentStep === 'review' && !outline)}
                    className="btn btn-primary"
                >
                    {currentStep === 'review' ? 'Finalize' : 'Next'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                </button>
            </div>
            
            {/* Coherence Report Modal */}
            {showCoherenceReport && coherenceAnalysis && (
                <CoherenceReport
                    analysis={coherenceAnalysis}
                    onClose={() => setShowCoherenceReport(false)}
                />
            )}
        </div>
    );
}

export default ArgumentBuilder;

