# Vedic: Divisional Charts (D1-D60) + Chara Karakas + Padas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Cosmora Vedic page with (1) all standard divisional charts D1–D60, (2) prominently displayed nakshatra padas for every planet, and (3) Jaimini Chara Karakas (AK, AmK, BK, MK, PK, GK, DK).

**Architecture:** Pure calculation functions added to `src/lib/astrology/sidereal.ts`. The Vedic page at `src/app/dashboard/vedic/page.tsx` is updated to add two new tabs: "Divisional Charts" (with a D-selector) and "Karakas". No new API route needed — all computation is client-safe pure math.

**Tech Stack:** TypeScript, Next.js 16.2.6 App Router, React 19, Fragment Mono + Cormorant Garamond fonts, Framer Motion.

## Global Constraints

- `sidereal.ts` is PURE — no IO, no fetch, no Next.js imports
- Divisional charts use the Parashari method (general formula) for D4–D8, D10–D60 except special cases
- Special calculation rules: D2 (Hora), D3 (Drekkana), D9 (Navamsha trikonastha), D30 (Trimshamsha)
- Chara Karakas use sidereal degree-within-sign; Rahu uses `30 - degInSign` (retrograde adjustment); Ketu excluded from 7-karaka system
- Dark OLED palette: bg `#010810`, gold `#C8A55B`, Fragment Mono for labels, Cormorant Garamond for body
- Planet colors: Sun #fbbf24, Moon #BFB6E8, Mercury #a78bfa, Venus #f472b6, Mars #ef4444, Jupiter #f59e0b, Saturn #94a3b8, Uranus #06b6d4, Neptune #3b82f6
- All pages have `"use client"`, DashboardBg, `left: 64` on scroll container
- Verification: `npx tsx scripts/verify-vedic-divisionals.ts` then `npm run build`
- Commit convention: `feat(vedic): ...`
- Path alias: `@/*` → `./src/*`

---

### Task 1: Divisional chart engine + Chara Karakas in sidereal.ts

**Files:**
- Modify: `src/lib/astrology/sidereal.ts` (append at bottom)
- Create: `scripts/verify-vedic-divisionals.ts`

**Interfaces produced:**

```typescript
// --- Divisional charts ---
export interface VargaPlacement {
  name: string;          // planet name
  sign: ZodiacSign;
  signDegree: number;    // 0–29.99
  signIndex: number;     // 0–11
}
export interface DivisionalChart {
  n: number;             // e.g. 9 for D9
  label: string;         // e.g. "Navamsha"
  planets: VargaPlacement[];
  lagna: VargaPlacement; // ascendant in this divisional
}

// --- Chara Karakas ---
export type CharaKarakaRole = "AK"|"AmK"|"BK"|"MK"|"PK"|"GK"|"DK";
export interface CharaKaraka {
  planet: string;
  role: CharaKarakaRole;
  roleLabel: string;     // e.g. "Atmakaraka"
  degInSign: number;     // degree used for ranking
}
export interface CharaKarakas {
  ak: CharaKaraka;
  amk: CharaKaraka;
  bk: CharaKaraka;
  mk: CharaKaraka;
  pk: CharaKaraka;
  gk: CharaKaraka;
  dk: CharaKaraka;
  all: CharaKaraka[];
}

// --- Exports ---
export const DIVISIONAL_NAMES: Record<number, string>
export function getDivisionalSign(siderealLon: number, n: number): number   // 0-11
export function buildDivisionalChart(chart: ChartData, ayanamsa: number, n: number): DivisionalChart
export function buildCharaKarakas(chart: ChartData, ayanamsa: number): CharaKarakas
```

**Calculation rules to implement:**

