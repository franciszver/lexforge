import express from 'express';
import cors from 'cors';
import { createAuthRouter } from './auth/routes.js';
import { createDataRouter } from './routes/index.js';

const JSON_BODY_LIMIT = '1mb';

export function createApp({ prisma, authRateLimitMax } = {}) {
  const app = express();

  // Render (and most PaaS) sit behind a reverse proxy; trust the first hop
  // so express-rate-limit sees the real client IP via X-Forwarded-For.
  app.set('trust proxy', 1);

  app.use(cors());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.get('/healthz', (req, res) => {
    res.status(200).json({ ok: true });
  });

  if (prisma) {
    app.use('/auth', createAuthRouter({ prisma, rateLimitMax: authRateLimitMax }));
    app.use(createDataRouter({ prisma }));
  }

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    // Client errors may carry their message; 5xx must never leak internals.
    const message = status < 500 ? err.message || 'Bad request' : 'Internal server error';
    res.status(status).json({ error: message });
  });

  return app;
}
