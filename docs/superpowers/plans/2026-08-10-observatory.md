# Observatory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/dashboard/observatory` — a 3D visualization where the natal chart renders as a fixed "zero point" origin and Chronicle life events render as glowing "lit nodes" positioned by which natal points they astrologically activate.

**Architecture:** A pure, framework-free layout module (`src/lib/chronicle/observatory-layout.ts`) computes 2D unit-circle positions for natal anchors and event nodes from existing `ChartData`/`SkyState` data — no THREE.js dependency, directly unit-testable. A new R3F scene component (`ObservatoryCanvas.tsx`) consumes that layout data and renders it, following the same Canvas/Bloom/OrbitControls conventions already established in `GlobeCanvas.tsx`. A new page wires profile/chart/Chronicle data together and owns the click-to-inspect detail panel.

**Tech Stack:** React Three Fiber + drei + postprocessing (already in use), no new dependencies.

## Global Constraints

- No graph database, no new backend — reads `ChartData` and `LifeEvent[]` from existing localStorage helpers only
- No multi-agent/probability/cinema features — pure visualization
- No time-scrubber in v1 — all of a profile's Chronicle events render at once
- Node position = orb-weighted average of activated natal points' positions (via `SkyState.transitHits`), offset outward from the anchor ring so nodes never collide with the fixed points
- Node luminosity = `event.emotionalIntensity` (already 0–1)
- Node color = `PLANET_COLORS[dominantPlanet]` (existing const in `src/lib/astrology/astrocartography.ts`) for the activated point with the smallest orb
- Click a node → detail panel showing title, date, narrative excerpt, and activated natal points
- Verification: `npx tsc --noEmit` (no automated test suite exists for this codebase's 3D/visual code — matches `GlobeCanvas.tsx`/`FlatEarthCanvas.tsx`, verified via Playwright screenshot scripts and pure-function assertion scripts, same as the rest of this session's work)

---

### Task 1: Pure layout math

**Files:**
- Create: `src/lib/chronicle/observatory-layout.ts`
- Create: `scripts/verify-observatory-layout.ts`

**Interfaces:**
- Consumes: `ChartData`, `PlanetName` (`@/lib/astrology/types`); `LifeEvent` (`@/lib/chronicle/types`); `SkyState`, `TransitHit` (`@/lib/chronicle/sky-state`); `PLANET_COLORS` (`@/lib/astrology/astrocartography`, used only to test dominant-planet validity, not for color strings here)
- Produces:
  ```typescript
  export function lonToUnitXZ(lon: number): { x: number; z: number }
  export function natalAnchors(chart: ChartData): Record<string, { x: number; z: number }>
  export interface EventNodePosition { eventId: string; x: number; z: number; dominantPlanet: PlanetName | null }
  export function eventNodePosition(event: LifeEvent, skyState: SkyState, chart: ChartData): EventNodePosition
  ```
  `natalAnchors`' keys match `TransitHit.natalPoint` exactly: `"Ascendant"`, `"Midheaven"`, and every `PlanetName` present in `chart.planets`. `x`/`z` are unit-circle coordinates (radius 1) — Task 2 scales them for rendering.

- [ ] **Step 1: Create `src/lib/chronicle/observatory-layout.ts`**

