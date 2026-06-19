# War-Room Night-Earth Globe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the astrocartography globe (`/dashboard/map`, globe view) into a photoreal night-Earth with a war-room palette, preserving astrocartography meaning and the holographic city skylines.

**Architecture:** Approach A (texture-swap). Replace the stylized blue dot-matrix sphere with a real Earth mesh built from textures already in `public/textures/planets/` (night-map emissive, day-map color, specular oceans, cloud shell), lit by a single fixed directional light for a warm near-limb terminator. Border lines are tinted per-vertex by the user's dominant planet energy. The atmosphere fresnel and HUD chrome are recolored to a shared war-room palette. All astro overlays (lines, skylines, birth pulse, energy heatmap) are preserved.

**Tech Stack:** Next.js 16.2.6 (App Router), React 19, TypeScript (strict), three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing.

## Global Constraints

- **Look-only reskin.** No real geopolitical/conflict data; colors never imply real alliances.
- **No new HUD panels.** HUD work is palette-only — no tickers, no reports.
- **`FlatEarthCanvas` is out of scope** — do not modify `src/app/dashboard/map/FlatEarthCanvas.tsx`.
- **No changes to astrocartography math** — do not modify `astrocartography.ts`, `skylines.ts`, `crossings.ts`, `cities.ts`.
- **Reuse existing assets only** — no new image/GeoJSON files.
- **Preserve:** `CityProjection` (holographic skylines), `AstroLineObject`, `BirthPulseRings`, `EnergyHeatmap`, `OrbitalRings`, and all `page.tsx` filter/category/oracle logic.
- **GPU tiering:** `detectGpuTier()` returns `"high" | "low"`; 8k textures on `high`, 2k on `low` (specular always 2k).
- TypeScript is `strict`. Path alias `@/*` → `./src/*`. Tests run via Playwright/node scripts; there is no Jest/Vitest runner configured — pure-logic tests are written as standalone `node`-executable `.mjs`/`.ts` assertion scripts under `scripts/` (run with `npx tsx`).

## File Structure

- **Create** `src/app/dashboard/map/warRoomPalette.ts` — shared war-room color tokens (consumed by `GlobeCanvas.tsx` and `page.tsx`).
- **Create** `src/app/dashboard/map/earthTextures.ts` — pure `earthTextureSet(tier)` helper mapping GPU tier → texture URLs.
- **Create** `src/app/dashboard/map/borderTint.ts` — pure `dominantTintAt(lines, lat, lon)` helper returning an `{r,g,b}` color or `null`.
- **Modify** `src/app/dashboard/map/GlobeCanvas.tsx` — add `<Earth>`/`<Clouds>`, remove `DotSurface`/`NightLights`/dark sphere, tint `GeoLines`, recolor `Atmosphere`, adjust lights.
- **Modify** `src/app/dashboard/map/page.tsx` — retheme HUD hexes to palette tokens.
- **Create** `scripts/test-earthTextures.ts`, `scripts/test-borderTint.ts` — assertion scripts for the pure helpers.

> **Verification note:** Three.js material/shader output cannot be meaningfully unit-tested. Pure logic (`earthTextureSet`, `dominantTintAt`) gets real assertion tests. Visual tasks are verified with `scripts/shoot-map.mjs` screenshots compared against the reference images. Each visual task's "test" step is a screenshot + checklist.

---

### Task 1: War-room palette module

**Files:**
- Create: `src/app/dashboard/map/warRoomPalette.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `WAR_ROOM` constant — `{ bg, panel, hairline, textDim, textMid, accent, accentWarm, limbInner, limbOuter, coastGlow }` (all `string` hex/rgba).

- [ ] **Step 1: Create the palette module**

```ts
// src/app/dashboard/map/warRoomPalette.ts
/** Shared war-room color tokens for the night-Earth map reskin. */
export const WAR_ROOM = {
  bg:         "#010810", // near-black background (unchanged from current)
  panel:      "rgba(4,10,20,0.72)",
  hairline:   "rgba(255,138,60,0.22)", // amber hairline borders
  textDim:    "#5A4A3A",
  textMid:    "#C9A06A",
  accent:     "#FF7A3C", // warm amber accent (replaces violet)
  accentWarm: "#FFB347",
  limbInner:  "#2BD4FF", // atmosphere inner cyan
  limbOuter:  "#FF7A3C", // atmosphere outer warm halo
  coastGlow:  "#FFB37A", // thin warm coastline glow
} as const;

