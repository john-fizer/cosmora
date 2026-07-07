# Chronicle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Chronicle — the life-event graph room at `/dashboard/chronicle` where events are stored as graph nodes and astrologically encoded on view by a versioned sky-state encoder.

**Architecture:** Three lib files (`types.ts`, `storage.ts`, `sky-state.ts`) under `src/lib/chronicle/`, one non-streaming extraction API route, one page, one sidebar item. Events store only human facts; `computeSkyState(chart, profile, date)` derives all astrology live (never snapshotted) and flattens it to canonical signature tokens. Spec: `docs/superpowers/specs/2026-07-06-chronicle-design.md`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Framer Motion, localStorage, Anthropic SDK (`@anthropic-ai/sdk`, already installed), existing astrology engines.

## Global Constraints

- All pages: `"use client"`, `DashboardBg` from `@/components/ui/DashboardBg`, scroll container at `left: 64`, `scrollbarWidth: "none"`, bg `#010810`
- Fonts: Fragment Mono for labels/codes, Cormorant Garamond for italic body text
- Path alias `@/*` → `./src/*`
- `calculateChart` is SYNCHRONOUS — never await it
- Interpretation never overwrites primary source: `narrative` is verbatim user text
- Sky state is computed on view, NEVER stored with events
- localStorage key: `cosmora_chronicle_<profileId>`
- Commit convention: `feat(chronicle): ...`
- Verification: `npx tsx scripts/verify-chronicle.ts` then `npm run build`

## Existing Interfaces (verified in codebase — consume, do not redefine)

```typescript
// @/lib/astrology/calculator
calculateChart(profile: Pick<BirthProfile,"birthDate"|"birthTime"|"latitude"|"longitude"|"timezone"|"houseSystem">): ChartData
calculateFirdaria(birthDatetime: string, isDay: boolean): FirdarPeriod[]
// FirdarPeriod: { lord: PlanetName; subLord: PlanetName | null; start: Date; end: Date; years: number; isCurrent: boolean; isPast: boolean; isMainPeriod: boolean }

// @/lib/astrology/types
// ChartData: { birthDatetime: string; sect: "day"|"night"; ascendant: number; midheaven: number; lotOfFortune: number; planets: PlanetPosition[]; houses: ... }
// PlanetPosition: { name: PlanetName; longitude: number; sign: ZodiacSign; signDegree: number; house: number; retrograde: boolean; speed: number }
// ZODIAC_SIGNS: ZodiacSign[];  TRADITIONAL_RULERS: Record<ZodiacSign, PlanetName>;  PLANET_SYMBOLS: Record<string,string>

// @/lib/astrology/sidereal
buildVimshottariDasha(moonSiderealLon: number, birthDatetime: string): VimshottariData  // { major: DashaPeriod[]; ... }
// DashaPeriod: { ruler: DashaRuler; antardasha?: DashaRuler; years: number; start: Date; end: Date; level: 1|2 }
lahiriAyanamsa(date: Date): number

// @/lib/astrology/zodiacalReleasing
buildL1Periods(lotLon: number, birthDatetime: string): ZRPeriod[]
buildSubPeriods(parent: ZRPeriod, level: 2|3|4): ZRPeriod[]
// ZRPeriod: { sign: ZodiacSign; years: number; start: Date; end: Date; level: 1|2|3|4; ... }

// @/lib/storage
// StoredProfile: { id, name, birthDate, birthTime, birthPlace, latitude, longitude, timezone, houseSystem, ... }
getActiveProfileId(): string | null;  getProfile(id): StoredProfile | null;  getCachedChart(id): ChartData | null
generateId(): string
```

**Dasha caveat:** `buildVimshottariDasha` computes `currentMajor` relative to *today*. For an arbitrary event date, scan `major[]` for the period containing the date, and compute the antardasha within it locally (helper in sky-state.ts).

## File Map

```
src/lib/chronicle/types.ts        — all Chronicle interfaces + constants (Task 1)
src/lib/chronicle/storage.ts      — localStorage CRUD + export/import (Task 1)
src/lib/chronicle/sky-state.ts    — computeSkyState + signature grammar + eclipse finder (Task 2)
scripts/verify-chronicle.ts       — assertions, grown across Tasks 1–2
src/app/api/chronicle/extract/route.ts  — Reality Engine extraction (Task 3)
src/app/dashboard/chronicle/page.tsx    — the room (Task 4)
src/components/dashboard/Sidebar.tsx    — nav item (Task 5)
```

---

### Task 1: Types + storage + verification harness

**Files:**
- Create: `src/lib/chronicle/types.ts`
- Create: `src/lib/chronicle/storage.ts`
- Create: `scripts/verify-chronicle.ts`

**Interfaces produced (later tasks rely on these exact names):**
`ChronicleEventType`, `EdgeType`, `EventLink`, `Provenance`, `LifeEvent`, `Person`, `Reflection`, `ChronicleData`, `EVENT_TYPE_META`, `DOMAINS`, `TONES`, `confidenceForPrecision(p)`, `validateEvent(e, allIds)`, `getChronicle(profileId)`, `saveChronicle(profileId, data)`, `upsertEvent(profileId, e)`, `deleteEvent(profileId, id)`, `upsertPerson(profileId, p)`, `exportChronicle(profileId, profile)`, `importChronicle(profileId, json, strategy)`.

- [ ] **Step 1: Create `src/lib/chronicle/types.ts`**

```typescript
export type ChronicleEventType =
  | "birth" | "death" | "family" | "parenting"
  | "relationship_start" | "relationship_end" | "conflict" | "reconciliation"
  | "career_start" | "career_end" | "promotion" | "money" | "legal"
  | "move" | "travel" | "education"
  | "health" | "recovery" | "loss"
  | "creative" | "achievement" | "decision" | "identity_shift"
  | "spiritual_awakening" | "dream" | "synchronicity" | "song" | "repeated_pattern"
  | "other";

export type EdgeType = "echoes" | "follows" | "caused_by" | "part_of";
export type DatePrecision = "exact" | "month" | "year" | "period";

export interface EventLink { eventId: string; type: EdgeType; }

export interface Provenance {
  source: "manual" | "ai_extracted" | "import";
  sourceRef?: string;
  confidence: number; // MTDS ladder — see confidenceForPrecision
}

export interface Reflection {
  id: string;
  date: string;
  text: string;
  outcomeConfirmation?: "confirmed" | "partially" | "did_not_happen";
}

export interface LifeEvent {
  id: string;
  schemaVersion: 1;
  title: string;
  eventType: ChronicleEventType;
  startsAt: string;           // ISO date YYYY-MM-DD
  endsAt?: string;
  datePrecision: DatePrecision;
  location?: { name: string; lat?: number; lon?: number };
  domains: string[];
  emotionalTone: string[];
  emotionalValence: number;   // -1..1
  emotionalIntensity: number; // 0..1
  narrative: string;          // user's verbatim words — never overwritten
  people: string[];           // Person ids
  links: EventLink[];
  reflections: Reflection[];
  provenance: Provenance;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  name: string;
  relationshipType: string;
  birthDate?: string;
}

export interface ChronicleData {
  schemaVersion: 1;
  events: LifeEvent[];
  people: Person[];
}

export const DOMAINS = ["family","identity","career","love","health","money","spirit","creative","home","community"] as const;
export const TONES = ["love","grief","fear","liberation","pressure","joy","anger","awe","shame","hope"] as const;

export const EVENT_TYPE_META: Record<ChronicleEventType, { glyph: string; color: string; label: string }> = {
  birth:               { glyph: "✶", color: "#C8A55B", label: "Birth" },
  death:               { glyph: "✝", color: "#94a3b8", label: "Death" },
  family:              { glyph: "⌂", color: "#38bdf8", label: "Family" },
  parenting:           { glyph: "☽", color: "#BFB6E8", label: "Parenting" },
  relationship_start:  { glyph: "♡", color: "#f472b6", label: "Relationship Start" },
  relationship_end:    { glyph: "♡̸", color: "#fb7185", label: "Relationship End" },
  conflict:            { glyph: "⚔", color: "#ef4444", label: "Conflict" },
  reconciliation:      { glyph: "☌", color: "#4ade80", label: "Reconciliation" },
  career_start:        { glyph: "△", color: "#f59e0b", label: "Career Start" },
  career_end:          { glyph: "▽", color: "#f59e0b", label: "Career End" },
  promotion:           { glyph: "↑", color: "#fbbf24", label: "Promotion" },
  money:               { glyph: "◈", color: "#22c55e", label: "Money" },
  legal:               { glyph: "§", color: "#94a3b8", label: "Legal" },
  move:                { glyph: "⌖", color: "#06b6d4", label: "Move" },
  travel:              { glyph: "✈", color: "#67e8f9", label: "Travel" },
  education:           { glyph: "✎", color: "#a78bfa", label: "Education" },
  health:              { glyph: "✚", color: "#f87171", label: "Health" },
  recovery:            { glyph: "❊", color: "#4ade80", label: "Recovery" },
  loss:                { glyph: "☂", color: "#64748b", label: "Loss" },
  creative:            { glyph: "✧", color: "#e879f9", label: "Creative" },
  achievement:         { glyph: "★", color: "#facc15", label: "Achievement" },
  decision:            { glyph: "⑂", color: "#C8A55B", label: "Decision" },
  identity_shift:      { glyph: "◐", color: "#7B6FD4", label: "Identity Shift" },
  spiritual_awakening: { glyph: "☉", color: "#C8A55B", label: "Spiritual Awakening" },
  dream:               { glyph: "☾", color: "#818cf8", label: "Dream" },
  synchronicity:       { glyph: "∞", color: "#2dd4bf", label: "Synchronicity" },
  song:                { glyph: "♪", color: "#f0abfc", label: "Song" },
  repeated_pattern:    { glyph: "↻", color: "#fb923c", label: "Repeated Pattern" },
  other:               { glyph: "·", color: "#6677AA", label: "Other" },
};

// MTDS confidence ladder (09-Event-Ingestion)
export function confidenceForPrecision(p: DatePrecision): number {
  switch (p) {
    case "exact": return 1.0;
    case "month": return 0.6;
    case "year": return 0.4;
    case "period": return 0.4;
  }
}

export function validateEvent(e: LifeEvent, allEventIds: Set<string>): string[] {
  const errors: string[] = [];
  if (!e.title.trim()) errors.push("title empty");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.startsAt)) errors.push("startsAt not ISO date");
  if (e.endsAt && e.endsAt < e.startsAt) errors.push("endsAt before startsAt");
  if (e.emotionalValence < -1 || e.emotionalValence > 1) errors.push("valence out of range");
  if (e.emotionalIntensity < 0 || e.emotionalIntensity > 1) errors.push("intensity out of range");
  for (const l of e.links) if (!allEventIds.has(l.eventId)) errors.push(`link to missing event ${l.eventId}`);
  return errors;
}
```

