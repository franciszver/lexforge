import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('server app', () => {
  it('GET /healthz returns 200 { ok: true }', async () => {
    const app = createApp();
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 404 JSON for an unknown route', async () => {
    const app = createApp();
    const res = await request(app).get('/no-such-route');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 JSON for a malformed JSON body (not an HTML error page)', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/healthz')
      .set('Content-Type', 'application/json')
      .send('{not valid json');
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('error');
  });
});
