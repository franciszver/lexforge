import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Precomputed hash of an unguessable, never-used password. Used by /auth/login
// to run a bcrypt.compare even when the email lookup misses, so unknown-email
// and wrong-password requests take the same amount of time (no user
// enumeration via response latency).
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync('lexforge-timing-safe-dummy-password', SALT_ROUNDS);