export type WarRoomPalette = typeof WAR_ROOM;
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd /c/Users/John/Desktop/cosmora && npx tsc --noEmit -p tsconfig.json`
Expected: no new errors referencing `warRoomPalette.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/map/warRoomPalette.ts
git commit -m "feat(map): add shared war-room palette tokens"
```

---

### Task 2: Earth texture-set helper (pure, tested)

**Files:**
- Create: `src/app/dashboard/map/earthTextures.ts`
- Test: `scripts/test-earthTextures.ts`

**Interfaces:**
- Consumes: `GpuTier` from `@/lib/design/gpuTier`.
- Produces: `earthTextureSet(tier: GpuTier): { night: string; day: string; clouds: string; specular: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/test-earthTextures.ts
import assert from "node:assert";
import { earthTextureSet } from "../src/app/dashboard/map/earthTextures";

const high = earthTextureSet("high");
assert.equal(high.night, "/textures/planets/8k_earth_nightmap.jpg");
assert.equal(high.day,   "/textures/planets/8k_earth_daymap.jpg");
assert.equal(high.clouds,"/textures/planets/8k_earth_clouds.jpg");
assert.equal(high.specular, "/textures/planets/2k_earth_specular_map.jpg");

const low = earthTextureSet("low");
assert.equal(low.night, "/textures/planets/2k_earth_nightmap.jpg");
assert.equal(low.day,   "/textures/planets/2k_earth_daymap.jpg");
assert.equal(low.clouds,"/textures/planets/2k_earth_clouds.jpg");
assert.equal(low.specular, "/textures/planets/2k_earth_specular_map.jpg");

console.log("earthTextures: OK");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /c/Users/John/Desktop/cosmora && npx tsx scripts/test-earthTextures.ts`
Expected: FAIL — cannot find module `earthTextures`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/dashboard/map/earthTextures.ts
import type { GpuTier } from "@/lib/design/gpuTier";

export interface EarthTextureSet {
  night: string;
  day: string;
  clouds: string;
  specular: string;
}

/** Map GPU tier → Earth texture URLs. 8k on high, 2k on low. Specular is always 2k. */
export function earthTextureSet(tier: GpuTier): EarthTextureSet {
  const res = tier === "high" ? "8k" : "2k";
  return {
    night:    `/textures/planets/${res}_earth_nightmap.jpg`,
    day:      `/textures/planets/${res}_earth_daymap.jpg`,
    clouds:   `/textures/planets/${res}_earth_clouds.jpg`,
    specular: `/textures/planets/2k_earth_specular_map.jpg`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /c/Users/John/Desktop/cosmora && npx tsx scripts/test-earthTextures.ts`
Expected: PASS — prints `earthTextures: OK`.

- [ ] **Step 5: Verify the 8k texture files actually exist**

Run: `ls public/textures/planets/8k_earth_nightmap.jpg public/textures/planets/8k_earth_daymap.jpg public/textures/planets/8k_earth_clouds.jpg public/textures/planets/2k_earth_specular_map.jpg`
Expected: all four paths listed (no "No such file").

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/map/earthTextures.ts scripts/test-earthTextures.ts
git commit -m "feat(map): add GPU-tiered Earth texture-set helper"
```

---

### Task 3: Border astro-tint helper (pure, tested)

**Files:**
- Create: `src/app/dashboard/map/borderTint.ts`
- Test: `scripts/test-borderTint.ts`

**Interfaces:**
- Consumes: `AstroLine`, `scoreLocation`, `PLANET_COLORS` from `@/lib/astrology/astrocartography`.
- Produces: `dominantTintAt(lines: AstroLine[], lat: number, lon: number, minInfluence?: number): { r: number; g: number; b: number } | null` — `r/g/b` are 0–1 floats from the dominant planet's hex color, scaled by influence; `null` when no line exceeds `minInfluence` (default `0.12`).

- [ ] **Step 1: Write the failing test**

```ts
// scripts/test-borderTint.ts
import assert from "node:assert";
import { dominantTintAt } from "../src/app/dashboard/map/borderTint";
import type { AstroLine } from "../src/lib/astrology/astrocartography";

// No lines → null everywhere.
assert.equal(dominantTintAt([], 34, -118), null);

// A single strong Mars MC line near a point should tint reddish (Mars color #ef4444).
// Build a vertical MC line segment passing through lon ≈ -118.
const marsLine: AstroLine = {
  planet: "Mars",
  angle: "MC",
  segments: [[
    { lat: 80, lon: -118 }, { lat: 0, lon: -118 }, { lat: -80, lon: -118 },
  ]],
};
const tint = dominantTintAt([marsLine], 34, -118.2, 0.0);
assert.ok(tint, "expected a tint near the Mars line");
assert.ok(tint!.r > tint!.b, "Mars tint should be more red than blue");

console.log("borderTint: OK");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /c/Users/John/Desktop/cosmora && npx tsx scripts/test-borderTint.ts`
Expected: FAIL — cannot find module `borderTint`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/dashboard/map/borderTint.ts
import { scoreLocation, PLANET_COLORS } from "@/lib/astrology/astrocartography";
import type { AstroLine } from "@/lib/astrology/astrocartography";

function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

/**
 * Dominant-planet tint at a lat/lon, scaled by influence (0–1).
 * Returns null when no line is strong enough — caller falls back to neutral.
 */
export function dominantTintAt(
  lines: AstroLine[],
  lat: number,
  lon: number,
  minInfluence = 0.12,
): { r: number; g: number; b: number } | null {
  if (!lines.length) return null;
  const scores = scoreLocation(lines, lat, lon);
  if (!scores.length || scores[0].influence < minInfluence) return null;
  const base = hexToRgb01(PLANET_COLORS[scores[0].planet]);
  const v = Math.min(scores[0].influence * 1.4, 1.0);
  return { r: base.r * v, g: base.g * v, b: base.b * v };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /c/Users/John/Desktop/cosmora && npx tsx scripts/test-borderTint.ts`
Expected: PASS — prints `borderTint: OK`.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/map/borderTint.ts scripts/test-borderTint.ts
git commit -m "feat(map): add per-vertex border astro-tint helper"
```

---

### Task 4: Photoreal Earth + clouds + lighting + atmosphere

**Files:**
- Modify: `src/app/dashboard/map/GlobeCanvas.tsx` (replace dark sphere `:687–691`, remove `DotSurface` usage `:694` and `NightLights` usage `:697`; remove now-unused `DotSurface`/`NightLights`/`NIGHT_CITIES` defs `:119–225`; recolor `Atmosphere` `:84–117`; adjust lights `:674–676`).

**Interfaces:**
- Consumes: `earthTextureSet` (Task 2), `WAR_ROOM` (Task 1), `detectGpuTier` from `@/lib/design/gpuTier`.
- Produces: `<Earth>`, `<Clouds>` components used inside `Scene`'s rotating globe group.

- [ ] **Step 1: Add imports at the top of `GlobeCanvas.tsx`**

```tsx
import { useLoader } from "@react-three/fiber";
import { earthTextureSet } from "./earthTextures";
import { WAR_ROOM } from "./warRoomPalette";
import { detectGpuTier } from "@/lib/design/gpuTier";
```
(`detectGpuTier` is already imported on line 13 alongside `QUALITY`; do not duplicate — only add the line if missing.)

- [ ] **Step 2: Add `<Earth>` and `<Clouds>` components**

Place after the `Atmosphere` component (around line 117):

```tsx
// ─── Photoreal night-Earth surface ────────────────────────────────────────────
function Earth() {
  const tier = typeof window !== "undefined" ? detectGpuTier() : "high";
  const tex = useMemo(() => earthTextureSet(tier), [tier]);
  const [night, day, specular] = useLoader(THREE.TextureLoader, [tex.night, tex.day, tex.specular]);

  useMemo(() => {
    night.colorSpace = THREE.SRGBColorSpace;
    day.colorSpace   = THREE.SRGBColorSpace;
  }, [night, day]);

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_R, 96, 96]} />
      <meshStandardMaterial
        map={day}
        emissiveMap={night}
        emissive={new THREE.Color("#ffffff")}
        emissiveIntensity={0.9}
        roughnessMap={specular}
        roughness={0.92}
        metalness={0.0}
      />
    </mesh>
  );
}

