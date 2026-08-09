# Observatory — Zero Point + Lit Nodes — Design

## Goal

A new visualization room (`dashboard/observatory`) where the user's natal chart
renders as a fixed "zero point" origin, and their Chronicle life events render as
glowing "lit nodes" positioned around it by which natal points they astrologically
activate. This is the first buildable slice of the larger Cosmos Engine / Kazmora
vision — a pure client-side rendering layer over data that already exists, with no
new backend, no graph database, and no agent orchestration.

## Background

Cosmora already has two pieces this design builds directly on top of:

- **Natal chart rendering** — `src/components/three/SolarSystemOrrery.tsx` computes
  3D positions from planet longitude via `lonToVec3(lon: number, radius: number):
  THREE.Vector3` (currently file-private). Observatory needs the same longitude→3D
  conversion for its fixed natal anchors, but composes its own scene rather than
  reusing the orrery's component tree directly (Observatory is a distinct room, per
  the Cosmos Engine docs' own framing — different camera, different composition,
  different purpose from the orrery's chart-inspection UI).
- **Sky-state per event** — `src/lib/chronicle/sky-state.ts`'s `computeSkyState(chart,
  profile, date, precision): SkyState` already computes, for any date, which natal
  points are activated and how strongly. The relevant field is
  `SkyState.transitHits: TransitHit[]`, where each `TransitHit` has:
  ```typescript
  interface TransitHit {
    transitingBody: PlanetName;
    aspect: AspectName;       // "conjunction" | "sextile" | "square" | "trine" | "opposition"
    natalPoint: string;       // PlanetName, or "Ascendant" | "Midheaven"
    orb: number;               // degrees of separation from exact — smaller = stronger
    applying: boolean;
    natalHouse: number;
  }
  ```
  This is called once per Chronicle event at `event.startsAt` (respecting
  `event.datePrecision`) — no new astrology computation is needed.

## Non-goals

- No graph database — this reads `ChartData` and `LifeEvent[]` directly from
  localStorage (via existing `getCachedChart` / Chronicle storage helpers), same as
  every other Cosmora page.
- No multi-agent council, no probability/forecast layer, no Cinema Room — those are
  separate, much larger pieces of the Cosmos Engine doc set, explicitly deferred.
- No time-scrubber for v1 — all of a profile's Chronicle events render simultaneously.
  Scrubbing through time is a natural follow-up once this baseline is live, not part
  of this slice.
- No synastry / cross-chart interaction layer (Kazmora's "Interaction Layer") — this
  design is single-chart only.

## Data flow

1. On mount, load the active profile's `ChartData` (`getCachedChart`) and its
   Chronicle events (`getChronicle(profileId).events`) — both already in
   localStorage; no new fetch.
2. For each `LifeEvent`, call `computeSkyState(chart, profile, event.startsAt,
   event.datePrecision)` and take `.transitHits`.
3. Compute each event's 3D position as the orb-weighted average of the 3D positions
   (via the longitude→3D conversion) of the natal points named in its `transitHits`,
   offset outward from the natal anchor ring so nodes don't collide with the fixed
   points themselves. Events with no transit hits (rare, but possible for very
   low-orb-only signatures) fall back to a position derived from their dominant
   `dasha`/`firdaria`/`profection.lordOfYear` planet instead, so no event is ever
   unplaced.
4. Luminosity (emissive intensity / bloom strength) is driven by
   `event.emotionalIntensity` (already 0–1, no transform needed).
5. Node color is the existing `PLANET_COLORS[dominantPlanet]` (from
   `src/lib/astrology/astrocartography.ts`, the same convention already used by the
   astrocartography map and the daily briefing page) for whichever activated natal
   point has the smallest orb in that event's `transitHits`.

## Interaction

Clicking a lit node opens a detail panel showing the event's title, date, a
narrative excerpt, and which natal points it activates (planet + aspect + orb) —
directly satisfying the Cosmos Engine docs' own acceptance criterion: "a user can
click any node and see why it exists." No editing from this view in v1 — it's a
read-only visualization; edits still happen in `dashboard/chronicle`.

## Testing / verification

No automated test suite exists for Cosmora's visual/3D code today (consistent with
`GlobeCanvas.tsx` / `FlatEarthCanvas.tsx`, verified manually via the project's
Playwright screenshot scripts). Verification for this feature:
- `npx tsc --noEmit` — clean typecheck.
- A Playwright screenshot script (matching `scripts/shoot-map.mjs`'s pattern) that
  seeds a demo profile with sample Chronicle events, loads `/dashboard/observatory`,
  and screenshots the result — confirming nodes render, are positioned near their
  activating natal points, and vary visibly in brightness by intensity.
- Manual click-through to confirm the detail panel opens with correct event data.

## Relationship to the historical-figures backlog (separate spec)

This design is intentionally scoped to a single user's own chart and their own
Chronicle events. The historical-figures chart backlog and correlation-discovery
engine (Supabase-backed, covering public figures' verified life events) is a
separate subsystem with its own spec — Observatory does not depend on it, though a
future version could let a user overlay a historical figure's chart in the same
scene once both pieces exist.
