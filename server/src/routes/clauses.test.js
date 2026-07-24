import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import { registerUser } from '../../test-utils/authHelpers.js';

describe('clauses API', () => {
  let app;
  let prisma;
  let user;

  beforeEach(async () => {
    prisma = createFakePrismaClient();
    app = createApp({ prisma });
    user = await registerUser(app);
  });

  function auth(token) {
    return { Authorization: `Bearer ${token}` };
  }

  async function createClause(overrides = {}) {
    return request(app)
      .post('/clauses')
      .set(auth(user.accessToken))
      .send({ title: 'Indemnification', content: 'The party shall...', category: 'Indemnification', ...overrides });
  }

  describe('POST /clauses', () => {
    it('creates a clause (201)', async () => {
      const res = await createClause();
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Indemnification');
      expect(res.body.usageCount).toBe(0);
    });

    it('rejects a missing category (400)', async () => {
      const res = await request(app)
        .post('/clauses')
        .set(auth(user.accessToken))
        .send({ title: 'x', content: 'y' });
      expect(res.status).toBe(400);
    });

    it('rejects an unauthenticated request (401)', async () => {
      const res = await request(app).post('/clauses').send({ title: 'x', content: 'y', category: 'z' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /clauses', () => {
    it('searches by category and jurisdiction', async () => {
      await createClause({ category: 'Confidentiality', jurisdiction: 'California' });
      await createClause({ category: 'Indemnification', jurisdiction: 'Texas' });

      const res = await request(app)
        .get('/clauses')
        .query({ category: 'Confidentiality' })
        .set(auth(user.accessToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].category).toBe('Confidentiality');
    });
  });

  describe('GET /clauses/categories', () => {
    it('returns category counts', async () => {
      await createClause({ category: 'Confidentiality' });
      await createClause({ category: 'Confidentiality' });

      const res = await request(app).get('/clauses/categories').set(auth(user.accessToken));
      expect(res.status).toBe(200);
      expect(res.body).toContainEqual({ name: 'Confidentiality', count: 2 });
    });
  });

  describe('GET /clauses/:id', () => {
    it('returns 404 for an unknown clause', async () => {
      const res = await request(app).get('/clauses/no-such-id').set(auth(user.accessToken));
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /clauses/:id', () => {
    it('updates a clause (200)', async () => {
      const created = await createClause();
      const res = await request(app)
        .patch(`/clauses/${created.body.id}`)
        .set(auth(user.accessToken))
        .send({ title: 'Updated title' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated title');
    });

    it('returns 404 for an unknown clause', async () => {
      const res = await request(app)
        .patch('/clauses/no-such-id')
        .set(auth(user.accessToken))
        .send({ title: 'x' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /clauses/:id', () => {
    it('deletes a clause (204)', async () => {
      const created = await createClause();
      const res = await request(app).delete(`/clauses/${created.body.id}`).set(auth(user.accessToken));
      expect(res.status).toBe(204);
    });

    it('returns 404 for an unknown clause', async () => {
      const res = await request(app).delete('/clauses/no-such-id').set(auth(user.accessToken));
      expect(res.status).toBe(404);
    });
  });

  describe('POST /clauses/:id/usage', () => {
    it('increments usage count', async () => {
      const created = await createClause();
      const res = await request(app).post(`/clauses/${created.body.id}/usage`).set(auth(user.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.usageCount).toBe(1);
    });

    it('returns 404 for an unknown clause', async () => {
      const res = await request(app).post('/clauses/no-such-id/usage').set(auth(user.accessToken));
      expect(res.status).toBe(404);
    });
  });

  describe('favorites', () => {
    it('adds and lists a favorite (201, 200)', async () => {
      const created = await createClause();
      const addRes = await request(app)
        .post('/clauses/favorites')
        .set(auth(user.accessToken))
        .send({ clauseId: created.body.id });
      expect(addRes.status).toBe(201);

      const listRes = await request(app).get('/clauses/favorites/mine').set(auth(user.accessToken));
      expect(listRes.status).toBe(200);
      expect(listRes.body).toHaveLength(1);
    });

    it('rejects a missing clauseId (400)', async () => {
      const res = await request(app).post('/clauses/favorites').set(auth(user.accessToken)).send({});
      expect(res.status).toBe(400);
    });

    it('removes a favorite (204)', async () => {
      const created = await createClause();
      const addRes = await request(app)
        .post('/clauses/favorites')
        .set(auth(user.accessToken))
        .send({ clauseId: created.body.id });

      const res = await request(app)
        .delete(`/clauses/favorites/${addRes.body.id}`)
        .set(auth(user.accessToken));
      expect(res.status).toBe(204);
    });

    it('returns 404 for an unknown favorite', async () => {
      const res = await request(app).delete('/clauses/favorites/no-such-id').set(auth(user.accessToken));
      expect(res.status).toBe(404);
    });
  });
});
