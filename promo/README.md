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
- `src/compositions/ZoomFrame.tsx` is the camera wrapper used by every scene that
  mounts a real page — a slow push-in via CSS `zoom` (not `transform`; see "Fixed
  rough edges" below for why). `src/compositions/PageFrame.tsx` holds the
  interaction helpers (`useFrameAction`, `clickByText`) for scripting real clicks
  (tab switches, etc.) on the real UI at specific frames — independent of which
  camera wrapper is used.
- `src/compositions/ViewportFix.tsx` forces Tailwind's `h-screen`/`min-h-screen`
  to the real composition height (see below — `100vh` doesn't resolve correctly
  inside Remotion's renderer).
- `src/tailwind-entry.css` adds an explicit `@source "../../src"` so Tailwind's
  v4 content scanner actually walks the real app's component tree for class
  names (see below — without it, almost every utility class used by the mounted
  pages was silently missing).

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

## Fixed rough edges

Three independent Remotion/Chrome-headless compatibility issues were silently
making every mounted page (not just Transits/Map) render with missing spacing,
collapsed panels, or oversized icons. All three are now worked around; see the
inline comments at each fix for the detail:

1. **Tailwind v4 wasn't scanning the real app's source for class names.**
   `@remotion/tailwind-v4`'s content auto-detection runs inside `/promo`'s
   webpack context, so it only looked around `/promo` — missing almost every
   utility class actually used by components living in `../src`. Pages rendered
   with most spacing/sizing/flex classes silently absent. Fixed with an explicit
   `@source "../../src"` in `src/tailwind-entry.css`. This was the root cause of
   most of what looked like "broken layout" — fixing it alone resolved the
   Transits aspect list, the Chart tab bar/summary row, and more.
2. **`100vh` (Tailwind's `h-screen`/`min-h-screen`) doesn't resolve to the real
   composition height inside Remotion's renderer** — it measured ~492px instead
   of 1920px regardless of composition size or wrapper, while `window.innerHeight`
   and `getBoundingClientRect()` on real ancestors correctly read 1920. This
   silently capped any `h-screen` flex layout (Chart, Transits, Oracle all use
   it) to a cramped box, collapsing flex-1 children designed to fill the frame.
   Fixed with `ViewportFix.tsx`, which force-overrides those classes to the real
   `useVideoConfig()` height via a scoped `!important` style tag.
3. **A CSS `transform` (or `perspective`) on any ancestor breaks `position: fixed`
   elements** — it makes that ancestor the containing block instead of the true
   viewport (this is correct CSS spec behavior, not a Remotion bug). Every
   mounted page renders `DashboardBg` (and some add their own vignette overlays)
   as `position: fixed`, so the original transform-based camera (`PageFrame`'s
   `scale()`/`rotateX()`) was corrupting the starfield into warped/oversized
   blobs, and collapsing Map's `fixed inset-0` root panel to a tiny box. Fixed by
   switching every scene's camera to `ZoomFrame` (`zoom` instead of `transform`),
   which doesn't trigger that CSS rule. Costs the subtle 3D tilt `PageFrame` had
   (`zoom` can't rotate) — a flat push-in is what every scene uses now.

Found and intentionally **not fixed on this branch**: a real Placidus house-cusp
bug surfaced while generating fixtures (duplicate cusps for house 2/8, 3/9, 5/11,
6/12 on the demo chart). Sidestepped by using whole-sign houses for the demo
profile instead. Worth a look on the main app — out of scope for a promo video.
