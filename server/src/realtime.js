import { Server } from 'socket.io';
import { verifyToken } from './auth/tokens.js';

// Cheap per-socket guard against runaway cursor spam (e.g. a stuck listener
// firing on every animation frame) — not a precise rate limiter.
const CURSOR_RATE_LIMIT = 20;
const CURSOR_RATE_WINDOW_MS = 1000;

function roomName(documentId) {
  return `doc:${documentId}`;
}

// Attaches a Socket.IO server to an existing http.Server for ephemeral
// document presence (roster + cursor broadcast). No persistence: state lives
// only in the in-memory `rooms` map for the life of the process, matching
// the P3.2 decision that DocumentPresence/DocumentSyncState stay no-ops.
export function attachRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // documentId -> Map<socketId, { sessionId, userId, userName, userEmail, status }>
  const rooms = new Map();

  io.use((socket, next) => {
    const auth = socket.handshake.auth || {};

    // The static demo site doesn't use realtime presence (demo mode is a
    // no-op in presenceService), so this path is gated off by default and
    // only exists so it can be exercised deliberately if that ever changes.
    if (auth.demo === true && process.env.ALLOW_DEMO_REALTIME === '1') {
      socket.data.user = { id: 'demo-user', email: 'demo@lexforge.app' };
      return next();
    }

    try {
      const decoded = verifyToken(auth.token);
      if (decoded.type !== 'access') {
        return next(new Error('Unauthorized'));
      }
      socket.data.user = { id: decoded.sub, email: decoded.email };
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

    socket.on('presence:join', ({ documentId, userName, userEmail } = {}) => {
      if (!documentId) return;

      joinedDocumentId = documentId;
      socket.join(roomName(documentId));

      if (!rooms.has(documentId)) rooms.set(documentId, new Map());
      rooms.get(documentId).set(socket.id, {
        sessionId: socket.id,
        userId: socket.data.user.id,
        userName,
        userEmail,
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

      const entry = rooms.get(documentId)?.get(socket.id);
      socket.to(roomName(documentId)).emit('presence:cursor', {
        sessionId: socket.id,
        userId: socket.data.user.id,
        userName: entry?.userName,
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
