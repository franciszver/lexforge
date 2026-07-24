import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import { registerUser } from '../../test-utils/authHelpers.js';

describe('citations API', () => {
  let app;
  let prisma;
  let user;
  let other;

  beforeEach(async () => {
    prisma = createFakePrismaClient();
    app = createApp({ prisma });
    user = await registerUser(app);
    other = await registerUser(app);
  });

  function auth(token) {
    return { Authorization: `Bearer ${token}` };
  }

  async function createCitation(overrides = {}) {
    return request(app)
      .post('/citations')
      .set(auth(user.accessToken))
      .send({ title: 'Marbury v. Madison', citation: '5 U.S. 137 (1803)', type: 'case', ...overrides });
  }

  describe('POST /citations', () => {
    it('creates a citation (201)', async () => {
      const res = await createCitation();
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Marbury v. Madison');
    });

    it('rejects a missing type (400)', async () => {
      const res = await request(app)
        .post('/citations')
        .set(auth(user.accessToken))
        .send({ title: 'x', citation: 'y' });
      expect(res.status).toBe(400);
    });

    it('rejects an unauthenticated request (401)', async () => {
      const res = await request(app).post('/citations').send({ title: 'x', citation: 'y', type: 'case' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /citations', () => {
    it('searches by type', async () => {
      await createCitation({ type: 'case' });
      await createCitation({ type: 'statute' });

      const res = await request(app).get('/citations').query({ type: 'statute' }).set(auth(user.accessToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].type).toBe('statute');
    });
  });

  describe('GET /citations/:id', () => {
    it('returns 404 for an unknown citation', async () => {
      const res = await request(app).get('/citations/no-such-id').set(auth(user.accessToken));
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /citations/:id', () => {
    it('updates a citation (200)', async () => {
      const created = await createCitation();
      const res = await request(app)
        .patch(`/citations/${created.body.id}`)
        .set(auth(user.accessToken))
        .send({ title: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated');
    });

    it('returns 404 for an unknown citation', async () => {
      const res = await request(app)
        .patch('/citations/no-such-id')
        .set(auth(user.accessToken))
        .send({ title: 'x' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /citations/:id', () => {
    it('deletes a citation (204)', async () => {
      const created = await createCitation();
      const res = await request(app).delete(`/citations/${created.body.id}`).set(auth(user.accessToken));
      expect(res.status).toBe(204);
    });

    it('returns 404 for an unknown citation', async () => {
      const res = await request(app).delete('/citations/no-such-id').set(auth(user.accessToken));
      expect(res.status).toBe(404);
    });
  });

  describe('POST /citations/:id/usage', () => {
    it('increments usage count', async () => {
      const created = await createCitation();
      const res = await request(app).post(`/citations/${created.body.id}/usage`).set(auth(user.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.usageCount).toBe(1);
    });

    it('returns 404 for an unknown citation', async () => {
      const res = await request(app).post('/citations/no-such-id/usage').set(auth(user.accessToken));
      expect(res.status).toBe(404);
    });
  });

  describe('favorites', () => {
    it('adds and lists a favorite (201, 200)', async () => {
      const created = await createCitation();
      const addRes = await request(app)
        .post('/citations/favorites')
        .set(auth(user.accessToken))
        .send({ citationId: created.body.id });
      expect(addRes.status).toBe(201);

      const listRes = await request(app).get('/citations/favorites/mine').set(auth(user.accessToken));
      expect(listRes.status).toBe(200);
      expect(listRes.body).toHaveLength(1);
    });

    it('rejects a missing citationId (400)', async () => {
      const res = await request(app).post('/citations/favorites').set(auth(user.accessToken)).send({});
      expect(res.status).toBe(400);
    });

    it('removes a favorite (204)', async () => {
      const created = await createCitation();
      const addRes = await request(app)
        .post('/citations/favorites')
        .set(auth(user.accessToken))
        .send({ citationId: created.body.id });

      const res = await request(app)
        .delete(`/citations/favorites/${addRes.body.id}`)
        .set(auth(user.accessToken));
      expect(res.status).toBe(204);
    });

    it('returns 404 for an unknown favorite', async () => {
      const res = await request(app).delete('/citations/favorites/no-such-id').set(auth(user.accessToken));
      expect(res.status).toBe(404);
    });

    it('does not let another user remove your favorite (IDOR)', async () => {
      const created = await createCitation();
      const addRes = await request(app)
        .post('/citations/favorites')
        .set(auth(user.accessToken))
        .send({ citationId: created.body.id });

      const res = await request(app)
        .delete(`/citations/favorites/${addRes.body.id}`)
        .set(auth(other.accessToken));
      expect(res.status).toBe(404);

      const listRes = await request(app).get('/citations/favorites/mine').set(auth(user.accessToken));
      expect(listRes.body).toHaveLength(1);
    });
  });
});