- [ ] **Step 2: Create `src/lib/chronicle/storage.ts`**

```typescript
import type { ChronicleData, LifeEvent, Person } from "./types";
import type { StoredProfile } from "@/lib/storage";

const KEY = (profileId: string) => `cosmora_chronicle_${profileId}`;

const EMPTY: ChronicleData = { schemaVersion: 1, events: [], people: [] };

export function getChronicle(profileId: string): ChronicleData {
  if (typeof window === "undefined" && typeof globalThis.localStorage === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(KEY(profileId));
    if (!raw) return { schemaVersion: 1, events: [], people: [] };
    return JSON.parse(raw) as ChronicleData;
  } catch { return { schemaVersion: 1, events: [], people: [] }; }
}

export function saveChronicle(profileId: string, data: ChronicleData): void {
  localStorage.setItem(KEY(profileId), JSON.stringify(data));
}

export function upsertEvent(profileId: string, event: LifeEvent): void {
  const data = getChronicle(profileId);
  const i = data.events.findIndex(e => e.id === event.id);
  if (i >= 0) data.events[i] = { ...event, updatedAt: new Date().toISOString() };
  else data.events.push(event);
  saveChronicle(profileId, data);
}

export function deleteEvent(profileId: string, eventId: string): void {
  const data = getChronicle(profileId);
  data.events = data.events.filter(e => e.id !== eventId);
  // remove dangling links to the deleted event
  for (const e of data.events) e.links = e.links.filter(l => l.eventId !== eventId);
  saveChronicle(profileId, data);
}

export function upsertPerson(profileId: string, person: Person): void {
  const data = getChronicle(profileId);
  const i = data.people.findIndex(p => p.id === person.id);
  if (i >= 0) data.people[i] = person;
  else data.people.push(person);
  saveChronicle(profileId, data);
}

export interface ChronicleExport {
  schemaVersion: 1;
  exportedAt: string;
  profile: { birthDate: string; birthTime: string; birthPlace: string; latitude: number; longitude: number; timezone: string };
  events: LifeEvent[];
  people: Person[];
}

export function exportChronicle(profileId: string, profile: StoredProfile): ChronicleExport {
  const data = getChronicle(profileId);
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile: {
      birthDate: profile.birthDate, birthTime: profile.birthTime, birthPlace: profile.birthPlace,
      latitude: profile.latitude, longitude: profile.longitude, timezone: profile.timezone,
    },
    events: data.events,
    people: data.people,
  };
}

export function importChronicle(
  profileId: string,
  imported: ChronicleExport,
  strategy: "keep_local" | "take_imported",
): { added: number; conflicts: number } {
  const data = getChronicle(profileId);
  let added = 0, conflicts = 0;
  const mergeById = <T extends { id: string }>(local: T[], incoming: T[]): T[] => {
    const out = [...local];
    for (const item of incoming) {
      const i = out.findIndex(x => x.id === item.id);
      if (i < 0) { out.push(item); added++; }
      else { conflicts++; if (strategy === "take_imported") out[i] = item; }
    }
    return out;
  };
  data.events = mergeById(data.events, imported.events);
  data.people = mergeById(data.people, imported.people);
  saveChronicle(profileId, data);
  return { added, conflicts };
}
```

- [ ] **Step 3: Create `scripts/verify-chronicle.ts` (storage + schema assertions)**

```typescript
// localStorage polyfill so storage.ts runs under Node/tsx
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
} as Storage;

import { confidenceForPrecision, validateEvent, EVENT_TYPE_META } from "../src/lib/chronicle/types";
import type { LifeEvent } from "../src/lib/chronicle/types";
import { getChronicle, upsertEvent, deleteEvent, upsertPerson, exportChronicle, importChronicle } from "../src/lib/chronicle/storage";
import type { StoredProfile } from "../src/lib/storage";

let failures = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ok  ${name}`);
  else { failures++; console.log(`FAIL  ${name}  ${detail}`); }
}