// ─── Thin rotating cloud shell ────────────────────────────────────────────────
function Clouds() {
  const ref = useRef<THREE.Mesh>(null);
  const tier = typeof window !== "undefined" ? detectGpuTier() : "high";
  const tex = useMemo(() => earthTextureSet(tier), [tier]);
  const clouds = useLoader(THREE.TextureLoader, tex.clouds);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.006; });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[GLOBE_R * 1.005, 64, 64]} />
      <meshStandardMaterial alphaMap={clouds} transparent opacity={0.25} depthWrite={false} color="#dfe8ff" />
    </mesh>
  );
}
```

- [ ] **Step 3: Recolor `Atmosphere` to war-room limb**

In `Atmosphere` (`:85–94`), replace the two `uColor` values:

```tsx
  const innerUniforms = useMemo(() => ({
    uColor:     { value: new THREE.Color(WAR_ROOM.limbInner) },
    uPower:     { value: 3.2 },
    uIntensity: { value: 1.05 },
  }), []);
  const outerUniforms = useMemo(() => ({
    uColor:     { value: new THREE.Color(WAR_ROOM.limbOuter) },
    uPower:     { value: 4.5 },
    uIntensity: { value: 0.45 },
  }), []);
```

- [ ] **Step 4: Swap the globe surface in `Scene`**

In `Scene` (`:685–706`), replace the dark ocean sphere mesh (`:687–691`), the `<DotSurface />` (`:694`), and `<NightLights />` (`:697`) with `<Earth />` and `<Clouds />`. Keep `<GeoLines />` and the subtle inner glow. Result:

```tsx
      {/* ── Everything geo: single rotating group ── */}
      <group ref={globeGroupRef}>
        {/* Photoreal night-Earth */}
        <Earth />
        <Clouds />

        {/* Geography lines */}
        <GeoLines />

        {/* Subtle inner glow */}
        <mesh>
          <sphereGeometry args={[GLOBE_R * 1.004, 32, 32]} />
          <meshPhongMaterial color="#0A2A6A" transparent opacity={0.05} side={THREE.FrontSide} depthWrite={false} />
        </mesh>

        {/* Birth location pulse rings */}
        <BirthPulseRings lat={birthLat} lon={birthLon} />
        {/* …rest unchanged (energy heatmap, astro lines, planet labels, city projections)… */}