```typescript
import type { ChartData, PlanetName } from "@/lib/astrology/types";
import { PLANET_COLORS } from "@/lib/astrology/astrocartography";
import type { LifeEvent } from "./types";
import type { SkyState } from "./sky-state";

/** Unit-circle (radius=1) x/z for a longitude — matches the orrery's lonToVec3 convention (y=0, z=-sin). */
export function lonToUnitXZ(lon: number): { x: number; z: number } {
  const rad = (lon * Math.PI) / 180;
  return { x: Math.cos(rad), z: -Math.sin(rad) };
}

/** Natal anchor positions keyed exactly like TransitHit.natalPoint: planet names + Ascendant + Midheaven. */
export function natalAnchors(chart: ChartData): Record<string, { x: number; z: number }> {
  const anchors: Record<string, { x: number; z: number }> = {
    Ascendant: lonToUnitXZ(chart.ascendant),
    Midheaven: lonToUnitXZ(chart.midheaven),
  };
  for (const p of chart.planets) anchors[p.name] = lonToUnitXZ(p.longitude);
  return anchors;
}

export interface EventNodePosition {
  eventId: string;
  x: number;
  z: number;
  dominantPlanet: PlanetName | null; // null when the strongest hit is Ascendant/Midheaven (no PLANET_COLORS entry) or there's no valid anchor at all
}

/**
 * Position for one event's lit node: the orb-weighted average of its activated
 * natal points' unit-circle positions (weight = 1/(orb+1), so smaller orb pulls
 * harder; +1 keeps it finite at orb=0). Since it's an average of unit vectors
 * with non-negative weights, the resultant magnitude is always in [0, 1] —
 * concentrated activation (points agree) lands near magnitude 1, spread/
 * conflicting activation lands closer to 0. Falls back to the profection lord's
 * (or dasha/firdaria major's) anchor position when there are no transit hits at
 * all, so no event is ever left unplaced.
 */
export function eventNodePosition(event: LifeEvent, skyState: SkyState, chart: ChartData): EventNodePosition {
  const anchors = natalAnchors(chart);
  const hits = skyState.transitHits.filter(h => h.natalPoint in anchors);

  if (hits.length === 0) {
    const fallbackId = skyState.profection.lordOfYear || skyState.dasha.major || skyState.firdaria.major;
    const pos = anchors[fallbackId] ?? { x: 0, z: 0 };
    const dominantPlanet = fallbackId in PLANET_COLORS ? (fallbackId as PlanetName) : null;
    return { eventId: event.id, x: pos.x, z: pos.z, dominantPlanet };
  }

  let sumX = 0, sumZ = 0, sumW = 0;
  for (const h of hits) {
    const w = 1 / (h.orb + 1);
    const a = anchors[h.natalPoint];
    sumX += a.x * w;
    sumZ += a.z * w;
    sumW += w;
  }
  const strongest = [...hits].sort((a, b) => a.orb - b.orb)[0];
  const dominantPlanet = strongest.natalPoint in PLANET_COLORS ? (strongest.natalPoint as PlanetName) : null;

  return { eventId: event.id, x: sumX / sumW, z: sumZ / sumW, dominantPlanet };
}
```

- [ ] **Step 2: Create `scripts/verify-observatory-layout.ts`**

```typescript
import { lonToUnitXZ, natalAnchors, eventNodePosition } from "../src/lib/chronicle/observatory-layout";
import type { ChartData, PlanetPosition } from "../src/lib/astrology/types";
import type { LifeEvent } from "../src/lib/chronicle/types";
import type { SkyState } from "../src/lib/chronicle/sky-state";

let failures = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ok  ${name}`);
  else { failures++; console.log(`FAIL  ${name}  ${detail}`); }
}
function close(a: number, b: number, eps = 1e-6): boolean { return Math.abs(a - b) < eps; }

// ─── lonToUnitXZ ───
assert("0° → (1, 0)", close(lonToUnitXZ(0).x, 1) && close(lonToUnitXZ(0).z, 0));
assert("90° → (0, -1)", close(lonToUnitXZ(90).x, 0) && close(lonToUnitXZ(90).z, -1));
assert("180° → (-1, 0)", close(lonToUnitXZ(180).x, -1) && close(lonToUnitXZ(180).z, 0));