const PID = "test-profile";
function makeEvent(id: string, overrides: Partial<LifeEvent> = {}): LifeEvent {
  return {
    id, schemaVersion: 1, title: `Event ${id}`, eventType: "decision",
    startsAt: "2020-12-16", datePrecision: "exact",
    domains: ["identity"], emotionalTone: ["awe"],
    emotionalValence: 0.5, emotionalIntensity: 0.8,
    narrative: "test narrative", people: [], links: [], reflections: [],
    provenance: { source: "manual", confidence: 1.0 },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// --- confidence ladder ---
assert("confidence exact = 1.0",  confidenceForPrecision("exact") === 1.0);
assert("confidence month = 0.6",  confidenceForPrecision("month") === 0.6);
assert("confidence year = 0.4",   confidenceForPrecision("year") === 0.4);
assert("confidence period = 0.4", confidenceForPrecision("period") === 0.4);

// --- validateEvent ---
const ids = new Set(["e1", "e2"]);
assert("valid event passes", validateEvent(makeEvent("e1"), ids).length === 0);
assert("bad valence caught", validateEvent(makeEvent("e1", { emotionalValence: 2 }), ids).length === 1);
assert("bad date caught", validateEvent(makeEvent("e1", { startsAt: "Dec 2020" }), ids).length === 1);
assert("ends before starts caught", validateEvent(makeEvent("e1", { endsAt: "2019-01-01" }), ids).length === 1);
assert("dangling link caught", validateEvent(makeEvent("e1", { links: [{ eventId: "missing", type: "echoes" }] }), ids).length === 1);

// --- EVENT_TYPE_META completeness ---
assert("29 event types have meta", Object.keys(EVENT_TYPE_META).length === 29);

// --- storage round-trip ---
upsertEvent(PID, makeEvent("e1"));
upsertEvent(PID, makeEvent("e2", { links: [{ eventId: "e1", type: "echoes" }] }));
upsertPerson(PID, { id: "p1", name: "Partner", relationshipType: "partner" });
assert("2 events saved", getChronicle(PID).events.length === 2);
assert("1 person saved", getChronicle(PID).people.length === 1);
upsertEvent(PID, makeEvent("e1", { title: "Renamed" }));
assert("upsert updates not duplicates", getChronicle(PID).events.length === 2);
assert("upsert applied", getChronicle(PID).events.find(e => e.id === "e1")!.title === "Renamed");
deleteEvent(PID, "e1");
assert("delete removes event", getChronicle(PID).events.length === 1);
assert("delete cleans dangling links", getChronicle(PID).events[0].links.length === 0);

// --- export / import ---
const profile = {
  id: PID, name: "Test", birthDate: "1990-06-15", birthTime: "08:30:00", birthPlace: "LA",
  latitude: 34.05, longitude: -118.24, timezone: "America/Los_Angeles",
  birthTimeConfidence: "exact", houseSystem: "whole_sign", astrologyMode: "western", createdAt: "",
} as StoredProfile;
const exported = exportChronicle(PID, profile);
assert("export has events", exported.events.length === 1);
assert("export has birth data", exported.profile.birthDate === "1990-06-15");
const r1 = importChronicle(PID, exported, "keep_local");
assert("re-import all conflicts, none added", r1.added === 0 && r1.conflicts === 2); // 1 event + 1 person
const r2 = importChronicle(PID, { ...exported, events: [makeEvent("e9")], people: [] }, "keep_local");
assert("new event imported", r2.added === 1 && getChronicle(PID).events.some(e => e.id === "e9"));

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 4: Run verification** — `npx tsx scripts/verify-chronicle.ts` — Expected: `ALL PASS`
- [ ] **Step 5: Run build** — `npm run build` — Expected: `✓ Compiled successfully`
- [ ] **Step 6: Commit**

```bash
git add src/lib/chronicle/ scripts/verify-chronicle.ts
git commit -m "feat(chronicle): add graph types, storage CRUD with export/import, verification"
```

---

### Task 2: Sky-state encoder

**Files:**
- Create: `src/lib/chronicle/sky-state.ts`
- Modify: `scripts/verify-chronicle.ts` (append encoder assertions)

**Interfaces produced:**
```typescript
export interface TransitHit { transitingBody: PlanetName; aspect: AspectName; natalPoint: string; orb: number; applying: boolean; natalHouse: number; }
export interface SkyState { encoderVersion: 1; approximate: boolean; transitHits: TransitHit[]; dasha: { major: string; antar: string }; firdaria: { major: string; sub: string }; zrFortune: { l1Sign: string; l2Sign: string }; profection: { year: number; house: number; lordOfYear: string }; eclipseProximity?: { kind: "solar" | "lunar"; daysAway: number }; signature: string[]; }
export function computeSkyState(chart: ChartData, profile: StoredProfile, date: string, precision?: DatePrecision): SkyState
export function topTokens(state: SkyState, n: number): string[]   // n tightest-orb transit tokens, falls back to lord tokens
```

- [ ] **Step 1: Create `src/lib/chronicle/sky-state.ts`**

```typescript
import { calculateChart, calculateFirdaria } from "@/lib/astrology/calculator";
import { buildVimshottariDasha, lahiriAyanamsa } from "@/lib/astrology/sidereal";
import { buildL1Periods, buildSubPeriods } from "@/lib/astrology/zodiacalReleasing";
import { ZODIAC_SIGNS, TRADITIONAL_RULERS } from "@/lib/astrology/types";
import type { ChartData, PlanetName, ZodiacSign } from "@/lib/astrology/types";
import type { StoredProfile } from "@/lib/storage";
import type { DatePrecision } from "./types";

export type AspectName = "conjunction" | "sextile" | "square" | "trine" | "opposition";

export interface TransitHit {
  transitingBody: PlanetName;
  aspect: AspectName;
  natalPoint: string;      // planet name or "Ascendant" | "Midheaven"
  orb: number;
  applying: boolean;
  natalHouse: number;      // house the natal point occupies (0 for angles = their own house cusp: ASC=1, MC=10)
}

export interface SkyState {
  encoderVersion: 1;
  approximate: boolean;
  transitHits: TransitHit[];
  dasha: { major: string; antar: string };
  firdaria: { major: string; sub: string };
  zrFortune: { l1Sign: string; l2Sign: string };
  profection: { year: number; house: number; lordOfYear: string };
  eclipseProximity?: { kind: "solar" | "lunar"; daysAway: number };
  signature: string[];
}

const ASPECTS: { name: AspectName; angle: number; abbrev: string }[] = [
  { name: "conjunction", angle: 0,   abbrev: "conj" },
  { name: "sextile",     angle: 60,  abbrev: "sextile" },
  { name: "square",      angle: 90,  abbrev: "square" },
  { name: "trine",       angle: 120, abbrev: "trine" },
  { name: "opposition",  angle: 180, abbrev: "opp" },
];

const FAST_BODIES: PlanetName[] = ["Sun", "Moon", "Mercury", "Venus", "Mars"];
const SLOW_BODIES: PlanetName[] = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const TRANSIT_BODIES: PlanetName[] = [...FAST_BODIES, ...SLOW_BODIES];

const DASHA_SEQ = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const DASHA_YEARS: Record<string, number> = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };

function sep(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/** Planet longitudes at noon UTC on `date`, computed with the existing (synchronous) chart engine. */
function transitPositions(date: string, profile: StoredProfile) {
  const chart = calculateChart({
    birthDate: date, birthTime: "12:00:00",
    latitude: profile.latitude, longitude: profile.longitude,
    timezone: "UTC", houseSystem: profile.houseSystem as "whole_sign",
  });
  return chart.planets;
}

function computeTransitHits(natal: ChartData, profile: StoredProfile, date: string, orbWiden: number): TransitHit[] {
  const now = transitPositions(date, profile);
  const nextDay = new Date(date + "T12:00:00Z"); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const tomorrow = transitPositions(nextDay.toISOString().slice(0, 10), profile);

  const natalPoints: { name: string; longitude: number; house: number }[] = [
    ...natal.planets.map(p => ({ name: p.name as string, longitude: p.longitude, house: p.house })),
    { name: "Ascendant", longitude: natal.ascendant, house: 1 },
    { name: "Midheaven", longitude: natal.midheaven, house: 10 },
  ];

  const hits: TransitHit[] = [];
  for (const body of TRANSIT_BODIES) {
    const t = now.find(p => p.name === body);
    const t2 = tomorrow.find(p => p.name === body);
    if (!t || !t2) continue;
    const maxOrb = (FAST_BODIES.includes(body) ? 5 : 3) + orbWiden;
    for (const np of natalPoints) {
      const s = sep(t.longitude, np.longitude);
      for (const asp of ASPECTS) {
        const orb = Math.abs(s - asp.angle);
        if (orb <= maxOrb) {
          const orbTomorrow = Math.abs(sep(t2.longitude, np.longitude) - asp.angle);
          hits.push({
            transitingBody: body, aspect: asp.name, natalPoint: np.name,
            orb: Math.round(orb * 100) / 100, applying: orbTomorrow < orb, natalHouse: np.house,
          });
        }
      }
    }
  }
  return hits.sort((a, b) => a.orb - b.orb);
}

/** Antardasha ruler within a major period at `date` — proportional sub-periods starting from the major ruler. */
function antarAtDate(majorRuler: string, majorStart: Date, majorYears: number, date: Date): string {
  const YEAR_MS = 365.25 * 86400000;
  const startIdx = DASHA_SEQ.indexOf(majorRuler);
  let cursor = majorStart.getTime();
  for (let i = 0; i < 9; i++) {
    const sub = DASHA_SEQ[(startIdx + i) % 9];
    const end = cursor + (DASHA_YEARS[sub] / 120) * majorYears * YEAR_MS;
    if (date.getTime() < end) return sub;
    cursor = end;
  }
  return DASHA_SEQ[startIdx]; // date at exact end boundary — return first
}

/** Nearest eclipse within ±14 days: daily lunation scan + mean-node distance check (approximation, encoder v1). */
function findNearbyEclipse(date: string, profile: StoredProfile): { kind: "solar" | "lunar"; daysAway: number } | undefined {
  const center = new Date(date + "T12:00:00Z");
  let best: { kind: "solar" | "lunar"; daysAway: number; score: number } | undefined;
  for (let d = -14; d <= 14; d++) {
    const day = new Date(center); day.setUTCDate(day.getUTCDate() + d);
    const planets = transitPositions(day.toISOString().slice(0, 10), profile);
    const sun = planets.find(p => p.name === "Sun");
    const moon = planets.find(p => p.name === "Moon");
    const node = planets.find(p => p.name === "NorthNode");
    if (!sun || !moon || !node) continue;
    const sunMoon = sep(sun.longitude, moon.longitude);
    const isNew = sunMoon < 7;                       // Moon moves ~13°/day: daily sampling catches lunations within ~7°
    const isFull = Math.abs(sunMoon - 180) < 7;
    if (!isNew && !isFull) continue;
    const nodeDist = Math.min(sep(moon.longitude, node.longitude), sep(moon.longitude, node.longitude + 180));
    if (nodeDist > 18) continue;                     // not near the nodal axis → ordinary lunation
    const kind: "solar" | "lunar" = isNew ? "solar" : "lunar";
    const score = isNew ? sunMoon : Math.abs(sunMoon - 180);
    if (!best || score < best.score) best = { kind, daysAway: d, score };
  }
  return best ? { kind: best.kind, daysAway: best.daysAway } : undefined;
}

export function computeSkyState(
  chart: ChartData,
  profile: StoredProfile,
  date: string,
  precision: DatePrecision = "exact",
): SkyState {
  const birthDatetime = chart.birthDatetime;
  const birth = new Date(birthDatetime);
  const eventDate = new Date(date + "T12:00:00Z");
  const approximate = precision !== "exact";
  const skipTransits = precision === "year" || precision === "period";
  // month precision: sample mid-month with widened orbs
  const sampleDate = precision === "month" ? date.slice(0, 8) + "15" : date;
  const orbWiden = precision === "month" ? 2 : 0;

  // ── Transits ──
  const transitHits = skipTransits ? [] : computeTransitHits(chart, profile, sampleDate, orbWiden);

  // ── Dasha at date ──
  const ayanamsa = lahiriAyanamsa(birth);
  const moon = chart.planets.find(p => p.name === "Moon");
  const moonSidereal = moon ? ((moon.longitude - ayanamsa) % 360 + 360) % 360 : 0;
  const dashaData = buildVimshottariDasha(moonSidereal, birthDatetime);
  const majorAt = dashaData.major.find(m => eventDate >= m.start && eventDate < m.end);
  const dashaMajor = majorAt ? String(majorAt.ruler) : "—";
  const dashaAntar = majorAt ? antarAtDate(String(majorAt.ruler), majorAt.start, majorAt.years, eventDate) : "—";

  // ── Firdaria at date ──
  const fPeriods = calculateFirdaria(birthDatetime, chart.sect === "day");
  const fMain = fPeriods.find(p => p.isMainPeriod && eventDate >= p.start && eventDate < p.end);
  const fSub = fPeriods.find(p => !p.isMainPeriod && eventDate >= p.start && eventDate < p.end);
  const firdaria = { major: fMain ? String(fMain.lord) : "—", sub: fSub?.subLord ? String(fSub.subLord) : "—" };

  // ── ZR Fortune at date ──
  const l1s = buildL1Periods(chart.lotOfFortune, birthDatetime);
  const l1 = l1s.find(p => eventDate >= p.start && eventDate < p.end);
  const l2 = l1 ? buildSubPeriods(l1, 2).find(p => eventDate >= p.start && eventDate < p.end) : undefined;
  const zrFortune = { l1Sign: l1 ? l1.sign : "—", l2Sign: l2 ? l2.sign : "—" };

  // ── Profection at date ──
  let age = eventDate.getUTCFullYear() - birth.getUTCFullYear();
  const bdayThisYear = new Date(Date.UTC(eventDate.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate()));
  if (eventDate < bdayThisYear) age--;
  age = Math.max(0, age);
  const profHouse = (age % 12) + 1;
  const ascSignIdx = Math.floor(((chart.ascendant % 360) + 360) % 360 / 30);
  const profSign = ZODIAC_SIGNS[(ascSignIdx + (age % 12)) % 12] as ZodiacSign;
  const profection = { year: age, house: profHouse, lordOfYear: String(TRADITIONAL_RULERS[profSign]) };

  // ── Eclipse proximity ── (skip for coarse dates — a ±14d window is meaningless against year precision)
  const eclipseProximity = skipTransits ? undefined : findNearbyEclipse(sampleDate, profile);

  // ── Signature tokens ──
  const ABBREV: Record<AspectName, string> = { conjunction: "conj", sextile: "sextile", square: "square", trine: "trine", opposition: "opp" };
  const tokens: string[] = [
    ...transitHits.map(h => `T.${h.transitingBody}.${ABBREV[h.aspect]}.${h.natalPoint}.H${h.natalHouse}`),
    `L.dasha.${dashaMajor}${dashaAntar !== "—" ? "." + dashaAntar : ""}`,
    `L.firdaria.${firdaria.major}`,
    `L.zr.${zrFortune.l1Sign}${zrFortune.l2Sign !== "—" ? ".L2." + zrFortune.l2Sign : ""}`,
    `L.prof.H${profHouse}.lord${profection.lordOfYear}`,
  ];
  if (eclipseProximity) tokens.push(`E.${eclipseProximity.kind}.${eclipseProximity.daysAway}`);
  const signature = [...new Set(tokens)];

  return { encoderVersion: 1, approximate, transitHits, dasha: { major: dashaMajor, antar: dashaAntar }, firdaria, zrFortune, profection, eclipseProximity, signature };
}

/** The n strongest tokens for the collapsed-card strip: tightest-orb transits first, then timing lords. */
export function topTokens(state: SkyState, n: number): string[] {
  const transitTokens = state.signature.filter(t => t.startsWith("T."));
  const lordTokens = state.signature.filter(t => !t.startsWith("T."));
  return [...transitTokens, ...lordTokens].slice(0, n);
}
```

- [ ] **Step 2: Append encoder assertions to `scripts/verify-chronicle.ts`** (before the final `console.log`)

```typescript
// ─── Encoder ───
import { computeSkyState, topTokens } from "../src/lib/chronicle/sky-state";
import { calculateChart } from "../src/lib/astrology/calculator";

const chart = calculateChart({
  birthDate: "1990-06-15", birthTime: "08:30:00",
  latitude: 34.05, longitude: -118.24,
  timezone: "America/Los_Angeles", houseSystem: "whole_sign",
});

// Dec 16 2020: two days after the Dec 14 total solar eclipse, five days before the Great Conjunction
const state = computeSkyState(chart, profile, "2020-12-16", "exact");
assert("encoder version 1", state.encoderVersion === 1);
assert("exact not approximate", state.approximate === false);
assert("transit hits found", state.transitHits.length > 0);
assert("hits sorted by orb", state.transitHits.every((h, i, a) => i === 0 || a[i - 1].orb <= h.orb));
assert("dasha major valid", ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"].includes(state.dasha.major));
assert("dasha antar valid", ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"].includes(state.dasha.antar));
assert("firdaria major defined", state.firdaria.major !== "—");
assert("zr L1 defined", state.zrFortune.l1Sign !== "—");
assert("profection house 1-12", state.profection.house >= 1 && state.profection.house <= 12);
assert("profection age ~30", state.profection.year === 30);
assert("eclipse detected near 2020-12-14", state.eclipseProximity?.kind === "solar" && Math.abs(state.eclipseProximity.daysAway + 2) <= 2);
assert("signature deduped", new Set(state.signature).size === state.signature.length);
assert("signature has T tokens", state.signature.some(t => /^T\.\w+\.(conj|sextile|square|trine|opp)\.\w+\.H\d+$/.test(t)));
assert("signature has dasha token", state.signature.some(t => t.startsWith("L.dasha.")));
assert("signature has prof token", state.signature.some(t => /^L\.prof\.H\d+\.lord\w+$/.test(t)));
assert("topTokens returns n", topTokens(state, 3).length === 3);

// precision rules
const monthState = computeSkyState(chart, profile, "2020-12-01", "month");
assert("month precision approximate", monthState.approximate === true);
const yearState = computeSkyState(chart, profile, "2020-01-01", "year");
assert("year precision: no transit hits", yearState.transitHits.length === 0);
assert("year precision: no eclipse", yearState.eclipseProximity === undefined);
assert("year precision: lords still present", yearState.dasha.major !== "—" && yearState.zrFortune.l1Sign !== "—");
```

- [ ] **Step 3: Run verification** — `npx tsx scripts/verify-chronicle.ts` — Expected: `ALL PASS`. If the eclipse assertion fails, print `state.eclipseProximity` and loosen the window by ±1 day only if the detected eclipse is real (Dec 14 2020) — do not delete the assertion.
- [ ] **Step 4: Run build** — `npm run build` — Expected: `✓ Compiled successfully`
- [ ] **Step 5: Commit**

```bash
git add src/lib/chronicle/sky-state.ts scripts/verify-chronicle.ts
git commit -m "feat(chronicle): sky-state encoder — transits, timing lords, eclipse finder, signature grammar"
```

---

### Task 3: Reality Engine extraction route

**Files:**
- Create: `src/app/api/chronicle/extract/route.ts`

**Interfaces produced:** `POST /api/chronicle/extract` accepting `{ text: string; existingPeople: { id: string; name: string }[] }`, returning `{ events: ExtractedEvent[]; people: ExtractedPerson[] }` (shapes below — Task 4's page consumes them).

- [ ] **Step 1: Create `src/app/api/chronicle/extract/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ExtractedEvent {
  title: string;
  eventType: string;
  startsAt: string;          // YYYY-MM-DD, best guess
  endsAt?: string;
  datePrecision: "exact" | "month" | "year" | "period";
  domains: string[];
  emotionalTone: string[];
  emotionalValence: number;  // -1..1
  emotionalIntensity: number;// 0..1
  peopleNames: string[];     // names as they appear in the text
  confidence: number;        // 0..1 extraction confidence
  sourceText: string;        // the span this event came from
}

export interface ExtractedPerson {
  name: string;
  relationshipType: string;
  matchesExistingId?: string;
}

const EVENT_TYPES = "birth,death,family,parenting,relationship_start,relationship_end,conflict,reconciliation,career_start,career_end,promotion,money,legal,move,travel,education,health,recovery,loss,creative,achievement,decision,identity_shift,spiritual_awakening,dream,synchronicity,song,repeated_pattern,other";

const SYSTEM = `You are the Reality Engine: you extract structured life events from personal narratives. You separate fact from interpretation. You never invent details not present in the text.

Return ONLY a JSON object, no markdown fences, matching exactly:
{
  "events": [{
    "title": "short factual title",
    "eventType": "one of: ${EVENT_TYPES}",
    "startsAt": "YYYY-MM-DD (use -01 or -01-01 padding for partial dates)",
    "endsAt": "YYYY-MM-DD or omit",
    "datePrecision": "exact | month | year | period",
    "domains": ["subset of: family,identity,career,love,health,money,spirit,creative,home,community"],
    "emotionalTone": ["subset of: love,grief,fear,liberation,pressure,joy,anger,awe,shame,hope"],
    "emotionalValence": -1 to 1,
    "emotionalIntensity": 0 to 1,
    "peopleNames": ["names or roles as written, e.g. 'my ex', 'dad'"],
    "confidence": 0 to 1,
    "sourceText": "the exact phrase(s) from the narrative this event came from"
  }],
  "people": [{ "name": "as written", "relationshipType": "partner|parent|child|sibling|friend|mentor|rival|other", "matchesExistingId": "id if it matches a provided existing person, else omit" }]
}

Confidence ladder: 1.0 exact date stated, 0.8 exact date implied, 0.6 month/year stated, 0.4 approximate life period, 0.2 uncertain memory.
Multiple events per narrative are expected. Emotional values reflect what the narrator expresses, not your judgment.`;

async function callExtraction(text: string, existingPeople: { id: string; name: string }[], previousError?: string): Promise<string> {
  const userMsg = `Existing people (match against these if the narrative mentions them): ${JSON.stringify(existingPeople)}\n\nNarrative:\n${text}${previousError ? `\n\nYour previous response failed to parse: ${previousError}. Return ONLY valid JSON.` : ""}`;
  const resp = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    temperature: 0,
    system: SYSTEM,
    messages: [{ role: "user", content: userMsg }],
  });
  const block = resp.content[0];
  return block.type === "text" ? block.text : "";
}

function parseResult(raw: string): { events: ExtractedEvent[]; people: ExtractedPerson[] } {
  // tolerate accidental code fences
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.events)) throw new Error("missing events array");
  return { events: parsed.events, people: Array.isArray(parsed.people) ? parsed.people : [] };
}

export async function POST(req: NextRequest) {
  try {
    const { text, existingPeople = [] } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return NextResponse.json({ error: "text too short" }, { status: 400 });
    }
    let raw = await callExtraction(text, existingPeople);
    try {
      return NextResponse.json(parseResult(raw));
    } catch (e1) {
      // one retry with the parse error appended
      raw = await callExtraction(text, existingPeople, String(e1));
      try {
        return NextResponse.json(parseResult(raw));
      } catch {
        return NextResponse.json({ error: "extraction failed after retry" }, { status: 502 });
      }
    }
  } catch {
    return NextResponse.json({ error: "extraction request failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Run build** — `npm run build` — Expected: `✓ Compiled successfully`, route listed as `ƒ /api/chronicle/extract`
- [ ] **Step 3: Commit**

```bash
git add src/app/api/chronicle/extract/route.ts
git commit -m "feat(chronicle): Reality Engine extraction route — strict JSON, one retry, confidence ladder"
```

---

### Task 4: The Chronicle room

**Files:**
- Create: `src/app/dashboard/chronicle/page.tsx`

**Interfaces consumed:** everything from Tasks 1–3 exactly as named there, plus `getActiveProfileId`, `getProfile`, `getCachedChart`, `generateId` from `@/lib/storage`, `PLANET_SYMBOLS` from `@/lib/astrology/types`.

The page is one file with internal components. Complete code:

- [ ] **Step 1: Create `src/app/dashboard/chronicle/page.tsx`**

```tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart, generateId } from "@/lib/storage";
import type { StoredProfile } from "@/lib/storage";
import type { ChartData } from "@/lib/astrology/types";
import {
  EVENT_TYPE_META, DOMAINS, TONES, confidenceForPrecision,
} from "@/lib/chronicle/types";
import type { LifeEvent, Person, ChronicleEventType, DatePrecision, EdgeType, Reflection } from "@/lib/chronicle/types";
import {
  getChronicle, upsertEvent, deleteEvent, upsertPerson, exportChronicle, importChronicle,
} from "@/lib/chronicle/storage";
import type { ChronicleExport } from "@/lib/chronicle/storage";
import { computeSkyState, topTokens } from "@/lib/chronicle/sky-state";
import type { SkyState } from "@/lib/chronicle/sky-state";

const MONO = "'Fragment Mono', monospace";
const SERIF = "'Cormorant Garamond', serif";
const GOLD = "#C8A55B";
const BORDER = "1px solid rgba(40,60,100,0.3)";

const BIO_PROMPTS = [
  "Top 5 turning points", "Major relationships", "Career timeline",
  "Moves & homes", "Health & crisis points", "Spiritual shifts", "Creative milestones",
];

const EDGE_LABELS: Record<EdgeType, string> = { echoes: "echoes", follows: "follows", caused_by: "caused by", part_of: "part of" };

function tokenChip(token: string): string {
  // compact display: T.Saturn.square.Moon.H4 → ♄ □ ☽ H4
  const GLYPH: Record<string, string> = { Sun:"☉",Moon:"☽",Mercury:"☿",Venus:"♀",Mars:"♂",Jupiter:"♃",Saturn:"♄",Uranus:"⛢",Neptune:"♆",Pluto:"♇",Ascendant:"ASC",Midheaven:"MC" };
  const ASP: Record<string, string> = { conj:"☌", sextile:"⚹", square:"□", trine:"△", opp:"☍" };
  const parts = token.split(".");
  if (parts[0] === "T") return `${GLYPH[parts[1]] ?? parts[1]} ${ASP[parts[2]] ?? parts[2]} ${GLYPH[parts[3]] ?? parts[3]} ${parts[4]}`;
  if (parts[0] === "L") return parts.slice(1).join(" ");
  if (parts[0] === "E") return `${parts[1]} eclipse ${parts[2]}d`;
  return token;
}

function fmtDate(e: LifeEvent): string {
  const pre = e.datePrecision === "exact" ? "" : "~";
  const d = e.startsAt.slice(0, e.datePrecision === "year" ? 4 : e.datePrecision === "month" ? 7 : 10);
  return e.endsAt ? `${pre}${d} → ${e.endsAt.slice(0, 10)}` : `${pre}${d}`;
}

// ─── Chip toggle row ─────────────────────────────────────────────────────────
function ChipRow({ options, selected, onToggle, color }: {
  options: readonly string[]; selected: string[]; onToggle: (v: string) => void; color: string;
}) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {options.map(o => {
        const on = selected.includes(o);
        return (
          <button key={o} onClick={() => onToggle(o)} style={{
            padding: "3px 10px", borderRadius: 16, cursor: "pointer",
            background: on ? `${color}18` : "transparent",
            border: `1px solid ${on ? color + "50" : "rgba(40,60,100,0.35)"}`,
            color: on ? color : "#445577", fontSize: 9, fontFamily: MONO, letterSpacing: "0.08em",
          }}>{o}</button>
        );
      })}
    </div>
  );
}

