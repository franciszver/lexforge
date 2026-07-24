import { verifyToken } from './tokens.js';

// Verifies a Bearer access token and sets req.user = { id, email, role }.
// Rejects missing/malformed headers, bad signatures, expired tokens, and
// refresh tokens presented as access tokens (via the `type` claim).
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = verifyToken(token);
    if (decoded.type !== 'access') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
