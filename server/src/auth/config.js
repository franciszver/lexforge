// Central JWT secret lookup. Real secret always comes from JWT_SECRET; a
// fixed fallback is only permitted under NODE_ENV=test so the test suite
// never needs a real secret configured. Any other environment (including
// production and plain `npm run dev`) throws immediately if it's missing,
// so misconfiguration is caught at startup instead of at first request.
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'test') {
    return 'test-only-jwt-secret-do-not-use-in-production';
  }
  throw new Error('JWT_SECRET environment variable is required');
}
