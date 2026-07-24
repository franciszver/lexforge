// Hardcoded allowlist of OpenRouter FREE models only (ids ending ":free").
// Requests may optionally pass a model, but it must be one of these.
export const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

export const ALLOWED_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-2-9b-it:free',
  'qwen/qwen-2.5-72b-instruct:free',
];

export const ALLOWED_KINDS = ['argument', 'suggestion'];

export const MAX_PROMPT_LENGTH = 8000;

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const UPSTREAM_TIMEOUT_MS = 55000;

export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const RATE_LIMIT_MAX = 10;

export const JSON_BODY_LIMIT = '50kb';