```

- [ ] **Step 5: Adjust scene lights for the fixed warm terminator**

Replace `Scene`'s lights (`:674–676`) with:

```tsx
      <ambientLight intensity={0.08} />
      <directionalLight position={[6, 2, 4]} intensity={1.1} color="#FFE6C0" />
```

- [ ] **Step 6: Delete now-unused defs**

Remove `DotSurface` (`:201–225`), `NightLights` (`:149–198`), and `NIGHT_CITIES` (`:121–147`). They have no remaining references.

- [ ] **Step 7: Type-check**

Run: `cd /c/Users/John/Desktop/cosmora && npx tsc --noEmit -p tsconfig.json`
Expected: no errors. (If `seededRand` is now unused, remove it too.)

- [ ] **Step 8: Screenshot verification**

Ensure dev server is running (`npm run dev`), then:
Run: `cd /c/Users/John/Desktop/cosmora && BASE=http://localhost:3000 node scripts/shoot-map.mjs`
Expected: `scripts/shots/01-globe.png` shows a recognizable photoreal Earth with glowing city lights and a warm-lit limb (not the blue dot-matrix). No `404` for `*_earth_*.jpg` in the script's `PAGE ERR` output. Skylines still rise (`02-globe-detail.png`).

- [ ] **Step 9: Commit**

```bash
git add src/app/dashboard/map/GlobeCanvas.tsx
git commit -m "feat(map): replace dot-matrix globe with photoreal night-Earth + clouds"
```

---

### Task 5: Astro-tinted glowing borders in `GeoLines`

