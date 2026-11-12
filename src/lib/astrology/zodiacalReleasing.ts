import type { ZodiacSign } from "./types";
import { ZODIAC_SIGNS, TRADITIONAL_RULERS } from "./types";

export const ZR_HOUSE_THEMES: Record<number, string> = {
  1: "Identity & Self", 2: "Resources & Values", 3: "Mind & Communication",
  4: "Home & Roots", 5: "Creativity & Pleasure", 6: "Health & Service",
  7: "Partnership & Other", 8: "Transformation & Depth", 9: "Wisdom & Expansion",
  10: "Career & Legacy", 11: "Community & Vision", 12: "Shadow & Retreat",
};

// Correct Hellenistic minor year values (Vettius Valens tradition)
export const ZR_MINOR_YEARS: Record<ZodiacSign, number> = {
  Aries: 15, Taurus: 8, Gemini: 20, Cancer: 25,
  Leo: 19, Virgo: 20, Libra: 8, Scorpio: 15,
  Sagittarius: 12, Capricorn: 27, Aquarius: 30, Pisces: 12,
};

export const ZR_TOTAL_YEARS = 211;

// Hellenistic ZR is nestable indefinitely; L1–L4 covers decade-to-month resolution,
// L5–L8 keep subdividing down to week/day resolution — needed for short-minor-year
// signs (Taurus/Libra = 8yr) where L4 alone still spans months.
export const ZR_MAX_LEVEL = 8;

export interface ZRPeriod {
  sign: ZodiacSign;
  years: number;
  start: Date;
  end: Date;
  isCurrent: boolean;
  isPast: boolean;
  level: number;
  // How many signs from the parent period's sign to this period's sign (1 = same sign, 7 = opposition)
  derivedHouse: number;
  // L2 period in the 7th sign from L1 = loosening of bonds (major life transition)
  isLooseningOfBonds: boolean;
}

// Number of signs from `from` to `to` (1–12; 1 = same sign, 7 = opposition)
export function signHouseDiff(from: ZodiacSign, to: ZodiacSign): number {
  return (ZODIAC_SIGNS.indexOf(to) - ZODIAC_SIGNS.indexOf(from) + 12) % 12 + 1;
}

export function buildL1Periods(lotLon: number, birthDatetime: string): ZRPeriod[] {
  const birth = new Date(birthDatetime);
  const today = new Date();
  const startIdx = Math.floor(lotLon / 30);
  const lotSign = ZODIAC_SIGNS[startIdx] as ZodiacSign;
  const maxDate = new Date(birth.getTime() + 120 * 365.25 * 86400000);

  const periods: ZRPeriod[] = [];
  let cursor = new Date(birth);
  let idx = startIdx;

  while (cursor < maxDate && periods.length < 60) {
    const sign = ZODIAC_SIGNS[idx % 12] as ZodiacSign;
    const years = ZR_MINOR_YEARS[sign];
    const end = new Date(cursor.getTime() + years * 365.25 * 86400000);
    periods.push({
      sign, years,
      start: new Date(cursor), end,
      isCurrent: today >= cursor && today < end,
      isPast: today >= end,
      level: 1,
      derivedHouse: signHouseDiff(lotSign, sign),
      isLooseningOfBonds: false,
    });
    cursor = end;
    idx++;
  }
  return periods;
}

// Build 12 sub-periods within a parent period, starting from the parent's sign
export function buildSubPeriods(parent: ZRPeriod, level: number): ZRPeriod[] {
  const today = new Date();
  const parentMs = parent.end.getTime() - parent.start.getTime();
  const startSignIdx = ZODIAC_SIGNS.indexOf(parent.sign);

  const periods: ZRPeriod[] = [];
  let cursor = new Date(parent.start);

  for (let i = 0; i < 12; i++) {
    const signIdx = (startSignIdx + i) % 12;
    const sign = ZODIAC_SIGNS[signIdx] as ZodiacSign;
    const subMs = (ZR_MINOR_YEARS[sign] / ZR_TOTAL_YEARS) * parentMs;
    const rawEnd = new Date(cursor.getTime() + subMs);
    const end = rawEnd <= parent.end ? rawEnd : new Date(parent.end);
    const derivedHouse = signHouseDiff(parent.sign, sign);

    periods.push({
      sign,
      years: (ZR_MINOR_YEARS[sign] / ZR_TOTAL_YEARS) * parent.years,
      start: new Date(cursor),
      end,
      isCurrent: today >= cursor && today < end,
      isPast: today >= end,
      level,
      derivedHouse,
      // Loosening of bonds: L2 period in the 7th sign from L1 = opposition = major transition
      isLooseningOfBonds: level === 2 && derivedHouse === 7,
    });

    cursor = end;
    if (cursor >= parent.end) break;
  }
  return periods;
}

