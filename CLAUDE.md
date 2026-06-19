# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> ⚠️ Next.js is pinned to **16.2.6** (App Router) with **React 19.2.4** and **Tailwind v4**.
> These are newer than most training data. Before writing Next.js code, consult
> `node_modules/next/dist/docs/` and heed deprecation notices, per `AGENTS.md`.

## Commands

```bash
npm run dev      # next dev — local development server (localhost:3000)
npm run build    # next build — production build
npm run start    # next start — serve production build
npm run lint     # eslint (flat config in eslint.config.mjs)
```

There is **no automated test suite**. Verification is done via Playwright screenshot
scripts run directly with node: `node audit-ss.mjs`, `node ss4.mjs`,
`node scripts/shoot-map.mjs`. `scripts/verify-crossings.ts` validates astrocartography math.

The voice agent is a separate Python process: `cd agent && pip install -r requirements.txt && python agent.py dev`.

Path alias: `@/*` → `./src/*`.

## Architecture

Cosmora is a Next.js astrology platform: precise Hellenistic chart calculation + a
multi-provider AI "Oracle" + 3D/voice presentation. Three concerns are deliberately kept apart.

### 1. Astrology engine (`src/lib/astrology/`) — pure, deterministic, no I/O
`calculator.ts` is the core: planet positions from **astronomy-engine** (VSOP87,
arcsecond accuracy), houses/aspects/lots/profections from **Meeus "Astronomical
Algorithms"**. Everything else builds on it — `transits.ts`, `astrocartography.ts` +
`crossings.ts` + `skylines.ts` (planetary lines on a map), `zodiacalReleasing.ts`,
`pressureWindows.ts`, `marriages.ts`, `solar return`, `sidereal.ts`, `fixedStars.ts`.
`types.ts` holds shared types and the dignity/ruler tables. This layer is framework-free —
prefer extending it over inlining astrology math into routes or components.

### 2. The Oracle — multi-provider AI (`src/lib/oracle/` + `src/app/api/`)
- `models.ts` defines selectable models across **anthropic / openai / google / groq**
  (client-safe: ids, taglines, `envKey` only — never keys). Server routes pick the
  provider and read the matching `*_API_KEY` from env.
- `personas.ts` (`COSMORA_IDENTITY` + persona variants), `knowledge.ts`, and
  `src/lib/skills.ts` (`selectSkills` / `formatSkillsForPrompt`) assemble the system prompt.
- `api/chat/route.ts` is the main reading endpoint: it builds a chart-summary context
  string and exposes **Anthropic tool-use tools** (e.g. `check_planet_placement`) so the
  model queries exact chart data before interpreting. `api/oracle/stream`, `dual-oracle`,
  and `suggest` are related variants.
- The chart itself is computed client-side and POSTed to these routes — routes do not
  recompute charts.

### 3. Presentation — 3D, voice, maps (`src/components/`)
- `three/` — React Three Fiber / drei / postprocessing scenes (planets, cosmos). GPU
  capability gating in `src/lib/design/gpuTier.ts`.
- `oracle/` + `src/lib/oracle/voice.ts` / `streamingTTS.ts` / `ttsProviders.ts` — TTS via
  ElevenLabs / Azure / Google. Real-time voice uses **LiveKit** (`api/livekit/token`,
  `useOracleSession.ts`) talking to the Python `agent/agent.py`, whose `PLANET_PERSONAS`
  mirror the planet voice profiles in `voice.ts`.
- `map/` uses Leaflet for astrocartography. `landing/`, `dashboard/`, `chart/`, `ui/` are
  the rest of the component tree. Design tokens live in `src/lib/design/tokens.ts`.

### State & persistence — two distinct stores
- **Client (no auth):** user profiles, computed charts, and chat history live in
  `localStorage` via `src/lib/storage.ts` (keys `cosmora_*`). There is no user accounts /
  login system; a "profile" is just a birth record in the browser.
- **Server:** `src/lib/db.ts` opens a local **better-sqlite3** file (`cosmora.db`, WAL mode)
  and self-initializes its schema on first `getDb()`. Tables: `subscriptions`,
  `oracle_usage` (daily free-tier rate limiting), `marriage_readings`. Server-only —
  never import `db.ts` into client components.

### Subscriptions (`src/lib/subscription.ts` + `api/stripe/`)
Free vs. pro tiers, gated by `FREE_ORACLE_DAILY_LIMIT` / `FREE_PROFILE_LIMIT`. Stripe
checkout/portal/status/webhook routes manage state. **When Stripe is not configured,
`isPro` grants open access** (dev / pre-launch default) — keep that fallback in mind when
testing gated features.

### Routing
App Router under `src/app/`. UI routes live under `dashboard/` (chart, transits, oracle,
map, compatibility, marriages, solar-return, timeline, pressure, reports, settings,
upgrade, …) plus `onboarding/`. API routes under `app/api/`. `vercel.json` raises
`maxDuration` for the AI/compute routes (chat, dual-oracle, tts, chart, transits, etc.).

## Environment
Copy `.env.example` to `.env.local`. Key groups: AI providers (`ANTHROPIC_API_KEY`,
`OPENAI_API_KEY`, `GOOGLE_AI_KEY`, `GROQ_API_KEY`), TTS (`ELEVENLABS_API_KEY`, Azure,
Google), and LiveKit (`LIVEKIT_*`, plus `DEEPGRAM_API_KEY` / `CARTESIA_API_KEY` for the agent).
