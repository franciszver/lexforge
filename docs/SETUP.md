# Setup

## Prerequisites

- Node.js 18+
- npm

## Install

```
npm install
```

## Build and test

```
npm run build
npx vitest run
```

The build and tests run out of the box in demo mode — no backend or env vars
required.

## Optional: run the server

The frontend can talk to a local API server instead of demo mode. See
`server/README.md` for details; in short:

```
cd server
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, OPENROUTER_API_KEY
npm install
npx prisma generate
npm run dev
```

Then run the frontend against it:

```
VITE_API_URL=http://localhost:3001 npm run dev
```

### Server tests

```
cd server
npm test
```
