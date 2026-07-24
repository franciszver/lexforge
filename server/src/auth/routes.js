import { Router } from 'express';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
} from '../repositories/userRepository.js';
import { hashPassword, comparePassword, DUMMY_PASSWORD_HASH } from './passwords.js';
import { signAccessToken, signRefreshToken, verifyToken, hashRefreshToken } from './tokens.js';
import { requireAuth } from './middleware.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name ?? null, role: user.role };
}

async function issueTokens(prisma, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await updateUser(prisma, user.id, { refreshTokenHash: hashRefreshToken(refreshToken) });
  return { accessToken, refreshToken };
}

export function createAuthRouter({ prisma }) {
  const router = Router();

  router.post('/register', async (req, res) => {
    const { email, password, name } = req.body || {};

    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const existing = await findUserByEmail(prisma, email);
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(prisma, { email, passwordHash, name });
    const tokens = await issueTokens(prisma, user);

    return res.status(201).json({ user: publicUser(user), ...tokens });
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await findUserByEmail(prisma, email);
    // Always run bcrypt.compare, even on a miss, so response time doesn't
    // reveal whether the email exists.
    const ok = await comparePassword(password, user ? user.passwordHash : DUMMY_PASSWORD_HASH);

    if (!user || !ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = await issueTokens(prisma, user);
    return res.status(200).json({ user: publicUser(user), ...tokens });
  });

  router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body || {};
    if (typeof refreshToken !== 'string') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await findUserById(prisma, decoded.sub);
    if (!user || !user.refreshTokenHash || user.refreshTokenHash !== hashRefreshToken(refreshToken)) {
      // Missing/cleared/mismatched hash: token was rotated out, revoked by
      // logout, or reused after already being redeemed once.
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const tokens = await issueTokens(prisma, user);
    return res.status(200).json(tokens);
  });

  router.post('/logout', requireAuth, async (req, res) => {
    await updateUser(prisma, req.user.id, { refreshTokenHash: null });
    return res.status(204).send();
  });

  router.get('/me', requireAuth, async (req, res) => {
    const user = await findUserById(prisma, req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(200).json(publicUser(user));
  });

  return router;
}