// ─── Quick-add / edit form ──────────────────────────────────────────────────
interface FormState {
  id?: string;
  title: string; eventType: ChronicleEventType; startsAt: string; endsAt: string;
  datePrecision: DatePrecision; locationName: string;
  domains: string[]; emotionalTone: string[];
  valenceSign: "positive" | "negative" | "mixed"; intensityDots: number;
  narrative: string; people: string[];
}
const emptyForm = (): FormState => ({
  title: "", eventType: "decision", startsAt: "", endsAt: "", datePrecision: "exact",
  locationName: "", domains: [], emotionalTone: [], valenceSign: "positive", intensityDots: 3,
  narrative: "", people: [],
});

function EventForm({ initial, people, onSave, onCancel, onCreatePerson }: {
  initial: FormState; people: Person[];
  onSave: (f: FormState) => void; onCancel: () => void;
  onCreatePerson: (name: string) => Person;
}) {
  const [f, setF] = useState<FormState>(initial);
  const [newPerson, setNewPerson] = useState("");
  const set = (patch: Partial<FormState>) => setF(prev => ({ ...prev, ...patch }));
  const inputStyle = {
    width: "100%", padding: "8px 10px", background: "rgba(10,15,35,0.7)", border: BORDER,
    borderRadius: 8, color: "#C0D4FF", fontSize: 12, fontFamily: MONO, outline: "none", boxSizing: "border-box" as const,
  };
  const label = (t: string) => (
    <p style={{ color: "#445577", fontSize: 8, fontFamily: MONO, letterSpacing: "0.15em", margin: "12px 0 5px" }}>{t}</p>
  );
  return (
    <div>
      {label("TITLE")}
      <input style={inputStyle} value={f.title} onChange={e => set({ title: e.target.value })} placeholder="What happened" />
      {label("EVENT TYPE")}
      <select style={{ ...inputStyle, cursor: "pointer" }} value={f.eventType} onChange={e => set({ eventType: e.target.value as ChronicleEventType })}>
        {Object.entries(EVENT_TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.glyph} {m.label}</option>)}
      </select>
      {label("DATE PRECISION")}
      <div style={{ display: "flex", gap: 5 }}>
        {(["exact", "month", "year", "period"] as DatePrecision[]).map(p => (
          <button key={p} onClick={() => set({ datePrecision: p })} style={{
            padding: "4px 12px", borderRadius: 16, cursor: "pointer", fontSize: 9, fontFamily: MONO,
            background: f.datePrecision === p ? `${GOLD}18` : "transparent",
            border: `1px solid ${f.datePrecision === p ? GOLD + "50" : "rgba(40,60,100,0.35)"}`,
            color: f.datePrecision === p ? GOLD : "#445577",
          }}>{p.toUpperCase()}</button>
        ))}
      </div>
      {label(f.datePrecision === "period" ? "START DATE" : "DATE")}
      <input type="date" style={inputStyle} value={f.startsAt} onChange={e => set({ startsAt: e.target.value })} />
      {f.datePrecision === "period" && (<>
        {label("END DATE (OPTIONAL)")}
        <input type="date" style={inputStyle} value={f.endsAt} onChange={e => set({ endsAt: e.target.value })} />
      </>)}
      {label("INTENSITY")}
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => set({ intensityDots: n })} style={{
            width: 18, height: 18, borderRadius: "50%", cursor: "pointer", border: `1px solid ${GOLD}60`,
            background: n <= f.intensityDots ? GOLD : "transparent",
          }} />
        ))}
      </div>
      {label("THIS WAS")}
      <div style={{ display: "flex", gap: 5 }}>
        {(["positive", "negative", "mixed"] as const).map(v => (
          <button key={v} onClick={() => set({ valenceSign: v })} style={{
            padding: "4px 12px", borderRadius: 16, cursor: "pointer", fontSize: 9, fontFamily: MONO,
            background: f.valenceSign === v ? "rgba(123,111,212,0.15)" : "transparent",
            border: `1px solid ${f.valenceSign === v ? "#7B6FD4" : "rgba(40,60,100,0.35)"}`,
            color: f.valenceSign === v ? "#BFB6E8" : "#445577",
          }}>{v.toUpperCase()}</button>
        ))}
      </div>
      {label("DOMAINS")}
      <ChipRow options={DOMAINS} selected={f.domains} color="#06b6d4"
        onToggle={v => set({ domains: f.domains.includes(v) ? f.domains.filter(x => x !== v) : [...f.domains, v] })} />
      {label("EMOTIONAL TONE")}
      <ChipRow options={TONES} selected={f.emotionalTone} color="#f472b6"
        onToggle={v => set({ emotionalTone: f.emotionalTone.includes(v) ? f.emotionalTone.filter(x => x !== v) : [...f.emotionalTone, v] })} />
      {label("PEOPLE")}
      <ChipRow options={people.map(p => p.name)} selected={f.people.map(id => people.find(p => p.id === id)?.name ?? "")} color="#a78bfa"
        onToggle={name => {
          const person = people.find(p => p.name === name); if (!person) return;
          set({ people: f.people.includes(person.id) ? f.people.filter(x => x !== person.id) : [...f.people, person.id] });
        }} />
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input style={{ ...inputStyle, flex: 1 }} value={newPerson} onChange={e => setNewPerson(e.target.value)} placeholder="Add person…" />
        <button onClick={() => { if (newPerson.trim()) { const p = onCreatePerson(newPerson.trim()); set({ people: [...f.people, p.id] }); setNewPerson(""); } }}
          style={{ padding: "0 14px", borderRadius: 8, cursor: "pointer", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)", color: "#a78bfa", fontSize: 10, fontFamily: MONO }}>+</button>
      </div>
      {label("LOCATION (OPTIONAL)")}
      <input style={inputStyle} value={f.locationName} onChange={e => set({ locationName: e.target.value })} placeholder="City, place…" />
      {label("YOUR WORDS")}
      <textarea style={{ ...inputStyle, minHeight: 70, fontFamily: SERIF, fontSize: 13, resize: "vertical" }}
        value={f.narrative} onChange={e => set({ narrative: e.target.value })} placeholder="What happened, in your own words — this is preserved verbatim." />
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={() => onSave(f)} disabled={!f.title.trim() || !f.startsAt} style={{
          flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer", fontFamily: MONO, fontSize: 10, letterSpacing: "0.15em",
          background: `${GOLD}18`, border: `1px solid ${GOLD}50`, color: GOLD,
          opacity: !f.title.trim() || !f.startsAt ? 0.4 : 1,
        }}>SAVE EVENT</button>
        <button onClick={onCancel} style={{ padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, fontSize: 10, background: "transparent", border: BORDER, color: "#445577" }}>CANCEL</button>
      </div>
    </div>
  );
}

