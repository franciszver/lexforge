import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Explicit empty PostCSS config stops Vite from walking up to the repo
  // root's postcss.config.js, whose plugins aren't installed when only
  // server/ dependencies exist (e.g. in the server-tests CI job).
  css: {
    postcss: {},
  },
  test: {
    environment: 'node',
  },
});
