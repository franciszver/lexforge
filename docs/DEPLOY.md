# LexForge Render Deployment

## What Gets Deployed

Two services are deployed to Render from this repository, auto-deploying on every push to the `main` branch:

1. **lexforge-demo** — Static React site, with demo mode enabled
2. **lexforge-api** — Node/Express + Prisma API server (auth, data, AI, Socket.IO realtime)

No AWS infrastructure. The API's Postgres database is hosted on [Neon](https://neon.tech). All Render services run on the free tier.

## One-Time Setup

### 1. Provision Postgres on Neon

1. Create a project at [Neon](https://neon.tech) (free tier)
2. Copy the pooled connection string — this is `DATABASE_URL`

### 2. Generate a JWT secret

```
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Save the output — this is `JWT_SECRET`. Treat it like a password; do not commit it anywhere.

### 3. Apply the Blueprint

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Blueprint**
3. Connect your GitHub account if you haven't already (or skip if already connected)
4. Select the `franciszver/lexforge` repository
5. Render reads `render.yaml` from the repo root and shows a preview of both services
6. Render will prompt for the env vars marked `sync: false` on **lexforge-api**:
   - `DATABASE_URL` — the Neon connection string from step 1
   - `JWT_SECRET` — the value generated in step 2
   - `OPENROUTER_API_KEY` — from [OpenRouter](https://openrouter.ai/keys)
7. Click **Apply**

**Note on service names:** If `lexforge-demo` or `lexforge-api` are already taken on Render, it will append a suffix (e.g., `-01`). In that case:
- Find the actual URLs for both services in your Render dashboard
- Update `VITE_API_URL` in the **lexforge-demo** environment variables to point to the actual API URL
- Update `ALLOWED_ORIGIN` in the **lexforge-api** environment variables to point to the actual site URL
- Trigger a manual redeploy of both services for changes to take effect

### 4. Run migrations

Render's **Pre-Deploy Command** (`preDeployCommand` in `render.yaml`) only runs on paid instance types, and `lexforge-api` is on the free plan — so it isn't used here. Run migrations manually instead, once after the first deploy and again after any schema change:

- Render Dashboard → **lexforge-api** → **Shell**, then:
  ```
  npx prisma migrate deploy
  ```

If `lexforge-api` moves to a paid plan later, migrations can be automated by adding to `render.yaml`:
```yaml
preDeployCommand: npx prisma migrate deploy
```

## Verify

### API Service
- Open `https://<api-url>/healthz` in your browser
- Expect response: `{"ok":true}`
- First request after idle can take ~1 minute (free tier spin-up) — wait and refresh if needed

### Demo Site
- Open `https://<site-url>` in your browser
- Expect to see the LexForge demo login page with a banner indicating demo mode
- Sign in with any email and password
- Open or create a document
- Click **Generate Suggestions** to test the AI integration
  - First AI call after API idle shows a "warming up" notice for up to 60 seconds
  - Then the live AI output appears (single response, not streamed)
  - If the API is unreachable, a `[DEMO MODE]` fallback message displays (still proves the site works)

## Costs

- **lexforge-demo**: free tier static site (no cost)
- **lexforge-api**: free tier Node.js (no cost, sleeps after ~15 min idle)
- **Neon Postgres**: free tier (no cost; serverless cold start on first query after idle)
- **OpenRouter API**: free models only (allowlisted server-side, no charges)

## Key Rotation

To rotate the OpenRouter API key:

1. Generate a new key in [OpenRouter](https://openrouter.ai/keys)
2. Go to your Render dashboard → **lexforge-api** service
3. Click **Environment** and update the `OPENROUTER_API_KEY` value
4. Save and Render redeploys the API automatically

To rotate `JWT_SECRET` (invalidates all existing sessions):

1. Generate a new value: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
2. Go to your Render dashboard → **lexforge-api** service → **Environment** and update `JWT_SECRET`
3. Save and Render redeploys the API automatically
