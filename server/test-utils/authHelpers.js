import request from 'supertest';

let counter = 0;

// Registers a fresh user against the given app/prisma and returns their
// access token + public user record, for use as `Authorization: Bearer`.
export async function registerUser(app, overrides = {}) {
  counter += 1;
  const res = await request(app)
    .post('/auth/register')
    .send({
      email: overrides.email || `user${counter}@lexforge.test`,
      password: overrides.password || 'correct-horse-battery',
      name: overrides.name || `Test User ${counter}`,
    });
  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { accessToken: res.body.accessToken, user: res.body.user };
}