export interface ZRData {
  l1: ZRPeriod[];
  currentL1?: ZRPeriod;
  l2: ZRPeriod[];
  currentL2?: ZRPeriod;
  l3: ZRPeriod[];
  currentL3?: ZRPeriod;
  l4: ZRPeriod[];
  currentL4?: ZRPeriod;
  l5: ZRPeriod[];
  currentL5?: ZRPeriod;
  l6: ZRPeriod[];
  currentL6?: ZRPeriod;
  l7: ZRPeriod[];
  currentL7?: ZRPeriod;
  l8: ZRPeriod[];
  currentL8?: ZRPeriod;
  // All levels indexed by level - 1 (levels[0] === l1, etc.), for code that walks
  // the chain generically instead of naming each level.
  levels: ZRPeriod[][];
  currentChain: ZRPeriod[];
}

// Cascades one level deeper than the given chain, using the deepest current period
// as the new parent. Stops early (short chain) once a period has no "current" child,
// e.g. the native's own lifetime hasn't reached that resolution yet.
export function buildZRData(lotLon: number, birthDatetime: string, maxLevel: number = ZR_MAX_LEVEL): ZRData {
  const levels: ZRPeriod[][] = [];
  const currentChain: ZRPeriod[] = [];

  levels.push(buildL1Periods(lotLon, birthDatetime));
  let current = levels[0].find(p => p.isCurrent);
  if (current) currentChain.push(current);

  for (let lvl = 2; lvl <= maxLevel && current; lvl++) {
    const sub = buildSubPeriods(current, lvl);
    levels.push(sub);
    current = sub.find(p => p.isCurrent);
    if (current) currentChain.push(current);
  }
  while (levels.length < maxLevel) levels.push([]);

  return {
    l1: levels[0] ?? [], currentL1: levels[0]?.find(p => p.isCurrent),
    l2: levels[1] ?? [], currentL2: levels[1]?.find(p => p.isCurrent),
    l3: levels[2] ?? [], currentL3: levels[2]?.find(p => p.isCurrent),
    l4: levels[3] ?? [], currentL4: levels[3]?.find(p => p.isCurrent),
    l5: levels[4] ?? [], currentL5: levels[4]?.find(p => p.isCurrent),
    l6: levels[5] ?? [], currentL6: levels[5]?.find(p => p.isCurrent),
    l7: levels[6] ?? [], currentL7: levels[6]?.find(p => p.isCurrent),
    l8: levels[7] ?? [], currentL8: levels[7]?.find(p => p.isCurrent),
    levels, currentChain,
  };
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Plain-text description of the live nested chain, for grounding AI prompts in the
// exact computed periods rather than letting the model invent dates or signs.
export function describeZRChain(chain: ZRPeriod[], label: "Fortune" | "Spirit"): string {
  if (!chain.length) return `LOT OF ${label.toUpperCase()}: no current period found (birth data out of range).`;

  const lines = chain.map((p, i) => {
    const lord = TRADITIONAL_RULERS[p.sign];
    const parts = [
      `L${p.level} ${p.sign} (${fmtDate(p.start)} – ${fmtDate(p.end)}, lord ${lord})`,
    ];
    if (i > 0) parts.push(`derived H${p.derivedHouse} of L${chain[i - 1].level} ${chain[i - 1].sign} — ${ZR_HOUSE_THEMES[p.derivedHouse]}`);
    if (p.isLooseningOfBonds) parts.push("LOOSENING OF BONDS ACTIVE (opposition from L1)");
    return parts.join(" · ");
  });

  return `LOT OF ${label.toUpperCase()} — nested chain, deepest to shallowest is most precise:\n  ${lines.join("\n  ")}`;
}
