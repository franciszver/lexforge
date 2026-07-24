import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { io as ioClient } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { attachRealtime } from './realtime.js';
import { getJwtSecret } from './auth/config.js';

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

describe('realtime presence', () => {
  let httpServer;
  let io;
  let port;
  const clients = [];

  beforeEach(async () => {
    httpServer = createServer();
    io = attachRealtime(httpServer);
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

  it('two authed clients in one doc room see each other join', async () => {
    const a = connect(port, { token: signAccess('user-a') });
    const b = connect(port, { token: signAccess('user-b') });
    clients.push(a, b);

    await Promise.all([waitFor(a, 'connect'), waitFor(b, 'connect')]);

    a.emit('presence:join', { documentId: 'doc-1', userName: 'Alice', userEmail: 'a@example.com' });
    const rosterAfterA = await waitFor(a, 'presence:update');
    expect(rosterAfterA).toHaveLength(1);

    b.emit('presence:join', { documentId: 'doc-1', userName: 'Bob', userEmail: 'b@example.com' });
    const rosterAfterB = await waitFor(a, 'presence:update');
    expect(rosterAfterB).toHaveLength(2);
    const names = rosterAfterB.map((u) => u.userName).sort();
    expect(names).toEqual(['Alice', 'Bob']);
  });

  it('cursor event reaches the other client with sessionId attached but not the sender', async () => {
    const a = connect(port, { token: signAccess('user-a') });
    const b = connect(port, { token: signAccess('user-b') });
    clients.push(a, b);

    await Promise.all([waitFor(a, 'connect'), waitFor(b, 'connect')]);

    a.emit('presence:join', { documentId: 'doc-1', userName: 'Alice' });
    await waitFor(a, 'presence:update');
    b.emit('presence:join', { documentId: 'doc-1', userName: 'Bob' });
    await waitFor(a, 'presence:update');
    await waitFor(b, 'presence:update');

    let senderReceivedCursor = false;
    a.once('presence:cursor', () => {
      senderReceivedCursor = true;
    });

    const cursorPromise = waitFor(b, 'presence:cursor');
    a.emit('presence:cursor', {
      documentId: 'doc-1',
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
    const a = connect(port, { token: signAccess('user-a') });
    const b = connect(port, { token: signAccess('user-b') });
    clients.push(a, b);

    await Promise.all([waitFor(a, 'connect'), waitFor(b, 'connect')]);

    a.emit('presence:join', { documentId: 'doc-1', userName: 'Alice' });
    await waitFor(a, 'presence:update');
    b.emit('presence:join', { documentId: 'doc-1', userName: 'Bob' });
    await waitFor(a, 'presence:update');
    await waitFor(b, 'presence:update');

    const rosterAfterLeave = waitFor(a, 'presence:update');
    b.disconnect();
    const roster = await rosterAfterLeave;
    expect(roster).toHaveLength(1);
    expect(roster[0].userName).toBe('Alice');
  });

  it('isolates rooms by documentId', async () => {
    const a = connect(port, { token: signAccess('user-a') });
    const c = connect(port, { token: signAccess('user-c') });
    clients.push(a, c);

    await Promise.all([waitFor(a, 'connect'), waitFor(c, 'connect')]);

    a.emit('presence:join', { documentId: 'doc-1', userName: 'Alice' });
    await waitFor(a, 'presence:update');

    let cGotUpdate = false;
    c.once('presence:update', () => {
      cGotUpdate = true;
    });

    c.emit('presence:join', { documentId: 'doc-2', userName: 'Carol' });
    const cRoster = await waitFor(c, 'presence:update');
    expect(cRoster).toHaveLength(1);
    expect(cRoster[0].userName).toBe('Carol');

    // Alice joining doc-1 must not have leaked into doc-2's roster event for c
    expect(cGotUpdate).toBe(true);
  });
});
