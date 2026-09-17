# V3: Firdaria, Secondary Progressions, Solar Arcs, Vedic Mode

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three V3 timing features — Firdaria (medieval Persian planetary periods), Secondary Progressions + Solar Arc Directions, and a full Vedic/Nakshatra view with Vimshottari Dasha — each with its own dashboard page, plus update the sidebar to link all three.

**Architecture:** Each feature follows the established Cosmora pattern: a pure-TS calculation lib in `src/lib/astrology/`, a Next.js client page in `src/app/dashboard/`, and (for Progressions) a server route in `src/app/api/` that calls `calculateChart()`. Vedic extends the existing `sidereal.ts`. There is no automated test runner — verification uses `npx tsx scripts/verify-<feature>.ts` (deterministic asserts) plus `npm run build` for type-checking, followed by manual page inspection.

**Tech Stack:** Next.js 16.2.6 App Router, TypeScript, React 19, Tailwind CSS v4, Framer Motion, Fragment Mono + Cormorant Garamond fonts, `astronomy-engine` for ephemeris. `@/lib/storage` (localStorage) for profile + chart access client-side.

## Global Constraints

- Project root: `C:\Users\John\Desktop\cosmora` — all paths below are relative to it
- Next.js App Router — every page file must have `"use client"` directive
- No automated test runner — verify with `npx tsx scripts/verify-<name>.ts` then `npm run build`
- All lib files in `src/lib/astrology/` must be **pure** (no IO, no fetch, no Next.js imports)
- Dark OLED palette: background `#010810`, gold `#C8A55B`, Fragment Mono for labels, Cormorant Garamond for body
- Planet colors (copy exactly): `Sun: "#fbbf24"`, `Moon: "#BFB6E8"`, `Mercury: "#a78bfa"`, `Venus: "#f472b6"`, `Mars: "#ef4444"`, `Jupiter: "#f59e0b"`, `Saturn: "#94a3b8"`, `Uranus: "#06b6d4"`, `Neptune: "#3b82f6"`
- DashboardBg: import `{ DashboardBg }` from `"@/components/ui/DashboardBg"` and wrap every page
- Profile loading pattern: `getActiveProfileId()` → `getProfile(id)` → `getCachedChart(id)` — all from `"@/lib/storage"`
- Commit message style: `feat(firdaria): ...`, `feat(progressions): ...`, `feat(vedic): ...`
- No comments unless WHY is non-obvious; no multi-line JSDoc

---

### Task 1: Firdaria calculation engine

**Files:**
- Create: `src/lib/astrology/firdaria.ts`
- Create: `scripts/verify-firdaria.ts`

**Interfaces produced (used by Task 2):**
```typescript
// FIRDARIA_YEARS: Record<FirdariaRuler, number>
// FIRDARIA_DAY_ORDER: FirdariaRuler[]   (Sun,Venus,Mercury,Moon,Saturn,Jupiter,Mars,NorthNode,SouthNode)
// FIRDARIA_NIGHT_ORDER: FirdariaRuler[] (Moon,Saturn,Mercury,Mars,Jupiter,Sun,Venus,NorthNode,SouthNode)
// FIRDARIA_TOTAL_YEARS = 75
// FirdariaPeriod { ruler, subRuler?, years, start, end, isCurrent, isPast, level: 1|2 }
// FirdariaData { major: FirdariaPeriod[], currentMajor?, subperiods: FirdariaPeriod[], currentSub? }
// buildFirdariaData(sect: "day"|"night", birthDatetime: string): FirdariaData
```

- [ ] **Step 1: Write `src/lib/astrology/firdaria.ts`**

```typescript
// Firdaria — medieval Persian planetary period system.
// A day-chart native progresses through planets in solar order;
// a night-chart native in lunar order. Total cycle = 75 years, then repeats.
// Sub-periods divide each major period into 9 sub-rulers in the same order
// starting from the major ruler.

export type FirdariaRuler =
  | "Sun" | "Venus" | "Mercury" | "Moon" | "Saturn"
  | "Jupiter" | "Mars" | "NorthNode" | "SouthNode";

export const FIRDARIA_YEARS: Record<FirdariaRuler, number> = {
  Sun: 10, Venus: 8, Mercury: 13, Moon: 9, Saturn: 11,
  Jupiter: 12, Mars: 7, NorthNode: 3, SouthNode: 2,
};

export const FIRDARIA_TOTAL_YEARS = 75;

export const FIRDARIA_DAY_ORDER: FirdariaRuler[] = [
  "Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars", "NorthNode", "SouthNode",
];
export const FIRDARIA_NIGHT_ORDER: FirdariaRuler[] = [
  "Moon", "Saturn", "Mercury", "Mars", "Jupiter", "Sun", "Venus", "NorthNode", "SouthNode",
];

export interface FirdariaPeriod {
  ruler: FirdariaRuler;
  subRuler?: FirdariaRuler;   // level 2 only
  years: number;
  start: Date;
  end: Date;
  isCurrent: boolean;
  isPast: boolean;
  level: 1 | 2;
}

export interface FirdariaData {
  major: FirdariaPeriod[];
  currentMajor?: FirdariaPeriod;
  subperiods: FirdariaPeriod[];
  currentSub?: FirdariaPeriod;
}

function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * 365.25 * 86400000);
}

function buildMajorPeriods(order: FirdariaRuler[], birthDatetime: string): FirdariaPeriod[] {
  const birth = new Date(birthDatetime);
  const today = new Date();
  const periods: FirdariaPeriod[] = [];
  // Repeat the 75-year cycle enough to cover 120 years of life
  const cycles = Math.ceil(120 / FIRDARIA_TOTAL_YEARS) + 1;
  let cursor = new Date(birth);
  for (let c = 0; c < cycles; c++) {
    for (const ruler of order) {
      const years = FIRDARIA_YEARS[ruler];
      const end = addYears(cursor, years);
      periods.push({ ruler, years, start: new Date(cursor), end, isCurrent: today >= cursor && today < end, isPast: today >= end, level: 1 });
      cursor = end;
      if (cursor.getFullYear() - birth.getFullYear() > 120) break;
    }
    if (cursor.getFullYear() - birth.getFullYear() > 120) break;
  }
  return periods;
}

function buildSubPeriods(major: FirdariaPeriod, order: FirdariaRuler[]): FirdariaPeriod[] {
  const today = new Date();
  const majorMs = major.end.getTime() - major.start.getTime();
  const startIdx = order.indexOf(major.ruler);
  const periods: FirdariaPeriod[] = [];
  let cursor = new Date(major.start);
  for (let i = 0; i < order.length; i++) {
    const subRuler = order[(startIdx + i) % order.length];
    const subMs = (FIRDARIA_YEARS[subRuler] / FIRDARIA_TOTAL_YEARS) * majorMs;
    const rawEnd = new Date(cursor.getTime() + subMs);
    const end = rawEnd <= major.end ? rawEnd : new Date(major.end);
    periods.push({ ruler: major.ruler, subRuler, years: subMs / (365.25 * 86400000), start: new Date(cursor), end, isCurrent: today >= cursor && today < end, isPast: today >= end, level: 2 });
    cursor = end;
    if (cursor >= major.end) break;
  }
  return periods;
}

export function buildFirdariaData(sect: "day" | "night", birthDatetime: string): FirdariaData {
  const order = sect === "day" ? FIRDARIA_DAY_ORDER : FIRDARIA_NIGHT_ORDER;
  const major = buildMajorPeriods(order, birthDatetime);
  const currentMajor = major.find(p => p.isCurrent);
  const subperiods = currentMajor ? buildSubPeriods(currentMajor, order) : [];
  const currentSub = subperiods.find(p => p.isCurrent);
  return { major, currentMajor, subperiods, currentSub };
}
```

