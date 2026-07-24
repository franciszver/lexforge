import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  ALLOWED_KINDS,
  ALLOWED_MODELS,
  DEFAULT_MODEL,
  MAX_PROMPT_LENGTH,
  OPENROUTER_URL,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  UPSTREAM_TIMEOUT_MS,
} from '../aiConfig.js';

// Ported from demo-proxy/server.js (P3.5): the demo static site calls this
// endpoint directly (no logged-in user, no JWT) to power its live AI demo.
// It is intentionally the only unauthenticated non-health route on this
// server — abuse is bounded instead by an Origin check, a per-IP rate
// limit, and a global daily cap (all below), matching demo-proxy exactly.

const SYSTEM_PROMPTS = {
  argument: [
    'You are a legal drafting assistant helping generate a persuasive argument for a demand letter.',
    'Write clear, professional legal argument text based on the user prompt.',
    'Do not include any disclaimers about not being a lawyer; just produce the requested text.',
  ].join(' '),
  suggestion: [
    'You are a legal drafting assistant suggesting contract clause or text improvements.',
    'Respond with the suggested clause or text based on the user prompt, without extra commentary.',
  ].join(' '),
};

function validateGenerateBody(body) {
  const { kind, prompt, model } = body ?? {};

  if (!kind || !ALLOWED_KINDS.includes(kind)) {
    return `kind is required and must be one of: ${ALLOWED_KINDS.join(', ')}`;
  }
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return 'prompt is required and must be a non-empty string';
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return `prompt must be at most ${MAX_PROMPT_LENGTH} characters`;
  }
  if (model !== undefined && !ALLOWED_MODELS.includes(model)) {
    return 'model is not on the allowlist of supported free models';
  }
  return null;
}

export function createGenerateRouter() {
  const router = Router();

  // CORS only restrains browsers; non-browser bots hit the endpoint directly.
  // Require the exact demo-site Origin header server-side. Trivially spoofable
  // by a targeted attacker, but stops drive-by scanners cold.
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
  const requireOrigin = (req, res, next) => {
    if (req.get('origin') !== allowedOrigin) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    next();
  };

  // Global daily cap so a distributed bot can't drain the free-tier AI quota;
  // the frontend falls back to canned demo responses beyond it. In-memory is
  // fine: a restart resetting the counter only ever errs toward availability.
  const dailyCap = Number(process.env.DAILY_CAP) || 300;
  let capDay = new Date().toISOString().slice(0, 10);
  let capCount = 0;
  const dailyCapGuard = (req, res, next) => {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== capDay) {
      capDay = today;
      capCount = 0;
    }
    if (capCount >= dailyCap) {
      res.status(429).json({ error: 'Daily demo AI limit reached, please try again tomorrow.' });
      return;
    }
    capCount += 1;
    next();
  };

  const generateLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ error: 'Too many requests, please try again later.' });
    },
  });

  router.post('/', requireOrigin, generateLimiter, dailyCapGuard, async (req, res) => {
    const validationError = validateGenerateBody(req.body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const { kind, prompt } = req.body;
    const requestedModel = req.body.model || DEFAULT_MODEL;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      res.status(502).json({ error: 'Upstream is not configured.' });
      return;
    }

    // Try the requested/default model first, then fail over through the rest
    // of the allowlist — free-tier endpoints get saturated per-model, so a
    // 429/5xx on one model often succeeds on another.
    const candidates = [requestedModel, ...ALLOWED_MODELS.filter((m) => m !== requestedModel)];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    let lastUpstreamStatus = null;

    try {
      for (const model of candidates) {
        const upstreamRes = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPTS[kind] },
              { role: 'user', content: prompt },
            ],
          }),
          signal: controller.signal,
        });

        if (!upstreamRes.ok) {
          lastUpstreamStatus = upstreamRes.status;
          continue;
        }

        const data = await upstreamRes.json();
        const text = data?.choices?.[0]?.message?.content;

        if (typeof text !== 'string') {
          lastUpstreamStatus = 200;
          continue;
        }

        res.status(200).json({ text, model: data?.model || model });
        return;
      }

      res.status(502).json({
        error: 'Upstream AI service returned an error.',
        upstreamStatus: lastUpstreamStatus,
      });
    } catch (err) {
      if (err?.name === 'AbortError') {
        res.status(504).json({ error: 'Upstream AI service timed out.' });
        return;
      }
      res.status(502).json({ error: 'Failed to reach upstream AI service.' });
    } finally {
      clearTimeout(timeout);
    }
  });

  return router;
}
