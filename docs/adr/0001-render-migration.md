# ADR-0001: Migrate off AWS Amplify onto Render

## Status
Accepted.

## Context
The app originally ran on AWS Amplify (Gen 2): Amplify Data/AppSync,
Cognito auth, and Amplify Hosting. Amplify Gen 2's Data/AppSync layer
proved awkward for the realtime/collaboration features (see the RTC/
presence work), and Cognito added auth complexity not needed for a
small-team product. Target: a plain Node/Express API deployed on Render,
Postgres via Neon in production, hand-rolled JWT auth, and Socket.IO for
realtime — replacing AppSync subscriptions and Cognito.

## Decision
- `server/` package: Node 20, Express, ESM, vitest + supertest.
- Prisma as the ORM, targeting Postgres. Neon for the managed Postgres
  instance in production; local/dev can point at any Postgres.
- Auth: hand-rolled JWT issuance/verification.
- Realtime: Socket.IO server replacing AppSync subscriptions/presence.
- Deployment target: Render — a web service for the API (`lexforge-api`)
  and a static site for the frontend (`lexforge-demo`).
- Frontend reaches the API entirely through `VITE_API_URL`; demo mode
  (`VITE_DEMO_MODE=1`) remains a fully static, backend-free fallback.

## Alternatives rejected
- **Status quo (stay on Amplify)**: Amplify Gen 2's Data/AppSync layer had
  proven awkward for the realtime/collaboration features already being
  built, and Cognito added auth complexity not needed for a small-team
  product.
- **Supabase or Clerk**: would replace Amplify's DB/auth with another
  hosted platform dependency; rejected to keep the stack simple and fully
  owned (plain Postgres + our own JWT), avoiding a second vendor lock-in
  so soon after leaving the first one.
- **Render's paid Postgres add-on**: rejected in favor of Neon; Neon's
  free tier is sufficient for current scale and its branching model is
  useful for preview/test databases. Revisit if Neon's serverless cold
  starts become a real problem.

## Consequences
- All Amplify-coupled code (Data client, Cognito auth calls, AppSync
  subscriptions) migrated via expand → migrate → contract: the new
  server + schema stood up in parallel, reads/writes cut over feature by
  feature, then the Amplify code and infra (the `amplify/` package, its
  three Lambdas, and the `aws-amplify` / `@aws-amplify/*` dependencies)
  were removed once nothing depended on them.
- The frontend test suite's Amplify client mocks were replaced with
  fetch/Socket.IO mocks against the new API as each feature cut over.
- Free-tier operational risk: Render's free web service spins down after
  inactivity, adding cold-start latency to the first request after idle.
  Neon's serverless Postgres has its own cold-start delay on the first
  query after idle. Both are acceptable for current traffic but should be
  watched; paid tiers are the mitigation if latency becomes user-visible.
- Render's Pre-Deploy Command (for running `prisma migrate deploy`
  automatically before each release) is only available on paid instance
  types; `lexforge-api` runs on the free plan, so migrations are applied
  manually via the Render shell instead.
