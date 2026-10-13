# Cosmora Promo Reel (Remotion)

A vertical (and soon 1:1 / 16:9) promo video built from Cosmora's **real, unmodified**
React components and a **real computed chart** — no mockups, no lorem ipsum. Lives on
branch `promo/cosmora-reel`, in its own `/promo` project so the main app's
`package.json`/config are untouched.

## How it works

- `/promo` is a standalone Remotion project (own `package.json`, own `node_modules`).
- `remotion.config.ts` aliases `@` to `../src`, so every composition imports the real
  app's pages/components directly (`@/app/dashboard/chart/page`, etc.) — not copies.
- `src/mocks/` is the shim layer that makes those Next.js pages mountable outside Next:
  - `next-link.tsx` / `next-navigation.ts` / `next-dynamic.tsx` — stand-ins for the
    Next.js APIs those pages import (no real Next.js server runs here).
  - `seedFixtures.ts` + `FixtureSeeder.tsx` — seeds `localStorage` through the app's
    **real** `src/lib/storage.ts` functions (not a mock of storage — the real thing),
    so every page reads a real profile/chart exactly like a real user's browser would.
  - `fetchMock.ts` — intercepts the handful of API routes these pages call
    (`/api/pressure`, `/api/transits`, `/api/chat`, …) and returns the precomputed
    fixture data / a saved Oracle answer instead of hitting a live Next.js server.
  - `publicAssetPatch.ts` — rewrites `/textures/...`, `/glyphs/...`, `/videos/...`
    etc. requests, because Remotion's own static server serves its public dir under
    `/public/...` instead of the root (unlike Next.js).
- `fixtures/generate.ts` calls Cosmora's **real astrology engine**
  (`src/lib/astrology/calculator.ts`, `transits.ts`, `pressureWindows.ts`,
  `astrocartography.ts`) to compute a real natal chart, real transits, and a real
  pressure-window report for a demo profile, and writes them to `fixtures/*.json`.
  `fixtures/oracle-answer.json` is a hand-written but chart-grounded Oracle answer
  (referencing this demo chart's actual placements) standing in for a live AI call.
- `src/compositions/PageFrame.tsx` wraps a mounted real page with a gentle CSS
  camera move (push-in / tilt) and helpers (`useFrameAction`, `clickByText`) for
  scripting real clicks (tab switches, etc.) on the real UI at specific frames.

## Scenes (current)

| id | file | what it shows |
|---|---|---|
| `HookScene` | `compositions/HookScene.tsx` | Kinetic hook line over the real `DashboardBg` starfield |
| `ChartScene` | `compositions/ChartScene.tsx` | Real 3D orrery (default tab), scripted clicks to Wheel/Aspects |
| `OracleScene` | `compositions/OracleScene.tsx` | Real Oracle page with a seeded, chart-grounded Q&A |
| `PressureScene` | `compositions/PressureScene.tsx` | Real Pressure Windows page, scripted click to reveal the real gauge/briefing |
| `TransitsScene` | `compositions/TransitsScene.tsx` | Real Transits page (list/sky-strip) |
| `MapScene` | `compositions/MapScene.tsx` | Real Astrocartography page |
| `EndCardScene` | `compositions/EndCardScene.tsx` | Logo, tagline, real `GlowButton` CTA |

Each is independently registered in `src/Root.tsx` so you can preview/render one at a
time. A `FullReel` composition that sequences all six with transitions is the next
step once the cut above is approved.

## Editing copy

- **Hook line**: `compositions/HookScene.tsx` → `HOOK_OPTIONS` array (3 options
  written; `HOOK_OPTIONS[0]` is selected — change the index to swap).
- **Oracle question/answer**: `fixtures/oracle-answer.json`.
- **End card tagline/CTA/URL**: `compositions/EndCardScene.tsx`.
- **Demo profile / birth data**: `fixtures/generate.ts` → `DEMO_PROFILE`, then
  `npm run fixtures` to regenerate every fixture from the real engine.

## Editing timing / camera

Each scene file exports a `*_DURATION` constant (frames @ 30fps) and a `<PageFrame
move={{...}}>` call controlling the camera (`scale`, `tiltX`, `tiltY`, `panX`, `panY`
as `[startValue, endValue]` pairs across the scene). `origin` controls the CSS
transform-origin (default top-center — most of these pages are built for a shorter
desktop viewport, so top-anchored zoom avoids panning into empty space below the
content).

Scripted interactions (tab clicks, etc.) use `useFrameAction(frame, async () => {...})`
in the scene file — see `ChartScene.tsx` / `PressureScene.tsx` for examples.

## Commands

```bash
cd promo
npm install              # first time only
npm run fixtures         # regenerate fixtures/*.json from the real engine
npm run studio            # remotion studio — live-preview every composition
npx remotion still src/index.ts <CompositionId> out/<name>.png --frame=<n>
npx remotion render src/index.ts <CompositionId> out/<name>.mp4
```

## Known rough edges (not yet resolved)

- **Transits / Map scenes**: both real pages render their main panel/map quite small
  when mounted outside the app's full dashboard shell (likely sized relative to a
  sidebar sibling we don't mount). Current fix is a brute-force camera zoom; worth a
  cleaner fix once the overall cut is approved.
- **Oracle streaming**: the real page's streaming text reveal is fetch/timer-driven,
  not frame-driven, so it isn't reliably reproducible frame-by-frame. We sidestepped
  this by seeding the full conversation into `localStorage` chat history directly
  (the real page loads real history on mount) instead of simulating a live stream.
- **GlassHero hero video**: tried for the Hook scene first (the real landing-page
  hero), but produced flaky/partial paints on single-frame still renders (likely
  `<video>` load-timing). Swapped to `DashboardBg` (the real dashboard starfield)
  for reliability — revisit if the hero video look is wanted specifically.
- A real **Placidus house-cusp bug** was found while generating fixtures (duplicate
  cusps for house 2/8, 3/9, 5/11, 6/12 on this demo chart) — sidestepped by using
  whole-sign houses for the demo profile. Not fixed here (out of scope for this
  branch) — worth a look on the main app.