// ─── Expanded sky state view ─────────────────────────────────────────────────
function SkyStateView({ state }: { state: SkyState }) {
  const row = (label: string, value: string) => (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <span style={{ color: "#445577", fontSize: 8, fontFamily: MONO, letterSpacing: "0.12em", width: 74, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#C0D4FF", fontSize: 11, fontFamily: MONO }}>{value}</span>
    </div>
  );
  return (
    <div style={{ background: "rgba(10,15,35,0.5)", border: BORDER, borderRadius: 10, padding: "12px 14px", marginTop: 10 }}>
      <p style={{ color: GOLD, fontSize: 8, fontFamily: MONO, letterSpacing: "0.18em", marginBottom: 8 }}>
        SKY STATE{state.approximate ? " · APPROXIMATE" : ""} · ENCODER v{state.encoderVersion}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {row("DASHA", `${state.dasha.major} / ${state.dasha.antar}`)}
        {row("FIRDARIA", `${state.firdaria.major} / ${state.firdaria.sub}`)}
        {row("ZR FORTUNE", `${state.zrFortune.l1Sign} · L2 ${state.zrFortune.l2Sign}`)}
        {row("PROFECTION", `Year ${state.profection.year} · House ${state.profection.house} · Lord ${state.profection.lordOfYear}`)}
        {state.eclipseProximity && row("ECLIPSE", `${state.eclipseProximity.kind} eclipse ${state.eclipseProximity.daysAway >= 0 ? "+" : ""}${state.eclipseProximity.daysAway}d`)}
      </div>
      {state.transitHits.length > 0 && (<>
        <p style={{ color: "#445577", fontSize: 8, fontFamily: MONO, letterSpacing: "0.15em", margin: "10px 0 6px" }}>TRANSIT HITS</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {state.transitHits.map((h, i) => (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 10, fontFamily: MONO }}>
              <span style={{ color: "#BFB6E8", width: 200 }}>{h.transitingBody} {h.aspect} {h.natalPoint}</span>
              <span style={{ color: "#445577" }}>orb {h.orb.toFixed(2)}° {h.applying ? "applying" : "separating"} · H{h.natalHouse}</span>
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function ChroniclePage() {
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"none" | "add" | "story" | "edit">("none");
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [storyText, setStoryText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [pending, setPending] = useState<{ events: Record<string, unknown>[]; people: Record<string, unknown>[] } | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sigQuery, setSigQuery] = useState("");
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [reflectingOn, setReflectingOn] = useState<string | null>(null);
  const [reflectionText, setReflectionText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = (pid: string) => {
    const data = getChronicle(pid);
    setEvents([...data.events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
    setPeople(data.people);
  };

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) return;
    const p = getProfile(id);
    const c = getCachedChart(id);
    if (!p || !c) return;
    setProfile(p); setChart(c); reload(id);
  }, []);

  // Sky states for expanded card + signature search (computed on view, never stored)
  const skyStates = useMemo(() => {
    if (!chart || !profile) return new Map<string, SkyState>();
    const map = new Map<string, SkyState>();
    const need = sigQuery ? events : events.filter(e => e.id === expandedId);
    for (const e of need) map.set(e.id, computeSkyState(chart, profile, e.startsAt, e.datePrecision));
    return map;
  }, [chart, profile, events, expandedId, sigQuery]);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (typeFilter !== "all" && e.eventType !== typeFilter) return false;
      if (sigQuery) {
        const state = skyStates.get(e.id);
        if (!state) return false;
        const terms = sigQuery.toLowerCase().split(/\s+/).filter(Boolean);
        const sig = state.signature.join(" ").toLowerCase();
        if (!terms.every(t => sig.includes(t))) return false;
      }
      return true;
    });
  }, [events, typeFilter, sigQuery, skyStates]);

  const byYear = useMemo(() => {
    const groups = new Map<string, LifeEvent[]>();
    for (const e of filtered) {
      const y = e.startsAt.slice(0, 4);
      if (!groups.has(y)) groups.set(y, []);
      groups.get(y)!.push(e);
    }
    return [...groups.entries()];
  }, [filtered]);

  const pid = profile?.id ?? "";

  const createPerson = (name: string): Person => {
    const p: Person = { id: generateId(), name, relationshipType: "other" };
    upsertPerson(pid, p); reload(pid); return p;
  };

  const saveForm = (f: FormState) => {
    const valence = f.valenceSign === "positive" ? 0.7 : f.valenceSign === "negative" ? -0.7 : 0;
    const ev: LifeEvent = {
      id: f.id ?? generateId(), schemaVersion: 1, title: f.title.trim(), eventType: f.eventType,
      startsAt: f.startsAt, endsAt: f.datePrecision === "period" && f.endsAt ? f.endsAt : undefined,
      datePrecision: f.datePrecision,
      location: f.locationName.trim() ? { name: f.locationName.trim() } : undefined,
      domains: f.domains, emotionalTone: f.emotionalTone,
      emotionalValence: valence, emotionalIntensity: f.intensityDots / 5,
      narrative: f.narrative, people: f.people,
      links: f.id ? (events.find(e => e.id === f.id)?.links ?? []) : [],
      reflections: f.id ? (events.find(e => e.id === f.id)?.reflections ?? []) : [],
      provenance: f.id
        ? (events.find(e => e.id === f.id)?.provenance ?? { source: "manual", confidence: confidenceForPrecision(f.datePrecision) })
        : { source: "manual", confidence: confidenceForPrecision(f.datePrecision) },
      createdAt: f.id ? (events.find(e => e.id === f.id)?.createdAt ?? new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    upsertEvent(pid, ev); reload(pid); setPanel("none"); setEditForm(null);
  };

  const runExtraction = async () => {
    setExtracting(true); setExtractError("");
    try {
      const res = await fetch("/api/chronicle/extract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: storyText, existingPeople: people.map(p => ({ id: p.id, name: p.name })) }),
      });
      if (!res.ok) { setExtractError("Extraction failed — you can add events manually below."); setExtracting(false); return; }
      const data = await res.json();
      setPending(data);
    } catch { setExtractError("Extraction failed — you can add events manually below."); }
    setExtracting(false);
  };

  const confirmPendingEvent = (raw: Record<string, unknown>, idx: number) => {
    // resolve people names → ids (create if new)
    const names = (raw.peopleNames as string[] | undefined) ?? [];
    const ids: string[] = [];
    for (const name of names) {
      const existing = people.find(p => p.name.toLowerCase() === name.toLowerCase());
      ids.push(existing ? existing.id : createPerson(name).id);
    }
    const precision = (raw.datePrecision as DatePrecision) ?? "year";
    const ev: LifeEvent = {
      id: generateId(), schemaVersion: 1,
      title: String(raw.title ?? "Untitled"), eventType: (raw.eventType as ChronicleEventType) ?? "other",
      startsAt: String(raw.startsAt ?? ""), endsAt: raw.endsAt ? String(raw.endsAt) : undefined,
      datePrecision: precision,
      domains: (raw.domains as string[]) ?? [], emotionalTone: (raw.emotionalTone as string[]) ?? [],
      emotionalValence: Number(raw.emotionalValence ?? 0), emotionalIntensity: Number(raw.emotionalIntensity ?? 0.5),
      narrative: String(raw.sourceText ?? storyText), people: ids, links: [], reflections: [],
      provenance: { source: "ai_extracted", confidence: Number(raw.confidence ?? confidenceForPrecision(precision)) },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    upsertEvent(pid, ev); reload(pid);
    setPending(prev => prev ? { ...prev, events: prev.events.filter((_, i) => i !== idx) } : null);
  };

  const addReflection = (eventId: string, outcome?: Reflection["outcomeConfirmation"]) => {
    const e = events.find(x => x.id === eventId); if (!e || !reflectionText.trim()) return;
    const updated: LifeEvent = {
      ...e, reflections: [...e.reflections, { id: generateId(), date: new Date().toISOString().slice(0, 10), text: reflectionText.trim(), outcomeConfirmation: outcome }],
    };
    upsertEvent(pid, updated); reload(pid); setReflectingOn(null); setReflectionText("");
  };

  const linkEvents = (fromId: string, toId: string, type: EdgeType) => {
    const e = events.find(x => x.id === fromId); if (!e || fromId === toId) return;
    if (e.links.some(l => l.eventId === toId)) return;
    upsertEvent(pid, { ...e, links: [...e.links, { eventId: toId, type }] });
    reload(pid); setLinkingFrom(null);
  };

  const doExport = () => {
    if (!profile) return;
    const blob = new Blob([JSON.stringify(exportChronicle(pid, profile), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cosmora-chronicle-${profile.name}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as ChronicleExport;
        // strategy fixed to keep_local for this slice; conflict-resolution UI comes later
        const { added, conflicts } = importChronicle(pid, parsed, "keep_local");
        reload(pid);
        alert(`Imported ${added} new item(s). ${conflicts} conflict(s) kept local versions.`);
      } catch { alert("Import failed: not a valid Chronicle export."); }
    };
    reader.readAsText(file);
  };

  if (!profile || !chart) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <p style={{ color: "#445577", fontSize: 11, fontFamily: MONO }} className="ml-16">CREATE A PROFILE TO BEGIN YOUR CHRONICLE</p>
      </div>
    );
  }

  const oracleQ = (e: LifeEvent, state?: SkyState) => {
    const tokens = state ? topTokens(state, 4).join(", ") : "";
    return encodeURIComponent(`Tell me about this life event against my chart. Event: "${e.title}" (${fmtDate(e)}). ${e.narrative ? `My words: ${e.narrative.slice(0, 300)}. ` : ""}${tokens ? `Active signatures at the time: ${tokens}.` : ""}`);
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#010810" }}>
      <DashboardBg />
      <div className="absolute inset-0 overflow-y-auto" style={{ left: 64, scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px 60px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ width: 6, height: 28, background: GOLD, borderRadius: 3, boxShadow: `0 0 10px ${GOLD}` }} />
            <h1 style={{ color: "#C0D4FF", fontSize: 22, fontFamily: MONO, letterSpacing: "0.15em", textTransform: "uppercase" }}>Chronicle</h1>
            <span style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}35`, borderRadius: 20, padding: "3px 12px", color: GOLD, fontSize: 9, fontFamily: MONO, letterSpacing: "0.15em" }}>
              {events.length} EVENTS
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button onClick={doExport} style={{ padding: "5px 12px", borderRadius: 8, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 9, fontFamily: MONO }}>EXPORT</button>
              <button onClick={() => fileRef.current?.click()} style={{ padding: "5px 12px", borderRadius: 8, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 9, fontFamily: MONO }}>IMPORT</button>
              <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) doImport(e.target.files[0]); e.target.value = ""; }} />
            </div>
          </div>
          <p style={{ color: "#445577", fontSize: 12, fontFamily: SERIF, fontStyle: "italic", paddingLeft: 18, marginBottom: 20 }}>
            Your life as a living graph — every event encoded against the sky
          </p>

          {/* Intake buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={() => { setEditForm(null); setPanel(panel === "add" ? "none" : "add"); }} style={{
              padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em",
              background: panel === "add" ? `${GOLD}18` : "transparent", border: `1px solid ${GOLD}45`, color: GOLD,
            }}>+ ADD EVENT</button>
            <button onClick={() => setPanel(panel === "story" ? "none" : "story")} style={{
              padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em",
              background: panel === "story" ? "rgba(123,111,212,0.15)" : "transparent", border: "1px solid rgba(123,111,212,0.45)", color: "#BFB6E8",
            }}>✦ TELL YOUR STORY</button>
          </div>

          {/* Panels */}
          <AnimatePresence>
            {(panel === "add" || panel === "edit") && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden", marginBottom: 20 }}>
                <div style={{ background: "rgba(10,15,35,0.6)", border: BORDER, borderRadius: 12, padding: 18 }}>
                  <EventForm initial={editForm ?? emptyForm()} people={people}
                    onSave={saveForm} onCancel={() => { setPanel("none"); setEditForm(null); }} onCreatePerson={createPerson} />
                </div>
              </motion.div>
            )}
            {panel === "story" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden", marginBottom: 20 }}>
                <div style={{ background: "rgba(10,15,35,0.6)", border: "1px solid rgba(123,111,212,0.3)", borderRadius: 12, padding: 18 }}>
                  <p style={{ color: "#BFB6E8", fontSize: 9, fontFamily: MONO, letterSpacing: "0.15em", marginBottom: 8 }}>THE REALITY ENGINE LISTENS</p>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                    {BIO_PROMPTS.map(p => (
                      <button key={p} onClick={() => setStoryText(t => t ? `${t}\n\n${p}: ` : `${p}: `)} style={{
                        padding: "3px 10px", borderRadius: 16, cursor: "pointer", background: "transparent",
                        border: "1px solid rgba(123,111,212,0.3)", color: "#7B6FD4", fontSize: 8, fontFamily: MONO,
                      }}>{p}</button>
                    ))}
                  </div>
                  <textarea value={storyText} onChange={e => setStoryText(e.target.value)}
                    placeholder="Write your story in any form — dates, chapters, fragments. The engine extracts the events; you confirm before anything is saved."
                    style={{ width: "100%", minHeight: 130, padding: "10px 12px", background: "rgba(5,8,20,0.7)", border: BORDER, borderRadius: 8, color: "#C0D4FF", fontSize: 13, fontFamily: SERIF, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                  {extractError && <p style={{ color: "#fb7185", fontSize: 10, fontFamily: MONO, marginTop: 8 }}>{extractError}</p>}
                  <button onClick={runExtraction} disabled={extracting || storyText.trim().length < 10} style={{
                    marginTop: 10, padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em",
                    background: "rgba(123,111,212,0.15)", border: "1px solid rgba(123,111,212,0.45)", color: "#BFB6E8",
                    opacity: extracting || storyText.trim().length < 10 ? 0.4 : 1,
                  }}>{extracting ? "READING YOUR STORY…" : "EXTRACT EVENTS"}</button>

                  {/* Confirmation table */}
                  {pending && pending.events.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <p style={{ color: GOLD, fontSize: 9, fontFamily: MONO, letterSpacing: "0.15em", marginBottom: 8 }}>
                        {pending.events.length} EVENT(S) EXTRACTED — CONFIRM EACH BEFORE SAVING
                      </p>
                      {pending.events.map((raw, i) => {
                        const conf = Number(raw.confidence ?? 0.5);
                        return (
                          <div key={i} style={{
                            border: `1px solid ${conf < 0.6 ? "rgba(245,158,11,0.5)" : "rgba(40,60,100,0.35)"}`,
                            borderRadius: 10, padding: "10px 12px", marginBottom: 8, background: "rgba(5,8,20,0.5)",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ color: "#C0D4FF", fontSize: 12, fontFamily: MONO }}>{String(raw.title)}</span>
                              <span style={{ color: "#445577", fontSize: 10, fontFamily: MONO }}>{String(raw.startsAt)} · {String(raw.eventType)}</span>
                              {conf < 0.6 && <span style={{ color: "#f59e0b", fontSize: 8, fontFamily: MONO }}>LOW CONFIDENCE {Math.round(conf * 100)}%</span>}
                              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                                <button onClick={() => confirmPendingEvent(raw, i)} style={{ padding: "3px 12px", borderRadius: 6, cursor: "pointer", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.4)", color: "#4ade80", fontSize: 9, fontFamily: MONO }}>CONFIRM</button>
                                <button onClick={() => setPending(prev => prev ? { ...prev, events: prev.events.filter((_, j) => j !== i) } : null)} style={{ padding: "3px 12px", borderRadius: 6, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 9, fontFamily: MONO }}>DISCARD</button>
                              </div>
                            </div>
                            {raw.sourceText ? <p style={{ color: "#556688", fontSize: 11, fontFamily: SERIF, fontStyle: "italic", marginTop: 5 }}>&ldquo;{String(raw.sourceText)}&rdquo;</p> : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filters */}
          {events.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{
                padding: "6px 10px", background: "rgba(10,15,35,0.7)", border: BORDER, borderRadius: 8,
                color: "#8899BB", fontSize: 10, fontFamily: MONO, cursor: "pointer", outline: "none",
              }}>
                <option value="all">ALL TYPES</option>
                {Object.entries(EVENT_TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
              <input value={sigQuery} onChange={e => setSigQuery(e.target.value)} placeholder="Signature search: Mars H7…" style={{
                flex: 1, minWidth: 180, padding: "6px 12px", background: "rgba(10,15,35,0.7)", border: BORDER, borderRadius: 8,
                color: "#C0D4FF", fontSize: 10, fontFamily: MONO, outline: "none",
              }} />
            </div>
          )}

          {/* Empty state */}
          {events.length === 0 && panel === "none" && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ color: "#C0D4FF", fontSize: 18, fontFamily: SERIF, fontStyle: "italic", marginBottom: 8 }}>
                Your chart is the source code. Your life is the evidence.
              </p>
              <p style={{ color: "#445577", fontSize: 12, fontFamily: SERIF, fontStyle: "italic" }}>
                Add the first ten events and watch the sky line up.
              </p>
            </div>
          )}

          {/* Timeline */}
          {byYear.map(([year, list]) => (
            <div key={year} style={{ display: "flex", gap: 14, marginBottom: 4 }}>
              {/* Year spine */}
              <div style={{ width: 44, flexShrink: 0, textAlign: "right" }}>
                <span style={{ color: GOLD, fontSize: 11, fontFamily: MONO, letterSpacing: "0.1em" }}>{year}</span>
                <div style={{ width: 1, background: "rgba(40,60,100,0.35)", margin: "6px auto 0", minHeight: 30, height: "calc(100% - 24px)" }} />
              </div>
              {/* Events */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingBottom: 14 }}>
                {list.map(e => {
                  const meta = EVENT_TYPE_META[e.eventType];
                  const expanded = expandedId === e.id;
                  const state = skyStates.get(e.id);
                  return (
                    <motion.div key={e.id} layout style={{
                      background: "rgba(10,15,35,0.55)", borderRadius: 12, cursor: "pointer",
                      border: `1px solid ${expanded ? meta.color + "45" : "rgba(40,60,100,0.3)"}`,
                    }}>
                      <div onClick={() => setExpandedId(expanded ? null : e.id)} style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <span style={{ color: meta.color, fontSize: 14, width: 18, textAlign: "center" }}>{meta.glyph}</span>
                          <span style={{ color: "#C0D4FF", fontSize: 13, fontFamily: MONO }}>{e.title}</span>
                          <span style={{ color: "#445577", fontSize: 10, fontFamily: MONO }}>{fmtDate(e)}</span>
                          <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <div key={n} style={{ width: 5, height: 5, borderRadius: "50%", background: n <= Math.round(e.emotionalIntensity * 5) ? (e.emotionalValence >= 0 ? "#4ade80" : "#fb7185") : "rgba(40,60,100,0.4)" }} />
                            ))}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6, paddingLeft: 27 }}>
                          {e.domains.slice(0, 3).map(d => <span key={d} style={{ color: "#06b6d4", fontSize: 8, fontFamily: MONO }}>#{d}</span>)}
                          {e.emotionalTone.slice(0, 3).map(t => <span key={t} style={{ color: "#f472b6", fontSize: 8, fontFamily: MONO }}>{t}</span>)}
                          {e.people.map(pid2 => <span key={pid2} style={{ color: "#a78bfa", fontSize: 8, fontFamily: MONO }}>@{people.find(p => p.id === pid2)?.name ?? "?"}</span>)}
                          {expanded && state && topTokens(state, 3).map(t => (
                            <span key={t} style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}30`, borderRadius: 12, padding: "1px 8px", color: meta.color, fontSize: 8, fontFamily: MONO }}>{tokenChip(t)}</span>
                          ))}
                        </div>
                      </div>

                      <AnimatePresence>
                        {expanded && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: "hidden", padding: "0 14px 12px" }}>
                            {e.narrative && <p style={{ color: "#8899BB", fontSize: 13, fontFamily: SERIF, fontStyle: "italic", lineHeight: 1.7, margin: "4px 0 0 27px" }}>&ldquo;{e.narrative}&rdquo;</p>}
                            {state && <div style={{ marginLeft: 27 }}><SkyStateView state={state} /></div>}

                            {/* Links */}
                            {e.links.length > 0 && (
                              <div style={{ marginLeft: 27, marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {e.links.map(l => (
                                  <span key={l.eventId} style={{ color: "#445577", fontSize: 9, fontFamily: MONO }}>
                                    → {EDGE_LABELS[l.type]}: {events.find(x => x.id === l.eventId)?.title ?? "?"}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Reflections */}
                            {e.reflections.length > 0 && (
                              <div style={{ marginLeft: 27, marginTop: 8 }}>
                                {e.reflections.map(r => (
                                  <p key={r.id} style={{ color: "#556688", fontSize: 11, fontFamily: SERIF, fontStyle: "italic", marginBottom: 3 }}>
                                    {r.date}: {r.text} {r.outcomeConfirmation && <span style={{ fontFamily: MONO, fontSize: 8, color: r.outcomeConfirmation === "confirmed" ? "#4ade80" : "#f59e0b" }}>[{r.outcomeConfirmation}]</span>}
                                  </p>
                                ))}
                              </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: "flex", gap: 6, marginLeft: 27, marginTop: 10, flexWrap: "wrap" }} onClick={ev => ev.stopPropagation()}>
                              <Link href={`/dashboard/oracle?q=${oracleQ(e, state)}`} style={{ textDecoration: "none" }}>
                                <button style={{ padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "rgba(123,111,212,0.12)", border: "1px solid rgba(123,111,212,0.4)", color: "#BFB6E8", fontSize: 9, fontFamily: MONO }}>✦ ASK THE ORACLE</button>
                              </Link>
                              <button onClick={() => { setReflectingOn(reflectingOn === e.id ? null : e.id); setReflectionText(""); }} style={{ padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 9, fontFamily: MONO }}>+ REFLECTION</button>
                              <button onClick={() => setLinkingFrom(linkingFrom === e.id ? null : e.id)} style={{ padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 9, fontFamily: MONO }}>⛓ LINK</button>
                              <button onClick={() => {
                                setEditForm({
                                  id: e.id, title: e.title, eventType: e.eventType, startsAt: e.startsAt, endsAt: e.endsAt ?? "",
                                  datePrecision: e.datePrecision, locationName: e.location?.name ?? "",
                                  domains: e.domains, emotionalTone: e.emotionalTone,
                                  valenceSign: e.emotionalValence > 0.2 ? "positive" : e.emotionalValence < -0.2 ? "negative" : "mixed",
                                  intensityDots: Math.max(1, Math.round(e.emotionalIntensity * 5)), narrative: e.narrative, people: e.people,
                                }); setPanel("edit"); window.scrollTo({ top: 0 });
                              }} style={{ padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 9, fontFamily: MONO }}>EDIT</button>
                              <button onClick={() => { if (confirm(`Delete "${e.title}"?`)) { deleteEvent(pid, e.id); reload(pid); } }} style={{ padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 9, fontFamily: MONO }}>DELETE</button>
                            </div>

                            {/* Reflection input */}
                            {reflectingOn === e.id && (
                              <div style={{ marginLeft: 27, marginTop: 10 }} onClick={ev => ev.stopPropagation()}>
                                <textarea value={reflectionText} onChange={ev => setReflectionText(ev.target.value)} placeholder="Looking back at this now…"
                                  style={{ width: "100%", minHeight: 50, padding: "8px 10px", background: "rgba(5,8,20,0.7)", border: BORDER, borderRadius: 8, color: "#C0D4FF", fontSize: 12, fontFamily: SERIF, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                  <button onClick={() => addReflection(e.id)} style={{ padding: "4px 12px", borderRadius: 6, cursor: "pointer", background: `${GOLD}15`, border: `1px solid ${GOLD}40`, color: GOLD, fontSize: 9, fontFamily: MONO }}>SAVE</button>
                                  <button onClick={() => addReflection(e.id, "confirmed")} style={{ padding: "4px 12px", borderRadius: 6, cursor: "pointer", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.35)", color: "#4ade80", fontSize: 9, fontFamily: MONO }}>SAVE + CONFIRMED OUTCOME</button>
                                  <button onClick={() => addReflection(e.id, "did_not_happen")} style={{ padding: "4px 12px", borderRadius: 6, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 9, fontFamily: MONO }}>SAVE + DIDN&apos;T HAPPEN</button>
                                </div>
                              </div>
                            )}

                            {/* Link picker */}
                            {linkingFrom === e.id && (
                              <div style={{ marginLeft: 27, marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }} onClick={ev => ev.stopPropagation()}>
                                <p style={{ color: "#445577", fontSize: 8, fontFamily: MONO, letterSpacing: "0.12em" }}>LINK TO (echoes):</p>
                                {events.filter(x => x.id !== e.id).slice(0, 12).map(x => (
                                  <button key={x.id} onClick={() => linkEvents(e.id, x.id, "echoes")} style={{
                                    textAlign: "left", padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                                    background: "transparent", border: BORDER, color: "#8899BB", fontSize: 10, fontFamily: MONO,
                                  }}>{x.title} · {fmtDate(x)}</button>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run build** — `npm run build` — Expected: `✓ Compiled successfully`, route `○ /dashboard/chronicle`
- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/chronicle/page.tsx
git commit -m "feat(chronicle): Chronicle room — timeline, dual intake, sky-state cards, reflections, links, export"
```

---

### Task 5: Sidebar nav item

**Files:**
- Modify: `src/components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Insert after the Akashic nav item** (`href: "/dashboard/akashic"`):

```typescript
  {
    label: "Chronicle",
    hint: "life events",
    href: "/dashboard/chronicle",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M12 2v20" strokeOpacity="0.4" />
        <circle cx="12" cy="6" r="2" />
        <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.7" />
        <circle cx="12" cy="18" r="2" />
        <path d="M14 6h5M14 12h5M14 18h5" strokeOpacity="0.5" />
      </svg>
    ),
  },
```

- [ ] **Step 2: Run build** — `npm run build` — Expected: `✓ Compiled successfully`
- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/Sidebar.tsx
git commit -m "feat(chronicle): add Chronicle to sidebar nav"
```

---

## Self-Review

**Spec coverage:**
- ✅ Graph data model with duration events, valence/intensity numerics, MTDS confidence ladder, typed edges, provenance — Task 1
- ✅ Compute-on-view sky state, never snapshotted — Task 2 (skyStates useMemo in Task 4)
- ✅ Signature token grammar + encoderVersion — Task 2
- ✅ Precision honesty rules (month → mid-month + widened orbs; year/period → lords only) — Task 2
- ✅ Eclipse finder per spec's lunation-scan method — Task 2
- ✅ Extraction route: strict JSON, one retry, confidence ladder, sourceText, people matching — Task 3
- ✅ Two-path intake, confirmation table with amber low-confidence flags, verbatim narrative — Task 4
- ✅ Timeline grouped by year, signature strip, expanded sky state, Ask Oracle `?q=`, reflections with outcome tags, typed links, filters + signature search, export/import, empty state, guided-biography chips — Task 4
- ✅ Sidebar — Task 5
- Deliberate simplifications (documented): link picker creates `echoes` edges only (other 3 edge types exist in schema; picker UI for them is a later refinement); import strategy fixed to `keep_local` (conflict-resolution UI deferred); location is name-only (no geocoding).

**Placeholder scan:** clean — all code complete; the one intentionally-flagged snippet (import strategy) includes its correction inline.

**Type consistency:** `computeSkyState(chart, profile, date, precision)` and `topTokens(state, n)` match between Task 2 definition and Task 4 usage; storage function names match between Tasks 1 and 4; `ExtractedEvent` fields consumed in Task 4's `confirmPendingEvent` match Task 3's interface; `confidenceForPrecision` imported consistently.
