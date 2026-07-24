// Hardcoded allowlist of OpenRouter FREE models only (ids ending ":free").
// Requests may optionally pass a model, but it must be one of these.
// Ported verbatim from demo-proxy/config.js (see P3.5 / P3.7).
export const DEFAULT_MODEL = 'google/gemma-4-31b-it:free';

export const ALLOWED_MODELS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'openai/gpt-oss-20b:free',
  'google/gemma-4-26b-a4b-it:free',
];

export const ALLOWED_KINDS = ['argument', 'suggestion'];

export const MAX_PROMPT_LENGTH = 8000;

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const UPSTREAM_TIMEOUT_MS = 55000;

export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const RATE_LIMIT_MAX = 10;
