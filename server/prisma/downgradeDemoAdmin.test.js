import { describe, it, expect, beforeEach } from 'vitest';
import { createFakePrismaClient } from '../test-utils/fakePrismaClient.js';
import { downgradeDemoAdmin } from './downgradeDemoAdmin.js';
import { DEMO_USER_EMAIL } from './seed.js';

describe('downgradeDemoAdmin', () => {
  let prisma;

  beforeEach(() => {
    prisma = createFakePrismaClient();
  });

  it('downgrades an existing demo admin user to role "user"', async () => {
    await prisma.user.create({
      data: {
        email: DEMO_USER_EMAIL,
        passwordHash: 'irrelevant-hash',
        name: 'Demo User',
        role: 'admin',
      },
    });

    const role = await downgradeDemoAdmin(prisma);

    expect(role).toBe('user');

    const user = await prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } });
    expect(user.role).toBe('user');
  });

  it('is idempotent when run a second time', async () => {
    await prisma.user.create({
      data: {
        email: DEMO_USER_EMAIL,
        passwordHash: 'irrelevant-hash',
        name: 'Demo User',
        role: 'admin',
      },
    });

    await downgradeDemoAdmin(prisma);
    const role = await downgradeDemoAdmin(prisma);

    expect(role).toBe('user');
  });

  it('does not throw when the demo user does not exist', async () => {
    const role = await downgradeDemoAdmin(prisma);

    expect(role).toBeNull();
  });
});
