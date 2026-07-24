import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import { registerUser } from '../../test-utils/authHelpers.js';

describe('collaborators API', () => {
  let app;
  let prisma;
  let owner;
  let invitee;
  let stranger;
  let draftId;

  function auth(token) {
    return { Authorization: `Bearer ${token}` };
  }

  beforeEach(async () => {
    prisma = createFakePrismaClient();
    app = createApp({ prisma });
    owner = await registerUser(app);
    invitee = await registerUser(app);
    stranger = await registerUser(app);

    const draft = await request(app).post('/drafts').set(auth(owner.accessToken)).send({ title: 'Doc' });
    draftId = draft.body.id;
  });

  describe('POST /collaborators (invite)', () => {
    it('invites a collaborator as the draft owner (201)', async () => {
      const res = await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
      expect(res.body.collaboratorEmail).toBe(invitee.user.email);
    });

    it('rejects a missing role (400)', async () => {
      const res = await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email });
      expect(res.status).toBe(400);
    });

    it('rejects a non-owner inviting on the document (403)', async () => {
      const res = await request(app)
        .post('/collaborators')
        .set(auth(stranger.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });
      expect(res.status).toBe(403);
    });

    it('returns 404 for an unknown document', async () => {
      const res = await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: 'no-such-doc', collaboratorEmail: invitee.user.email, role: 'editor' });
      expect(res.status).toBe(404);
    });

    it('rejects an unauthenticated request (401)', async () => {
      const res = await request(app)
        .post('/collaborators')
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /collaborators/token/:token', () => {
    it('looks up a pending invitation by token (200)', async () => {
      const invite = await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });

      const res = await request(app)
        .get(`/collaborators/token/${invite.body.inviteToken}`)
        .set(auth(invitee.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(invite.body.id);
      expect(res.body.status).toBe('pending');
    });

    it('returns 404 for an unknown token', async () => {
      const res = await request(app).get('/collaborators/token/no-such-token').set(auth(invitee.accessToken));
      expect(res.status).toBe(404);
    });
  });

  describe('POST /collaborators/accept/:token', () => {
    it('accepts an invitation for the invited user (200)', async () => {
      const invite = await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });

      const res = await request(app)
        .post(`/collaborators/accept/${invite.body.inviteToken}`)
        .set(auth(invitee.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('accepted');
      expect(res.body.collaboratorUserId).toBe(invitee.user.id);
    });

    it('is not reachable by database id (the old, IDOR-vulnerable shape is gone)', async () => {
      const invite = await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });

      const res = await request(app)
        .post(`/collaborators/${invite.body.id}/accept`)
        .set(auth(invitee.accessToken));
      expect(res.status).toBe(404);
    });

    it('returns a generic 404 for an unknown token', async () => {
      const res = await request(app).post('/collaborators/accept/no-such-token').set(auth(invitee.accessToken));
      expect(res.status).toBe(404);
    });

    it("rejects a caller whose email doesn't match the invited email (404, IDOR)", async () => {
      const invite = await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });

      const res = await request(app)
        .post(`/collaborators/accept/${invite.body.inviteToken}`)
        .set(auth(stranger.accessToken));
      expect(res.status).toBe(404);
    });

    it('rejects an expired invitation (404)', async () => {
      const invite = await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });

      await prisma.documentCollaborator.update({
        where: { id: invite.body.id },
        data: { inviteExpiresAt: new Date(Date.now() - 1000) },
      });

      const res = await request(app)
        .post(`/collaborators/accept/${invite.body.inviteToken}`)
        .set(auth(invitee.accessToken));
      expect(res.status).toBe(404);
    });

    it('rejects re-accepting an already-accepted invitation (token reuse, 404)', async () => {
      const invite = await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });

      const first = await request(app)
        .post(`/collaborators/accept/${invite.body.inviteToken}`)
        .set(auth(invitee.accessToken));
      expect(first.status).toBe(200);

      const second = await request(app)
        .post(`/collaborators/accept/${invite.body.inviteToken}`)
        .set(auth(invitee.accessToken));
      expect(second.status).toBe(404);
    });
  });

  describe('GET /collaborators/document/:documentId', () => {
    it('lists collaborators for the document owner (200)', async () => {
      await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });

      const res = await request(app).get(`/collaborators/document/${draftId}`).set(auth(owner.accessToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('rejects a non-owner (403)', async () => {
      const res = await request(app).get(`/collaborators/document/${draftId}`).set(auth(stranger.accessToken));
      expect(res.status).toBe(403);
    });
  });

  describe('GET /collaborators/mine', () => {
    it("lists documents shared with the caller", async () => {
      const invite = await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });
      await request(app).post(`/collaborators/accept/${invite.body.inviteToken}`).set(auth(invitee.accessToken));

      const res = await request(app).get('/collaborators/mine').set(auth(invitee.accessToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].documentId).toBe(draftId);
    });

    it('rejects an unauthenticated request (401)', async () => {
      const res = await request(app).get('/collaborators/mine');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /collaborators/:id (update role)', () => {
    it('updates the role as the document owner (200)', async () => {
      const invite = await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });

      const res = await request(app)
        .patch(`/collaborators/${invite.body.id}`)
        .set(auth(owner.accessToken))
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('admin');
    });

    it('rejects an invalid role (400)', async () => {
      const invite = await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });

      const res = await request(app)
        .patch(`/collaborators/${invite.body.id}`)
        .set(auth(owner.accessToken))
        .send({ role: 'superuser' });
      expect(res.status).toBe(400);
    });

    it('rejects a non-owner (403)', async () => {
      const invite = await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });

      const res = await request(app)
        .patch(`/collaborators/${invite.body.id}`)
        .set(auth(stranger.accessToken))
        .send({ role: 'admin' });
      expect(res.status).toBe(403);
    });

    it('returns 404 for an unknown collaborator', async () => {
      const res = await request(app)
        .patch('/collaborators/no-such-id')
        .set(auth(owner.accessToken))
        .send({ role: 'admin' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /collaborators/:id (revoke)', () => {
    it('revokes as the document owner (204)', async () => {
      const invite = await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });

      const res = await request(app).delete(`/collaborators/${invite.body.id}`).set(auth(owner.accessToken));
      expect(res.status).toBe(204);

      const list = await request(app).get(`/collaborators/document/${draftId}`).set(auth(owner.accessToken));
      expect(list.body).toHaveLength(0);
    });

    it('rejects a non-owner (403)', async () => {
      const invite = await request(app)
        .post('/collaborators')
        .set(auth(owner.accessToken))
        .send({ documentId: draftId, collaboratorEmail: invitee.user.email, role: 'editor' });

      const res = await request(app).delete(`/collaborators/${invite.body.id}`).set(auth(stranger.accessToken));
      expect(res.status).toBe(403);
    });

    it('returns 404 for an unknown collaborator', async () => {
      const res = await request(app).delete('/collaborators/no-such-id').set(auth(owner.accessToken));
      expect(res.status).toBe(404);
    });
  });
});