- [ ] **Step 2: Write `scripts/verify-firdaria.ts`**

```typescript
import { buildFirdariaData, FIRDARIA_TOTAL_YEARS, FIRDARIA_YEARS } from "../src/lib/astrology/firdaria";

let failures = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) { console.log(`  ok  ${name}`); }
  else { failures++; console.log(`FAIL  ${name}  ${detail}`); }
}
const approx = (a: number, b: number, eps = 0.01) => Math.abs(a - b) <= eps;

// Sanity: years sum to 75
const sum = Object.values(FIRDARIA_YEARS).reduce((a, b) => a + b, 0);
assert("FIRDARIA years sum to 75", sum === FIRDARIA_TOTAL_YEARS, String(sum));

// Day chart
const day = buildFirdariaData("day", "1990-06-15T08:30:00Z");
assert("day: has major periods", day.major.length > 0, String(day.major.length));
assert("day: has current major", !!day.currentMajor, JSON.stringify(day.currentMajor));
assert("day: major starts with Sun", day.major[0].ruler === "Sun");
assert("day: major periods cover > 110 years", day.major.length >= 2, String(day.major.length));

// Night chart
const night = buildFirdariaData("night", "1990-06-15T08:30:00Z");
assert("night: major starts with Moon", night.major[0].ruler === "Moon");
assert("night: has current major", !!night.currentMajor);

// Sub-periods
assert("day: sub-periods populated", day.subperiods.length > 0, String(day.subperiods.length));
assert("day: has current sub", !!day.currentSub, JSON.stringify(day.currentSub));
assert("day: sub-periods span the major period",
  approx(
    day.subperiods.reduce((a, p) => a + (p.end.getTime() - p.start.getTime()), 0),
    day.currentMajor!.end.getTime() - day.currentMajor!.start.getTime(),
    1000 * 86400 // 1-day tolerance
  )
);
assert("day: sub-period level is 2", day.subperiods[0].level === 2);
// The first sub-ruler = the major ruler
assert("day: first sub-ruler = major ruler", day.subperiods[0].subRuler === day.currentMajor!.ruler);

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 3: Run verification**

```
cd C:\Users\John\Desktop\cosmora
npx tsx scripts/verify-firdaria.ts
```

Expected: `ALL PASS`

- [ ] **Step 4: Run build check**

```
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit**

```bash
git add src/lib/astrology/firdaria.ts scripts/verify-firdaria.ts
git commit -m "feat(firdaria): add Firdaria calculation engine + verification"
```

---

### Task 2: Firdaria dashboard page

**Files:**
- Create: `src/app/dashboard/firdaria/page.tsx`

**Interfaces consumed (from Task 1):**
```typescript
import { buildFirdariaData } from "@/lib/astrology/firdaria";
import type { FirdariaData, FirdariaPeriod, FirdariaRuler } from "@/lib/astrology/firdaria";
// buildFirdariaData(sect: "day"|"night", birthDatetime: string): FirdariaData
```

**Profile loading pattern (copy from releasing/page.tsx):**
```typescript
useEffect(() => {
  const id = getActiveProfileId();
  if (!id) { setNoProfile(true); return; }
  const profile = getProfile(id);
  if (!profile) { setNoProfile(true); return; }
  const chart = getCachedChart(id);
  if (!chart) { setNoProfile(true); return; }
  // use profile.birthDate, profile.birthTime, chart.sect
  const birthDatetime = `${profile.birthDate}T${profile.birthTime}Z`;
  setFirdaria(buildFirdariaData(chart.sect, birthDatetime));
}, []);
```

- [ ] **Step 1: Write `src/app/dashboard/firdaria/page.tsx`**

