# LexForge Render Deployment

## What Gets Deployed

Two services are deployed to Render from this repository, auto-deploying on every push to the `main` branch:

1. **lexforge-demo** — Static React site, with demo mode enabled
2. **lexforge-demo-proxy** — Node.js proxy server for OpenRouter API calls

No AWS infrastructure. All cloud resources live on Render's free tier.

## One-Time Setup (Blueprint Path — Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Blueprint**
3. Connect your GitHub account if you haven't already (or skip if already connected)
4. Select the `franciszver/lexforge` repository
5. Render reads `render.yaml` from the repo root and shows a preview of both services
6. Render will prompt you to set the `OPENROUTER_API_KEY` (marked `sync: false` so it won't sync to version control)
   - Paste your OpenRouter API key from [OpenRouter](https://openrouter.ai/keys)
   - Do NOT commit this value anywhere
7. Click **Apply**

**Note on service names:** If `lexforge-demo` or `lexforge-demo-proxy` are already taken on Render, it will append a suffix (e.g., `-01`). In that case:
- Find the actual URLs for both services in your Render dashboard
- Update `VITE_DEMO_PROXY_URL` in the **lexforge-demo** environment variables to point to the actual proxy URL
- Update `ALLOWED_ORIGIN` in the **lexforge-demo-proxy** environment variables to point to the actual site URL
- Trigger a manual redeploy of the static site for changes to take effect

## Verify

### Proxy Service
- Open `https://<proxy-url>/healthz` in your browser
- Expect response: `{"ok":true}`
- First request after idle can take ~1 minute (free tier spin-up) — wait and refresh if needed

### Demo Site
- Open `https://<site-url>` in your browser
- Expect to see the LexForge demo login page with a banner indicating demo mode
- Sign in with any email and password
- Open or create a document
- Click **Generate Suggestions** to test the AI integration
  - First AI call after proxy idle shows a "warming up" notice for up to 60 seconds
  - Then live output streams in
  - If the proxy is unreachable, a `[DEMO MODE]` fallback message displays (still proves the site works)

## Costs

- **lexforge-demo**: free tier static site (no cost)
- **lexforge-demo-proxy**: free tier Node.js (no cost, sleeps after ~15 min idle)
- **OpenRouter API**: free models only (allowlisted server-side, no charges)

## Key Rotation

To rotate the OpenRouter API key:

1. Generate a new key in [OpenRouter](https://openrouter.ai/keys)
2. Go to your Render dashboard → **lexforge-demo-proxy** service
3. Click **Environment** and update the `OPENROUTER_API_KEY` value
4. Save and Render redeploys the proxy automatically
