/**
 * Demo AI Proxy Client
 *
 * In demo mode, `queries.askAI` and `queries.generateArguments` (see
 * dataClient.ts) normally return canned [DEMO MODE] fixtures. When
 * `VITE_API_URL` (preferred; the server/ API's base URL) or, failing that,
 * the legacy `VITE_DEMO_PROXY_URL` is set, this module routes those calls to
 * `POST {url}/api/generate` for live OpenRouter output instead, mapping its
 * plain-text response back into the exact shapes argumentService.ts and
 * suggestionsSlice.ts already expect.
 *
 * If neither URL is set, or the proxy call fails/times out for any reason
 * (the Render free-tier service spins down when idle and can be slow to
 * wake), this falls back to the canned fixtures so the demo never looks
 * broken.
 */
import { v4 as uuidv4 } from 'uuid';
import {
    DEMO_ARGUMENT_OUTLINE,
    DEMO_COUNTER_ARGUMENTS,
    DEMO_COHERENCE_ANALYSIS,
    DEMO_SUGGESTIONS,
} from './fixtures';
import type { ArgumentOutline, CounterArgument, CoherenceAnalysis } from '../utils/argumentTypes';

/**
 * Raw suggestion shape as consumed by suggestionsSlice.ts's `askAI` parsing
 * (before it fills in the client-side bookkeeping fields like `pinned`).
 */
interface RawSuggestion {
    id: string;
    type: string;
    title: string;
    text: string;
    confidence: number;
    sourceRefs: string[];
}

const WARMING_THRESHOLD_MS = 2500;
const REQUEST_TIMEOUT_MS = 65_000;

// ============================================
// Warm-up status pub/sub
// ============================================

export type ProxyStatus = 'warming' | 'done' | 'error';
type ProxyStatusListener = (status: ProxyStatus) => void;

const statusListeners = new Set<ProxyStatusListener>();

/** Subscribe to proxy warm-up status. Returns an unsubscribe function. */
export function onProxyStatus(listener: ProxyStatusListener): () => void {
    statusListeners.add(listener);
    return () => statusListeners.delete(listener);
}

function emitStatus(status: ProxyStatus): void {
    statusListeners.forEach((listener) => listener(status));
}

// ============================================
// Config
// ============================================

function getProxyUrl(): string {
    // VITE_API_URL is the full server/ API's base URL (same var authClient.ts
    // and dataClient.ts use); prefer it so demo builds pointed at the real
    // server hit /api/generate there. VITE_DEMO_PROXY_URL is the legacy
    // demo-proxy/ URL, kept as a fallback until that service is removed
    // (P3.7). If neither is set, canned-only mode.
    const raw = import.meta.env.VITE_API_URL || import.meta.env.VITE_DEMO_PROXY_URL;
    return raw ? raw.replace(/\/+$/, '') : '';
}

// ============================================
// Low-level proxy call
// ============================================

async function callProxy(kind: 'argument' | 'suggestion', prompt: string): Promise<string> {
    const baseUrl = getProxyUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const warmingId = setTimeout(() => emitStatus('warming'), WARMING_THRESHOLD_MS);

    try {
        const res = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind, prompt }),
            signal: controller.signal,
        });

        if (!res.ok) {
            throw new Error(`demo-proxy responded with status ${res.status}`);
        }

        const data = await res.json();
        if (typeof data?.text !== 'string') {
            throw new Error('demo-proxy returned an unexpected response shape');
        }

        emitStatus('done');
        return data.text;
    } catch (error) {
        emitStatus('error');
        throw error;
    } finally {
        clearTimeout(timeoutId);
        clearTimeout(warmingId);
    }
}

// ============================================
// Prompt builders
// ============================================

function buildArgumentPrompt(args: { mode: string; [key: string]: unknown }): string {
    const { mode, ...rest } = args;
    const details = Object.entries(rest)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
        .join('\n');
    return `Task: ${mode} a legal argument.\n${details}`;
}

function buildSuggestionPrompt(args: { text?: string; context?: unknown }): string {
    const contextStr = args.context ? JSON.stringify(args.context) : '(none)';
    return `Document text:\n${args.text ?? ''}\n\nContext: ${contextStr}`;
}

