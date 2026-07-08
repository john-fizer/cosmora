import { calculateChart, calculateFirdaria } from "@/lib/astrology/calculator";
import { buildVimshottariDasha, lahiriAyanamsa, DASHA_ORDER, DASHA_YEARS } from "@/lib/astrology/sidereal";
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
  const startIdx = DASHA_ORDER.indexOf(majorRuler as never);
  let cursor = majorStart.getTime();
  for (let i = 0; i < 9; i++) {
    const sub = DASHA_ORDER[(startIdx + i) % 9];
    const end = cursor + (DASHA_YEARS[sub] / 120) * majorYears * YEAR_MS;
    if (date.getTime() < end) return sub;
    cursor = end;
  }
  return DASHA_ORDER[startIdx]; // date at exact end boundary — return first
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
  const abbrevOf = (n: AspectName) => ASPECTS.find(a => a.name === n)!.abbrev;
  const tokens: string[] = [
    ...transitHits.map(h => `T.${h.transitingBody}.${abbrevOf(h.aspect)}.${h.natalPoint}.H${h.natalHouse}`),
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
