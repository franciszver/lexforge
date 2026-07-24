import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import { getJwtSecret } from './config.js';

const VALID_USER = { email: 'lawyer@lexforge.app', password: 'correct-horse-battery', name: 'Ada Lovelace' };

function assertNoHashLeak(body) {
  const serialized = JSON.stringify(body);
  expect(serialized).not.toMatch(/passwordHash/i);
  expect(serialized).not.toMatch(/refreshTokenHash/i);
}

describe('auth API', () => {
  let app;
  let prisma;

  beforeEach(() => {
    prisma = createFakePrismaClient();
    app = createApp({ prisma });
  });

  describe('POST /auth/register', () => {
    it('creates a user and returns tokens (201)', async () => {
      const res = await request(app).post('/auth/register').send(VALID_USER);

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({ email: VALID_USER.email, name: VALID_USER.name, role: 'user' });
      expect(res.body.user.id).toBeDefined();
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      assertNoHashLeak(res.body);
    });

    it('rejects a duplicate email (409)', async () => {
      await request(app).post('/auth/register').send(VALID_USER);
      const res = await request(app).post('/auth/register').send(VALID_USER);

      expect(res.status).toBe(409);
      assertNoHashLeak(res.body);
    });

    it('rejects a malformed email (400)', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ ...VALID_USER, email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('rejects a password under 8 characters (400)', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ ...VALID_USER, password: 'short1' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/auth/register').send(VALID_USER);
    });

    it('logs in with correct credentials (200)', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: VALID_USER.email, password: VALID_USER.password });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(VALID_USER.email);
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      assertNoHashLeak(res.body);
    });

    it('rejects an unknown email with a generic message (401)', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'ghost@lexforge.app', password: 'whatever123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('rejects a wrong password with the same generic message (401)', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: VALID_USER.email, password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /auth/me', () => {
    it('returns the current user for a valid access token (200)', async () => {
      const registerRes = await request(app).post('/auth/register').send(VALID_USER);
      const { accessToken, user } = registerRes.body;

      const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: user.id, email: user.email, name: user.name, role: user.role });
      assertNoHashLeak(res.body);
    });

    it('rejects a missing Authorization header (401)', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('rejects a bad-signature token (401)', async () => {
      const forged = jwt.sign({ sub: 'x', email: 'x@x.com', role: 'user', type: 'access' }, 'wrong-secret', {
        expiresIn: '15m',
      });

      const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${forged}`);
      expect(res.status).toBe(401);
    });

    it('rejects an expired token (401)', async () => {
      const expired = jwt.sign(
        { sub: 'x', email: 'x@x.com', role: 'user', type: 'access' },
        getJwtSecret(),
        { expiresIn: -10 }
      );

      const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${expired}`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('issues a new access+refresh pair for a valid refresh token (200)', async () => {
      const registerRes = await request(app).post('/auth/register').send(VALID_USER);
      const { refreshToken } = registerRes.body;

      const res = await request(app).post('/auth/refresh').send({ refreshToken });

      expect(res.status).toBe(200);
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      expect(res.body.refreshToken).not.toBe(refreshToken);
      assertNoHashLeak(res.body);
    });

    it('rejects reuse of an already-rotated-out refresh token (401)', async () => {
      const registerRes = await request(app).post('/auth/register').send(VALID_USER);
      const oldRefreshToken = registerRes.body.refreshToken;

      await request(app).post('/auth/refresh').send({ refreshToken: oldRefreshToken });
      const reuse = await request(app).post('/auth/refresh').send({ refreshToken: oldRefreshToken });

      expect(reuse.status).toBe(401);
    });

    it('rejects a malformed refresh token (401)', async () => {
      const res = await request(app).post('/auth/refresh').send({ refreshToken: 'not-a-jwt' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('clears the refresh token and returns 204', async () => {
      const registerRes = await request(app).post('/auth/register').send(VALID_USER);
      const { accessToken, refreshToken } = registerRes.body;

      const res = await request(app).post('/auth/logout').set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(204);

      const refreshAfterLogout = await request(app).post('/auth/refresh').send({ refreshToken });
      expect(refreshAfterLogout.status).toBe(401);
    });

    it('rejects logout without a valid access token (401)', async () => {
      const res = await request(app).post('/auth/logout');
      expect(res.status).toBe(401);
    });
  });

  describe('rate limiting on /register, /login, /refresh (shared budget, not /me or /logout)', () => {
    it('429s once the per-IP budget is exhausted, with a JSON body and standard headers', async () => {
      // authRateLimitMax keeps this cheap: 3 requests is enough to prove the
      // limiter works without looping 21 times against the default budget.
      const limitedApp = createApp({ prisma, authRateLimitMax: 3 });

      let lastRes;
      for (let i = 0; i < 4; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        lastRes = await request(limitedApp).post('/auth/register').send({}); // malformed body: cheap 400s still consume budget
      }

      expect(lastRes.status).toBe(429);
      expect(lastRes.body).toHaveProperty('error');
      expect(lastRes.headers).toHaveProperty('ratelimit-limit');
    });

    it('shares the budget across register/login/refresh', async () => {
      const limitedApp = createApp({ prisma, authRateLimitMax: 3 });

      await request(limitedApp).post('/auth/register').send({});
      await request(limitedApp).post('/auth/login').send({});
      await request(limitedApp).post('/auth/refresh').send({});
      const fourth = await request(limitedApp).post('/auth/register').send({});

      expect(fourth.status).toBe(429);
    });

    it('does not rate limit /auth/me or /auth/logout', async () => {
      const limitedApp = createApp({ prisma, authRateLimitMax: 2 });

      for (let i = 0; i < 5; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await request(limitedApp).get('/auth/me');
      }
      const res = await request(limitedApp).get('/auth/me');

      expect(res.status).not.toBe(429);
    });
  });

  describe('email normalization', () => {
    it('normalizes case so login matches a differently-cased register', async () => {
      await request(app).post('/auth/register').send({ email: 'Demo@Example.com', password: 'password123' });

      const res = await request(app).post('/auth/login').send({ email: 'demo@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('demo@example.com');
    });

    it('rejects a second register with only different casing as a duplicate (409)', async () => {
      await request(app).post('/auth/register').send({ email: 'Demo2@Example.com', password: 'password123' });

      const res = await request(app).post('/auth/register').send({ email: 'demo2@example.com', password: 'password123' });

      expect(res.status).toBe(409);
    });
  });

  describe('concurrent duplicate register (race)', () => {
    it('returns 201 once and 409 once, never a 500, for two concurrent registers with the same email', async () => {
      const email = 'race@example.com';
      const [resA, resB] = await Promise.all([
        request(app).post('/auth/register').send({ email, password: 'password123' }),
        request(app).post('/auth/register').send({ email, password: 'password123' }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([201, 409]);
    });
  });
});
