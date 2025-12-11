import React from 'react';
import type { Suggestion } from '../types';

interface SuggestionCardProps {
    suggestion: Suggestion;
    onAccept: (id: string) => void;
    onDismiss: (id: string) => void;
}

/**
 * Suggestion Card Component
 * Displays AI suggestions in the editor sidebar.
 * Styled to match DraftWise theming.
 */
export const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onAccept, onDismiss }) => {
    const getTypeStyles = () => {
        switch (suggestion.type) {
            case 'tone': 
                return { 
                    badge: 'bg-warning-50 text-warning-600', 
                    card: 'bg-warning-50 border-warning-500/20' 
                };
            case 'source': 
                return { 
                    badge: 'bg-success-50 text-success-600', 
                    card: 'bg-success-50 border-success-500/20' 
                };
            case 'risk': 
                return { 
                    badge: 'bg-danger-50 text-danger-600', 
                    card: 'bg-danger-50 border-danger-500/20' 
                };
            default: 
                return { 
                    badge: 'bg-primary-100 text-primary-800', 
                    card: 'bg-primary-50 border-primary-500/20' 
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <div className={`p-4 rounded-xl border animate-fade-in ${styles.card}`}>
            <div className="flex items-center gap-2 mb-2">
                <span className={`badge ${styles.badge}`}>
                    {suggestion.type}
                </span>
                <span className="ml-auto text-xs text-slate-500">
                    {Math.round(suggestion.confidence * 100)}% confidence
                </span>
            </div>

            <p className="text-sm text-slate-900 mb-3">{suggestion.text}</p>

            {suggestion.replacementText && (
                <div className="p-3 mb-3 bg-white rounded-lg text-sm text-slate-700 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1 font-medium">Suggested replacement:</p>
                    {suggestion.replacementText}
                </div>
            )}

            {suggestion.source && (
                <a 
                    href={typeof suggestion.source === 'string' && suggestion.source.startsWith('http') ? suggestion.source : '#'}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block mb-3 text-xs text-primary-600 hover:underline truncate"
                >
                    <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {typeof suggestion.source === 'string' && suggestion.source.startsWith('http') 
                        ? new URL(suggestion.source).hostname 
                        : suggestion.source
                    }
                </a>
            )}

            <div className="flex gap-2 mt-3">
                <button
                    onClick={() => onAccept(suggestion.id)}
                    className="btn-primary btn-sm flex-1"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Accept
                </button>
                <button
                    onClick={() => onDismiss(suggestion.id)}
                    className="btn-secondary btn-sm flex-1"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Dismiss
                </button>
            </div>
        </div>
    );
};
