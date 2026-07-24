import { describe, expect, it, beforeEach } from 'vitest';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import {
  inviteCollaborator,
  findActiveCollaboratorByEmail,
  findCollaboratorByToken,
  acceptCollaboratorInvite,
  listCollaboratorsByDocument,
  listCollaboratorsByUserId,
  listPendingCollaboratorsByEmail,
  updateCollaboratorRole,
  revokeCollaborator,
} from './collaboratorRepository.js';

describe('collaboratorRepository', () => {
  let prisma;

  beforeEach(() => {
    prisma = createFakePrismaClient();
  });

  it('invites a collaborator as pending with a token', async () => {
    const invite = await inviteCollaborator(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      collaboratorEmail: 'friend@example.com',
      role: 'editor',
      invitedBy: 'owner-1',
      inviteToken: 'token-abc',
      inviteExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    expect(invite.status).toBe('pending');
    expect(invite.collaboratorEmail).toBe('friend@example.com');
  });

  it('finds an active (non-revoked) collaborator by document and email', async () => {
    await inviteCollaborator(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      collaboratorEmail: 'friend@example.com',
      role: 'editor',
      invitedBy: 'owner-1',
    });

    const found = await findActiveCollaboratorByEmail(prisma, 'doc-1', 'friend@example.com');
    expect(found).not.toBeNull();
  });

  it('does not find a revoked collaborator as active', async () => {
    const invite = await inviteCollaborator(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      collaboratorEmail: 'friend@example.com',
      role: 'editor',
      invitedBy: 'owner-1',
    });
    await revokeCollaborator(prisma, invite.id);

    const found = await findActiveCollaboratorByEmail(prisma, 'doc-1', 'friend@example.com');
    expect(found).toBeNull();
  });

  it('finds a collaborator invite by token', async () => {
    await inviteCollaborator(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      collaboratorEmail: 'friend@example.com',
      role: 'editor',
      invitedBy: 'owner-1',
      inviteToken: 'token-abc',
    });

    const found = await findCollaboratorByToken(prisma, 'token-abc');
    expect(found.collaboratorEmail).toBe('friend@example.com');
  });

  it('accepts an invite, clearing the token and setting status', async () => {
    const invite = await inviteCollaborator(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      collaboratorEmail: 'friend@example.com',
      role: 'editor',
      invitedBy: 'owner-1',
      inviteToken: 'token-abc',
    });

    const accepted = await acceptCollaboratorInvite(prisma, invite.id, 'user-friend');
    expect(accepted.status).toBe('accepted');
    expect(accepted.collaboratorUserId).toBe('user-friend');
    expect(accepted.inviteToken).toBeNull();
  });

  it('lists collaborators for a document excluding revoked', async () => {
    const a = await inviteCollaborator(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      collaboratorEmail: 'a@example.com',
      role: 'viewer',
      invitedBy: 'owner-1',
    });
    await inviteCollaborator(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      collaboratorEmail: 'b@example.com',
      role: 'viewer',
      invitedBy: 'owner-1',
    });
    await revokeCollaborator(prisma, a.id);

    const list = await listCollaboratorsByDocument(prisma, 'doc-1');
    expect(list).toHaveLength(1);
    expect(list[0].collaboratorEmail).toBe('b@example.com');
  });

  it('lists accepted collaborations for a userId', async () => {
    const invite = await inviteCollaborator(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      collaboratorEmail: 'friend@example.com',
      role: 'editor',
      invitedBy: 'owner-1',
    });
    await acceptCollaboratorInvite(prisma, invite.id, 'user-friend');

    const list = await listCollaboratorsByUserId(prisma, 'user-friend');
    expect(list).toHaveLength(1);
  });

  it('lists pending invitations for an email', async () => {
    await inviteCollaborator(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      collaboratorEmail: 'pending@example.com',
      role: 'viewer',
      invitedBy: 'owner-1',
    });

    const list = await listPendingCollaboratorsByEmail(prisma, 'pending@example.com');
    expect(list).toHaveLength(1);
  });

  it('updates a collaborator role', async () => {
    const invite = await inviteCollaborator(prisma, {
      documentId: 'doc-1',
      documentOwnerId: 'owner-1',
      collaboratorEmail: 'friend@example.com',
      role: 'viewer',
      invitedBy: 'owner-1',
    });

    const updated = await updateCollaboratorRole(prisma, invite.id, 'admin');
    expect(updated.role).toBe('admin');
  });
});
