import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from './server.js';
import { DEFAULT_MODEL, ALLOWED_MODELS } from './config.js';

const FAKE_KEY = 'sk-or-v1-super-secret-fake-key-do-not-leak';

function okUpstreamResponse(text = 'Generated legal text.', model = DEFAULT_MODEL) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: text } }],
      model,
    }),
  };
}

describe('demo-proxy server', () => {
  let app;
  let fetchMock;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = FAKE_KEY;
    process.env.ALLOWED_ORIGIN = 'http://localhost:5173';
    process.env.DAILY_CAP = '5';
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    app = createApp();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENROUTER_API_KEY;
  });

  it('GET /healthz returns 200 { ok: true } and is not rate limited', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('rejects a non-allowlisted model with 400', async () => {
    const res = await request(app)
      .post('/api/generate').set('Origin', 'http://localhost:5173')
      .send({ kind: 'argument', prompt: 'Draft an argument.', model: 'openai/gpt-4o' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects missing kind with 400', async () => {
    const res = await request(app).post('/api/generate').set('Origin', 'http://localhost:5173').send({ prompt: 'hello' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects invalid kind enum with 400', async () => {
    const res = await request(app)
      .post('/api/generate').set('Origin', 'http://localhost:5173')
      .send({ kind: 'not-a-real-kind', prompt: 'hello' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects missing/empty prompt with 400', async () => {
    const res = await request(app).post('/api/generate').set('Origin', 'http://localhost:5173').send({ kind: 'argument', prompt: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects prompt over max length with 400', async () => {
    const res = await request(app)
      .post('/api/generate').set('Origin', 'http://localhost:5173')
      .send({ kind: 'argument', prompt: 'a'.repeat(8001) });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns { text, model } on success and never leaks the API key', async () => {
    fetchMock.mockResolvedValueOnce(okUpstreamResponse('Here is your argument.', DEFAULT_MODEL));

    const res = await request(app)
      .post('/api/generate').set('Origin', 'http://localhost:5173')
      .send({ kind: 'argument', prompt: 'Draft an argument about breach of contract.' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: 'Here is your argument.', model: DEFAULT_MODEL });
    expect(JSON.stringify(res.body)).not.toContain(FAKE_KEY);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(opts.headers.Authorization).toBe(`Bearer ${FAKE_KEY}`);
    const sentBody = JSON.parse(opts.body);
    expect(sentBody.model).toBe(DEFAULT_MODEL);
  });

  it('accepts an allowlisted non-default model', async () => {
    const chosen = ALLOWED_MODELS.find((m) => m !== DEFAULT_MODEL);
    fetchMock.mockResolvedValueOnce(okUpstreamResponse('Suggested clause text.', chosen));

    const res = await request(app)
      .post('/api/generate').set('Origin', 'http://localhost:5173')
      .send({ kind: 'suggestion', prompt: 'Suggest a clause.', model: chosen });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: 'Suggested clause text.', model: chosen });
  });

  it('returns 502 JSON error when upstream responds with an error status', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'upstream broke' }),
    });

    const res = await request(app)
      .post('/api/generate').set('Origin', 'http://localhost:5173')
      .send({ kind: 'argument', prompt: 'Draft an argument.' });

    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty('error');
    expect(JSON.stringify(res.body)).not.toContain(FAKE_KEY);
  });

  it('rejects requests without an Origin header (non-browser bots)', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send({ kind: 'suggestion', prompt: 'Suggest something.' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects requests with a wrong Origin header', async () => {
    const res = await request(app)
      .post('/api/generate').set('Origin', 'http://localhost:5173')
      .set('Origin', 'https://evil.example.com')
      .send({ kind: 'suggestion', prompt: 'Suggest something.' });

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 429 once the global daily cap is exhausted', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });

    // DAILY_CAP is lowered via env in test setup; exhaust it.
    const cap = Number(process.env.DAILY_CAP || 300);
    for (let i = 0; i < cap; i++) {
      await request(app)
        .post('/api/generate').set('Origin', 'http://localhost:5173')
        .set('Origin', 'http://localhost:5173')
        .send({ kind: 'suggestion', prompt: 'hi' });
    }

    const res = await request(app)
      .post('/api/generate').set('Origin', 'http://localhost:5173')
      .set('Origin', 'http://localhost:5173')
      .send({ kind: 'suggestion', prompt: 'hi' });

    expect(res.status).toBe(429);
    expect(res.body).toHaveProperty('error');
  });

  it('fails over to the next allowlisted model when the first is rate-limited upstream', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'rate limited' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          model: 'nvidia/nemotron-3-super-120b-a12b:free',
          choices: [{ message: { content: 'Failover text.' } }],
        }),
      });

    const res = await request(app)
      .post('/api/generate').set('Origin', 'http://localhost:5173')
      .send({ kind: 'suggestion', prompt: 'Suggest something.' });

    expect(res.status).toBe(200);
    expect(res.body.text).toBe('Failover text.');
    expect(res.body.model).toBe('nvidia/nemotron-3-super-120b-a12b:free');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('includes the upstream HTTP status (code only) in the 502 body for diagnosability', async () => {
    // Every allowlisted candidate rejects (failover exhausts the list).
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'No endpoints found matching your data policy' }),
    });

    const res = await request(app)
      .post('/api/generate').set('Origin', 'http://localhost:5173')
      .send({ kind: 'suggestion', prompt: 'Suggest something.' });

    expect(res.status).toBe(502);
    expect(res.body.upstreamStatus).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('data policy');
    expect(JSON.stringify(res.body)).not.toContain(FAKE_KEY);
  });

  it('returns 504 JSON error when the upstream call times out', async () => {
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        })
    );

    const res = await request(app)
      .post('/api/generate').set('Origin', 'http://localhost:5173')
      .send({ kind: 'argument', prompt: 'Draft an argument.' });

    expect(res.status).toBe(504);
    expect(res.body).toHaveProperty('error');
    expect(JSON.stringify(res.body)).not.toContain(FAKE_KEY);
  });

  it('never crashes and never echoes the key on unexpected upstream failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network exploded'));

    const res = await request(app)
      .post('/api/generate').set('Origin', 'http://localhost:5173')
      .send({ kind: 'argument', prompt: 'Draft an argument.' });

    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty('error');
    expect(JSON.stringify(res.body)).not.toContain(FAKE_KEY);
  });

  it('rate limits /api/generate to 10 requests per minute per IP with a 429', async () => {
    fetchMock.mockResolvedValue(okUpstreamResponse());

    let lastRes;
    for (let i = 0; i < 11; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      lastRes = await request(app)
        .post('/api/generate').set('Origin', 'http://localhost:5173')
        .send({ kind: 'argument', prompt: 'Draft an argument.' });
    }

    expect(lastRes.status).toBe(429);
    expect(lastRes.body).toHaveProperty('error');
    expect(JSON.stringify(lastRes.body)).not.toContain(FAKE_KEY);
  });
});
