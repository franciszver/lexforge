import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { pathToFileURL } from 'node:url';
import {
  ALLOWED_KINDS,
  ALLOWED_MODELS,
  DEFAULT_MODEL,
  JSON_BODY_LIMIT,
  MAX_PROMPT_LENGTH,
  OPENROUTER_URL,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  UPSTREAM_TIMEOUT_MS,
} from './config.js';

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

export function createApp() {
  const app = express();

  // Render (and most PaaS) sit behind a reverse proxy; trust the first hop
  // so express-rate-limit sees the real client IP via X-Forwarded-For.
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
    })
  );
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.get('/healthz', (req, res) => {
    res.status(200).json({ ok: true });
  });

  const generateLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ error: 'Too many requests, please try again later.' });
    },
  });

  app.post('/api/generate', generateLimiter, async (req, res) => {
    const validationError = validateGenerateBody(req.body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const { kind, prompt } = req.body;
    const model = req.body.model || DEFAULT_MODEL;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      res.status(502).json({ error: 'Upstream is not configured.' });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
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
        res.status(502).json({
          error: 'Upstream AI service returned an error.',
          upstreamStatus: upstreamRes.status,
        });
        return;
      }

      const data = await upstreamRes.json();
      const text = data?.choices?.[0]?.message?.content;

      if (typeof text !== 'string') {
        res.status(502).json({ error: 'Upstream AI service returned an unexpected response.' });
        return;
      }

      res.status(200).json({ text, model: data?.model || model });
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

  return app;
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const app = createApp();
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`demo-proxy listening on port ${port}`);
  });
}
