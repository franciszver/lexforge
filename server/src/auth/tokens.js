import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';
import { getJwtSecret } from './config.js';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: 'access' },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

export function signRefreshToken(user) {
  // jti makes each issued refresh token unique even when two are signed
  // within the same second (same iat), so rotation always changes the
  // stored hash instead of reusing an identical previous token/signature.
  return jwt.sign({ sub: user.id, type: 'refresh', jti: randomUUID() }, getJwtSecret(), {
    expiresIn: REFRESH_TOKEN_TTL,
  });
}

// Throws jsonwebtoken's TokenExpiredError / JsonWebTokenError on bad tokens.
export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

// Refresh tokens are high-entropy, unguessable JWTs (unlike passwords), so a
// fast deterministic hash is sufficient for detecting reuse of a rotated-out
// token and lets us look it up by equality instead of bcrypt-comparing
// against every user.
export function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