```
// --- getDivisionalSign ---
// General (Parashari) rule for all Dn:
//   signIdx = floor(siderealLon / 30)         // 0-11
//   posInSign = siderealLon % 30              // 0-30
//   division = floor(posInSign * n / 30)      // 0 to n-1
//   d_sign = (signIdx * n + division) % 12
//
// Special overrides:
//
// D2 (Hora):
//   Odd signs (0,2,4,6,8,10): posInSign < 15 → Leo (4), else Cancer (3)
//   Even signs (1,3,5,7,9,11): posInSign < 15 → Cancer (3), else Leo (4)
//
// D3 (Drekkana):
//   0-10°: same sign (signIdx)
//   10-20°: (signIdx + 4) % 12
//   20-30°: (signIdx + 8) % 12
//
// D9 (Navamsha) — Trikonastha:
//   Triplicity starting signs: Fire→0(Aries), Earth→9(Capricorn), Air→6(Libra), Water→3(Cancer)
//   startSign = triplicity_start[signIdx % 4 mapped by element]
//   division = floor(posInSign * 9 / 30)   // 0-8
//   d_sign = (startSign + division) % 12
//   Element mapping by signIdx:
//     0,4,8  (Aries,Leo,Sag)     = Fire  → start=0
//     1,5,9  (Tau,Vir,Cap)       = Earth → start=9
//     2,6,10 (Gem,Lib,Aqu)       = Air   → start=6
//     3,7,11 (Can,Sco,Pis)       = Water → start=3
//
// D30 (Trimshamsha) — Odd/Even sign special:
//   Odd signs:  0-5°→Mars(Aries,0),  5-10°→Saturn(Aquarius,10), 10-18°→Jupiter(Sag,8),
//               18-25°→Mercury(Gem,2), 25-30°→Venus(Libra,6)
//   Even signs: 0-5°→Venus(Tau,1),   5-12°→Mercury(Vir,5),     12-20°→Jupiter(Pis,11),
//               20-25°→Saturn(Cap,9), 25-30°→Mars(Sco,7)
//   d_sign = the sign assigned per the above table

// --- buildDivisionalChart ---
// For each planet p in chart.planets:
//   siderealLon = norm360(p.longitude - ayanamsa)
//   d_signIdx = getDivisionalSign(siderealLon, n)
//   d_posInSign = (siderealLon * n) % 30   // fractional position within the divisional sign
//   VargaPlacement { name: p.name, sign: ZODIAC_SIGNS[d_signIdx], signDegree: d_posInSign, signIndex: d_signIdx }
// For lagna:
//   siderealAsc = norm360(chart.ascendant - ayanamsa)
//   same formula

// --- buildCharaKarakas ---
// Eligible planets: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Rahu
// For each: degInSign = siderealLon % 30
// For Rahu: degInSign = 30 - (siderealLon % 30)  (because Rahu is always retrograde)
// Sort by degInSign DESCENDING: highest → AK, next → AmK, ..., lowest → DK
// Map roles: ["AK","AmK","BK","MK","PK","GK","DK"]
// Role labels: AK→"Atmakaraka", AmK→"Amatyakaraka", BK→"Bhratrikaraka", 
//              MK→"Matrikaraka", PK→"Pitrikaraka", GK→"Gnatikaraka", DK→"Darakaraka"
```

**Key divisional names (for `DIVISIONAL_NAMES`):**
```typescript
export const DIVISIONAL_NAMES: Record<number, string> = {
  1: "Rashi", 2: "Hora", 3: "Drekkana", 4: "Chaturthamsha", 5: "Panchamsha",
  6: "Shashthamsha", 7: "Saptamsha", 8: "Ashtamsha", 9: "Navamsha", 10: "Dashamsha",
  11: "Ekashamsha", 12: "Dwadashamsha", 16: "Shodashamsha", 20: "Vimshamsha",
  24: "Siddhamsha", 27: "Nakshatramsha", 30: "Trimshamsha", 40: "Khavedamsha",
  45: "Akshavedamsha", 60: "Shashtiamsha",
};
```

- [ ] **Step 1: Append to `src/lib/astrology/sidereal.ts`**

Add after `buildVimshottariDasha`. The file already has `norm360`, `NAK_SPAN`, `ZODIAC_SIGNS` in scope — do NOT redeclare them. Import `ChartData` from `./types` is already at the top of the file.

