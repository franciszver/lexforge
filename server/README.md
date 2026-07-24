# lexforge-server

Express + Prisma API, deployed to Render. Postgres (Neon in production) via
`DATABASE_URL`.

## Testing strategy

Unit/API tests run with `supertest` against the app factory (`createApp()`
in `src/app.js`) with **no live database**. This scaffold has no DB-touching
code yet — `prisma/schema.prisma` is a placeholder only, and no migrations
have been run.

Real data access lands in P3.2 behind a repository layer (e.g.
`src/repositories/*.js`) that request handlers depend on. Tests will swap in
an in-memory/fake repository via dependency injection, so the suite never
needs a live Postgres connection. `npm test` must stay fast and offline.

## Scripts

- `npm run dev` — start with `node --watch`
- `npm start` — start
- `npm test` — run vitest
- `npm run prisma:generate` — regenerate the Prisma client (no DB required)
