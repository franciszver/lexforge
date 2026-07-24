import { describe, expect, it, beforeEach } from 'vitest';
import { createFakePrismaClient } from '../../test-utils/fakePrismaClient.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
} from './userRepository.js';

describe('userRepository', () => {
  let prisma;

  beforeEach(() => {
    prisma = createFakePrismaClient();
  });

  it('creates a user and returns it', async () => {
    const user = await createUser(prisma, {
      email: 'demo@lexforge.app',
      passwordHash: 'hashed',
      name: 'Demo User',
      role: 'admin',
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('demo@lexforge.app');
    expect(user.role).toBe('admin');
  });

  it('defaults role to "user" when not provided', async () => {
    const user = await createUser(prisma, {
      email: 'plain@lexforge.app',
      passwordHash: 'hashed',
    });

    expect(user.role).toBe('user');
  });

  it('finds a user by email', async () => {
    await createUser(prisma, { email: 'a@b.com', passwordHash: 'x' });

    const found = await findUserByEmail(prisma, 'a@b.com');
    expect(found).not.toBeNull();
    expect(found.email).toBe('a@b.com');
  });

  it('returns null when no user matches the email', async () => {
    const found = await findUserByEmail(prisma, 'missing@b.com');
    expect(found).toBeNull();
  });

  it('finds a user by id', async () => {
    const created = await createUser(prisma, { email: 'c@d.com', passwordHash: 'x' });

    const found = await findUserById(prisma, created.id);
    expect(found.email).toBe('c@d.com');
  });

  it('updates a user', async () => {
    const created = await createUser(prisma, { email: 'e@f.com', passwordHash: 'x' });

    const updated = await updateUser(prisma, created.id, { name: 'New Name' });
    expect(updated.name).toBe('New Name');
  });
});