```typescript
// ─── Divisional Charts (Varga) ────────────────────────────────────────────────

export const DIVISIONAL_NAMES: Record<number, string> = {
  1: "Rashi", 2: "Hora", 3: "Drekkana", 4: "Chaturthamsha", 5: "Panchamsha",
  6: "Shashthamsha", 7: "Saptamsha", 8: "Ashtamsha", 9: "Navamsha", 10: "Dashamsha",
  11: "Ekashamsha", 12: "Dwadashamsha", 16: "Shodashamsha", 20: "Vimshamsha",
  24: "Siddhamsha", 27: "Nakshatramsha", 30: "Trimshamsha", 40: "Khavedamsha",
  45: "Akshavedamsha", 60: "Shashtiamsha",
};

export interface VargaPlacement {
  name: string;
  sign: ZodiacSign;
  signDegree: number;
  signIndex: number;
}

export interface DivisionalChart {
  n: number;
  label: string;
  planets: VargaPlacement[];
  lagna: VargaPlacement;
}

// D30 sign tables (Trimshamsha)
const D30_ODD: Array<[number, number]> = [  // [cutoff, sign_index]
  [5, 0], [10, 10], [18, 8], [25, 2], [30, 6],
];
const D30_EVEN: Array<[number, number]> = [
  [5, 1], [12, 5], [20, 11], [25, 9], [30, 7],
];

export function getDivisionalSign(siderealLon: number, n: number): number {
  const lon = norm360(siderealLon);
  const signIdx = Math.floor(lon / 30);
  const posInSign = lon % 30;

  if (n === 2) {
    const isOdd = signIdx % 2 === 0;  // Aries=0 is odd in Jyotish
    return posInSign < 15 ? (isOdd ? 4 : 3) : (isOdd ? 3 : 4);
  }
  if (n === 3) {
    if (posInSign < 10) return signIdx;
    if (posInSign < 20) return (signIdx + 4) % 12;
    return (signIdx + 8) % 12;
  }
  if (n === 9) {
    const elementStart = [0, 9, 6, 3][signIdx % 4];
    const division = Math.floor(posInSign * 9 / 30);
    return (elementStart + division) % 12;
  }
  if (n === 30) {
    const table = signIdx % 2 === 0 ? D30_ODD : D30_EVEN;
    for (const [cut, sign] of table) {
      if (posInSign <= cut) return sign;
    }
    return table[table.length - 1][1];
  }
  // General Parashari formula
  const division = Math.floor(posInSign * n / 30);
  return (signIdx * n + division) % 12;
}

function lonToVarga(lon: number, name: string, n: number): VargaPlacement {
  const sLon = norm360(lon);
  const signIndex = getDivisionalSign(sLon, n);
  const signDegree = (sLon * n) % 30;
  return { name, sign: ZODIAC_SIGNS[signIndex], signDegree, signIndex };
}

export function buildDivisionalChart(chart: ChartData, ayanamsa: number, n: number): DivisionalChart {
  const planets: VargaPlacement[] = chart.planets.map(p =>
    lonToVarga(norm360(p.longitude - ayanamsa), p.name, n)
  );
  const lagna = lonToVarga(norm360(chart.ascendant - ayanamsa), "Lagna", n);
  return { n, label: DIVISIONAL_NAMES[n] ?? `D${n}`, planets, lagna };
}

// ─── Chara Karakas (Jaimini) ─────────────────────────────────────────────────

export type CharaKarakaRole = "AK" | "AmK" | "BK" | "MK" | "PK" | "GK" | "DK";

export interface CharaKaraka {
  planet: string;
  role: CharaKarakaRole;
  roleLabel: string;
  degInSign: number;
}

export interface CharaKarakas {
  ak: CharaKaraka; amk: CharaKaraka; bk: CharaKaraka; mk: CharaKaraka;
  pk: CharaKaraka; gk: CharaKaraka; dk: CharaKaraka;
  all: CharaKaraka[];
}

const CK_ROLES: CharaKarakaRole[] = ["AK", "AmK", "BK", "MK", "PK", "GK", "DK"];
const CK_LABELS: Record<CharaKarakaRole, string> = {
  AK: "Atmakaraka", AmK: "Amatyakaraka", BK: "Bhratrikaraka",
  MK: "Matrikaraka", PK: "Pitrikaraka", GK: "Gnatikaraka", DK: "Darakaraka",
};
const CK_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "NorthNode"];

export function buildCharaKarakas(chart: ChartData, ayanamsa: number): CharaKarakas {
  const eligible = chart.planets
    .filter(p => CK_PLANETS.includes(p.name))
    .map(p => {
      const sLon = norm360(p.longitude - ayanamsa);
      const raw = sLon % 30;
      const degInSign = p.name === "NorthNode" ? 30 - raw : raw;
      return { planet: p.name, degInSign };
    })
    .sort((a, b) => b.degInSign - a.degInSign)
    .slice(0, 7);

  const all: CharaKaraka[] = eligible.map((e, i) => ({
    planet: e.planet, role: CK_ROLES[i], roleLabel: CK_LABELS[CK_ROLES[i]], degInSign: e.degInSign,
  }));

  return {
    ak: all[0], amk: all[1], bk: all[2], mk: all[3],
    pk: all[4], gk: all[5], dk: all[6], all,
  };
}
```

- [ ] **Step 2: Write `scripts/verify-vedic-divisionals.ts`**