**Files:**
- Modify: `src/app/dashboard/map/GlobeCanvas.tsx` — `buildLineGeo` (`:49–58`) and `GeoLines` (`:228–251`).

**Interfaces:**
- Consumes: `dominantTintAt` (Task 3), `WAR_ROOM` (Task 1), the `lines` prop already threaded into `Scene`.
- Produces: per-vertex-colored border geometry; `GeoLines` now takes a `lines: AstroLine[]` prop.

- [ ] **Step 1: Add a color-aware line builder**

Add below `buildLineGeo` (`:58`):

```tsx
import { dominantTintAt } from "./borderTint";
// (place the import with the other imports at the top of the file)

function buildTintedLineGeo(lines: number[][][], r: number, astroLines: AstroLine[]): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const cols: number[] = [];
  const neutral = new THREE.Color(WAR_ROOM.coastGlow).multiplyScalar(0.25);
  const pushPt = (lat: number, lon: number) => {
    pts.push(ll2xyz(lat, lon, r));
    const t = dominantTintAt(astroLines, lat, lon);
    if (t) cols.push(t.r, t.g, t.b);
    else cols.push(neutral.r, neutral.g, neutral.b);
  };
  for (const line of lines)
    for (let i = 0; i < line.length - 1; i++) {
      const [lon1, lat1] = line[i], [lon2, lat2] = line[i + 1];
      if (Math.abs(lon2 - lon1) > 90) continue;
      pushPt(lat1, lon1); pushPt(lat2, lon2);
    }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  return g;
}
```

`AstroLine` is already imported on line 9.

- [ ] **Step 2: Make `GeoLines` consume astro lines and render tinted borders**

Replace `GeoLines` (`:228–251`) with a version that takes `lines` and tints borders:

```tsx
function GeoLines({ lines }: { lines: AstroLine[] }) {
  const [coastGeo,  setCoastGeo]  = useState<THREE.BufferGeometry | null>(null);
  const [borderRaw, setBorderRaw] = useState<number[][][] | null>(null);

  useEffect(() => {
    fetch("/geo/coastlines.json").then(r => r.json())
      .then((d: number[][][]) => setCoastGeo(buildLineGeo(d, GLOBE_R + 0.005))).catch(() => {});
    fetch("/geo/borders.json").then(r => r.json())
      .then((d: number[][][]) => setBorderRaw(d)).catch(() => {});
  }, []);

  const borderGeo = useMemo(
    () => borderRaw ? buildTintedLineGeo(borderRaw, GLOBE_R + 0.004, lines) : null,
    [borderRaw, lines],
  );

  return (
    <>
      {borderGeo && (
        <lineSegments geometry={borderGeo}>
          <lineBasicMaterial vertexColors transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
        </lineSegments>
      )}
      {coastGeo && (
        <lineSegments geometry={coastGeo}>
          <lineBasicMaterial color={WAR_ROOM.coastGlow} transparent opacity={0.45} blending={THREE.AdditiveBlending} depthWrite={false} />
        </lineSegments>
      )}
    </>
  );
}
```

(States and rivers are dropped to reduce clutter per the spec; the `states.json`/`rivers.json` fetches are intentionally removed.)

- [ ] **Step 3: Pass `lines` into `GeoLines` in `Scene`**

In `Scene`, change `<GeoLines />` to `<GeoLines lines={lines} />`. (`lines` is already a `Scene` prop, line 649.)

- [ ] **Step 4: Type-check**

