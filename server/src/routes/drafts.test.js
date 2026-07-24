import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import { registerUser } from '../../test-utils/authHelpers.js';

describe('drafts API', () => {
  let app;
  let prisma;
  let owner;
  let other;

  beforeEach(async () => {
    prisma = createFakePrismaClient();
    app = createApp({ prisma });
    owner = await registerUser(app);
    other = await registerUser(app);
  });

  function auth(token) {
    return { Authorization: `Bearer ${token}` };
  }

  describe('POST /drafts', () => {
    it('creates a draft owned by the caller (201)', async () => {
      const res = await request(app)
        .post('/drafts')
        .set(auth(owner.accessToken))
        .send({ title: 'My Demand Letter', content: 'Dear Sir,' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('My Demand Letter');
      expect(res.body.userId).toBe(owner.user.id);
    });

    it('rejects an unauthenticated request (401)', async () => {
      const res = await request(app).post('/drafts').send({ title: 'x' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /drafts', () => {
    it("lists only the caller's drafts", async () => {
      await request(app).post('/drafts').set(auth(owner.accessToken)).send({ title: 'Mine' });
      await request(app).post('/drafts').set(auth(other.accessToken)).send({ title: 'Not mine' });

      const res = await request(app).get('/drafts').set(auth(owner.accessToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Mine');
    });

    it('rejects an unauthenticated request (401)', async () => {
      const res = await request(app).get('/drafts');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /drafts/:id', () => {
    it('returns the draft to its owner (200)', async () => {
      const created = await request(app).post('/drafts').set(auth(owner.accessToken)).send({ title: 'x' });
      const res = await request(app).get(`/drafts/${created.body.id}`).set(auth(owner.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it('rejects a non-owner with 403', async () => {
      const created = await request(app).post('/drafts').set(auth(owner.accessToken)).send({ title: 'x' });
      const res = await request(app).get(`/drafts/${created.body.id}`).set(auth(other.accessToken));
      expect(res.status).toBe(403);
    });

    it('returns 404 for an unknown draft', async () => {
      const res = await request(app).get('/drafts/no-such-id').set(auth(owner.accessToken));
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /drafts/:id', () => {
    it("updates the owner's draft (200)", async () => {
      const created = await request(app).post('/drafts').set(auth(owner.accessToken)).send({ title: 'x' });
      const res = await request(app)
        .patch(`/drafts/${created.body.id}`)
        .set(auth(owner.accessToken))
        .send({ title: 'updated' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('updated');
    });

    it('rejects a non-owner with 403', async () => {
      const created = await request(app).post('/drafts').set(auth(owner.accessToken)).send({ title: 'x' });
      const res = await request(app)
        .patch(`/drafts/${created.body.id}`)
        .set(auth(other.accessToken))
        .send({ title: 'hijacked' });
      expect(res.status).toBe(403);
    });

    it('returns 404 for an unknown draft', async () => {
      const res = await request(app).patch('/drafts/no-such-id').set(auth(owner.accessToken)).send({ title: 'x' });
      expect(res.status).toBe(404);
    });

    it('ignores an attempt to reassign userId in the body (mass assignment)', async () => {
      const created = await request(app).post('/drafts').set(auth(owner.accessToken)).send({ title: 'x' });
      const res = await request(app)
        .patch(`/drafts/${created.body.id}`)
        .set(auth(owner.accessToken))
        .send({ userId: other.user.id, title: 'still mine' });
      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(owner.user.id);
      expect(res.body.title).toBe('still mine');
    });
  });

  describe('DELETE /drafts/:id', () => {
    it("deletes the owner's draft (204)", async () => {
      const created = await request(app).post('/drafts').set(auth(owner.accessToken)).send({ title: 'x' });
      const res = await request(app).delete(`/drafts/${created.body.id}`).set(auth(owner.accessToken));
      expect(res.status).toBe(204);

      const getRes = await request(app).get(`/drafts/${created.body.id}`).set(auth(owner.accessToken));
      expect(getRes.status).toBe(404);
    });

    it('rejects a non-owner with 403', async () => {
      const created = await request(app).post('/drafts').set(auth(owner.accessToken)).send({ title: 'x' });
      const res = await request(app).delete(`/drafts/${created.body.id}`).set(auth(other.accessToken));
      expect(res.status).toBe(403);
    });

    it('returns 404 for an unknown draft', async () => {
      const res = await request(app).delete('/drafts/no-such-id').set(auth(owner.accessToken));
      expect(res.status).toBe(404);
    });
  });
});
