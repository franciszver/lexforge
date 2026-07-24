import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import { registerUser } from '../../test-utils/authHelpers.js';

describe('share-links API', () => {
  let app;
  let prisma;
  let owner;
  let stranger;
  let draftId;

  function auth(token) {
    return { Authorization: `Bearer ${token}` };
  }

  beforeEach(async () => {
    prisma = createFakePrismaClient();
    app = createApp({ prisma });
    owner = await registerUser(app);
    stranger = await registerUser(app);

    const draft = await request(app).post('/drafts').set(auth(owner.accessToken)).send({ title: 'Doc' });
    draftId = draft.body.id;
  });

  describe('POST /share-links', () => {
    it('creates a share link as the document owner (201)', async () => {
      const res = await request(app)
        .post('/share-links')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId });

      expect(res.status).toBe(201);
      expect(res.body.documentId).toBe(draftId);
      expect(typeof res.body.token).toBe('string');
      expect(typeof res.body.passcode).toBe('string');
      expect(res.body.isActive).toBe(true);
    });

    it('generates a cryptographically strong passcode (16 hex chars, not Math.random)', async () => {
      const res = await request(app)
        .post('/share-links')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId });

      // randomBytes(8).toString('hex').toUpperCase() => 16 uppercase hex chars.
      // Math.random().toString(36).substring(2, 8) would be 6 base36 chars,
      // so this length+charset assertion also rules out the old generator.
      expect(res.body.passcode).toMatch(/^[0-9A-F]{16}$/);
    });

    it('rejects a missing documentId (400)', async () => {
      const res = await request(app).post('/share-links').set(auth(owner.accessToken)).send({});
      expect(res.status).toBe(400);
    });

    it('rejects a non-owner (403)', async () => {
      const res = await request(app)
        .post('/share-links')
        .set(auth(stranger.accessToken))
        .send({ documentId: draftId });
      expect(res.status).toBe(403);
    });

    it('returns 404 for an unknown document', async () => {
      const res = await request(app)
        .post('/share-links')
        .set(auth(owner.accessToken))
        .send({ documentId: 'no-such-doc' });
      expect(res.status).toBe(404);
    });

    it('rejects an unauthenticated request (401)', async () => {
      const res = await request(app).post('/share-links').send({ documentId: draftId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /share-links/token/:token', () => {
    it('looks up a link by token (200)', async () => {
      const created = await request(app)
        .post('/share-links')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId });

      const res = await request(app)
        .get(`/share-links/token/${created.body.token}`)
        .set(auth(stranger.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.documentId).toBe(draftId);
    });

    it('returns 404 for an unknown token', async () => {
      const res = await request(app).get('/share-links/token/no-such-token').set(auth(owner.accessToken));
      expect(res.status).toBe(404);
    });
  });

  describe('GET /share-links/document/:documentId', () => {
    it('lists links for the document owner (200)', async () => {
      await request(app).post('/share-links').set(auth(owner.accessToken)).send({ documentId: draftId });

      const res = await request(app).get(`/share-links/document/${draftId}`).set(auth(owner.accessToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('rejects a non-owner (403)', async () => {
      const res = await request(app).get(`/share-links/document/${draftId}`).set(auth(stranger.accessToken));
      expect(res.status).toBe(403);
    });
  });

  describe('POST /share-links/:id/access', () => {
    it('increments access count for any authenticated caller (200)', async () => {
      const created = await request(app)
        .post('/share-links')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId });

      const res = await request(app)
        .post(`/share-links/${created.body.id}/access`)
        .set(auth(stranger.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.accessCount).toBe(1);
    });

    it('returns 404 for an unknown link', async () => {
      const res = await request(app).post('/share-links/no-such-id/access').set(auth(owner.accessToken));
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /share-links/:id (revoke)', () => {
    it('revokes as the document owner (204)', async () => {
      const created = await request(app)
        .post('/share-links')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId });

      const res = await request(app).delete(`/share-links/${created.body.id}`).set(auth(owner.accessToken));
      expect(res.status).toBe(204);
    });

    it('rejects a non-owner (403)', async () => {
      const created = await request(app)
        .post('/share-links')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId });

      const res = await request(app).delete(`/share-links/${created.body.id}`).set(auth(stranger.accessToken));
      expect(res.status).toBe(403);
    });

    it('returns 404 for an unknown link', async () => {
      const res = await request(app).delete('/share-links/no-such-id').set(auth(owner.accessToken));
      expect(res.status).toBe(404);
    });
  });
});