```typescript
import { calculateChart } from "../src/lib/astrology/calculator";
import { lahiriAyanamsa, getDivisionalSign, buildDivisionalChart, buildCharaKarakas } from "../src/lib/astrology/sidereal";

let failures = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ok  ${name}`);
  else { failures++; console.log(`FAIL  ${name}  ${detail}`); }
}
const approx = (a: number, b: number, eps = 0.5) => Math.abs(a - b) <= eps;

const chart = calculateChart({ birthDate: "1990-06-15", birthTime: "08:30:00", latitude: 34.05, longitude: -118.24, timezone: "America/Los_Angeles", houseSystem: "whole_sign" });
const ayanamsa = lahiriAyanamsa(new Date("1990-06-15T08:30:00Z"));

// D2: two possible outputs only — Cancer(3) or Leo(4)
const d2Sign = getDivisionalSign(30, 2);  // 30° = start of Taurus (even), first 15° → Cancer
assert("D2 Taurus 0° → Cancer(3)", d2Sign === 3, String(d2Sign));
const d2Sign2 = getDivisionalSign(45, 2);  // 45° = 15° into Taurus → Leo
assert("D2 Taurus 15° → Leo(4)", d2Sign2 === 4, String(d2Sign2));

// D3: Aries 0° → Aries(0), Aries 10° → Leo(4), Aries 20° → Sag(8)
assert("D3 Aries 0° → Aries(0)",      getDivisionalSign(5, 3) === 0);
assert("D3 Aries 10° → Leo(4)",       getDivisionalSign(15, 3) === 4);
assert("D3 Aries 20° → Sagittarius(8)", getDivisionalSign(25, 3) === 8);

// D9: Aries 0° (Fire) → Aries(0)
assert("D9 Aries 0° → Aries(0)",      getDivisionalSign(0, 9) === 0);
// D9: Aries 3.33° (second division) → Taurus(1)
assert("D9 Aries 3.4° → Taurus(1)",   getDivisionalSign(3.4, 9) === 1);
// D9: Cancer 0° (Water) → Cancer(3)
assert("D9 Cancer 0° → Cancer(3)",    getDivisionalSign(90, 9) === 3);

// D12: Aries 0° → first division = Aries(0)
assert("D12 Aries 0° → Aries(0)",     getDivisionalSign(0, 12) === 0);
// D12: Aries 2.5° → Taurus(1) (0*12+1=1)
assert("D12 Aries 2.6° → Taurus(1)",  getDivisionalSign(2.6, 12) === 1);

// buildDivisionalChart
const d9 = buildDivisionalChart(chart, ayanamsa, 9);
assert("D9: has planets", d9.planets.length >= 10);
assert("D9: has lagna", !!d9.lagna.sign);
assert("D9: label is Navamsha", d9.label === "Navamsha");
assert("D9: signIndex in 0-11", d9.lagna.signIndex >= 0 && d9.lagna.signIndex <= 11);

// Chara Karakas
const ck = buildCharaKarakas(chart, ayanamsa);
assert("CK: AK exists", !!ck.ak.planet);
assert("CK: 7 karakas", ck.all.length === 7);
assert("CK: all roles distinct", new Set(ck.all.map(k => k.role)).size === 7);
assert("CK: AK highest degree", ck.all.every(k => k.degInSign <= ck.ak.degInSign + 0.01));
assert("CK: DK lowest degree", ck.all.every(k => k.degInSign >= ck.dk.degInSign - 0.01));
assert("CK: roles in order", ck.all.map(k => k.role).join(",") === "AK,AmK,BK,MK,PK,GK,DK");

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 3: Run verification**

```
npx tsx scripts/verify-vedic-divisionals.ts
```

Expected: `ALL PASS`

- [ ] **Step 4: Run build**

