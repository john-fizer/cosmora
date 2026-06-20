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