// ============================================
// generateArguments (kind: 'argument')
// ============================================

interface ArgumentsResult {
    success: boolean;
    outline?: ArgumentOutline;
    counterArguments?: CounterArgument[];
    analysis?: CoherenceAnalysis;
    error?: string;
}

function cannedArgumentsResult(mode: string): ArgumentsResult {
    switch (mode) {
        case 'generate':
        case 'strengthen':
            return { success: true, outline: DEMO_ARGUMENT_OUTLINE as unknown as ArgumentOutline };
        case 'counter':
            return { success: true, counterArguments: DEMO_COUNTER_ARGUMENTS as unknown as CounterArgument[] };
        case 'analyze':
            return { success: true, analysis: DEMO_COHERENCE_ANALYSIS as unknown as CoherenceAnalysis };
        default:
            return { success: false, error: 'Unknown mode' };
    }
}

function mapArgumentResponse(mode: string, text: string): ArgumentsResult {
    const now = new Date().toISOString();

    switch (mode) {
        case 'generate':
        case 'strengthen':
            return {
                success: true,
                outline: {
                    ...DEMO_ARGUMENT_OUTLINE,
                    id: uuidv4(),
                    title: 'AI-Generated Argument Outline',
                    description: 'Live AI-generated output from the demo proxy.',
                    introduction: text,
                    arguments: [
                        {
                            id: uuidv4(),
                            type: 'factual' as const,
                            title: 'Argument',
                            thesis: text,
                            supportingPoints: [],
                            counterArguments: [],
                            conclusion: '',
                            strength: 'moderate' as const,
                            confidenceScore: 0.75,
                            citations: [],
                            order: 0,
                        },
                    ],
                    conclusion: '',
                    createdAt: now,
                    updatedAt: now,
                    suggestions: [],
                } as unknown as ArgumentOutline,
            };
        case 'counter':
            return {
                success: true,
                counterArguments: [
                    {
                        id: uuidv4(),
                        text,
                        strength: 'moderate' as const,
                        rebuttal: '',
                        rebuttalStrength: 'moderate' as const,
                    },
                ],
            };
        case 'analyze':
            return {
                success: true,
                analysis: {
                    ...DEMO_COHERENCE_ANALYSIS,
                    issues: [] as CoherenceAnalysis['issues'],
                    suggestions: [text],
                },
            };
        default:
            return { success: false, error: 'Unknown mode' };
    }
}

export async function generateArgumentsResult(args: { mode: string; [key: string]: unknown }): Promise<ArgumentsResult> {
    const baseUrl = getProxyUrl();
    if (!baseUrl) {
        return cannedArgumentsResult(args.mode);
    }

    try {
        const text = await callProxy('argument', buildArgumentPrompt(args));
        return mapArgumentResponse(args.mode, text);
    } catch (error) {
        console.warn('[demo] proxy argument generation failed, falling back to canned response', error);
        return cannedArgumentsResult(args.mode);
    }
}

// ============================================
// askAI (kind: 'suggestion')
// ============================================

interface SuggestionsResult {
    suggestions: RawSuggestion[];
    relevantClauses: never[];
}

function cannedSuggestionsResult(): SuggestionsResult {
    return { suggestions: DEMO_SUGGESTIONS, relevantClauses: [] };
}

function mapSuggestionResponse(text: string): SuggestionsResult {
    return {
        suggestions: [
            {
                id: uuidv4(),
                type: 'structured',
                title: 'AI Suggestion',
                text,
                confidence: 0.8,
                sourceRefs: [],
            },
        ],
        relevantClauses: [],
    };
}

export async function getSuggestionsResult(args: { text?: string; context?: unknown }): Promise<SuggestionsResult> {
    const baseUrl = getProxyUrl();
    if (!baseUrl) {
        return cannedSuggestionsResult();
    }

    try {
        const text = await callProxy('suggestion', buildSuggestionPrompt(args));
        return mapSuggestionResponse(text);
    } catch (error) {
        console.warn('[demo] proxy suggestion generation failed, falling back to canned response', error);
        return cannedSuggestionsResult();
    }
}