```
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit**

```bash
git add src/lib/astrology/sidereal.ts scripts/verify-vedic-divisionals.ts
git commit -m "feat(vedic): add divisional chart engine (D1-D60) + Jaimini Chara Karakas"
```

---

### Task 2: Update Vedic page with divisionals, padas, and karakas

**Files:**
- Modify: `src/app/dashboard/vedic/page.tsx`

**Interfaces consumed (from Task 1):**
```typescript
import { 
  toSiderealChart, buildVimshottariDasha, buildDivisionalChart, buildCharaKarakas,
  DIVISIONAL_NAMES, lahiriAyanamsa,
} from "@/lib/astrology/sidereal";
import type { 
  SiderealChart, VimshottariData, DashaPeriod, DashaRuler,
  DivisionalChart, VargaPlacement, CharaKarakas, CharaKaraka, CharaKarakaRole,
} from "@/lib/astrology/sidereal";
// getCachedChart returns ChartData which has .planets[].longitude and .ascendant
```

**New UI structure:** 4 tabs replacing the current 2:
1. **PLACEMENTS** — sidereal planets with nakshatra, pada, and sign (enhanced from current)
2. **NAVAMSHA** — D9 chart (single most important divisional, gets its own tab)
3. **VARGA** — divisional chart browser: pill selector for D1/D2/D3/D4/D7/D9/D10/D12/D16/D20/D24/D27/D30/D40/D45/D60
4. **KARAKAS** — Jaimini Chara Karakas (AK, AmK, BK, MK, PK, GK, DK)
5. **DASHA** — Vimshottari Dasha (existing, moved to 5th tab)

**Pada display:** The existing `nakshatraOf()` already returns `pada: 1–4`. Display it as `P1`–`P4` in the placements table.

- [ ] **Step 1: Rewrite `src/app/dashboard/vedic/page.tsx`**

The page is client-side only — all divisional calculations run in-browser using `buildDivisionalChart`. Pre-compute the 16 key divisionals (D1,D2,D3,D4,D7,D9,D10,D12,D16,D20,D24,D27,D30,D40,D45,D60) in a `useMemo` once the chart is loaded. Selected divisional shown by `selectedD` state.

```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import {
  toSiderealChart, buildVimshottariDasha, buildDivisionalChart, buildCharaKarakas,
  lahiriAyanamsa, DIVISIONAL_NAMES,
} from "@/lib/astrology/sidereal";
import type {
  SiderealChart, VimshottariData, DashaPeriod, DashaRuler,
  DivisionalChart, CharaKarakas, CharaKaraka,
} from "@/lib/astrology/sidereal";
import type { ChartData } from "@/lib/astrology/types";

const KEY_DIVISIONALS = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60];

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
  NorthNode: "☊", SouthNode: "☋", Chiron: "⚷",
};
const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#BFB6E8", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#7B6FD4",
  NorthNode: "#06b6d4", SouthNode: "#7B6FD4", Chiron: "#a78bfa",
};
const CK_ROLE_COLORS: Record<string, string> = {
  AK: "#fbbf24", AmK: "#f59e0b", BK: "#a78bfa", MK: "#BFB6E8",
  PK: "#f472b6", GK: "#94a3b8", DK: "#06b6d4",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function fmtYears(y: number) {
  const yy = Math.floor(y), m = Math.round((y - yy) * 12);
  return m === 0 ? `${yy}y` : `${yy}y ${m}m`;
}
function degStr(d: number) {
  return `${Math.floor(d)}°${Math.round((d % 1) * 60).toString().padStart(2, "0")}′`;
}

function VargaRow({ p, accent }: { p: { name: string; sign: string; signDegree: number; signIndex: number }; accent?: string }) {
  const col = accent ?? PLANET_COLORS[p.name] ?? "#8899BB";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "28px 100px 1fr", alignItems: "center", gap: 10, padding: "7px 12px", borderRadius: 8, background: "rgba(10,15,35,0.5)" }}>
      <span style={{ color: col, fontSize: 14, textAlign: "center" }}>{PLANET_SYMBOLS[p.name] ?? "✦"}</span>
      <span style={{ color: col, fontSize: 10, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.06em" }}>{p.name.replace("NorthNode", "N.Node").replace("SouthNode", "S.Node")}</span>
      <span style={{ color: "#C0D4FF", fontSize: 11, fontFamily: "'Fragment Mono', monospace" }}>
        {SIGN_SYMBOLS[p.sign] ?? ""} {degStr(p.signDegree)} {p.sign}
      </span>
    </div>
  );
}

