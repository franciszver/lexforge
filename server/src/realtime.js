import { Server } from 'socket.io';
import { verifyToken } from './auth/tokens.js';
import { getDraft } from './repositories/draftRepository.js';
import { listCollaboratorsByDocument } from './repositories/collaboratorRepository.js';

// Cheap per-socket guard against runaway cursor spam (e.g. a stuck listener
// firing on every animation frame) — not a precise rate limiter.
const CURSOR_RATE_LIMIT = 20;
const CURSOR_RATE_WINDOW_MS = 1000;

function roomName(documentId) {
  return `doc:${documentId}`;
}

// Only the document owner or an accepted collaborator may join a document's
// presence room — otherwise any authenticated socket could join an
// arbitrary documentId and observe another user's roster/cursors.
async function canAccessDocument(prisma, documentId, userId) {
  const draft = await getDraft(prisma, documentId);
  if (draft && draft.userId === userId) return true;

  const collaborators = await listCollaboratorsByDocument(prisma, documentId);
  return collaborators.some((c) => c.collaboratorUserId === userId && c.status === 'accepted');
}

// Attaches a Socket.IO server to an existing http.Server for ephemeral
// document presence (roster + cursor broadcast). No persistence: state lives
// only in the in-memory `rooms` map for the life of the process, matching
// the P3.2 decision that DocumentPresence/DocumentSyncState stay no-ops.
export function attachRealtime(httpServer, { prisma } = {}) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // documentId -> Map<socketId, { sessionId, userId, userEmail, status }>
  const rooms = new Map();

  io.use((socket, next) => {
    const auth = socket.handshake.auth || {};

    // The static demo site doesn't use realtime presence (demo mode is a
    // no-op in presenceService), so this path is gated off by default and
    // only exists so it can be exercised deliberately if that ever changes.
    // Demo identity is not backed by a real user/DB row, so the document
    // ownership/collaborator check below is skipped for it too.
    if (auth.demo === true && process.env.ALLOW_DEMO_REALTIME === '1') {
      socket.data.user = { id: 'demo-user', email: 'demo@lexforge.app', isDemo: true };
      return next();
    }

    try {
      const decoded = verifyToken(auth.token);
      if (decoded.type !== 'access') {
        return next(new Error('Unauthorized'));
      }
      socket.data.user = { id: decoded.sub, email: decoded.email, isDemo: false };
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  function broadcastRoster(documentId) {
    const roster = rooms.get(documentId);
    const users = roster ? Array.from(roster.values()) : [];
    io.to(roomName(documentId)).emit('presence:update', users);
  }

  io.on('connection', (socket) => {
    let joinedDocumentId = null;
    let cursorEventTimestamps = [];

    socket.on('presence:join', async ({ documentId } = {}) => {
      if (!documentId) return;

      const user = socket.data.user;
      const authorized = user.isDemo || (await canAccessDocument(prisma, documentId, user.id));
      if (!authorized) {
        socket.emit('presence:error', { documentId, error: 'Forbidden' });
        return;
      }

      joinedDocumentId = documentId;
      socket.join(roomName(documentId));

      if (!rooms.has(documentId)) rooms.set(documentId, new Map());
      // Identity comes from the verified JWT, never from the client-supplied
      // join payload — otherwise any socket could claim to be anyone.
      rooms.get(documentId).set(socket.id, {
        sessionId: socket.id,
        userId: user.id,
        userEmail: user.email,
        status: 'viewing',
      });

      broadcastRoster(documentId);
    });

    socket.on('presence:cursor', ({ documentId, cursorPosition, selectionRange } = {}) => {
      if (!documentId || documentId !== joinedDocumentId) return;

      const now = Date.now();
      cursorEventTimestamps = cursorEventTimestamps.filter((t) => now - t < CURSOR_RATE_WINDOW_MS);
      if (cursorEventTimestamps.length >= CURSOR_RATE_LIMIT) return;
      cursorEventTimestamps.push(now);

      socket.to(roomName(documentId)).emit('presence:cursor', {
        sessionId: socket.id,
        userId: socket.data.user.id,
        cursorPosition,
        selectionRange,
      });
    });

    socket.on('presence:status', ({ documentId, status } = {}) => {
      if (!documentId || documentId !== joinedDocumentId) return;

      const entry = rooms.get(documentId)?.get(socket.id);
      if (entry) entry.status = status;
      broadcastRoster(documentId);
    });

    socket.on('disconnect', () => {
      if (!joinedDocumentId) return;

      const roster = rooms.get(joinedDocumentId);
      if (roster) {
        roster.delete(socket.id);
        if (roster.size === 0) rooms.delete(joinedDocumentId);
      }
      broadcastRoster(joinedDocumentId);
    });
  });

  return io;
}
