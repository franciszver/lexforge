# Setup

## Prerequisites

- Node.js 18+
- npm

## Install

```
npm install
```

## Amplify outputs

The app imports `amplify_outputs.json` (gitignored, contains real AWS backend
IDs) at `src/main.tsx`. A fresh clone won't have this file, so copy the
example to get a buildable/runnable UI:

```
cp amplify_outputs.example.json amplify_outputs.json
```

PowerShell:

```powershell
Copy-Item amplify_outputs.example.json amplify_outputs.json
```

The example file has placeholder values — it's enough to build and run the
UI, but features that call the real backend (auth, data, AI suggestions,
etc.) won't work. To get a real backend, deploy an Amplify sandbox:

```
npx ampx sandbox
```

This generates a real `amplify_outputs.json` with live backend IDs,
overwriting the placeholder copy.

## Build and test

```
npm run build
npx vitest run
```
