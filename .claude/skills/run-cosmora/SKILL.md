---
name: run-cosmora
description: Run, build, screenshot, and smoke-test the Cosmora Next.js app. Use when asked to start, launch, run, build, screenshot, or test Cosmora.
---

Cosmora is a Next.js 16 App Router web app (astrological intelligence platform). It is driven via a Playwright script at `.claude/skills/run-cosmora/driver.mjs`. The dev server runs on port 3000.

## Prerequisites

Node.js v24+ and npm are required. Playwright must be installed in the project:

```
npm install --save-dev playwright
npx playwright install chromium
```

These commands were run and confirmed working.

## Build

No separate build step for development. TypeScript is checked via:

```
npx tsc --noEmit
```

Zero errors expected — this is a hard project constraint.

## Run (agent path)

### 1. Start the dev server (background)

```
npm run dev
```

Wait for "Ready on http://localhost:3000". Verify with:

```
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
```

Expect `200`.

### 2. Smoke test — visit all key routes and screenshot

```
node .claude/skills/run-cosmora/driver.mjs smoke
```

Outputs `ss-home.png`, `ss-dashboard.png`, `ss-dashboard-oracle.png`, `ss-dashboard-report.png`, `ss-dashboard-transits.png` in the current directory. Screenshots are 1440×900.

### 3. Screenshot a specific route

```
node .claude/skills/run-cosmora/driver.mjs screenshot /dashboard/oracle
```

Outputs `ss-dashboard-oracle.png`.

## Run (human path)

```
npm run dev
```

Opens on `http://localhost:3000`. Navigate to `/dashboard` (redirects to onboarding if no chart data stored in the browser's localStorage).

## Key routes

| Route | Description |
|---|---|
| `/` | Marketing landing page |
| `/onboarding` | Birth data form (name, date, time, place) |
| `/dashboard` | Main hub with CTA cards |
| `/dashboard/oracle` | AI Oracle chat — multi-model (Claude/GPT-4o/Gemini), Mercury-adaptive voice, A/B/C follow-up suggestions |
| `/dashboard/chart/[planet]` | Per-planet deep-dive with inline Oracle panel |
| `/dashboard/report` | 8-chapter sequential streaming natal report |
| `/dashboard/transits` | Current sky transits with hover "Ask" Oracle links |
| `/dashboard/briefing` | Daily astrological briefing |

## Gotchas

- **Stale dev server after npm install**: If you install a new npm package while the dev server is already running, it will throw 500 errors (`Module not found`) for the new package. Kill the server (`taskkill /PID <pid> /F` on Windows) and restart it.
- **No chart = empty state**: All dashboard pages require birth data in localStorage. Without it they show "No chart found / Begin →". This is expected — the app is not broken.
- **Port 3000 already in use**: Next.js will auto-try port 3001, 3002, etc. Check terminal output for the actual port.
- **playwright package scope**: `driver.mjs` must be run from the project root (`C:\Users\John\Desktop\cosmora`) where `node_modules/playwright` exists. Running it from another directory will throw `ERR_MODULE_NOT_FOUND`.
- **Google Generative AI / OpenAI providers**: These require `GOOGLE_AI_KEY` and `OPENAI_API_KEY` in `.env.local`. Without them the model selector shows "NEEDS KEY" and those providers throw graceful in-stream errors if selected.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Module not found: Can't resolve '@google/generative-ai'` on HTTP 500 | Restart the dev server after `npm install @google/generative-ai` |
| `ERR_MODULE_NOT_FOUND: Cannot find package 'playwright'` | Run driver from project root, not from another directory |
| `curl` returns 500 on first request | Next.js is still compiling; retry after a few seconds |
| Dashboard shows "No chart found" | Expected — no localStorage data. Not a bug. |
