# Holographic Skyline Astrocartography — Design

**Date:** 2026-06-17
**Surface:** `/dashboard/map` (globe + flat-earth views)
**Reference aesthetic:** war-watch.com style dark dot-matrix 3D globe (already in place).

## Goal

On the existing 3D astrocartography globe, replace the generic procedural "city
skyline" holograms with **recognizable, correct city skylines**, drawn from a
pool of **~160 world cities**, where a city's skyline only **activates and shows
when a planetary line crosses close to it**. Provide a **category toggle** so
activated cities don't visually drown each other out.

## Decisions (locked with user)

1. **Skyline fidelity = Hybrid.** ~40 iconic cities get hand-authored landmark
   silhouettes (Eiffel lattice spire, Burj Khalifa taper, Empire State setbacks,
   Big Ben/Shard, Petronas twins, Marina Bay, etc.). The remaining ~120 get
   distinct **data-driven procedural** skylines seeded from real metadata
   (tallest-building bucket + density). The map is never empty.
2. **Activation rule = a planetary line crosses close to the city** (close
   proximity, not merely "in range"). Tighten the gate and make distance precise.
3. **Anti-crowding via a category toggle** (user: "don't want multiple cities
   drowning each other out… toggle for different areas or planetary categories").
   Primary axis = planetary **energy categories** (Career / Love / Wealth /
   Creativity / Spirituality / Transformation), derived from each city's dominant
   crossing planet. Plus de-clutter spacing + a concurrency cap.

## Components

### 1. City dataset — `src/lib/astrology/cities.ts`
```ts
type SkylineKind = "landmark" | "procedural";
interface City {
  name: string; lat: number; lon: number;
  region: "Americas" | "Europe" | "Africa-ME" | "Asia" | "Oceania";
  tier: SkylineKind;
  // procedural metadata
  height: 0|1|2|3;     // skyline height bucket (low→supertall)
  density: 0|1|2;      // sparse→dense
  // landmark profile id (only when tier==="landmark")
  landmark?: LandmarkId;
}
```
~160 entries. ~40 `landmark`. Region used for optional secondary filtering.

### 2. Landmark profiles — authored silhouettes
A small primitive DSL so skylines stay cheap wireframe holograms:
`box`, `taper` (tapered tower), `spire` (lattice/needle), `setback` (stepped),
`dome`, `twin`. Each `LandmarkId` → an ordered list of placed primitives with
relative x/width/depth/height. Rendered as glowing `EdgesGeometry` line wireframe,
matching the current holographic look (bloom + rise animation + floating label).

### 3. Crossing/activation logic — `src/lib/astrology/crossings.ts` (pure, tested)
- `distanceToSegmentDeg(lat, lon, a, b)` — point-to-segment angular distance
  (the current code only measures distance to sampled vertices, which is loose;
  this measures distance to the segment interior for precise proximity).
- `nearestCrossing(lines, lat, lon)` — min distance across all line segments +
  which planet/angle owns it.
- `activeCities(cities, lines, { thresholdDeg, categories, planets, minSepDeg, cap })`:
  1. keep cities whose nearest line distance ≤ `thresholdDeg` (~1.5° / ~165 km),
  2. assign dominant planet → energy category; drop cities not in selected
     categories / planets,
  3. compute power from `scoreLocation`,
  4. de-clutter: sort by power, greedily drop any city within `minSepDeg` of an
     already-kept higher-power city,
  5. cap to `cap` (~14).
  Returns `CitySpot[]` (existing shape) extended with `region` + `skyline` meta.

### 4. Rendering — `GlobeCanvas.tsx`
Replace `CityProjection`'s generic 4×4 box grid with a `Skyline` component that
dispatches on `spot.skyline.tier`:
- `LandmarkSkyline` — renders the authored primitive list for `spot.skyline.landmark`.
- `ProceduralSkyline` — improved generator driven by `height`/`density` buckets
  (seeded per city) instead of pure random.
Both keep the platform base, rise animation, holographic wireframe, and label.

### 5. Page wiring + toggle UI — `page.tsx`
- Replace `SAMPLE_SPOTS` with the cities dataset.
- Make `activeCategories` a real toggle bar (chips, Fragment-Mono styling, matching
  existing controls). Compose with existing planet toggles.
- Recompute active cities via `activeCities()` whenever lines/categories/planets
  change; pass to both `GlobeCanvas` and `FlatEarthCanvas`.

## Backward compatibility
`CitySpot` is shared by `GlobeCanvas` and `FlatEarthCanvas`. Extend it with
optional `region?` and `skyline?` fields so the flat map keeps rendering its
simple towers unchanged.

## Verification
- No unit-test runner is configured → verify `crossings.ts` with a small
  standalone `tsx`/node script (deterministic asserts on distance + gating).
- `npm run build` for typecheck; load `/dashboard/map` and screenshot to confirm
  skylines render, activate only on close crossings, and the category toggle
  thins the field.

## Out of scope (YAGNI)
- Photo-accurate per-building geometry for all 160 cities.
- Time-scrubber recomputation of crossings (existing scrubber stays decorative).
- New geo/texture assets.
