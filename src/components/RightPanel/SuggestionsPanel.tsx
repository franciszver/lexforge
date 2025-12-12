import { useCallback, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  generateSuggestions,
  setSignals,
  setApproverPov,
  setSuggestionCount,
  togglePin,
  setFeedback,
  archiveSuggestion,
  unarchiveSuggestion,
  toggleCollapse,
  collapseAll,
  expandAll,
  type ApproverPOV,
  type FeedbackType,
} from '../../features/suggestionsSlice';
import { setPendingInsertion } from '../../features/uiSlice';
import { formatDistanceToNow } from 'date-fns';
import { 
  RefreshCw, 
  Lightbulb, 
  ChevronRight, 
  ChevronDown, 
  Bookmark, 
  Archive, 
  RotateCcw,
  ExternalLink,
  Info,
  Minimize2,
  Maximize2,
  Plus,
  Check,
  ThumbsUp,
  ThumbsDown,
  BookOpen
} from 'lucide-react';

const suggestionCountOptions = [3, 5, 8, 10, 15];

const povOptions: { value: ApproverPOV; label: string }[] = [
  { value: null, label: 'All Perspectives' },
  { value: 'operational_risk', label: 'Operational Risk' },
  { value: 'regulatory_compliance', label: 'Regulatory Compliance' },
  { value: 'financial_impact', label: 'Financial Impact' },
  { value: 'safety_workforce', label: 'Safety & Workforce' },
  { value: 'environmental_impact', label: 'Environmental Impact' },
  { value: 'legal_contractual', label: 'Legal / Contractual' },
];

const signalTooltips = {
  formality: {
    title: 'Formality',
    description: 'Controls the language style and precision of suggestions',
    options: {
      casual: 'Conversational language for internal memos',
      moderate: 'Standard business language for policies',
      formal: 'Precise, structured language for court filings',
    },
  },
  risk: {
    title: 'Risk Tolerance',
    description: 'Controls how conservative or aggressive suggestions are',
    options: {
      conservative: 'Stricter interpretations, more safeguards',
      moderate: 'Balanced approach between strict and flexible',
      aggressive: 'Minimum compliance thresholds, efficiency-focused',
    },
  },
  stickiness: {
    title: 'Stickiness',
    description: 'Controls suggestion persistence for critical issues',
    options: {
      low: 'Gentle reminders, easily dismissed',
      medium: 'Important suggestions may reappear',
      high: 'Critical gaps are persistent until addressed',
    },
  },
};

