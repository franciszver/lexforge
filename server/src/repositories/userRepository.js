// Repository for the User aggregate. Functions take a PrismaClient (or a
// fake with the same surface) as their first argument so tests can inject
// an in-memory stub instead of a live DB connection.

export async function createUser(prisma, { email, passwordHash, name, role }) {
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      name: name ?? null,
      role: role ?? 'user',
    },
  });
}

export async function findUserByEmail(prisma, email) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(prisma, id) {
  return prisma.user.findUnique({ where: { id } });
}

export async function updateUser(prisma, id, data) {
  return prisma.user.update({ where: { id }, data });
}
