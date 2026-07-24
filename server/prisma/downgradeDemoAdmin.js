// Targeted, idempotent remediation script for the demo account privilege
// exposure (issue #55): downgrades demo@lexforge.app to role 'user' if it
// currently has an elevated role, without touching any other data. Safe to
// run repeatedly against prod. Import-safe: only executes when run directly
// (`node prisma/downgradeDemoAdmin.js`), never as a side effect of importing
// this module.

import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { DEMO_USER_EMAIL } from './seed.js';

export async function downgradeDemoAdmin(prisma) {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } });
  if (!existing) {
    console.log(`No user found for ${DEMO_USER_EMAIL}; nothing to downgrade.`);
    return null;
  }

  const user = await prisma.user.update({
    where: { email: DEMO_USER_EMAIL },
    data: { role: 'user' },
  });

  return user.role;
}

// Only run when executed directly (`node prisma/downgradeDemoAdmin.js`),
// never as a side effect of importing this module.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prisma = new PrismaClient();
  downgradeDemoAdmin(prisma)
    .then((role) => {
      console.log(`Demo user role is now: ${role}`);
    })
    .then(() => prisma.$disconnect())
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
