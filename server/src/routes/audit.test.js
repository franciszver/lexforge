import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import { registerUser } from '../../test-utils/authHelpers.js';
import { updateUser } from '../repositories/userRepository.js';

// Promotes an already-registered user to role 'admin' and returns a fresh
// access token carrying that role (the JWT role claim is baked in at
// login time, so the pre-promotion token from registerUser() is stale).
async function promoteToAdmin(app, prisma, registered) {
  await updateUser(prisma, registered.user.id, { role: 'admin' });
  const res = await request(app)
    .post('/auth/login')
    .send({ email: registered.user.email, password: 'correct-horse-battery' });
  return { accessToken: res.body.accessToken, user: res.body.user };
}

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
    let draftId;

    beforeEach(async () => {
      const draft = await request(app).post('/drafts').set(auth(user.accessToken)).send({ title: 'Doc' });
      draftId = draft.body.id;

      await request(app)
        .post('/audit')
        .set(auth(user.accessToken))
        .send({ eventType: 'document', action: 'create', resourceId: draftId });
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

    it('GET /audit/by-event/:eventType filters by event type, for an admin caller', async () => {
      const admin = await promoteToAdmin(app, prisma, user);
      const res = await request(app).get('/audit/by-event/clause').set(auth(admin.accessToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].eventType).toBe('clause');
    });

    it('GET /audit/by-resource/:resourceId filters by resource, for the owning caller', async () => {
      const res = await request(app).get(`/audit/by-resource/${draftId}`).set(auth(user.accessToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].resourceId).toBe(draftId);
    });

    it('rejects unauthenticated list requests (401)', async () => {
      const res = await request(app).get('/audit/mine');
      expect(res.status).toBe(401);
    });
  });

  describe('cross-user access control', () => {
    it('GET /audit/ rejects a non-admin caller (403)', async () => {
      const res = await request(app).get('/audit').set(auth(user.accessToken));
      expect(res.status).toBe(403);
    });

    it('GET /audit/ allows an admin caller (200)', async () => {
      const admin = await promoteToAdmin(app, prisma, user);
      const res = await request(app).get('/audit').set(auth(admin.accessToken));
      expect(res.status).toBe(200);
    });

    it('GET /audit/by-event/:eventType rejects a non-admin caller (403)', async () => {
      const res = await request(app).get('/audit/by-event/document').set(auth(user.accessToken));
      expect(res.status).toBe(403);
    });

    it('GET /audit/by-event/:eventType allows an admin caller (200)', async () => {
      const admin = await promoteToAdmin(app, prisma, user);
      const res = await request(app).get('/audit/by-event/document').set(auth(admin.accessToken));
      expect(res.status).toBe(200);
    });

    describe('GET /audit/by-resource/:resourceId', () => {
      it('allows the owner of the referenced draft (200)', async () => {
        const draft = await request(app).post('/drafts').set(auth(user.accessToken)).send({ title: 'Doc' });
        const res = await request(app)
          .get(`/audit/by-resource/${draft.body.id}`)
          .set(auth(user.accessToken));
        expect(res.status).toBe(200);
      });

      it('rejects a caller who does not own the referenced draft (403)', async () => {
        const owner = await registerUser(app);
        const draft = await request(app).post('/drafts').set(auth(owner.accessToken)).send({ title: 'Doc' });

        const res = await request(app)
          .get(`/audit/by-resource/${draft.body.id}`)
          .set(auth(user.accessToken));
        expect(res.status).toBe(403);
      });

      it('rejects a caller when the resourceId is not a draft they own (403)', async () => {
        const res = await request(app).get('/audit/by-resource/not-a-draft-id').set(auth(user.accessToken));
        expect(res.status).toBe(403);
      });

      it('allows an admin regardless of draft ownership (200)', async () => {
        const owner = await registerUser(app);
        const draft = await request(app).post('/drafts').set(auth(owner.accessToken)).send({ title: 'Doc' });
        const admin = await promoteToAdmin(app, prisma, user);

        const res = await request(app)
          .get(`/audit/by-resource/${draft.body.id}`)
          .set(auth(admin.accessToken));
        expect(res.status).toBe(200);
      });
    });
  });
});
