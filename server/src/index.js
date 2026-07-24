import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`server listening on port ${port}`);
  });
}
