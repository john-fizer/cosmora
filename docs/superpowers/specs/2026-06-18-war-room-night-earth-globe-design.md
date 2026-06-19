# War-Room Night-Earth Globe — Design

**Date:** 2026-06-18
**Status:** Approved (design), pending implementation plan
**Scope:** Reskin the astrocartography globe (`/dashboard/map`, globe view only) to the
visual language of war-world.com — a photoreal night-Earth with a war-room palette —
while preserving all astrocartography meaning and the holographic city skylines.

## Goal

Make the 3D globe *look* like the war-world.com reference (realistic night-Earth, glowing
energy borders, dense dark war-room vibe) **without changing what the map means**. It stays
an astrocartography map: the user's planetary lines, power cities, and holographic city
skylines at line crossings are all preserved. This is a look-only reskin, not new data and
not a geopolitical/conflict product.

## Non-Goals

- No real geopolitical / conflict data. Colors never imply real-world alliances.
- No new HUD panels (no intel ticker, no "daily report"). HUD work is palette-only.
- **`FlatEarthCanvas` is explicitly out of scope** — a follow-up so the two views don't drift.
- No changes to astrocartography math (`astrocartography.ts`, `skylines.ts`, `crossings.ts`).

## Reference

Source is the Instagram reel by "warwatchz" (user uploads IMG_8854/8857/8858/8859).
Note: `www.war-world.com` itself is a parked domain for sale, not the live app — the
screenshots are the reference of record. Key traits to emulate: photographic night-Earth
with glowing city lights, saturated glowing borders (red/amber/green/teal), pulsing
hotspots, near-black background, monospace war-room chrome.

## Chosen Approach

**Approach A — Texture-swap**, with one borrowed idea from a terminator shader (a *fixed*
soft terminator via light placement, not a dynamic GLSL day/night material).

Rejected: (B) full dynamic day/night terminator shader — marginal payoff since the target is
essentially all-night; (C) hybrid keep-the-dot-matrix — superseded by the photoreal choice.

The per-planet astro line palette (Mars red, Jupiter amber, Saturn steel, Uranus teal, Venus
pink) already reads as the saturated war-room glow palette, so astro-tinting borders yields
the multi-color "alliance" look for free while staying true to astrocartography.

## Assets (already in repo)

- `public/textures/planets/8k_earth_nightmap.jpg` / `2k_earth_nightmap.jpg`
- `public/textures/planets/8k_earth_daymap.jpg` / `2k_earth_daymap.jpg`
- `public/textures/planets/8k_earth_clouds.jpg` / `2k_earth_clouds.jpg`
- `public/textures/planets/2k_earth_specular_map.jpg`
- `public/geo/{borders,coastlines,states,rivers}.json` (line geometry, reused)

No new assets required.

## Component Design

All changes are in **`src/app/dashboard/map/GlobeCanvas.tsx`** plus a palette pass on
**`src/app/dashboard/map/page.tsx`**.

### 1. `<Earth>` — new component (replaces dark sphere + `DotSurface`)

Replaces the dark ocean sphere (`GlobeCanvas.tsx:687–691`) and `<DotSurface>` (`:694`).
The procedural `<NightLights>` points (`:697`) are **removed** — the night-map provides
geographically-correct city lights.

- Sphere at `GLOBE_R`, `meshStandardMaterial`:
  - `emissiveMap` = night-map, `emissive` = white, `emissiveIntensity ≈ 0.9` (glowing city lights on the dark side).
  - `map` = day-map, dimmed (landform color on the lit limb).
  - specular/ocean sheen via `2k_earth_specular_map.jpg` (as `roughnessMap` or metalness routing — implementation detail for the plan).
- Textures loaded with `useLoader(THREE.TextureLoader, …)`, `colorSpace = SRGBColorSpace`
  on color maps. **GPU tiering:** 8k maps on `high`, 2k on `med`/`low` via `detectGpuTier()`;
  specular is 2k regardless.
- **Fixed terminator:** the existing lights become one dim `directionalLight` angled so the
  near limb glows warm and the far hemisphere stays deep-night. Ambient kept very low so the
  night side reads dark with city lights carrying it.

### 2. `<Clouds>` — new thin shell

Sphere at `GLOBE_R * 1.005`, clouds texture as `alphaMap` (white over transparent),
opacity ≈ 0.25, rotates slowly and independently of the globe group (own `useFrame`).

### 3. `GeoLines` — astro-tinted glowing borders

Keep fetching `borders.json` / `coastlines.json`. Extend `buildLineGeo` to attach a
**per-vertex color** buffer: for each vertex, `scoreLocation(lines, lat, lon)` → tint by the
dominant planet's color (`PLANET_COLORS`), fading toward a faint neutral where no line is
strong. Render with `vertexColors`, additive blending, low base opacity → borders read as a
subtle glowing energy web colored by the user's chart. Coastlines: thin warm-neutral glow.
`states.json` / `rivers.json` stay faint or are dropped to reduce clutter (plan decides).

### 4. `Atmosphere` — recolored fresnel

Swap the cold blues (`#2E7FFF` inner / `#1A56E8` outer) for a war-room limb: inner cyan
`#2BD4FF`, outer warm halo `#FF7A3C` at low intensity. Background stays `#010810`.

### 5. `page.tsx` — HUD palette retheme (no structural change)

Retheme blue/violet chrome to war-room tokens: near-black panels, thin amber/cyan hairline
borders, retain `Fragment Mono`. Accent shifts violet → amber/red. Replace hardcoded
blue/violet hexes (`#334466`, `rgba(50,80,160,*)`, etc.) with a small shared palette
constant. No new panels, no layout changes.

## Preserved (must not regress)

`CityProjection` holographic skylines at crossings, `AstroLineObject` lines, `BirthPulseRings`,
`EnergyHeatmap`, `OrbitalRings`, and all of `page.tsx`'s filter/category/oracle logic.

## Risks & Mitigations

- **Texture memory/load (3× large jpg):** mitigate with GPU tiering (2k default,
  8k only on `high`); night-map is the hero. Lazy/`Suspense` fallback to the current
  background during load.
- **City lights double-counting:** removing `<NightLights>` prevents procedural + texture
  lights stacking.
- **Bloom blowout:** existing `Bloom` may over-brighten emissive city lights — tune
  `emissiveIntensity` and `luminanceThreshold` together during verification.
- **Border tint cost:** `scoreLocation` per border vertex runs once in a `useMemo`; if
  vertex count is high, decimate borders or sample tint at lower resolution.

## Verification

- Run `scripts/shoot-map.mjs` against the live dev server (`localhost:3000`) to capture
  globe / detail / skyline / filtered screenshots; compare against reference IMG_8857 & IMG_8859.
- Smoke check: canvas renders, textures resolve (no 404s in page console), skylines still
  rise at crossings, birth pulse present, no regression in filter toggles.
- Purely visual feature — no unit tests added.

## Out of Scope / Follow-ups

- `FlatEarthCanvas` matching reskin (separate pass).
- Any war-room HUD additions (tickers, reports) if desired later.
