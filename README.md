# LexForge

**AI-powered demand-letter drafting for law firms** — draft, collaborate on, and format legal demand letters with AI-assisted argument building, a reusable clause library, and court-rules-aware formatting.

[![CI](https://github.com/franciszver/lexforge/actions/workflows/ci.yml/badge.svg)](https://github.com/franciszver/lexforge/actions/workflows/ci.yml)
**450+ tests** · React 19 · TypeScript · AWS Amplify Gen 2

> **Live demo:** _coming soon_

## Features

- **AI argument builder** — generate structured legal arguments (introduction, numbered arguments, conclusion) from case facts, with AI suggestions to strengthen weak points
- **AI clause suggestions** — context-aware clause recommendations while drafting
- **Clause library** — reusable, categorized clauses with usage tracking and one-click insertion
- **Citation manager** — capture, format, and insert legal citations (Bluebook-style formatting)
- **Court-rules formatting** — brief & pleading formatting driven by a court-rules database (margins, captions, line numbering per jurisdiction)
- **Real-time collaboration** — live cursors, selections, and presence sync across editors; document sharing with role-based invitations and revocable share links
- **Audit logging** — every document event recorded and reportable, built for legal-compliance review

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Redux Toolkit, Tiptap (ProseMirror), Tailwind CSS |
| Backend | AWS Amplify Gen 2 — Cognito (auth), AppSync GraphQL (API + real-time subscriptions), DynamoDB |
| Serverless | 3 Lambdas: `audit-logger`, `generate-argument`, `generate-suggestion` |
| Testing | Vitest + Testing Library — 453 tests across 23 files |

## Architecture

```
┌─────────────────────────────────────────────┐
│  React SPA (Vite + Redux Toolkit + Tiptap)  │
│  editor · clause library · citations · args │
└──────────────┬──────────────────────────────┘
               │ Amplify client
   ┌───────────┼─────────────────┐
   ▼           ▼                 ▼
┌────────┐ ┌──────────────┐ ┌─────────────────┐
│Cognito │ │AppSync GraphQL│ │ Lambdas         │
│ auth   │ │ + real-time  │ │ audit-logger    │
└────────┘ │ subscriptions │ │ generate-arg    │
           └──────┬───────┘ │ generate-suggest│
                  ▼          └─────────────────┘
             ┌─────────┐
             │DynamoDB │
             └─────────┘
```

Real-time collaboration rides AppSync subscriptions: presence and cursor updates are throttled client-side and fanned out to all sessions on a document.

## Local setup

```bash
git clone https://github.com/franciszver/lexforge.git
cd lexforge
npm install
cp amplify_outputs.example.json amplify_outputs.json   # placeholder backend config
npm run dev
```

The placeholder config is enough to build and explore the UI. For a live backend (auth, data, AI), deploy an Amplify sandbox — `npx ampx sandbox` — which regenerates `amplify_outputs.json` with real resource IDs. Details in [docs/SETUP.md](docs/SETUP.md).

```bash
npx vitest run   # 450+ tests
npm run build    # production build
```

## License

MIT — see [LICENSE](LICENSE).
