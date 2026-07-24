import rateLimit from 'express-rate-limit';

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// One shared limiter instance is meant to be mounted on /register, /login,
// and /refresh so their budgets are combined per IP (not /me or /logout,
// which need to keep working for an already-authenticated user even if
// their login attempts got throttled).
export function createAuthRateLimiter({ max } = {}) {
  const resolvedMax = max ?? (Number(process.env.AUTH_RATE_LIMIT_MAX) || 20);

  return rateLimit({
    windowMs: WINDOW_MS,
    max: resolvedMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ error: 'Too many requests, please try again later.' });
    },
  });
}