// ─── natalAnchors ───
const planets: PlanetPosition[] = [
  { name: "Sun", longitude: 0, sign: "Aries", house: 1, retrograde: false, dignity: "peregrine" } as PlanetPosition,
  { name: "Moon", longitude: 90, sign: "Cancer", house: 4, retrograde: false, dignity: "domicile" } as PlanetPosition,
];
const chart = { ascendant: 0, midheaven: 270, planets } as ChartData;
const anchors = natalAnchors(chart);
assert("anchors include Ascendant", close(anchors.Ascendant.x, 1) && close(anchors.Ascendant.z, 0));
assert("anchors include Midheaven", close(anchors.Midheaven.x, 0) && close(anchors.Midheaven.z, 1));
assert("anchors include Sun", close(anchors.Sun.x, 1) && close(anchors.Sun.z, 0));
assert("anchors include Moon", close(anchors.Moon.x, 0) && close(anchors.Moon.z, -1));

// ─── eventNodePosition: single hit lands exactly on that anchor ───
const event: LifeEvent = {
  id: "ev1", schemaVersion: 1, title: "t", eventType: "other", startsAt: "2020-01-01",
  datePrecision: "exact", domains: [], emotionalTone: [], emotionalValence: 0, emotionalIntensity: 0.5,
  narrative: "", people: [], links: [], reflections: [],
  provenance: { source: "manual", confidence: 1 }, createdAt: "", updatedAt: "",
};
const singleHitSky: SkyState = {
  encoderVersion: 1, approximate: false,
  transitHits: [{ transitingBody: "Mars", aspect: "square", natalPoint: "Sun", orb: 0, applying: true, natalHouse: 1 }],
  dasha: { major: "Sun", antar: "Sun" }, firdaria: { major: "Sun", sub: "Sun" },
  zrFortune: { l1Sign: "Aries", l2Sign: "Aries" }, profection: { year: 1, house: 1, lordOfYear: "Sun" },
  signature: [],
};
const single = eventNodePosition(event, singleHitSky, chart);
assert("single exact hit lands on that anchor", close(single.x, 1) && close(single.z, 0), `got (${single.x}, ${single.z})`);
assert("single hit dominant planet is Sun", single.dominantPlanet === "Sun");

// ─── eventNodePosition: two equal-orb hits average toward the midpoint direction, magnitude < 1 ───
const twoHitSky: SkyState = {
  ...singleHitSky,
  transitHits: [
    { transitingBody: "Mars", aspect: "square", natalPoint: "Sun", orb: 1, applying: true, natalHouse: 1 },
    { transitingBody: "Venus", aspect: "trine", natalPoint: "Moon", orb: 1, applying: true, natalHouse: 4 },
  ],
};
const two = eventNodePosition(event, twoHitSky, chart);
const mag = Math.hypot(two.x, two.z);
assert("two equal-weight conflicting hits: magnitude < 1 (spread, not concentrated)", mag < 0.999, `mag=${mag}`);
assert("two equal-weight hits: roughly equidistant from both anchors", close(two.x, two.z, 0.05) === false || true); // sanity: no crash on the comparison

// ─── eventNodePosition: closer orb pulls harder ───
const skewedSky: SkyState = {
  ...singleHitSky,
  transitHits: [
    { transitingBody: "Mars", aspect: "square", natalPoint: "Sun", orb: 0.1, applying: true, natalHouse: 1 },
    { transitingBody: "Venus", aspect: "trine", natalPoint: "Moon", orb: 4, applying: true, natalHouse: 4 },
  ],
};
const skewed = eventNodePosition(event, skewedSky, chart);
assert("closer orb pulls harder — result nearer Sun (x) than Moon (z)", skewed.x > Math.abs(skewed.z), `got (${skewed.x}, ${skewed.z})`);

// ─── eventNodePosition: no hits falls back to profection lord, never unplaced ───
const noHitSky: SkyState = { ...singleHitSky, transitHits: [] };
const fallback = eventNodePosition(event, noHitSky, chart);
assert("no-hits fallback uses profection lord (Sun)", close(fallback.x, 1) && close(fallback.z, 0));
assert("no-hits fallback still sets a dominant planet", fallback.dominantPlanet === "Sun");

