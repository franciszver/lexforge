import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import { registerUser } from '../../test-utils/authHelpers.js';

describe('audit API', () => {
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

  describe('POST /audit', () => {
    it('creates an audit log entry attributed to the caller (201)', async () => {
      const res = await request(app)
        .post('/audit')
        .set(auth(user.accessToken))
        .send({ eventType: 'document', action: 'create', resourceId: 'doc-1' });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(user.user.id);
      expect(res.body.eventType).toBe('document');
    });

    it('rejects a missing action (400)', async () => {
      const res = await request(app).post('/audit').set(auth(user.accessToken)).send({ eventType: 'document' });
      expect(res.status).toBe(400);
    });

    it('rejects an unauthenticated request (401)', async () => {
      const res = await request(app).post('/audit').send({ eventType: 'document', action: 'create' });
      expect(res.status).toBe(401);
    });
  });

  describe('listing', () => {
    beforeEach(async () => {
      await request(app)
        .post('/audit')
        .set(auth(user.accessToken))
        .send({ eventType: 'document', action: 'create', resourceId: 'doc-1' });
      await request(app)
        .post('/audit')
        .set(auth(user.accessToken))
        .send({ eventType: 'clause', action: 'update', resourceId: 'clause-1' });
    });

    it('GET /audit/mine returns only the caller entries', async () => {
      const res = await request(app).get('/audit/mine').set(auth(user.accessToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('GET /audit/by-event/:eventType filters by event type', async () => {
      const res = await request(app).get('/audit/by-event/clause').set(auth(user.accessToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].eventType).toBe('clause');
    });

    it('GET /audit/by-resource/:resourceId filters by resource', async () => {
      const res = await request(app).get('/audit/by-resource/doc-1').set(auth(user.accessToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].resourceId).toBe('doc-1');
    });

    it('rejects unauthenticated list requests (401)', async () => {
      const res = await request(app).get('/audit/mine');
      expect(res.status).toBe(401);
    });
  });
});