Run: `cd /c/Users/John/Desktop/cosmora && npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Screenshot verification**

Run: `cd /c/Users/John/Desktop/cosmora && BASE=http://localhost:3000 node scripts/shoot-map.mjs`
Expected: `01-globe.png` shows borders glowing additively and tinted by planet color where the user's lines are strong (e.g. reddish near Mars lines), faint warm neutral elsewhere. `04-globe-wealth.png` (single-category filter) still works.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/map/GlobeCanvas.tsx
git commit -m "feat(map): astro-tinted glowing country borders"
```

---

### Task 6: HUD palette retheme in `page.tsx`

**Files:**
- Modify: `src/app/dashboard/map/page.tsx` — replace hardcoded blue/violet hexes with `WAR_ROOM` tokens. Structural layout unchanged.

**Interfaces:**
- Consumes: `WAR_ROOM` (Task 1).
- Produces: no exported interface change.

- [ ] **Step 1: Import the palette**

Add near the top of `page.tsx`:

```tsx
import { WAR_ROOM } from "./warRoomPalette";
```

- [ ] **Step 2: Replace the blue/violet chrome hexes**

Find-and-replace the recurring cool-tone values with war-room tokens (apply to inline `style` props and the loading screens). Specifically:
- Subtitle/label text `#334466` → `WAR_ROOM.textDim`.
- Border colors `rgba(50,80,160,0.2)` / `rgba(50,80,160,*)` → `WAR_ROOM.hairline`.
- Close-button / muted accents `#4455AA` → `WAR_ROOM.textMid`.
- Violet active-state accents used for selected toggles/oracle → `WAR_ROOM.accent`.
- Loading-screen backgrounds `#010810` stay as-is (already war-room); may reference `WAR_ROOM.bg`.

Keep all layout, spacing, `Fragment Mono` font, and component structure identical. Do not touch the planet-color swatches (those come from `PLANET_COLORS` and must stay per-planet).

- [ ] **Step 3: Type-check**

Run: `cd /c/Users/John/Desktop/cosmora && npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Screenshot verification**

Run: `cd /c/Users/John/Desktop/cosmora && BASE=http://localhost:3000 node scripts/shoot-map.mjs`
Expected: HUD chrome (top bar, filters, side panels) now reads amber/cyan war-room rather than blue/violet; planet swatches still show their individual colors; all toggles/oracle still function.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/map/page.tsx
git commit -m "feat(map): retheme HUD chrome to war-room palette"
```

---

### Task 7: Final verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the pure-logic tests**

Run: `cd /c/Users/John/Desktop/cosmora && npx tsx scripts/test-earthTextures.ts && npx tsx scripts/test-borderTint.ts`
Expected: both print `OK`.

- [ ] **Step 2: Lint + type-check**

Run: `cd /c/Users/John/Desktop/cosmora && npm run lint && npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Full screenshot sweep**

Run: `cd /c/Users/John/Desktop/cosmora && BASE=http://localhost:3000 node scripts/shoot-map.mjs`
Then review `scripts/shots/01-globe.png`, `02-globe-detail.png`, `03-flat.png`, `04-globe-wealth.png` against the reference images (IMG_8857 / IMG_8859).

Checklist (all must hold):
- Globe is photoreal night-Earth with glowing city lights and warm lit limb.
- Borders glow and are astro-tinted; coastlines a thin warm glow.
- Holographic city skylines still rise at crossings (`02-globe-detail.png`).
- Birth pulse marker present; astro lines render in planet colors.
- HUD chrome is war-room amber/cyan; filters/oracle functional.
- `03-flat.png` (flat earth) is unchanged — confirms it was left out of scope.
- No texture `404`s in the script's `PAGE ERR` output.

- [ ] **Step 4: Final commit (if any verification fixes were made)**

```bash
git add -A src/app/dashboard/map
git commit -m "chore(map): verification fixes for war-room globe"
```

---

## Self-Review

**Spec coverage:**
- Photoreal night-Earth (textures, terminator, clouds) → Task 4. ✓
- Astro-tinted glowing borders (per-vertex `scoreLocation`) → Tasks 3 + 5. ✓
- Atmosphere recolor → Task 4 Step 3. ✓
- HUD palette retheme, no new panels → Task 6. ✓
- GPU tiering 8k/2k → Task 2. ✓
- Preserve skylines/lines/pulse/heatmap → enforced by Task 4 Step 4 ("rest unchanged") and Task 7 checklist. ✓
- FlatEarth out of scope → Global Constraints + Task 7 Step 3 checklist. ✓
- Reuse assets only → Task 2 Step 5 verifies existing files. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `earthTextureSet(tier: GpuTier)` returns `EarthTextureSet` used in Task 4; `dominantTintAt(...) → {r,g,b}|null` used by `buildTintedLineGeo` in Task 5; `GeoLines({ lines })` matches the `<GeoLines lines={lines} />` call site; `WAR_ROOM` token names are consistent across Tasks 1/4/5/6. ✓