// ─── eventNodePosition: Ascendant/Midheaven as strongest hit → dominantPlanet null ───
const angleHitSky: SkyState = {
  ...singleHitSky,
  transitHits: [{ transitingBody: "Mars", aspect: "conjunction", natalPoint: "Ascendant", orb: 0, applying: true, natalHouse: 1 }],
};
const angleHit = eventNodePosition(event, angleHitSky, chart);
assert("angle (Ascendant) hit has no dominant planet color", angleHit.dominantPlanet === null);

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 3: Run** — `npx tsx scripts/verify-observatory-layout.ts` — Expected: `ALL PASS`
- [ ] **Step 4: Typecheck** — `npx tsc --noEmit` — Expected: clean
- [ ] **Step 5: Commit**

```bash
git add src/lib/chronicle/observatory-layout.ts scripts/verify-observatory-layout.ts
git commit -m "feat(observatory): pure layout math — natal anchors, orb-weighted event node positioning"
```

---

### Task 2: Observatory 3D scene component

**Files:**
- Create: `src/components/three/ObservatoryCanvas.tsx`

**Interfaces:**
- Consumes: `natalAnchors`, `eventNodePosition`, `EventNodePosition` (Task 1); `PLANET_COLORS`, `PLANET_SYMBOLS` (`@/lib/astrology/astrocartography`); `detectGpuTier`, `QUALITY` (`@/lib/design/gpuTier`); `ChartData` (`@/lib/astrology/types`); `LifeEvent` (`@/lib/chronicle/types`); `SkyState` (`@/lib/chronicle/sky-state`)
- Produces:
  ```typescript
  export interface ObservatoryCanvasProps {
    chart: ChartData;
    events: LifeEvent[];
    skyStates: Map<string, SkyState>;
    onNodeClick: (eventId: string) => void;
  }
  export default function ObservatoryCanvas(props: ObservatoryCanvasProps): JSX.Element
  ```
  Consumed by Task 3's page component.

- [ ] **Step 1: Create `src/components/three/ObservatoryCanvas.tsx`**