export function SuggestionsPanel() {
  const dispatch = useAppDispatch();
  const { 
    suggestions, 
    archivedSuggestions, 
    collapsedIds,
    signals, 
    approverPov, 
    suggestionCount, 
    isGenerating, 
    lastGeneratedAt 
  } = useAppSelector((state) => state.suggestions);
  const { currentDocument } = useAppSelector((state) => state.document);
  const [showArchived, setShowArchived] = useState(false);

  const handleGenerate = useCallback(() => {
    if (currentDocument) {
      dispatch(generateSuggestions({
        documentId: currentDocument.id,
        content: currentDocument.content,
        appendMode: false,
        context: {
          jurisdiction: currentDocument.jurisdiction,
          docType: currentDocument.docType,
          practiceArea: currentDocument.practiceArea,
        },
      }));
    }
  }, [dispatch, currentDocument]);

  const handleGenerateMore = useCallback(() => {
    if (currentDocument) {
      dispatch(generateSuggestions({
        documentId: currentDocument.id,
        content: currentDocument.content,
        appendMode: true,
        context: {
          jurisdiction: currentDocument.jurisdiction,
          docType: currentDocument.docType,
          practiceArea: currentDocument.practiceArea,
        },
      }));
    }
  }, [dispatch, currentDocument]);

  // Sort suggestions: pinned first, then by date
  const sortedSuggestions = useMemo(() => {
    return [...suggestions]
      .filter(s => !s.superseded || s.pinned)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [suggestions]);

  // Check if suggestions are stale (older than 10 minutes)
  const isStale = useMemo(() => {
    if (!lastGeneratedAt) return false;
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    return new Date(lastGeneratedAt).getTime() < tenMinutesAgo;
  }, [lastGeneratedAt]);

  if (!currentDocument) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">
            Open a document to get AI-powered suggestions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Signal controls */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <SignalControl
            label="Formality"
            tooltip={signalTooltips.formality}
            value={signals.formality}
            options={['casual', 'moderate', 'formal']}
            onChange={(v) => dispatch(setSignals({ formality: v as typeof signals.formality }))}
          />
          <SignalControl
            label="Risk"
            tooltip={signalTooltips.risk}
            value={signals.riskAppetite}
            options={['conservative', 'moderate', 'aggressive']}
            onChange={(v) => dispatch(setSignals({ riskAppetite: v as typeof signals.riskAppetite }))}
          />
          <SignalControl
            label="Stickiness"
            tooltip={signalTooltips.stickiness}
            value={signals.stickiness}
            options={['low', 'medium', 'high']}
            onChange={(v) => dispatch(setSignals({ stickiness: v as typeof signals.stickiness }))}
            tooltipAlign="right"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={approverPov || ''}
            onChange={(e) => dispatch(setApproverPov((e.target.value || null) as ApproverPOV))}
            className="input text-sm flex-1"
          >
            {povOptions.map((opt) => (
              <option key={opt.value || 'null'} value={opt.value || ''}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={suggestionCount}
            onChange={(e) => dispatch(setSuggestionCount(parseInt(e.target.value)))}
            className="input text-sm w-16"
            title="Number of suggestions"
          >
            {suggestionCountOptions.map((count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-primary btn-sm"
            title="Generate Suggestions"
          >
            {isGenerating ? (
              <span className="spinner w-4 h-4" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Generation status */}
      {isGenerating && (
        <div className="px-4 py-3 bg-primary-50 border-b border-primary-100 flex items-center gap-2">
          <span className="spinner w-4 h-4 text-primary-600" />
          <span className="text-sm text-primary-700">Generating suggestions...</span>
        </div>
      )}

      {isStale && !isGenerating && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <span className="text-xs text-amber-700">Suggestions may be stale</span>
          <button onClick={handleGenerate} className="text-xs text-amber-700 font-medium hover:underline">
            Refresh
          </button>
        </div>
      )}

      {/* Controls bar */}
      {(sortedSuggestions.length > 0 || archivedSuggestions.length > 0) && (
        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {showArchived
                ? `${archivedSuggestions.length} archived`
                : `${sortedSuggestions.length} suggestion${sortedSuggestions.length !== 1 ? 's' : ''}`}
            </span>
            {archivedSuggestions.length > 0 && (
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`text-xs ${showArchived ? 'text-primary-600 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {showArchived ? 'Show Active' : `View Archived (${archivedSuggestions.length})`}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!showArchived && sortedSuggestions.length > 0 && (
              <>
                <button
                  onClick={handleGenerateMore}
                  disabled={isGenerating}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  title="Generate More"
                >
                  <Plus className="w-3 h-3" /> More
                </button>
                <div className="w-px h-4 bg-slate-200" />
                <button
                  onClick={() => dispatch(collapseAll())}
                  className="text-slate-400 hover:text-slate-600"
                  title="Collapse All"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => dispatch(expandAll())}
                  className="text-slate-400 hover:text-slate-600"
                  title="Expand All"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Suggestions list */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {!showArchived && sortedSuggestions.length === 0 && !isGenerating && (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm mb-4">No suggestions yet</p>
            <button onClick={handleGenerate} className="btn-primary">
              Generate Suggestions
            </button>
          </div>
        )}

        {showArchived && archivedSuggestions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">No archived suggestions</p>
          </div>
        )}

        {showArchived
          ? archivedSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                isCollapsed={false}
                isArchived={true}
                onPin={() => {}}
                onToggleCollapse={() => {}}
                onArchive={() => dispatch(unarchiveSuggestion(suggestion.id))}
              />
            ))
          : sortedSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                isCollapsed={collapsedIds.includes(suggestion.id)}
                isArchived={false}
                onPin={() => dispatch(togglePin(suggestion.id))}
                onToggleCollapse={() => dispatch(toggleCollapse(suggestion.id))}
                onArchive={() => dispatch(archiveSuggestion(suggestion.id))}
                onAccept={(suggestion.replacementText || suggestion.clauseContent) ? () => {
                  // Use clauseContent for clause suggestions, replacementText for others
                  const textToInsert = suggestion.clauseContent || suggestion.replacementText;
                  if (textToInsert) {
                    dispatch(setPendingInsertion({
                      text: textToInsert,
                      suggestionId: suggestion.id,
                    }));
                    dispatch(archiveSuggestion(suggestion.id));
                  }
                } : undefined}
                onFeedback={(feedback) => dispatch(setFeedback({ id: suggestion.id, feedback }))}
              />
            ))}
      </div>
    </div>
  );
}

interface SignalControlProps {
  label: string;
  tooltip: { title: string; description: string; options: Record<string, string> };
  value: string;
  options: string[];
  onChange: (value: string) => void;
  tooltipAlign?: 'left' | 'right';
}

function SignalControl({ label, tooltip, value, options, onChange, tooltipAlign = 'left' }: SignalControlProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <div className="flex items-center gap-1 mb-1">
        <label className="text-xs text-slate-500">{label}</label>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      {showTooltip && (
        <div className={`absolute z-50 top-full mt-1 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg ${tooltipAlign === 'right' ? 'right-0' : 'left-0'}`}>
          <p className="font-medium mb-1">{tooltip.title}</p>
          <p className="text-slate-300 mb-2">{tooltip.description}</p>
          <div className="space-y-1">
            {Object.entries(tooltip.options).map(([key, desc]) => (
              <div key={key} className="flex gap-2">
                <span className="font-medium capitalize text-primary-300">{key}:</span>
                <span className="text-slate-300">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: {
    id: string;
    type: string;
    title: string;
    text: string;
    replacementText?: string;
    confidence: number;
    sourceRefs: string[];
    createdAt: string;
    pinned: boolean;
    feedback?: FeedbackType;
    // Clause-specific fields
    clauseId?: string;
    clauseContent?: string;
    clauseCategory?: string;
  };
  isCollapsed: boolean;
  isArchived: boolean;
  onPin: () => void;
  onToggleCollapse: () => void;
  onArchive: () => void;
  onAccept?: () => void;
  onFeedback?: (feedback: FeedbackType) => void;
}

function SuggestionCard({ suggestion, isCollapsed, isArchived, onPin, onToggleCollapse, onArchive, onAccept, onFeedback }: SuggestionCardProps) {
  const timeAgo = formatDistanceToNow(new Date(suggestion.createdAt), { addSuffix: true });

  const getSeverityBadge = () => {
    if (suggestion.confidence < 0.6) return { label: 'High', class: 'bg-red-100 text-red-700' };
    if (suggestion.confidence < 0.8) return { label: 'Medium', class: 'bg-amber-100 text-amber-700' };
    return { label: 'Low', class: 'bg-green-100 text-green-700' };
  };

  const severity = getSeverityBadge();

  if (isCollapsed) {
    return (
      <div
        className={`card p-3 transition-all cursor-pointer hover:bg-slate-50 ${
          suggestion.pinned ? 'ring-2 ring-primary-500 bg-primary-50/30' : ''
        }`}
        onClick={onToggleCollapse}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <h4 className="font-medium text-slate-900 truncate text-sm">{suggestion.title}</h4>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full ${severity.class}`}>
              {severity.label}
            </span>
            {suggestion.pinned && (
              <Bookmark className="w-4 h-4 text-primary-600 fill-primary-600" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card p-4 transition-all ${
        suggestion.pinned ? 'ring-2 ring-primary-500 bg-primary-50/30' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onToggleCollapse}
            className="p-0.5 rounded hover:bg-slate-100 text-slate-400"
            title="Collapse"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <span className={`badge ${
            suggestion.type === 'clause' 
              ? 'bg-amber-100 text-amber-700' 
              : suggestion.type === 'structured' 
                ? 'badge-primary' 
                : 'badge-slate'
          }`}>
            {suggestion.type === 'clause' ? '📚 clause' : suggestion.type}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${severity.class}`}>
            {severity.label}
          </span>
          <span className="text-xs text-slate-400">{timeAgo}</span>
        </div>
        <div className="flex items-center gap-1">
          {!isArchived && (
            <button
              onClick={onPin}
              className={`p-1 rounded hover:bg-slate-100 ${suggestion.pinned ? 'text-primary-600' : 'text-slate-400'}`}
              title={suggestion.pinned ? 'Unpin' : 'Pin'}
            >
              <Bookmark className={`w-4 h-4 ${suggestion.pinned ? 'fill-primary-600' : ''}`} />
            </button>
          )}
          <button
            onClick={onArchive}
            className="p-1 rounded hover:bg-slate-100 text-slate-400"
            title={isArchived ? 'Restore' : 'Archive'}
          >
            {isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className="font-medium text-slate-900 mb-2">{suggestion.title}</h4>

      {/* Content */}
      <p className="text-sm text-slate-600 whitespace-pre-wrap">{suggestion.text}</p>

      {/* Replacement text with Accept button */}
      {suggestion.replacementText && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-green-700">Suggested Replacement:</p>
            {onAccept && !isArchived && (
              <button
                onClick={onAccept}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                <Check className="w-3 h-3" />
                Accept
              </button>
            )}
          </div>
          <p className="text-sm text-green-800">{suggestion.replacementText}</p>
        </div>
      )}

      {/* Clause content with Insert button */}
      {suggestion.type === 'clause' && suggestion.clauseContent && (
        <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <p className="text-xs font-medium text-amber-700">
                {suggestion.clauseCategory || 'Clause'} Library
              </p>
            </div>
            {onAccept && !isArchived && (
              <button
                onClick={onAccept}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                Insert
              </button>
            )}
          </div>
          <div 
            className="text-sm text-amber-800 prose prose-sm max-w-none line-clamp-4"
            dangerouslySetInnerHTML={{ __html: suggestion.clauseContent }}
          />
        </div>
      )}

      {/* Sources */}
      {suggestion.sourceRefs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-600 mb-2">
            Reference Sources ({suggestion.sourceRefs.length})
          </p>
          <div className="space-y-1.5">
            {suggestion.sourceRefs.map((ref, i) => {
              let hostname = ref;
              try {
                const url = new URL(ref);
                hostname = url.hostname.replace('www.', '');
              } catch {
                // Invalid URL
              }
              return (
                <a
                  key={i}
                  href={ref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-md bg-slate-50 hover:bg-primary-50 border border-slate-100 hover:border-primary-200 transition-colors group"
                >
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-primary-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-slate-700 group-hover:text-primary-700 truncate">
                    {hostname}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Confidence bar and feedback */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                suggestion.confidence > 0.8
                  ? 'bg-green-500'
                  : suggestion.confidence > 0.6
                    ? 'bg-amber-500'
                    : 'bg-slate-400'
              }`}
              style={{ width: `${suggestion.confidence * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {Math.round(suggestion.confidence * 100)}%
          </span>
        </div>
        
        {/* Feedback buttons */}
        {onFeedback && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => onFeedback(suggestion.feedback === 'up' ? null : 'up')}
              className={`p-1 rounded transition-colors ${
                suggestion.feedback === 'up'
                  ? 'text-green-600 bg-green-100'
                  : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
              }`}
              title="Helpful"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onFeedback(suggestion.feedback === 'down' ? null : 'down')}
              className={`p-1 rounded transition-colors ${
                suggestion.feedback === 'down'
                  ? 'text-red-600 bg-red-100'
                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
              }`}
              title="Not helpful"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

