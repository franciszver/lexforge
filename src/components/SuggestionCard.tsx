import React from 'react';
import type { Suggestion } from '../types';
import { X, Check } from 'lucide-react';
import classNames from 'classnames';

interface SuggestionCardProps {
    suggestion: Suggestion;
    onAccept: (id: string) => void;
    onDismiss: (id: string) => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onAccept, onDismiss }) => {
    return (
        <div className="p-4 rounded-lg bg-[var(--bg-surface-hover)] border border-[var(--border-strong)] animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex items-center gap-2 mb-2">
                <span className={classNames("w-2 h-2 rounded-full", {
                    "bg-[var(--status-warning)]": suggestion.type === 'tone',
                    "bg-[var(--status-success)]": suggestion.type === 'source',
                    "bg-[var(--status-error)]": suggestion.type === 'risk',
                    "bg-[var(--primary-brand)]": suggestion.type === 'precision',
                })}></span>
                <span className={classNames("text-xs font-bold uppercase", {
                    "text-[var(--status-warning)]": suggestion.type === 'tone',
                    "text-[var(--status-success)]": suggestion.type === 'source',
                    "text-[var(--status-error)]": suggestion.type === 'risk',
                    "text-[var(--primary-brand)]": suggestion.type === 'precision',
                })}>
                    {suggestion.type} Check
                </span>
                <span className="ml-auto text-xs text-[var(--text-tertiary)]">{Math.round(suggestion.confidence * 100)}% Match</span>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-3">{suggestion.text}</p>

            {suggestion.replacementText && (
                <div className="p-2 mb-3 bg-[var(--bg-app)] rounded text-xs text-[var(--text-primary)] border border-[var(--border-subtle)] font-mono">
                    {suggestion.replacementText}
                </div>
            )}

            {suggestion.source && (
                <a href={suggestion.source} target="_blank" rel="noopener noreferrer" className="block mb-3 text-xs text-[var(--primary-brand)] hover:underline truncate">
                    Source: {new URL(suggestion.source).hostname}
                </a>
            )}

            <div className="flex gap-2 mt-2">
                <button
                    onClick={() => onAccept(suggestion.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-[var(--primary-brand)] text-white text-xs font-medium hover:bg-[var(--primary-brand-hover)] transition-colors"
                >
                    <Check size={14} /> Accept
                </button>
                <button
                    onClick={() => onDismiss(suggestion.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-secondary)] text-xs font-medium hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <X size={14} /> Dismiss
                </button>
            </div>
        </div>
    );
};
