import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import { registerUser } from '../../test-utils/authHelpers.js';

describe('templates API', () => {
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

  async function createTemplate(overrides = {}) {
    return request(app)
      .post('/templates')
      .set(auth(user.accessToken))
      .send({ name: 'Demand Letter', category: 'Demand Letter', skeletonContent: '...', ...overrides });
  }

  describe('POST /templates', () => {
    it('creates a template (201)', async () => {
      const res = await createTemplate();
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Demand Letter');
    });

    it('rejects a missing category (400)', async () => {
      const res = await request(app).post('/templates').set(auth(user.accessToken)).send({ name: 'x' });
      expect(res.status).toBe(400);
    });

    it('rejects an unauthenticated request (401)', async () => {
      const res = await request(app).post('/templates').send({ name: 'x', category: 'y' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /templates', () => {
    it('lists templates, optionally by category', async () => {
      await createTemplate({ category: 'Demand Letter' });
      await createTemplate({ category: 'NDA' });

      const res = await request(app).get('/templates').query({ category: 'NDA' }).set(auth(user.accessToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].category).toBe('NDA');
    });
  });

  describe('GET /templates/:id', () => {
    it('returns 404 for an unknown template', async () => {
      const res = await request(app).get('/templates/no-such-id').set(auth(user.accessToken));
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /templates/:id', () => {
    it('updates a template (200)', async () => {
      const created = await createTemplate();
      const res = await request(app)
        .patch(`/templates/${created.body.id}`)
        .set(auth(user.accessToken))
        .send({ name: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated');
    });

    it('returns 404 for an unknown template', async () => {
      const res = await request(app)
        .patch('/templates/no-such-id')
        .set(auth(user.accessToken))
        .send({ name: 'x' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /templates/:id', () => {
    it('deletes a template (204)', async () => {
      const created = await createTemplate();
      const res = await request(app).delete(`/templates/${created.body.id}`).set(auth(user.accessToken));
      expect(res.status).toBe(204);
    });

    it('returns 404 for an unknown template', async () => {
      const res = await request(app).delete('/templates/no-such-id').set(auth(user.accessToken));
      expect(res.status).toBe(404);
    });
  });
});