function DashaRow({ p, isAntar = false }: { p: DashaPeriod; isAntar?: boolean }) {
  const ruler = (isAntar ? p.antardasha : p.ruler) as DashaRuler;
  const col = DASHA_COLORS[ruler];
  const now = new Date();
  const totalMs = p.end.getTime() - p.start.getTime();
  const elapsedMs = Math.max(0, Math.min(now.getTime() - p.start.getTime(), totalMs));
  const pct = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;
  return (
    <div style={{ position: "relative", overflow: "hidden", background: p.isCurrent ? `${col}10` : "rgba(10,15,35,0.4)", border: `1px solid ${p.isCurrent ? col + "45" : "rgba(40,60,100,0.25)"}`, borderRadius: 9, padding: "8px 12px" }}>
      {p.isCurrent && <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${pct}%`, background: `${col}08`, pointerEvents: "none" }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <span style={{ color: col, fontSize: isAntar ? 12 : 16, width: 22, textAlign: "center" }}>{DASHA_SYMBOLS[ruler]}</span>
        <div style={{ flex: 1 }}>
          <span style={{ color: p.isCurrent ? col : "#C0D4FF", fontSize: isAntar ? 10 : 12, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>{ruler}</span>
          <div style={{ color: "#445577", fontSize: 9, fontFamily: "'Fragment Mono', monospace" }}>{fmtDate(p.start)} — {fmtDate(p.end)} · {fmtYears(p.years)}</div>
        </div>
        {p.isCurrent && <span style={{ color: col, fontSize: 8, fontFamily: "'Fragment Mono', monospace" }}>{Math.round(pct)}%</span>}
      </div>
    </div>
  );
}

export default function VedicPage() {
  const [sidereal, setSidereal]   = useState<SiderealChart | null>(null);
  const [rawChart, setRawChart]   = useState<ChartData | null>(null);
  const [ayanamsa, setAyanamsa]   = useState(0);
  const [dasha, setDasha]         = useState<VimshottariData | null>(null);
  const [karakas, setKarakas]     = useState<CharaKarakas | null>(null);
  const [noProfile, setNoProfile] = useState(false);
  const [tab, setTab]             = useState<"placements" | "navamsha" | "varga" | "karakas" | "dasha">("placements");
  const [selectedD, setSelectedD] = useState(9);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setNoProfile(true); return; }
    const profile = getProfile(id);
    const chart   = getCachedChart(id);
    if (!profile || !chart) { setNoProfile(true); return; }
    const birthDatetime = `${profile.birthDate}T${profile.birthTime}Z`;
    const sc = toSiderealChart(chart, birthDatetime);
    const ay = lahiriAyanamsa(new Date(birthDatetime));
    setSidereal(sc);
    setRawChart(chart);
    setAyanamsa(ay);
    const moonP = chart.planets.find(p => p.name === "Moon");
    if (moonP) {
      const moonSidereal = ((moonP.longitude - sc.ayanamsa) % 360 + 360) % 360;
      setDasha(buildVimshottariDasha(moonSidereal, birthDatetime));
    }
    setKarakas(buildCharaKarakas(chart, ay));
  }, []);

  const divisionals = useMemo<Record<number, DivisionalChart>>(() => {
    if (!rawChart) return {};
    const out: Record<number, DivisionalChart> = {};
    for (const n of KEY_DIVISIONALS) {
      out[n] = buildDivisionalChart(rawChart, ayanamsa, n);
    }
    return out;
  }, [rawChart, ayanamsa]);

  const d9 = divisionals[9];
  const selectedChart = divisionals[selectedD];

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

  const moonPlacement  = sidereal.placements.find(p => p.name === "Moon");
  const lagnaColor     = "#a78bfa";
  const dashaMajorCol  = dasha?.currentMajor ? DASHA_COLORS[dasha.currentMajor.ruler] : "#C8A55B";

  const TABS: Array<{ key: typeof tab; label: string }> = [
    { key: "placements", label: "PLACEMENTS" },
    { key: "navamsha",   label: "NAVAMSHA D9" },
    { key: "varga",      label: "VARGA" },
    { key: "karakas",    label: "KARAKAS" },
    { key: "dasha",      label: "DASHA" },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#010810" }}>
      <DashboardBg />
      <div className="absolute inset-0 overflow-y-auto" style={{ left: 64, scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px 48px" }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ width: 6, height: 28, background: lagnaColor, borderRadius: 3, boxShadow: `0 0 10px ${lagnaColor}` }} />
              <h1 style={{ color: "#C0D4FF", fontSize: 22, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}>Vedic Chart</h1>
              <span style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)", borderRadius: 20, padding: "3px 12px", color: "#a78bfa", fontSize: 9, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em" }}>
                LAHIRI · {sidereal.ayanamsa.toFixed(2)}°
              </span>
            </div>
            <p style={{ color: "#445577", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", paddingLeft: 18 }}>
              Jyotish · Sidereal · 27 Nakshatras · {KEY_DIVISIONALS.length} Divisional Charts · Jaimini Karakas
            </p>
          </div>

          {/* Lagna + Moon spotlight */}
          <div style={{ display: "grid", gridTemplateColumns: moonPlacement ? "1fr 1fr" : "1fr", gap: 14, marginBottom: 22 }}>
            <div style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(5,8,22,0.8))", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 14, padding: "14px 18px" }}>
              <div style={{ color: "#a78bfa", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 8 }}>LAGNA</div>
              <div style={{ color: "#C0D4FF", fontSize: 17, fontFamily: "'Fragment Mono', monospace" }}>
                {SIGN_SYMBOLS[sidereal.ascendant.sign]} {sidereal.ascendant.signDegree.toFixed(1)}° {sidereal.ascendant.sign}
              </div>
              <div style={{ color: "#8899BB", fontSize: 10, fontFamily: "'Fragment Mono', monospace", marginTop: 4 }}>
                {sidereal.ascendant.nakshatra.nakshatra.name} · P{sidereal.ascendant.nakshatra.pada} · {sidereal.ascendant.nakshatra.nakshatra.lord}
              </div>
            </div>
            {moonPlacement && (
              <div style={{ background: `linear-gradient(135deg, ${dashaMajorCol}12, rgba(5,8,22,0.8))`, border: `1px solid ${dashaMajorCol}30`, borderRadius: 14, padding: "14px 18px" }}>
                <div style={{ color: dashaMajorCol, fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 8 }}>MOON · JANMA NAKSHATRA</div>
                <div style={{ color: "#C0D4FF", fontSize: 17, fontFamily: "'Fragment Mono', monospace" }}>
                  {moonPlacement.nakshatra.nakshatra.name}
                </div>
                <div style={{ color: "#8899BB", fontSize: 10, fontFamily: "'Fragment Mono', monospace", marginTop: 4 }}>
                  P{moonPlacement.nakshatra.pada} · Lord: {moonPlacement.nakshatra.nakshatra.lord} · {moonPlacement.nakshatra.nakshatra.deity}
                </div>
                <div style={{ color: "#556688", fontSize: 11, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", marginTop: 3 }}>
                  "{moonPlacement.nakshatra.nakshatra.nature}"
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "5px 14px",
                background: tab === t.key ? "rgba(167,139,250,0.12)" : "transparent",
                border: `1px solid ${tab === t.key ? "rgba(167,139,250,0.3)" : "rgba(40,60,100,0.3)"}`,
                borderRadius: 20, color: tab === t.key ? "#C8A55B" : "#445577",
                fontSize: 9, letterSpacing: "0.12em",
                fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* --- PLACEMENTS --- */}
          {tab === "placements" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {sidereal.placements.map((p, i) => {
                const col = PLANET_COLORS[p.name] ?? "#8899BB";
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 90px 130px 1fr 60px 30px", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 9, background: "rgba(10,15,35,0.5)" }}>
                    <span style={{ color: col, fontSize: 14, textAlign: "center" }}>{PLANET_SYMBOLS[p.name] ?? "·"}</span>
                    <span style={{ color: col, fontSize: 10, fontFamily: "'Fragment Mono', monospace" }}>{p.name.replace("NorthNode", "N.Node")}</span>
                    <span style={{ color: "#C0D4FF", fontSize: 11, fontFamily: "'Fragment Mono', monospace" }}>
                      {SIGN_SYMBOLS[p.sign] ?? ""} {p.signDegree.toFixed(1)}° {p.sign}
                    </span>
                    <span style={{ color: "#8899BB", fontSize: 10, fontFamily: "'Fragment Mono', monospace" }}>
                      {p.nakshatra.nakshatra.name} · <span style={{ color: "#a78bfa" }}>P{p.nakshatra.pada}</span> · {p.nakshatra.nakshatra.lord}
                    </span>
                    <span style={{ color: "#556688", fontSize: 9, fontFamily: "'Fragment Mono', monospace" }}>H{p.house}</span>
                    <span style={{ color: "#334466", fontSize: 9, fontFamily: "'Fragment Mono', monospace" }}>{p.retrograde ? "Rx" : ""}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* --- NAVAMSHA D9 --- */}
          {tab === "navamsha" && d9 && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <p style={{ color: "#a78bfa", fontSize: 9, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 4 }}>
                  D9 — NAVAMSHA · {d9.label}
                </p>
                <p style={{ color: "#445577", fontSize: 11, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                  Soul chart · spouse chart · reveals deeper nature and dharma. Lagna: {SIGN_SYMBOLS[d9.lagna.sign]} {d9.lagna.sign}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <VargaRow p={{ ...d9.lagna }} accent="#a78bfa" />
                {d9.planets.map((p, i) => <VargaRow key={i} p={p} />)}
              </div>
            </div>
          )}

          {/* --- VARGA BROWSER --- */}
          {tab === "varga" && (
            <div>
              {/* D selector */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {KEY_DIVISIONALS.map(n => (
                  <button key={n} onClick={() => setSelectedD(n)} style={{
                    padding: "4px 10px",
                    background: selectedD === n ? "rgba(167,139,250,0.18)" : "rgba(10,15,35,0.6)",
                    border: `1px solid ${selectedD === n ? "rgba(167,139,250,0.4)" : "rgba(40,60,100,0.3)"}`,
                    borderRadius: 8, color: selectedD === n ? "#C8A55B" : "#445577",
                    fontSize: 9, letterSpacing: "0.1em",
                    fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
                  }}>
                    D{n}
                  </button>
                ))}
              </div>
              {selectedChart && (
                <div>
                  <p style={{ color: "#a78bfa", fontSize: 9, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>
                    D{selectedD} — {selectedChart.label} · Lagna: {SIGN_SYMBOLS[selectedChart.lagna.sign]} {selectedChart.lagna.sign}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <VargaRow p={{ ...selectedChart.lagna }} accent="#a78bfa" />
                    {selectedChart.planets.map((p, i) => <VargaRow key={i} p={p} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- KARAKAS --- */}
          {tab === "karakas" && karakas && (
            <div>
              <p style={{ color: "#445577", fontSize: 9, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 14 }}>
                JAIMINI CHARA KARAKAS — ranked by sidereal degree within sign
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {karakas.all.map((ck, i) => {
                  const col = CK_ROLE_COLORS[ck.role] ?? "#8899BB";
                  const pCol = PLANET_COLORS[ck.planet] ?? "#8899BB";
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      style={{ background: i === 0 ? `${col}15` : "rgba(10,15,35,0.6)", border: `1px solid ${i === 0 ? col + "40" : "rgba(40,60,100,0.3)"}`, borderRadius: 12, padding: "14px 16px", boxShadow: i === 0 ? `0 0 20px ${col}12` : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <span style={{ color: pCol, fontSize: 20 }}>{PLANET_SYMBOLS[ck.planet] ?? "·"}</span>
                        <div>
                          <div style={{ color: col, fontSize: 10, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.12em" }}>
                            {ck.role} — {ck.roleLabel}
                          </div>
                          <div style={{ color: pCol, fontSize: 13, fontFamily: "'Fragment Mono', monospace" }}>
                            {ck.planet.replace("NorthNode", "Rahu")}
                          </div>
                        </div>
                      </div>
                      <div style={{ color: "#445577", fontSize: 9, fontFamily: "'Fragment Mono', monospace" }}>
                        {ck.degInSign.toFixed(2)}° in sign
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* --- DASHA --- */}
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
                  ANTARDASHA — {dasha.currentMajor?.ruler?.toUpperCase() ?? "—"}
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

- [ ] **Step 2: Run build**

```
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/vedic/page.tsx
git commit -m "feat(vedic): divisional chart browser (D1-D60), enhanced padas, Chara Karakas tab"
```

---

## Self-Review

**Spec coverage:**
- ✅ D1-D60 standard divisional charts — 16 key varga charts (D1,2,3,4,7,9,10,12,16,20,24,27,30,40,45,60)
- ✅ D61-D100 — not implemented (no classical consensus on calculation rules)
- ✅ Nakshatra padas — displayed in placements tab as P1–P4 with violet accent
- ✅ Chara Karakas — AK, AmK, BK, MK, PK, GK, DK with Rahu degInSign correction
- ✅ Navamsha (D9) gets dedicated tab (most important divisional)
- ✅ Varga browser tab with D-selector for all 16 divisionals
- ✅ Dasha tab preserved from previous implementation

**Type consistency:**
- `buildDivisionalChart` takes `ChartData` (tropical) + `ayanamsa` → applies internally
- `buildCharaKarakas` takes `ChartData` + `ayanamsa` → same pattern as divisionals
- `VargaPlacement` used in `DivisionalChart.planets[]` and `DivisionalChart.lagna`
- Page imports `CharaKarakas` and `CharaKaraka` types from sidereal.ts

**Placeholder scan:** None — all code blocks complete.
