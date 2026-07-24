import express from 'express';
import cors from 'cors';

const JSON_BODY_LIMIT = '1mb';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.get('/healthz', (req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
  });

  return app;
}