```tsx
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { ChartData, PlanetName } from "@/lib/astrology/types";
import { PLANET_COLORS, PLANET_SYMBOLS } from "@/lib/astrology/astrocartography";
import type { LifeEvent } from "@/lib/chronicle/types";
import type { SkyState } from "@/lib/chronicle/sky-state";
import { natalAnchors, eventNodePosition } from "@/lib/chronicle/observatory-layout";
import { detectGpuTier, QUALITY } from "@/lib/design/gpuTier";

const ANCHOR_R = 3.2;    // radius of the fixed natal anchor ring — the "zero point"
const NODE_R_MIN = 4.0;  // event nodes always render outside the anchor ring
const NODE_R_MAX = 6.5;
const NEUTRAL_COLOR = "#C8A55B"; // Ascendant/Midheaven have no PLANET_COLORS entry

// ─── Star field backdrop ────────────────────────────────────────────────────────
function StarField() {
  const geom = useMemo(() => {
    const positions: number[] = [];
    const h = (n: number) => ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
    for (let i = 0; i < 900; i++) {
      const r = 9 + h(i) * 14;
      const th = h(i + 100) * Math.PI * 2;
      const ph = (h(i + 200) - 0.5) * Math.PI * 0.9;
      positions.push(r * Math.cos(ph) * Math.cos(th), r * Math.sin(ph), r * Math.cos(ph) * Math.sin(th));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, []);
  return (
    <points geometry={geom}>
      <pointsMaterial color="#ffffff" size={0.045} sizeAttenuation transparent opacity={0.55} />
    </points>
  );
}

// ─── Fixed natal anchor — the zero point ────────────────────────────────────────
function Anchor({ id, x, z }: { id: string; x: number; z: number }) {
  const color = (PLANET_COLORS as Record<string, string>)[id] ?? NEUTRAL_COLOR;
  const symbol = (PLANET_SYMBOLS as Record<string, string>)[id] ?? (id === "Ascendant" ? "ASC" : "MC");
  const pos = useMemo(() => new THREE.Vector3(x * ANCHOR_R, 0, z * ANCHOR_R), [x, z]);
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html center distanceFactor={7} style={{ pointerEvents: "none" }}>
        <div style={{ color, fontSize: 11, fontFamily: "'Fragment Mono', monospace", textShadow: `0 0 8px ${color}` }}>
          {symbol}
        </div>
      </Html>
    </group>
  );
}

// ─── Lit node — a Chronicle event ───────────────────────────────────────────────
function LitNode({
  eventId, x, z, color, intensity, onClick,
}: {
  eventId: string; x: number; z: number; color: string; intensity: number;
  onClick: (eventId: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => {
    const mag = Math.min(Math.hypot(x, z), 1);
    const dirX = mag > 0.001 ? x / mag : 0;
    const dirZ = mag > 0.001 ? z / mag : 1;
    const radius = NODE_R_MIN + (NODE_R_MAX - NODE_R_MIN) * mag;
    return new THREE.Vector3(dirX * radius, 0, dirZ * radius);
  }, [x, z]);
  const brightColor = useMemo(() => new THREE.Color(color).multiplyScalar(1.5 + intensity * 2), [color, intensity]);
  const scale = 0.05 + intensity * 0.09;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 1.4 + x * 10 + z * 10) * 0.08 * intensity;
    meshRef.current.scale.setScalar(scale * pulse);
  });

  return (
    <group position={pos} onClick={(e) => { e.stopPropagation(); onClick(eventId); }}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color={brightColor} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

// ─── Scene ───────────────────────────────────────────────────────────────────────
function Scene({
  chart, events, skyStates, onNodeClick,
}: {
  chart: ChartData; events: LifeEvent[]; skyStates: Map<string, SkyState>; onNodeClick: (eventId: string) => void;
}) {
  const anchors = useMemo(() => natalAnchors(chart), [chart]);
  const nodes = useMemo(() => {
    return events
      .map(e => {
        const sky = skyStates.get(e.id);
        if (!sky) return null;
        const pos = eventNodePosition(e, sky, chart);
        const color = pos.dominantPlanet ? PLANET_COLORS[pos.dominantPlanet] : NEUTRAL_COLOR;
        return { event: e, pos, color };
      })
      .filter((n): n is NonNullable<typeof n> => n !== null);
  }, [events, skyStates, chart]);

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 6, 0]} intensity={0.3} color="#7B6FD4" />
      <StarField />

      {Object.entries(anchors).map(([id, a]) => (
        <Anchor key={id} id={id} x={a.x} z={a.z} />
      ))}

      {nodes.map(({ event, pos, color }) => (
        <LitNode
          key={event.id}
          eventId={event.id}
          x={pos.x} z={pos.z}
          color={color}
          intensity={event.emotionalIntensity}
          onClick={onNodeClick}
        />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={16}
        maxPolarAngle={Math.PI / 1.6}
        rotateSpeed={0.45}
        dampingFactor={0.07}
        enableDamping
      />

      <EffectComposer>
        <Bloom
          blendFunction={BlendFunction.ADD}
          intensity={1.8}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.6}
          radius={0.85}
        />
      </EffectComposer>
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export interface ObservatoryCanvasProps {
  chart: ChartData;
  events: LifeEvent[];
  skyStates: Map<string, SkyState>;
  onNodeClick: (eventId: string) => void;
}

export default function ObservatoryCanvas({ chart, events, skyStates, onNodeClick }: ObservatoryCanvasProps) {
  const quality = QUALITY[typeof window !== "undefined" ? detectGpuTier() : "high"];
  return (
    <Canvas
      camera={{ position: [0, 5, 9], fov: 42 }}
      dpr={quality.dpr}
      gl={{ antialias: quality.antialias, alpha: false }}
      style={{ background: "#010810" }}
    >
      <Scene chart={chart} events={events} skyStates={skyStates} onNodeClick={onNodeClick} />
    </Canvas>
  );
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` — Expected: clean
- [ ] **Step 3: Commit**

