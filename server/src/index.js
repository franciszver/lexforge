import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';
import { getJwtSecret } from './auth/config.js';

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  getJwtSecret(); // fail fast if misconfigured, before accepting any traffic
  const prisma = new PrismaClient();
  const app = createApp({ prisma });
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`server listening on port ${port}`);
  });
}