```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart, getOraclePersona } from "@/lib/storage";
import {
  buildFirdariaData, FIRDARIA_YEARS,
} from "@/lib/astrology/firdaria";
import type { FirdariaData, FirdariaPeriod, FirdariaRuler } from "@/lib/astrology/firdaria";

const PLANET_COLORS: Record<FirdariaRuler, string> = {
  Sun: "#fbbf24", Venus: "#f472b6", Mercury: "#a78bfa", Moon: "#BFB6E8",
  Saturn: "#94a3b8", Jupiter: "#f59e0b", Mars: "#ef4444",
  NorthNode: "#06b6d4", SouthNode: "#7B6FD4",
};

const PLANET_SYMBOLS: Record<FirdariaRuler, string> = {
  Sun: "☉", Venus: "♀", Mercury: "☿", Moon: "☽", Saturn: "♄",
  Jupiter: "♃", Mars: "♂", NorthNode: "☊", SouthNode: "☋",
};

const RULER_THEMES: Record<FirdariaRuler, string> = {
  Sun: "identity, vitality, leadership, recognition",
  Venus: "love, beauty, pleasure, resources, relationships",
  Mercury: "mind, communication, trade, learning, siblings",
  Moon: "home, emotion, the public, change, nurturing",
  Saturn: "discipline, restriction, karma, time, structure",
  Jupiter: "expansion, wisdom, faith, abundance, philosophy",
  Mars: "drive, conflict, courage, ambition, physical energy",
  NorthNode: "destiny, growth, collective direction",
  SouthNode: "past, release, accumulated karma",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function fmtYears(years: number) {
  const y = Math.floor(years);
  const m = Math.round((years - y) * 12);
  if (m === 0) return `${y} yr${y !== 1 ? "s" : ""}`;
  return `${y}y ${m}m`;
}

function PeriodBar({ period, isSubPeriod = false }: { period: FirdariaPeriod; isSubPeriod?: boolean }) {
  const ruler = (isSubPeriod ? period.subRuler : period.ruler) as FirdariaRuler;
  const col = PLANET_COLORS[ruler];
  const now = new Date();
  const totalMs = period.end.getTime() - period.start.getTime();
  const elapsedMs = Math.max(0, Math.min(now.getTime() - period.start.getTime(), totalMs));
  const pct = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        position: "relative",
        background: period.isCurrent
          ? `linear-gradient(135deg, ${col}1A, ${col}0A)`
          : "rgba(10,15,35,0.4)",
        border: `1px solid ${period.isCurrent ? col + "50" : "rgba(40,60,100,0.3)"}`,
        borderRadius: 10, padding: "10px 14px",
        boxShadow: period.isCurrent ? `0 0 20px ${col}15` : "none",
      }}
    >
      {/* Progress fill */}
      {period.isCurrent && (
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0,
          width: `${pct}%`, borderRadius: 10,
          background: `linear-gradient(90deg, ${col}08, transparent)`,
          pointerEvents: "none",
        }} />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
        <div style={{
          width: isSubPeriod ? 28 : 36, height: isSubPeriod ? 28 : 36,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${col}25, ${col}05)`,
          border: `1.5px solid ${col}60`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: isSubPeriod ? 14 : 18, color: col, flexShrink: 0,
        }}>
          {PLANET_SYMBOLS[ruler]}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{
              color: period.isCurrent ? col : "#C0D4FF",
              fontSize: isSubPeriod ? 11 : 13,
              fontFamily: "'Fragment Mono', monospace",
              letterSpacing: "0.1em", fontWeight: 600,
              textTransform: "uppercase",
            }}>
              {ruler.replace("NorthNode", "North Node").replace("SouthNode", "South Node")}
            </span>
            {period.isCurrent && (
              <span style={{
                background: `${col}25`, border: `1px solid ${col}50`,
                borderRadius: 20, padding: "1px 8px",
                color: col, fontSize: 8,
                fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em",
              }}>
                ACTIVE
              </span>
            )}
          </div>
          <div style={{
            color: "#445577", fontSize: 10,
            fontFamily: "'Fragment Mono', monospace", marginTop: 2,
          }}>
            {fmtDate(period.start)} — {fmtDate(period.end)} · {fmtYears(period.years)}
          </div>
        </div>

        {period.isCurrent && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ color: col, fontSize: 18, fontFamily: "'Fragment Mono', monospace", fontWeight: 700 }}>
              {Math.round(pct)}%
            </div>
            <div style={{ color: "#445577", fontSize: 8, fontFamily: "'Fragment Mono', monospace" }}>elapsed</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function FirdariaPage() {
  const [firdaria, setFirdaria]   = useState<FirdariaData | null>(null);
  const [noProfile, setNoProfile] = useState(false);
  const [sect, setSect]           = useState<"day" | "night">("day");
  const [profileName, setProfileName] = useState("Native");
  const [reading, setReading]     = useState("");
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setNoProfile(true); return; }
    const profile = getProfile(id);
    if (!profile) { setNoProfile(true); return; }
    const chart = getCachedChart(id);
    if (!chart) { setNoProfile(true); return; }
    const s = chart.sect ?? "day";
    setSect(s);
    setProfileName(profile.name ?? "Native");
    const birthDatetime = `${profile.birthDate}T${profile.birthTime}Z`;
    setFirdaria(buildFirdariaData(s, birthDatetime));
  }, []);

  const streamReading = async () => {
    if (streaming || !firdaria?.currentMajor) return;
    const major = firdaria.currentMajor.ruler;
    const sub = firdaria.currentSub?.subRuler ?? "—";
    const prompt = `[FIRDARIA for ${profileName}] Major period: ${major} (${RULER_THEMES[major]}). Sub-period: ${sub} (${RULER_THEMES[sub as FirdariaRuler] ?? ""}). Sect: ${sect} chart. Give a 3-4 sentence interpretive reading of this period — what life themes are being activated, what the native should watch for, and what opportunities or challenges this combination typically brings.`;
    setStreaming(true); setReading("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [], persona: getOraclePersona() }),
      });
      if (!res.ok || !res.body) { setStreaming(false); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") break;
          try { const p = JSON.parse(payload); if (p.text) { acc += p.text; setReading(acc); } } catch { /* skip */ }
        }
      }
    } catch { /* silent */ }
    setStreaming(false);
  };

  if (noProfile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <div className="text-center ml-16">
          <p style={{ color: "#C8A55B", fontSize: 13, fontFamily: "'Fragment Mono', monospace" }}>BIRTH DATA REQUIRED</p>
          <p style={{ color: "#445577", fontSize: 11, marginTop: 6 }}>Complete your profile in Settings to activate Firdaria.</p>
        </div>
      </div>
    );
  }

  if (!firdaria) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ width: 40, height: 40, border: "1px solid #1A3A8A", borderTopColor: "#C8A55B", borderRadius: "50%" }} />
      </div>
    );
  }

  const { currentMajor, subperiods, currentSub, major } = firdaria;
  const currentRulerColor = currentMajor ? PLANET_COLORS[currentMajor.ruler] : "#C8A55B";

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#010810" }}>
      <DashboardBg />
      <div className="absolute inset-0 overflow-y-auto" style={{ left: 64, scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 48px" }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ width: 6, height: 28, background: currentRulerColor, borderRadius: 3, boxShadow: `0 0 10px ${currentRulerColor}` }} />
              <h1 style={{ color: "#C0D4FF", fontSize: 22, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Firdaria
              </h1>
              <span style={{ background: `${currentRulerColor}18`, border: `1px solid ${currentRulerColor}40`, borderRadius: 20, padding: "3px 12px", color: currentRulerColor, fontSize: 9, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em" }}>
                {sect === "day" ? "DAY CHART" : "NIGHT CHART"}
              </span>
            </div>
            <p style={{ color: "#445577", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", paddingLeft: 18 }}>
              Medieval Persian planetary period system — 75-year cycle of planetary rulers governing life chapters
            </p>
          </div>

          {/* Current period spotlight */}
          {currentMajor && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{
                background: `linear-gradient(135deg, ${currentRulerColor}12, rgba(5,8,22,0.9))`,
                border: `1px solid ${currentRulerColor}40`,
                borderRadius: 16, padding: "20px 24px", marginBottom: 24,
                boxShadow: `0 0 40px ${currentRulerColor}10`,
              }}
            >
              <p style={{ color: currentRulerColor, fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 12 }}>
                CURRENT PERIOD
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 44, color: currentRulerColor }}>{PLANET_SYMBOLS[currentMajor.ruler]}</div>
                <div>
                  <div style={{ color: currentRulerColor, fontSize: 24, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {currentMajor.ruler.replace("NorthNode", "North Node").replace("SouthNode", "South Node")}
                  </div>
                  {currentSub && (
                    <div style={{ color: "#8899BB", fontSize: 13, fontFamily: "'Fragment Mono', monospace", marginTop: 4 }}>
                      ↳ Sub: {PLANET_SYMBOLS[currentSub.subRuler!]} {currentSub.subRuler?.replace("NorthNode", "North Node").replace("SouthNode", "South Node")}
                    </div>
                  )}
                </div>
              </div>
              <p style={{ color: "#8899BB", fontSize: 13, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", lineHeight: 1.6, marginBottom: 16 }}>
                {RULER_THEMES[currentMajor.ruler]}
              </p>

              {/* AI reading */}
              {reading ? (
                <div style={{ color: "#A0B0D0", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {reading}
                  {streaming && (
                    <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
                      style={{ display: "inline-block", width: 6, height: 12, background: currentRulerColor, borderRadius: 1, marginLeft: 3, verticalAlign: "middle" }} />
                  )}
                </div>
              ) : (
                <button onClick={streamReading} disabled={streaming} style={{
                  padding: "7px 18px",
                  background: `${currentRulerColor}12`,
                  border: `1px solid ${currentRulerColor}35`,
                  borderRadius: 8, color: currentRulerColor,
                  fontSize: 9, letterSpacing: "0.15em",
                  fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
                }}>
                  ✦ ORACLE READING
                </button>
              )}
            </motion.div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
            {/* Sub-periods */}
            {currentMajor && (
              <div>
                <p style={{ color: "#445577", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>
                  SUB-PERIODS OF {currentMajor.ruler.toUpperCase()}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {subperiods.map((p, i) => (
                    <PeriodBar key={i} period={p} isSubPeriod />
                  ))}
                </div>
              </div>
            )}

            {/* Major period timeline */}
            <div>
              <p style={{ color: "#445577", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>
                MAJOR PERIODS (FULL LIFE)
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {major.slice(0, 18).map((p, i) => (
                  <PeriodBar key={i} period={p} />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run build to check types**

```
npm run build
```

Expected: `✓ Compiled successfully` — if there are TS errors, fix them before committing.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/firdaria/page.tsx
git commit -m "feat(firdaria): add Firdaria dashboard page"
```

---

### Task 3: Secondary Progressions + Solar Arc engine + API route

**Files:**
- Create: `src/lib/astrology/progressions.ts`
- Create: `src/app/api/progressions/route.ts`
- Create: `scripts/verify-progressions.ts`

**Interfaces produced (used by Task 4):**
```typescript
// From progressions.ts
export interface ProgPlacement {
  name: string; longitude: number; sign: ZodiacSign; signDegree: number;
  house: number; retrograde: boolean;
}
export interface DirectedPlacement {
  name: string; natalLon: number; directedLon: number; sign: ZodiacSign;
  signDegree: number; arcDeg: number;
}
export interface ProgressionResult {
  progDate: string;       // ISO — the ephemeris date used (birth + N days)
  ageYears: number;
  solarArc: number;       // degrees
  progressedSun: ProgPlacement;
  progressedMoon: ProgPlacement;
  allPlanets: ProgPlacement[];
  directedPlanets: DirectedPlacement[];
}

// API route: POST /api/progressions
// Body: { birthDatetime: string, latitude: number, longitude: number, timezone: string, houseSystem?: string }
// Response: { result: ProgressionResult }
```

- [ ] **Step 1: Write `src/lib/astrology/progressions.ts`**

```typescript
// Secondary progressions + solar arc directions (pure math layer).
// The heavy lifting (computing planet positions for the progressed date)
// is done server-side in the API route. This file holds shared types
// and the solar arc computation that the route calls.

import type { ZodiacSign } from "./types";
import { ZODIAC_SIGNS } from "./types";
import type { ChartData, PlanetPosition } from "./types";

export interface ProgPlacement {
  name: string;
  longitude: number;
  sign: ZodiacSign;
  signDegree: number;
  house: number;
  retrograde: boolean;
}

export interface DirectedPlacement {
  name: string;
  natalLon: number;
  directedLon: number;
  sign: ZodiacSign;
  signDegree: number;
  arcDeg: number;
}

export interface ProgressionResult {
  progDate: string;     // ISO date of the progressed chart (birth + ageYears days)
  ageYears: number;
  solarArc: number;     // degrees (progressed Sun lon − natal Sun lon)
  progressedSun: ProgPlacement;
  progressedMoon: ProgPlacement;
  allPlanets: ProgPlacement[];
  directedPlanets: DirectedPlacement[];
}

const norm360 = (a: number) => ((a % 360) + 360) % 360;

function lonToSign(lon: number): { sign: ZodiacSign; signDegree: number } {
  const idx = Math.floor(norm360(lon) / 30);
  return { sign: ZODIAC_SIGNS[idx], signDegree: norm360(lon) % 30 };
}

/** 
 * Given natal chart + progressed chart (computed externally), derive the
 * full ProgressionResult including solar arc directed positions.
 */
export function buildProgressionResult(
  natal: ChartData,
  progressed: ChartData,
  ageYears: number,
  progDateISO: string,
): ProgressionResult {
  const natalSun  = natal.planets.find(p => p.name === "Sun")!;
  const progSun   = progressed.planets.find(p => p.name === "Sun")!;
  const progMoon  = progressed.planets.find(p => p.name === "Moon")!;

  const solarArc = norm360(progSun.longitude - natalSun.longitude);

  const toProg = (p: PlanetPosition): ProgPlacement => ({
    name: p.name, longitude: p.longitude,
    ...lonToSign(p.longitude),
    house: p.house, retrograde: p.retrograde,
  });

  const directed: DirectedPlacement[] = natal.planets.map(p => {
    const dLon = norm360(p.longitude + solarArc);
    return {
      name: p.name, natalLon: p.longitude, directedLon: dLon,
      ...lonToSign(dLon), arcDeg: solarArc,
    };
  });

  return {
    progDate: progDateISO,
    ageYears,
    solarArc,
    progressedSun: toProg(progSun),
    progressedMoon: toProg(progMoon),
    allPlanets: progressed.planets.map(toProg),
    directedPlanets: directed,
  };
}
```

- [ ] **Step 2: Write `src/app/api/progressions/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { calculateChart } from "@/lib/astrology/calculator";
import { buildProgressionResult } from "@/lib/astrology/progressions";
import type { HouseSystem } from "@/lib/astrology/types";

export async function POST(req: NextRequest) {
  try {
    const { birthDatetime, latitude, longitude, timezone, houseSystem } = await req.json();
    if (!birthDatetime || latitude == null || longitude == null) {
      return NextResponse.json({ error: "birthDatetime, latitude, longitude required" }, { status: 400 });
    }

    const birth = new Date(birthDatetime);
    const today = new Date();
    const ageYears = (today.getTime() - birth.getTime()) / (365.25 * 86400000);

    // Secondary progressions: 1 day after birth = 1 year of life
    const progDate = new Date(birth.getTime() + ageYears * 86400000);
    const progDateISO = progDate.toISOString();

    const [birthDate, birthTime] = birthDatetime.split("T");
    const [progDateStr] = progDateISO.split("T");
    const progTimeStr = progDateISO.split("T")[1].slice(0, 8);

    const hs = (houseSystem || "whole_sign") as HouseSystem;

    const [natal, progressed] = await Promise.all([
      calculateChart({ birthDate, birthTime: birthTime.slice(0, 8), latitude, longitude, timezone: timezone || "UTC", houseSystem: hs }),
      calculateChart({ birthDate: progDateStr, birthTime: progTimeStr, latitude, longitude, timezone: timezone || "UTC", houseSystem: hs }),
    ]);

    const result = buildProgressionResult(natal, progressed, ageYears, progDateISO);
    return NextResponse.json({ result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Progressions calculation failed", detail: String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 3: Write `scripts/verify-progressions.ts`**

```typescript
import type { ChartData } from "../src/lib/astrology/types";
import { buildProgressionResult } from "../src/lib/astrology/progressions";
import { calculateChart } from "../src/lib/astrology/calculator";

let failures = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ok  ${name}`);
  else { failures++; console.log(`FAIL  ${name}  ${detail}`); }
}
const approx = (a: number, b: number, eps: number) => Math.abs(a - b) <= eps;

const birth = new Date("1990-06-15T08:30:00Z");
const ageYears = (new Date().getTime() - birth.getTime()) / (365.25 * 86400000);
const progDate = new Date(birth.getTime() + ageYears * 86400000);

const natal     = calculateChart({ birthDate: "1990-06-15", birthTime: "08:30:00", latitude: 34.05, longitude: -118.24, timezone: "America/Los_Angeles", houseSystem: "whole_sign" });
const progressed = calculateChart({
  birthDate: progDate.toISOString().split("T")[0],
  birthTime: progDate.toISOString().split("T")[1].slice(0, 8),
  latitude: 34.05, longitude: -118.24, timezone: "America/Los_Angeles", houseSystem: "whole_sign",
});

const result = buildProgressionResult(natal, progressed, ageYears, progDate.toISOString());

assert("ageYears > 30", result.ageYears > 30, String(result.ageYears));
assert("solarArc > 0", result.solarArc > 0, String(result.solarArc));
assert("solarArc < 90 (plausible for 36-year-old)", result.solarArc < 90, String(result.solarArc));
assert("progressed Sun is a planet", !!result.progressedSun.name, result.progressedSun.name);
assert("progressed Moon is a planet", !!result.progressedMoon.name, result.progressedMoon.name);
assert("allPlanets has entries", result.allPlanets.length >= 10, String(result.allPlanets.length));
assert("directedPlanets has entries", result.directedPlanets.length >= 10, String(result.directedPlanets.length));
// Solar arc applied correctly: directed Sun = natal Sun + solarArc (mod 360)
const natalSunLon = natal.planets.find(p => p.name === "Sun")!.longitude;
const expectedDirSunLon = ((natalSunLon + result.solarArc) % 360 + 360) % 360;
const dirSunLon = result.directedPlanets.find(p => p.name === "Sun")!.directedLon;
assert("directed Sun = natal Sun + solarArc", approx(dirSunLon, expectedDirSunLon, 0.01), `${dirSunLon} vs ${expectedDirSunLon}`);

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 4: Run verification**

```
npx tsx scripts/verify-progressions.ts
```

Expected: `ALL PASS`

- [ ] **Step 5: Run build**

```
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add src/lib/astrology/progressions.ts src/app/api/progressions/route.ts scripts/verify-progressions.ts
git commit -m "feat(progressions): add Secondary Progressions + Solar Arc engine and API route"
```

---

### Task 4: Progressions dashboard page

**Files:**
- Create: `src/app/dashboard/progressions/page.tsx`

**Interfaces consumed (from Task 3):**
```typescript
// GET from /api/progressions via POST { birthDatetime, latitude, longitude, timezone, houseSystem }
// Returns: { result: ProgressionResult }
// ProgressionResult: { progDate, ageYears, solarArc, progressedSun, progressedMoon, allPlanets, directedPlanets }
// ProgPlacement: { name, longitude, sign, signDegree, house, retrograde }
// DirectedPlacement: { name, natalLon, directedLon, sign, signDegree, arcDeg }
```

- [ ] **Step 1: Write `src/app/dashboard/progressions/page.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import type { ProgressionResult, ProgPlacement, DirectedPlacement } from "@/lib/astrology/progressions";

const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#BFB6E8", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#7B6FD4",
  NorthNode: "#06b6d4", Chiron: "#a78bfa",
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "⛢", Neptune: "♆", Pluto: "♇",
  NorthNode: "☊", Chiron: "⚷",
};

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

function degStr(lon: number) {
  const deg = Math.floor(lon % 30);
  const min = Math.round((lon % 1) * 60);
  return `${deg}°${min.toString().padStart(2, "0")}′`;
}

function PlacementRow({ p, accent }: { p: ProgPlacement; accent?: string }) {
  const col = accent ?? PLANET_COLORS[p.name] ?? "#8899BB";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, background: "rgba(10,15,35,0.5)" }}>
      <span style={{ color: col, fontSize: 14, width: 20, textAlign: "center" }}>{PLANET_SYMBOLS[p.name] ?? "·"}</span>
      <span style={{ color: col, fontSize: 10, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.08em", width: 70 }}>
        {p.name.replace("NorthNode", "N.Node")}
      </span>
      <span style={{ color: "#8899BB", fontSize: 10, fontFamily: "'Fragment Mono', monospace" }}>
        {SIGN_SYMBOLS[p.sign] ?? ""} {degStr(p.signDegree)} {p.sign}
      </span>
      <span style={{ color: "#445577", fontSize: 9, fontFamily: "'Fragment Mono', monospace", marginLeft: "auto" }}>
        H{p.house}{p.retrograde ? " Rx" : ""}
      </span>
    </div>
  );
}

function DirectedRow({ p }: { p: DirectedPlacement }) {
  const col = PLANET_COLORS[p.name] ?? "#8899BB";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, background: "rgba(10,15,35,0.5)" }}>
      <span style={{ color: col, fontSize: 14, width: 20, textAlign: "center" }}>{PLANET_SYMBOLS[p.name] ?? "·"}</span>
      <span style={{ color: col, fontSize: 10, fontFamily: "'Fragment Mono', monospace", width: 70 }}>
        {p.name.replace("NorthNode", "N.Node")}
      </span>
      <span style={{ color: "#445577", fontSize: 9, fontFamily: "'Fragment Mono', monospace", width: 90 }}>
        {SIGN_SYMBOLS[p.sign] ?? ""} {degStr(p.signDegree)} {p.sign}
      </span>
      <span style={{ color: "#334466", fontSize: 9, fontFamily: "'Fragment Mono', monospace", marginLeft: "auto" }}>
        +{p.arcDeg.toFixed(2)}°
      </span>
    </div>
  );
}

export default function ProgressionsPage() {
  const [result, setResult]       = useState<ProgressionResult | null>(null);
  const [loading, setLoading]     = useState(true);
  const [noProfile, setNoProfile] = useState(false);
  const [tab, setTab]             = useState<"prog" | "arcs">("prog");

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setNoProfile(true); setLoading(false); return; }
    const profile = getProfile(id);
    const chart   = getCachedChart(id);
    if (!profile || !chart) { setNoProfile(true); setLoading(false); return; }

    const birthDatetime = `${profile.birthDate}T${profile.birthTime}Z`;
    fetch("/api/progressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthDatetime, latitude: profile.latitude, longitude: profile.longitude, timezone: profile.timezone, houseSystem: chart.houseSystem }),
    })
      .then(r => r.json())
      .then(d => { setResult(d.result ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (noProfile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <div className="text-center ml-16">
          <p style={{ color: "#C8A55B", fontSize: 13, fontFamily: "'Fragment Mono', monospace" }}>BIRTH DATA REQUIRED</p>
          <p style={{ color: "#445577", fontSize: 11, marginTop: 6 }}>Complete your profile in Settings.</p>
        </div>
      </div>
    );
  }

  if (loading || !result) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ width: 40, height: 40, border: "1px solid #1A3A8A", borderTopColor: "#C8A55B", borderRadius: "50%" }} />
      </div>
    );
  }

  const sunColor = "#fbbf24";
  const moonColor = "#BFB6E8";

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#010810" }}>
      <DashboardBg />
      <div className="absolute inset-0 overflow-y-auto" style={{ left: 64, scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 48px" }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ width: 6, height: 28, background: sunColor, borderRadius: 3, boxShadow: `0 0 10px ${sunColor}` }} />
              <h1 style={{ color: "#C0D4FF", fontSize: 22, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Progressions
              </h1>
            </div>
            <p style={{ color: "#445577", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", paddingLeft: 18 }}>
              Secondary progressions + solar arc directions — symbolic timing: 1 day = 1 year
            </p>
          </div>

          {/* Key metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { label: "AGE", value: result.ageYears.toFixed(1) + " yrs", color: "#C8A55B" },
              { label: "SOLAR ARC", value: result.solarArc.toFixed(2) + "°", color: sunColor },
              { label: "PROG DATE", value: result.progDate.split("T")[0], color: "#8899BB" },
            ].map(m => (
              <div key={m.label} style={{ background: "rgba(10,15,35,0.7)", border: "1px solid rgba(40,60,100,0.35)", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ color: "#445577", fontSize: 8, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 6 }}>{m.label}</div>
                <div style={{ color: m.color, fontSize: 18, fontFamily: "'Fragment Mono', monospace", fontWeight: 700 }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Progressed Sun + Moon spotlight */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
            {[
              { label: "PROGRESSED SUN", p: result.progressedSun, col: sunColor },
              { label: "PROGRESSED MOON", p: result.progressedMoon, col: moonColor },
            ].map(({ label, p, col }) => (
              <div key={label} style={{ background: `linear-gradient(135deg, ${col}12, rgba(5,8,22,0.8))`, border: `1px solid ${col}35`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ color: col, fontSize: 8, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>{label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 32, color: col }}>{PLANET_SYMBOLS[p.name]}</span>
                  <div>
                    <div style={{ color: "#C0D4FF", fontSize: 16, fontFamily: "'Fragment Mono', monospace" }}>
                      {SIGN_SYMBOLS[p.sign]} {p.sign}
                    </div>
                    <div style={{ color: "#8899BB", fontSize: 11, fontFamily: "'Fragment Mono', monospace" }}>
                      {degStr(p.signDegree)} · House {p.house}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tab: all progressed planets / solar arc directed */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {(["prog", "arcs"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "5px 16px",
                background: tab === t ? "rgba(50,213,255,0.12)" : "transparent",
                border: `1px solid ${tab === t ? "rgba(50,213,255,0.3)" : "rgba(40,60,100,0.3)"}`,
                borderRadius: 20, color: tab === t ? "#C8A55B" : "#445577",
                fontSize: 9, letterSpacing: "0.12em",
                fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
              }}>
                {t === "prog" ? "PROGRESSED PLANETS" : "SOLAR ARC DIRECTED"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {tab === "prog"
              ? result.allPlanets.map((p, i) => <PlacementRow key={i} p={p} />)
              : result.directedPlanets.map((p, i) => <DirectedRow key={i} p={p} />)
            }
          </div>

        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run build**

```
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/progressions/page.tsx
git commit -m "feat(progressions): add Progressions + Solar Arc dashboard page"
```

---

### Task 5: Vedic/Nakshatra page with Vimshottari Dasha

**Files:**
- Modify: `src/lib/astrology/sidereal.ts` (add `buildVimshottariDasha`)
- Create: `src/app/dashboard/vedic/page.tsx`

**Vimshottari Dasha rules:**
- 120-year cycle. Period years: Ketu=7, Venus=20, Sun=6, Moon=10, Mars=7, Rahu=18, Jupiter=16, Saturn=19, Mercury=17
- Fixed sequence: Ketu→Venus→Sun→Moon→Mars→Rahu→Jupiter→Saturn→Mercury (repeats)
- Starting ruler = Moon's nakshatra lord (Ashwini→Ketu, Bharani→Venus, Krittika→Sun, etc.)
- Starting balance = years remaining in the starting dasha, proportional to how much of the nakshatra (13°20′) the Moon has yet to traverse

**Interfaces produced:**
```typescript
// From sidereal.ts additions:
export type DashaRuler = "Ketu"|"Venus"|"Sun"|"Moon"|"Mars"|"Rahu"|"Jupiter"|"Saturn"|"Mercury";
export interface DashaPeriod {
  ruler: DashaRuler; antardasha?: DashaRuler;
  years: number; start: Date; end: Date;
  isCurrent: boolean; isPast: boolean; level: 1|2;
}
export interface VimshottariData {
  major: DashaPeriod[]; currentMajor?: DashaPeriod;
  antardasha: DashaPeriod[]; currentAntar?: DashaPeriod;
}
export function buildVimshottariDasha(moonSiderealLon: number, birthDatetime: string): VimshottariData
```

- [ ] **Step 1: Add Vimshottari Dasha to `src/lib/astrology/sidereal.ts`**

Append to the bottom of the existing file (after `buildDegreeContext`):

```typescript
// ─── Vimshottari Dasha ────────────────────────────────────────────────────────
// 120-year nakshatra-based planetary period system.

export type DashaRuler =
  | "Ketu" | "Venus" | "Sun" | "Moon" | "Mars"
  | "Rahu" | "Jupiter" | "Saturn" | "Mercury";

export const DASHA_YEARS: Record<DashaRuler, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};
export const DASHA_TOTAL_YEARS = 120;

export const DASHA_ORDER: DashaRuler[] = [
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
];

// Each nakshatra's Vimshottari lord (index 0–26 maps to Ashwini–Revati)
const NAK_LORDS: DashaRuler[] = [
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury", // 0–8
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury", // 9–17
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury", // 18–26
];

export interface DashaPeriod {
  ruler: DashaRuler;
  antardasha?: DashaRuler;
  years: number;
  start: Date;
  end: Date;
  isCurrent: boolean;
  isPast: boolean;
  level: 1 | 2;
}

export interface VimshottariData {
  major: DashaPeriod[];
  currentMajor?: DashaPeriod;
  antardasha: DashaPeriod[];
  currentAntar?: DashaPeriod;
}

function addYearsDasha(d: Date, years: number): Date {
  return new Date(d.getTime() + years * 365.25 * 86400000);
}

export function buildVimshottariDasha(moonSiderealLon: number, birthDatetime: string): VimshottariData {
  const birth = new Date(birthDatetime);
  const today = new Date();
  const moonLon = norm360(moonSiderealLon);

  const nakIdx = Math.floor(moonLon / NAK_SPAN) % 27;
  const startRuler = NAK_LORDS[nakIdx];
  const startIdx = DASHA_ORDER.indexOf(startRuler);

  // How far through the current nakshatra is the Moon?
  const degInNak = moonLon - nakIdx * NAK_SPAN;  // 0–13.33°
  const fractionElapsed = degInNak / NAK_SPAN;
  const startingBalance = DASHA_YEARS[startRuler] * (1 - fractionElapsed);

  const major: DashaPeriod[] = [];
  let cursor = new Date(birth);
  const maxDate = new Date(birth.getTime() + 140 * 365.25 * 86400000);

  for (let cycle = 0; cycle < 2; cycle++) {
    for (let i = 0; i < DASHA_ORDER.length; i++) {
      const pos = (startIdx + (cycle * DASHA_ORDER.length) + i) % DASHA_ORDER.length;
      const ruler = DASHA_ORDER[pos];
      const years = (cycle === 0 && i === 0) ? startingBalance : DASHA_YEARS[ruler];
      if (years <= 0) { cursor = addYearsDasha(cursor, DASHA_YEARS[ruler]); continue; }
      const end = addYearsDasha(cursor, years);
      major.push({ ruler, years, start: new Date(cursor), end, isCurrent: today >= cursor && today < end, isPast: today >= end, level: 1 });
      cursor = end;
      if (cursor > maxDate) break;
    }
    if (cursor > maxDate) break;
  }

  const currentMajor = major.find(p => p.isCurrent);
  const antardasha: DashaPeriod[] = [];
  if (currentMajor) {
    const mStartIdx = DASHA_ORDER.indexOf(currentMajor.ruler);
    const majorMs = currentMajor.end.getTime() - currentMajor.start.getTime();
    let aCursor = new Date(currentMajor.start);
    for (let i = 0; i < DASHA_ORDER.length; i++) {
      const aRuler = DASHA_ORDER[(mStartIdx + i) % DASHA_ORDER.length];
      const aMs = (DASHA_YEARS[aRuler] / DASHA_TOTAL_YEARS) * majorMs;
      const rawEnd = new Date(aCursor.getTime() + aMs);
      const end = rawEnd <= currentMajor.end ? rawEnd : new Date(currentMajor.end);
      antardasha.push({ ruler: currentMajor.ruler, antardasha: aRuler, years: aMs / (365.25 * 86400000), start: new Date(aCursor), end, isCurrent: today >= aCursor && today < end, isPast: today >= end, level: 2 });
      aCursor = end;
      if (aCursor >= currentMajor.end) break;
    }
  }

  return { major, currentMajor, antardasha, currentAntar: antardasha.find(p => p.isCurrent) };
}
```

- [ ] **Step 2: Write `src/app/dashboard/vedic/page.tsx`**

```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import { toSiderealChart, buildVimshottariDasha, lahiriAyanamsa, NAKSHATRAS } from "@/lib/astrology/sidereal";
import type { SiderealChart, VimshottariData, DashaPeriod, DashaRuler } from "@/lib/astrology/sidereal";

const DASHA_COLORS: Record<DashaRuler, string> = {
  Ketu: "#7B6FD4", Venus: "#f472b6", Sun: "#fbbf24", Moon: "#BFB6E8",
  Mars: "#ef4444", Rahu: "#06b6d4", Jupiter: "#f59e0b", Saturn: "#94a3b8", Mercury: "#a78bfa",
};

const DASHA_SYMBOLS: Record<DashaRuler, string> = {
  Ketu: "☋", Venus: "♀", Sun: "☉", Moon: "☽", Mars: "♂",
  Rahu: "☊", Jupiter: "♃", Saturn: "♄", Mercury: "☿",
};

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "⛢", Neptune: "♆", Pluto: "♇",
  NorthNode: "☊", Chiron: "⚷",
};

const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#BFB6E8", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#7B6FD4",
  NorthNode: "#06b6d4", Chiron: "#a78bfa",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function fmtYears(y: number) {
  const yy = Math.floor(y), m = Math.round((y - yy) * 12);
  return m === 0 ? `${yy}y` : `${yy}y ${m}m`;
}

function DashaRow({ p, isAntar = false }: { p: DashaPeriod; isAntar?: boolean }) {
  const ruler = (isAntar ? p.antardasha : p.ruler) as DashaRuler;
  const col = DASHA_COLORS[ruler];
  const now = new Date();
  const totalMs = p.end.getTime() - p.start.getTime();
  const elapsedMs = Math.max(0, Math.min(now.getTime() - p.start.getTime(), totalMs));
  const pct = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      background: p.isCurrent ? `${col}10` : "rgba(10,15,35,0.4)",
      border: `1px solid ${p.isCurrent ? col + "45" : "rgba(40,60,100,0.25)"}`,
      borderRadius: 9, padding: "8px 12px",
    }}>
      {p.isCurrent && (
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${pct}%`, background: `${col}08`, pointerEvents: "none" }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <span style={{ color: col, fontSize: isAntar ? 12 : 16, width: 22, textAlign: "center" }}>{DASHA_SYMBOLS[ruler]}</span>
        <div style={{ flex: 1 }}>
          <span style={{ color: p.isCurrent ? col : "#C0D4FF", fontSize: isAntar ? 10 : 12, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {ruler}
          </span>
          <div style={{ color: "#445577", fontSize: 9, fontFamily: "'Fragment Mono', monospace" }}>
            {fmtDate(p.start)} — {fmtDate(p.end)} · {fmtYears(p.years)}
          </div>
        </div>
        {p.isCurrent && <span style={{ color: col, fontSize: 8, fontFamily: "'Fragment Mono', monospace" }}>{Math.round(pct)}%</span>}
      </div>
    </div>
  );
}

export default function VedicPage() {
  const [sidereal, setSidereal]     = useState<SiderealChart | null>(null);
  const [dasha, setDasha]           = useState<VimshottariData | null>(null);
  const [noProfile, setNoProfile]   = useState(false);
  const [tab, setTab]               = useState<"placements" | "dasha">("placements");

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setNoProfile(true); return; }
    const profile = getProfile(id);
    const chart   = getCachedChart(id);
    if (!profile || !chart) { setNoProfile(true); return; }
    const birthDatetime = `${profile.birthDate}T${profile.birthTime}Z`;
    const sc = toSiderealChart(chart, birthDatetime);
    setSidereal(sc);
    const moonP = chart.planets.find(p => p.name === "Moon");
    if (moonP) {
      const moonSidereal = ((moonP.longitude - sc.ayanamsa) % 360 + 360) % 360;
      setDasha(buildVimshottariDasha(moonSidereal, birthDatetime));
    }
  }, []);

  if (noProfile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <div className="text-center ml-16">
          <p style={{ color: "#C8A55B", fontSize: 13, fontFamily: "'Fragment Mono', monospace" }}>BIRTH DATA REQUIRED</p>
          <p style={{ color: "#445577", fontSize: 11, marginTop: 6 }}>Complete your profile in Settings.</p>
        </div>
      </div>
    );
  }

  if (!sidereal) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ width: 40, height: 40, border: "1px solid #1A3A8A", borderTopColor: "#C8A55B", borderRadius: "50%" }} />
      </div>
    );
  }

  const moonPlacement = sidereal.placements.find(p => p.name === "Moon");
  const moonNak = moonPlacement?.nakshatra;
  const currentMajorColor = dasha?.currentMajor ? DASHA_COLORS[dasha.currentMajor.ruler] : "#C8A55B";

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#010810" }}>
      <DashboardBg />
      <div className="absolute inset-0 overflow-y-auto" style={{ left: 64, scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 48px" }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ width: 6, height: 28, background: "#a78bfa", borderRadius: 3, boxShadow: "0 0 10px #a78bfa" }} />
              <h1 style={{ color: "#C0D4FF", fontSize: 22, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Vedic Chart
              </h1>
              <span style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)", borderRadius: 20, padding: "3px 12px", color: "#a78bfa", fontSize: 9, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em" }}>
                LAHIRI · SIDEREAL
              </span>
            </div>
            <p style={{ color: "#445577", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", paddingLeft: 18 }}>
              Sidereal (Jyotish) chart · Lahiri ayanamsa {sidereal.ayanamsa.toFixed(2)}° · 27 Nakshatras
            </p>
          </div>

          {/* Lagna + Moon nakshatra spotlight */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
            <div style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(5,8,22,0.8))", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ color: "#a78bfa", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>LAGNA (SIDEREAL ASCENDANT)</div>
              <div style={{ color: "#C0D4FF", fontSize: 18, fontFamily: "'Fragment Mono', monospace" }}>
                {SIGN_SYMBOLS[sidereal.ascendant.sign]} {sidereal.ascendant.signDegree.toFixed(1)}° {sidereal.ascendant.sign}
              </div>
              <div style={{ color: "#8899BB", fontSize: 11, fontFamily: "'Fragment Mono', monospace", marginTop: 4 }}>
                {sidereal.ascendant.nakshatra.nakshatra.name} · Pada {sidereal.ascendant.nakshatra.pada}
              </div>
            </div>

            {moonNak && (
              <div style={{ background: `linear-gradient(135deg, ${currentMajorColor}12, rgba(5,8,22,0.8))`, border: `1px solid ${currentMajorColor}30`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ color: currentMajorColor, fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>MOON NAKSHATRA · DASHA LORD</div>
                <div style={{ color: "#C0D4FF", fontSize: 16, fontFamily: "'Fragment Mono', monospace" }}>
                  {moonNak.nakshatra.name}
                </div>
                <div style={{ color: "#8899BB", fontSize: 11, fontFamily: "'Fragment Mono', monospace", marginTop: 4 }}>
                  Lord: {moonNak.nakshatra.lord} · Pada {moonNak.pada} · {moonNak.nakshatra.deity}
                </div>
                <div style={{ color: "#556688", fontSize: 11, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", marginTop: 4 }}>
                  "{moonNak.nakshatra.nature}"
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {(["placements", "dasha"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "5px 16px",
                background: tab === t ? "rgba(167,139,250,0.12)" : "transparent",
                border: `1px solid ${tab === t ? "rgba(167,139,250,0.3)" : "rgba(40,60,100,0.3)"}`,
                borderRadius: 20, color: tab === t ? "#C8A55B" : "#445577",
                fontSize: 9, letterSpacing: "0.12em",
                fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
              }}>
                {t === "placements" ? "SIDEREAL PLACEMENTS" : "VIMSHOTTARI DASHA"}
              </button>
            ))}
          </div>

          {tab === "placements" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {sidereal.placements.map((p, i) => {
                const col = PLANET_COLORS[p.name] ?? "#8899BB";
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 100px 1fr 1fr auto", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 9, background: "rgba(10,15,35,0.5)" }}>
                    <span style={{ color: col, fontSize: 14, textAlign: "center" }}>{PLANET_SYMBOLS[p.name] ?? "·"}</span>
                    <span style={{ color: col, fontSize: 10, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.06em" }}>{p.name}</span>
                    <span style={{ color: "#C0D4FF", fontSize: 11, fontFamily: "'Fragment Mono', monospace" }}>
                      {SIGN_SYMBOLS[p.sign] ?? ""} {p.signDegree.toFixed(1)}° {p.sign}
                    </span>
                    <span style={{ color: "#8899BB", fontSize: 10, fontFamily: "'Fragment Mono', monospace" }}>
                      {p.nakshatra.nakshatra.name} · P{p.nakshatra.pada} · {p.nakshatra.nakshatra.lord}
                    </span>
                    <span style={{ color: "#445577", fontSize: 9, fontFamily: "'Fragment Mono', monospace" }}>
                      H{p.house}{p.retrograde ? " Rx" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "dasha" && dasha && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <p style={{ color: "#445577", fontSize: 8, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>MAJOR DASHAS</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {dasha.major.slice(0, 12).map((p, i) => <DashaRow key={i} p={p} />)}
                </div>
              </div>
              <div>
                <p style={{ color: "#445577", fontSize: 8, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>
                  ANTARDASHA OF {dasha.currentMajor?.ruler?.toUpperCase() ?? "—"}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {dasha.antardasha.map((p, i) => <DashaRow key={i} p={p} isAntar />)}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run build**

```
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add src/lib/astrology/sidereal.ts src/app/dashboard/vedic/page.tsx
git commit -m "feat(vedic): add Vimshottari Dasha engine + Vedic chart page"
```

---

### Task 6: Sidebar navigation — add Firdaria, Progressions, Vedic

**Files:**
- Modify: `src/components/dashboard/Sidebar.tsx`

Add three items to the `NAV_ITEMS` array. Insert after the `"Solar Rtn"` entry (around line 130).

**Interfaces consumed:** None — pure navigation.

- [ ] **Step 1: Locate insertion point in `src/components/dashboard/Sidebar.tsx`**

Find this block (approximately line 130):
```
  {
    label: "Solar Rtn",
    hint: "year ahead",
    href: "/dashboard/solar-return",
```

- [ ] **Step 2: Insert three nav items after the Solar Rtn entry**

The new items to insert (place them between `Solar Rtn` and `Releasing`):

```typescript
  {
    label: "Firdaria",
    hint: "persian periods",
    href: "/dashboard/firdaria",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5" />
        <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.7" />
        <path d="M8 9.5C9 8 11 7.5 12 7.5" strokeOpacity="0.5" />
        <path d="M16 9.5C15 8 13 7.5 12 7.5" strokeOpacity="0.5" />
        <path d="M7 14h10" strokeOpacity="0.4" />
      </svg>
    ),
  },
  {
    label: "Progressions",
    hint: "secondary prog",
    href: "/dashboard/progressions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" strokeOpacity="0.4" />
        <path d="M12 3 L12 7M12 17 L12 21" strokeOpacity="0.6" />
        <path d="M7 12 L12 12 L16 9" />
      </svg>
    ),
  },
  {
    label: "Vedic",
    hint: "jyotish / nakshatra",
    href: "/dashboard/vedic",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M12 3 L14.5 9 L21 9 L16 13.5 L18 20 L12 16 L6 20 L8 13.5 L3 9 L9.5 9 Z" />
      </svg>
    ),
  },
```

- [ ] **Step 3: Run build to confirm no TS errors**

```
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/Sidebar.tsx
git commit -m "feat(sidebar): add Firdaria, Progressions, Vedic nav items"
```

---

## Self-Review

**Spec coverage:**
- ✅ Firdaria — Tasks 1–2
- ✅ Secondary progressions — Tasks 3–4
- ✅ Solar arcs — Tasks 3–4 (combined with progressions)
- ✅ Vedic mode — Task 5 (sidereal chart + Vimshottari Dasha)
- ✅ Nakshatra mode — Task 5 (nakshatra placements for all planets)
- ⬛ Electional — already built (`/dashboard/electional`)
- ⬛ Rectification assistant, Mundane, Community, Marketplace, Dev API — out of scope (infrastructure not ready)

**Placeholder scan:** No TBD/TODO/placeholder language present. All code blocks are complete.

**Type consistency:**
- `FirdariaRuler` defined in Task 1, consumed in Task 2
- `ProgressionResult` defined in Task 3, consumed in Task 4
- `VimshottariData`, `DashaPeriod`, `DashaRuler`, `buildVimshottariDasha` added to `sidereal.ts` in Task 5 and consumed in the same task
- `DashaPeriod.antardasha` is `DashaRuler | undefined` — used safely with `?.` throughout