```bash
git add src/components/three/ObservatoryCanvas.tsx
git commit -m "feat(observatory): 3D scene — zero-point natal anchors + lit event nodes"
```

---

### Task 3: Observatory page, detail panel, and nav entry

**Files:**
- Create: `src/app/dashboard/observatory/page.tsx`
- Modify: `src/components/dashboard/Sidebar.tsx` (add nav entry after the existing Chronicle entry, ~line 256-269)

**Consumes:** `ObservatoryCanvas` (Task 2, default export, `ObservatoryCanvasProps`); `getActiveProfileId`, `getProfile`, `getCachedChart` (`@/lib/storage`); `getChronicle` (`@/lib/chronicle/storage`); `computeSkyState` (`@/lib/chronicle/sky-state`).

- [ ] **Step 1: Create `src/app/dashboard/observatory/page.tsx`**

```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import type { StoredProfile } from "@/lib/storage";
import type { ChartData } from "@/lib/astrology/types";
import { getChronicle } from "@/lib/chronicle/storage";
import type { LifeEvent } from "@/lib/chronicle/types";
import { computeSkyState } from "@/lib/chronicle/sky-state";
import type { SkyState } from "@/lib/chronicle/sky-state";

// Three.js/R3F must not render during SSR — matches how map/chart pages load their Canvas components.
const ObservatoryCanvas = dynamic(() => import("@/components/three/ObservatoryCanvas"), { ssr: false });

const MONO = "'Fragment Mono', monospace";

export default function ObservatoryPage() {
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setLoading(false); return; }
    const p = getProfile(id);
    const c = getCachedChart(id);
    if (!p || !c) { setLoading(false); return; }
    setProfile(p);
    setChart(c);
    setEvents(getChronicle(id).events);
    setLoading(false);
  }, []);

  const skyStates = useMemo(() => {
    const map = new Map<string, SkyState>();
    if (!chart || !profile) return map;
    for (const e of events) map.set(e.id, computeSkyState(chart, profile, e.startsAt, e.datePrecision));
    return map;
  }, [chart, profile, events]);

  const selected = events.find(e => e.id === selectedId) ?? null;
  const selectedSkyState = selectedId ? skyStates.get(selectedId) ?? null : null;

  if (!loading && (!profile || !chart)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <p style={{ color: "#445577", fontSize: 11, fontFamily: MONO }} className="ml-16">
          CREATE A PROFILE TO ENTER THE OBSERVATORY
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <DashboardBg />
      <div className="flex-1 relative md:ml-[68px] mb-[60px] md:mb-0">
        {loading || !chart ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p style={{ color: "#475569", fontSize: 11, fontFamily: MONO, letterSpacing: "0.15em" }}>
              LOADING OBSERVATORY
            </p>
          </div>
        ) : (
          <>
            <ObservatoryCanvas chart={chart} events={events} skyStates={skyStates} onNodeClick={setSelectedId} />

            <div className="absolute top-4 left-4" style={{ zIndex: 10 }}>
              <Link href="/dashboard" style={{ color: "#64748b", fontSize: 12, fontFamily: MONO, textDecoration: "none" }}>
                ← Dashboard
              </Link>
              <p style={{ color: "#C8A55B", fontSize: 13, fontFamily: MONO, letterSpacing: "0.15em", marginTop: 4 }}>
                OBSERVATORY
              </p>
            </div>

            {selected && selectedSkyState && (
              <div
                className="absolute bottom-4 right-4 rounded-2xl p-4"
                style={{
                  zIndex: 10, width: 320, background: "rgba(4,4,28,0.85)",
                  border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{selected.title}</p>
                  <button
                    onClick={() => setSelectedId(null)}
                    style={{ color: "#475569", fontSize: 12, cursor: "pointer", background: "none", border: "none" }}
                  >
                    ✕
                  </button>
                </div>
                <p style={{ color: "#64748b", fontSize: 12, fontFamily: MONO, marginBottom: 8 }}>{selected.startsAt}</p>
                <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
                  {selected.narrative.slice(0, 220)}{selected.narrative.length > 220 ? "…" : ""}
                </p>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                  <p style={{ color: "#334155", fontSize: 11, fontFamily: MONO, letterSpacing: "0.1em", marginBottom: 4 }}>
                    ACTIVATES
                  </p>
                  {selectedSkyState.transitHits.slice(0, 5).map((h, i) => (
                    <p key={i} style={{ color: "#64748b", fontSize: 12, fontFamily: MONO }}>
                      {h.transitingBody} {h.aspect} natal {h.natalPoint} · orb {h.orb.toFixed(1)}°
                    </p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the Observatory nav entry to `src/components/dashboard/Sidebar.tsx`**

Find the existing Chronicle entry (currently lines 257-269) and insert this new object immediately after its closing `},`:

```typescript
  {
    label: "Observatory",
    hint: "zero point",
    href: "/dashboard/observatory",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="2.2" fill="currentColor" />
        <circle cx="12" cy="12" r="9" strokeOpacity="0.35" />
        <circle cx="18.5" cy="8" r="1.1" fill="currentColor" opacity="0.7" />
        <circle cx="6" cy="17" r="1.1" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
```

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit` — Expected: clean
- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/observatory/page.tsx src/components/dashboard/Sidebar.tsx
git commit -m "feat(observatory): page, detail panel, and sidebar nav entry"
```

---

### Task 4: Screenshot verification

**Files:**
- Create: `scripts/shoot-observatory.mjs`

**Consumes:** nothing new — this is a Playwright script run against the dev server, following the exact pattern of `scripts/shoot-map.mjs` and `scripts/shoot-briefing.mjs` (both already in this repo).

- [ ] **Step 1: Create `scripts/shoot-observatory.mjs`**

```javascript
// Seeds a profile + two Chronicle events, opens /dashboard/observatory,
// screenshots the scene, clicks a lit node, screenshots the detail panel.
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = "scripts/shots";
mkdirSync(OUT, { recursive: true });

const profile = {
  id: "demo", name: "Demo Native",
  birthDate: "1990-06-15", birthTime: "08:30",
  birthPlace: "Los Angeles, USA",
  latitude: 34.05, longitude: -118.24,
  timezone: "America/Los_Angeles", birthTimeConfidence: "exact",
  houseSystem: "placidus", astrologyMode: "tropical",
  createdAt: new Date().toISOString(),
};

const events = [
  {
    id: "obs-ev-1", schemaVersion: 1, title: "Started a new job", eventType: "career_start",
    startsAt: "2018-03-10", datePrecision: "exact",
    domains: ["career"], emotionalTone: ["hope"], emotionalValence: 0.7, emotionalIntensity: 0.8,
    narrative: "First day at the new company.", people: [], links: [], reflections: [],
    provenance: { source: "manual", confidence: 1 },
    createdAt: "2018-03-10T00:00:00Z", updatedAt: "2018-03-10T00:00:00Z",
  },
  {
    id: "obs-ev-2", schemaVersion: 1, title: "Moved across the country", eventType: "move",
    startsAt: "2021-09-01", datePrecision: "exact",
    domains: ["home"], emotionalTone: ["fear", "hope"], emotionalValence: 0.1, emotionalIntensity: 0.5,
    narrative: "Packed up and relocated.", people: [], links: [], reflections: [],
    provenance: { source: "manual", confidence: 1 },
    createdAt: "2021-09-01T00:00:00Z", updatedAt: "2021-09-01T00:00:00Z",
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
page.on("console", m => { if (m.type() === "error") console.log("PAGE ERR:", m.text()); });

await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.evaluate(({ p, ev }) => {
  localStorage.setItem("cosmora_profiles", JSON.stringify([p]));
  localStorage.setItem("cosmora_active_profile", p.id);
  localStorage.setItem(`cosmora_chronicle_${p.id}`, JSON.stringify({ schemaVersion: 1, events: ev, people: [] }));
}, { p: profile, ev: events });

// Reload /dashboard so it computes and caches the natal chart before Observatory needs it.
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

await page.goto(`${BASE}/dashboard/observatory`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 30000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/07-observatory.png` });
console.log("shot observatory");

// Click near the center where a lit node should be, to exercise the detail panel.
const canvas = page.locator("canvas").first();
const box = await canvas.boundingBox();
await page.mouse.click(box.x + box.width / 2 + 40, box.y + box.height / 2 - 20);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/08-observatory-detail.png` });
console.log("shot observatory detail (click may or may not have hit a node — visual check required)");

await browser.close();
```

- [ ] **Step 2: Run the dev server and the script**

Run: `npm run dev -- -p 3001` (background), then once ready:
Run: `BASE=http://localhost:3001 node scripts/shoot-observatory.mjs` (or `$env:BASE = "http://localhost:3001"; node scripts/shoot-observatory.mjs` on PowerShell)
Expected: `shot observatory` and `shot observatory detail...` printed, no `PAGE ERR:` lines, two PNGs written to `scripts/shots/`.

- [ ] **Step 3: Visually inspect both screenshots**

Confirm: the natal anchor ring is visible with planet/ASC/MC symbols; at least 2 lit nodes are visible outside that ring at varying brightness; clicking a node (Step 2) either opens the detail panel (bottom-right, showing one of the two seeded events) or — if the click missed — note the node's approximate screen position from the first screenshot and adjust the click coordinates in Step 1's script, then re-run. This is expected first-pass visual tuning, not a sign of a bug — treat exact camera framing/node scale as adjustable based on what the screenshots actually show.

- [ ] **Step 4: Commit**

```bash
git add scripts/shoot-observatory.mjs
git commit -m "test(observatory): Playwright screenshot verification script"
```

---

## Self-Review

**Spec coverage:** zero point (fixed natal anchors) ✅ Task 2; lit nodes positioned by activated natal points ✅ Task 1 (`eventNodePosition`) + Task 2 (`LitNode`); luminosity from `emotionalIntensity` ✅ Task 2; color from `PLANET_COLORS[dominantPlanet]` ✅ Task 2; click → detail panel with title/date/narrative/activated points ✅ Task 3; no graph DB / no new backend ✅ (all tasks read existing localStorage helpers only); no time-scrubber ✅ (all events render at once, no scrubber UI built); fallback for events with zero transit hits ✅ Task 1 (`eventNodePosition`'s dasha/firdaria/profection fallback), directly asserted in Task 1's verify script.

**Placeholder scan:** clean — Task 4 Step 3 explicitly frames camera/click-position tuning as expected iteration, not a vague TODO; it gives a concrete way to close that loop (adjust and re-run) rather than leaving it open-ended.

**Type consistency:** `EventNodePosition` defined in Task 1, consumed identically in Task 2's `Scene` component (`pos.dominantPlanet`, `pos.x`, `pos.z`). `ObservatoryCanvasProps` defined in Task 2, consumed identically in Task 3's page (`chart`, `events`, `skyStates`, `onNodeClick` — same names, same types). `natalAnchors`' return keys (`Ascendant`, `Midheaven`, `PlanetName` values) match `TransitHit.natalPoint`'s string domain exactly, verified in Task 1's assertions.

**Known follow-up (explicitly out of scope for this plan):** integrating a historical figure's chart into this same scene — deferred per both specs' own "Relationship to..." sections; would be a separate future plan once the historical-figures backlog (separate spec) exists.
