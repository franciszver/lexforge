import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { io as ioClient } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { attachRealtime } from './realtime.js';
import { getJwtSecret } from './auth/config.js';
import { createFakePrismaClient } from '../test-utils/fakePrismaClient.js';

function signAccess(sub, overrides = {}) {
  return jwt.sign({ sub, email: `${sub}@example.com`, role: 'user', type: 'access', ...overrides }, getJwtSecret(), {
    expiresIn: '15m',
  });
}

function connect(port, auth) {
  return ioClient(`http://localhost:${port}`, {
    auth,
    reconnection: false,
    forceNew: true,
    transports: ['websocket'],
  });
}

function waitFor(socket, event, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeout);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

// Resolves with `fallback` if `event` doesn't fire within `timeout` — used to
// assert an event does NOT happen without slowing the suite down.
function waitForOrTimeout(socket, event, timeout, fallback) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), timeout);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe('realtime presence', () => {
  let httpServer;
  let io;
  let port;
  let prisma;
  const clients = [];

  beforeEach(async () => {
    prisma = createFakePrismaClient();
    httpServer = createServer();
    io = attachRealtime(httpServer, { prisma });
    await new Promise((resolve) => httpServer.listen(0, resolve));
    port = httpServer.address().port;
  });

  afterEach(async () => {
    for (const c of clients) {
      if (c.connected) c.disconnect();
    }
    clients.length = 0;
    io.close();
    await new Promise((resolve) => httpServer.close(resolve));
  });

  it('rejects a connection with a missing token', async () => {
    const client = connect(port, {});
    clients.push(client);

    const err = await waitFor(client, 'connect_error');
    expect(err.message).toMatch(/unauthorized/i);
  });

  it('rejects a connection with a bad token', async () => {
    const client = connect(port, { token: 'not-a-real-token' });
    clients.push(client);

    const err = await waitFor(client, 'connect_error');
    expect(err.message).toMatch(/unauthorized/i);
  });

  it('rejects a refresh token presented as an access token', async () => {
    const badToken = jwt.sign({ sub: 'user-1', type: 'refresh' }, getJwtSecret(), { expiresIn: '30d' });
    const client = connect(port, { token: badToken });
    clients.push(client);

    const err = await waitFor(client, 'connect_error');
    expect(err.message).toMatch(/unauthorized/i);
  });

  describe('document access control', () => {
    it('denies presence:join for an authed user who is neither owner nor an accepted collaborator', async () => {
      const draft = await prisma.draft.create({ data: { userId: 'owner-1', title: 'Owned doc' } });

      const outsider = connect(port, { token: signAccess('outsider-1') });
      clients.push(outsider);
      await waitFor(outsider, 'connect');

      const errorPromise = waitFor(outsider, 'presence:error');
      const rosterPromise = waitForOrTimeout(outsider, 'presence:update', 300, null);

      outsider.emit('presence:join', { documentId: draft.id, userName: 'Outsider' });

      const error = await errorPromise;
      expect(error.documentId).toBe(draft.id);

      // Never got added to the room, so no roster broadcast reaches it either.
      expect(await rosterPromise).toBeNull();
    });

    it('does not let an unauthorized join leak into another member roster', async () => {
      const draft = await prisma.draft.create({ data: { userId: 'owner-2', title: 'Owned doc 2' } });

      const owner = connect(port, { token: signAccess('owner-2') });
      const outsider = connect(port, { token: signAccess('outsider-2') });
      clients.push(owner, outsider);
      await Promise.all([waitFor(owner, 'connect'), waitFor(outsider, 'connect')]);

      owner.emit('presence:join', { documentId: draft.id });
      const rosterAfterOwner = await waitFor(owner, 'presence:update');
      expect(rosterAfterOwner).toHaveLength(1);

      const nextRosterOrTimeout = waitForOrTimeout(owner, 'presence:update', 300, null);
      outsider.emit('presence:join', { documentId: draft.id });
      expect(await nextRosterOrTimeout).toBeNull();
    });

    it('allows the document owner to join', async () => {
      const draft = await prisma.draft.create({ data: { userId: 'owner-3', title: 'Owned doc 3' } });

      const owner = connect(port, { token: signAccess('owner-3') });
      clients.push(owner);
      await waitFor(owner, 'connect');

      owner.emit('presence:join', { documentId: draft.id });
      const roster = await waitFor(owner, 'presence:update');
      expect(roster).toHaveLength(1);
      expect(roster[0].userId).toBe('owner-3');
    });

    it('allows an accepted collaborator to join', async () => {
      const draft = await prisma.draft.create({ data: { userId: 'owner-4', title: 'Owned doc 4' } });
      await prisma.documentCollaborator.create({
        data: {
          documentId: draft.id,
          collaboratorUserId: 'collab-4',
          collaboratorEmail: 'collab-4@example.com',
          role: 'editor',
          status: 'accepted',
        },
      });

      const collaborator = connect(port, { token: signAccess('collab-4') });
      clients.push(collaborator);
      await waitFor(collaborator, 'connect');

      collaborator.emit('presence:join', { documentId: draft.id });
      const roster = await waitFor(collaborator, 'presence:update');
      expect(roster).toHaveLength(1);
      expect(roster[0].userId).toBe('collab-4');
    });

    it('denies a pending (not yet accepted) collaborator', async () => {
      const draft = await prisma.draft.create({ data: { userId: 'owner-5', title: 'Owned doc 5' } });
      await prisma.documentCollaborator.create({
        data: {
          documentId: draft.id,
          collaboratorUserId: 'pending-5',
          collaboratorEmail: 'pending-5@example.com',
          role: 'editor',
          status: 'pending',
        },
      });

      const pendingCollaborator = connect(port, { token: signAccess('pending-5') });
      clients.push(pendingCollaborator);
      await waitFor(pendingCollaborator, 'connect');

      const errorPromise = waitFor(pendingCollaborator, 'presence:error');
      pendingCollaborator.emit('presence:join', { documentId: draft.id });
      const error = await errorPromise;
      expect(error.documentId).toBe(draft.id);
    });
  });

  describe('server-authoritative identity', () => {
    it('roster entries carry the JWT identity even when the client sends a spoofed userName/userEmail', async () => {
      const draft = await prisma.draft.create({ data: { userId: 'owner-6', title: 'Owned doc 6' } });

      const owner = connect(port, { token: signAccess('owner-6') });
      clients.push(owner);
      await waitFor(owner, 'connect');

      owner.emit('presence:join', {
        documentId: draft.id,
        userName: 'Totally Not Owner-6',
        userEmail: 'spoofed@evil.example',
      });
      const roster = await waitFor(owner, 'presence:update');

      expect(roster).toHaveLength(1);
      expect(roster[0].userId).toBe('owner-6');
      expect(roster[0].userEmail).toBe('owner-6@example.com'); // from the JWT, not the payload
      expect(roster[0].userEmail).not.toBe('spoofed@evil.example');
    });
  });

  it('two authed clients in one doc room see each other join', async () => {
    const draft = await prisma.draft.create({ data: { userId: 'user-a', title: 'Shared doc' } });
    await prisma.documentCollaborator.create({
      data: {
        documentId: draft.id,
        collaboratorUserId: 'user-b',
        collaboratorEmail: 'user-b@example.com',
        role: 'editor',
        status: 'accepted',
      },
    });

    const a = connect(port, { token: signAccess('user-a') });
    const b = connect(port, { token: signAccess('user-b') });
    clients.push(a, b);

    await Promise.all([waitFor(a, 'connect'), waitFor(b, 'connect')]);

    a.emit('presence:join', { documentId: draft.id });
    const rosterAfterA = await waitFor(a, 'presence:update');
    expect(rosterAfterA).toHaveLength(1);

    b.emit('presence:join', { documentId: draft.id });
    const rosterAfterB = await waitFor(a, 'presence:update');
    expect(rosterAfterB).toHaveLength(2);
    const userIds = rosterAfterB.map((u) => u.userId).sort();
    expect(userIds).toEqual(['user-a', 'user-b']);
  });

  it('cursor event reaches the other client with sessionId attached but not the sender', async () => {
    const draft = await prisma.draft.create({ data: { userId: 'user-a', title: 'Shared doc 2' } });
    await prisma.documentCollaborator.create({
      data: {
        documentId: draft.id,
        collaboratorUserId: 'user-b',
        collaboratorEmail: 'user-b@example.com',
        role: 'editor',
        status: 'accepted',
      },
    });

    const a = connect(port, { token: signAccess('user-a') });
    const b = connect(port, { token: signAccess('user-b') });
    clients.push(a, b);

    await Promise.all([waitFor(a, 'connect'), waitFor(b, 'connect')]);

    a.emit('presence:join', { documentId: draft.id });
    await waitFor(a, 'presence:update');
    b.emit('presence:join', { documentId: draft.id });
    await waitFor(a, 'presence:update');
    await waitFor(b, 'presence:update');

    let senderReceivedCursor = false;
    a.once('presence:cursor', () => {
      senderReceivedCursor = true;
    });

    const cursorPromise = waitFor(b, 'presence:cursor');
    a.emit('presence:cursor', {
      documentId: draft.id,
      cursorPosition: { line: 0, column: 5 },
      selectionRange: null,
    });

    const received = await cursorPromise;
    expect(received.sessionId).toBe(a.id);
    expect(received.userId).toBe('user-a');
    expect(received.cursorPosition).toEqual({ line: 0, column: 5 });

    // give the sender a beat to (not) receive its own event
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(senderReceivedCursor).toBe(false);
  });

  it('disconnect updates the roster for remaining members', async () => {
    const draft = await prisma.draft.create({ data: { userId: 'user-a', title: 'Shared doc 3' } });
    await prisma.documentCollaborator.create({
      data: {
        documentId: draft.id,
        collaboratorUserId: 'user-b',
        collaboratorEmail: 'user-b@example.com',
        role: 'editor',
        status: 'accepted',
      },
    });

    const a = connect(port, { token: signAccess('user-a') });
    const b = connect(port, { token: signAccess('user-b') });
    clients.push(a, b);

    await Promise.all([waitFor(a, 'connect'), waitFor(b, 'connect')]);

    a.emit('presence:join', { documentId: draft.id });
    await waitFor(a, 'presence:update');
    b.emit('presence:join', { documentId: draft.id });
    await waitFor(a, 'presence:update');
    await waitFor(b, 'presence:update');

    const rosterAfterLeave = waitFor(a, 'presence:update');
    b.disconnect();
    const roster = await rosterAfterLeave;
    expect(roster).toHaveLength(1);
    expect(roster[0].userId).toBe('user-a');
  });

  it('isolates rooms by documentId', async () => {
    const draft1 = await prisma.draft.create({ data: { userId: 'user-a', title: 'Doc 1' } });
    const draft2 = await prisma.draft.create({ data: { userId: 'user-c', title: 'Doc 2' } });

    const a = connect(port, { token: signAccess('user-a') });
    const c = connect(port, { token: signAccess('user-c') });
    clients.push(a, c);

    await Promise.all([waitFor(a, 'connect'), waitFor(c, 'connect')]);

    a.emit('presence:join', { documentId: draft1.id });
    await waitFor(a, 'presence:update');

    let cGotUpdate = false;
    c.once('presence:update', () => {
      cGotUpdate = true;
    });

    c.emit('presence:join', { documentId: draft2.id });
    const cRoster = await waitFor(c, 'presence:update');
    expect(cRoster).toHaveLength(1);
    expect(cRoster[0].userId).toBe('user-c');

    // Alice joining doc-1 must not have leaked into doc-2's roster event for c
    expect(cGotUpdate).toBe(true);
  });
});
