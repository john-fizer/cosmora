import type { ChartData, PlanetName, ZodiacSign } from "./types";
import { ZODIAC_SIGNS } from "./types";

/**
 * Sidereal (Vedic) layer + Western degree theory.
 * Pure math — no AI, no IO. Converts the tropical chart to Lahiri sidereal,
 * computes nakshatra/pada placements, and surfaces degree-level testimony.
 */

// ─── Lahiri ayanamsa ──────────────────────────────────────────────────────────
// Lahiri (Chitrapaksha) ≈ 23°51.18′ at J2000, precessing ~50.29″/year.
// Arcminute-level accuracy — ample for interpretive work.

export function lahiriAyanamsa(date: Date): number {
  const year = date.getUTCFullYear() +
    (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / (365.25 * 86400000);
  return 23.853 + (year - 2000) * 0.013972;
}

const norm360 = (a: number) => ((a % 360) + 360) % 360;

// ─── Nakshatras ───────────────────────────────────────────────────────────────
// 27 lunar mansions of 13°20′. Vimshottari lords cycle Ketu→Venus→Sun→Moon→
// Mars→Rahu→Jupiter→Saturn→Mercury three times around the zodiac.

export interface NakshatraInfo {
  name: string;
  lord: string;       // Vimshottari dasha lord
  deity: string;
  symbol: string;
  nature: string;     // classical temperament keyword
}

export const NAKSHATRAS: NakshatraInfo[] = [
  { name: "Ashwini",          lord: "Ketu",    deity: "Ashvins",        symbol: "Horse's head",      nature: "swift healing, new beginnings" },
  { name: "Bharani",          lord: "Venus",   deity: "Yama",           symbol: "Yoni",              nature: "bearing, restraint, transformation" },
  { name: "Krittika",         lord: "Sun",     deity: "Agni",           symbol: "Razor / flame",     nature: "cutting clarity, purification" },
  { name: "Rohini",           lord: "Moon",    deity: "Brahma",         symbol: "Ox cart",           nature: "growth, fertility, magnetism" },
  { name: "Mrigashira",       lord: "Mars",    deity: "Soma",           symbol: "Deer's head",       nature: "searching, gentle curiosity" },
  { name: "Ardra",            lord: "Rahu",    deity: "Rudra",          symbol: "Teardrop",          nature: "storm, breakthrough through grief" },
  { name: "Punarvasu",        lord: "Jupiter", deity: "Aditi",          symbol: "Quiver of arrows",  nature: "return of light, renewal" },
  { name: "Pushya",           lord: "Saturn",  deity: "Brihaspati",     symbol: "Cow's udder",       nature: "nourishment, spiritual flowering" },
  { name: "Ashlesha",         lord: "Mercury", deity: "Nagas",          symbol: "Coiled serpent",    nature: "hypnotic insight, entwining" },
  { name: "Magha",            lord: "Ketu",    deity: "Pitris",         symbol: "Throne room",       nature: "ancestral authority, lineage" },
  { name: "Purva Phalguni",   lord: "Venus",   deity: "Bhaga",          symbol: "Front bed legs",    nature: "pleasure, creative repose" },
  { name: "Uttara Phalguni",  lord: "Sun",     deity: "Aryaman",        symbol: "Back bed legs",     nature: "patronage, contracts, union" },
  { name: "Hasta",            lord: "Moon",    deity: "Savitar",        symbol: "Open hand",         nature: "skill, dexterous manifestation" },
  { name: "Chitra",           lord: "Mars",    deity: "Tvashtar",       symbol: "Bright jewel",      nature: "crafted brilliance, design" },
  { name: "Swati",            lord: "Rahu",    deity: "Vayu",           symbol: "Young sprout in wind", nature: "independence, scattering wind" },
  { name: "Vishakha",         lord: "Jupiter", deity: "Indra-Agni",     symbol: "Triumphal arch",    nature: "determined pursuit of the goal" },
  { name: "Anuradha",         lord: "Saturn",  deity: "Mitra",          symbol: "Lotus",             nature: "devotion through friendship" },
  { name: "Jyeshtha",         lord: "Mercury", deity: "Indra",          symbol: "Earring / umbrella", nature: "seniority, protective power" },
  { name: "Mula",             lord: "Ketu",    deity: "Nirriti",        symbol: "Bundle of roots",   nature: "uprooting, going to the core" },
  { name: "Purva Ashadha",    lord: "Venus",   deity: "Apas",           symbol: "Winnowing fan",     nature: "invincible declaration, early victory" },
  { name: "Uttara Ashadha",   lord: "Sun",     deity: "Vishvadevas",    symbol: "Elephant tusk",     nature: "final victory, universal principle" },
  { name: "Shravana",         lord: "Moon",    deity: "Vishnu",         symbol: "Ear / three footprints", nature: "listening, learning, connection" },
  { name: "Dhanishta",        lord: "Mars",    deity: "Vasus",          symbol: "Drum",              nature: "rhythm, wealth, performance" },
  { name: "Shatabhisha",      lord: "Rahu",    deity: "Varuna",         symbol: "Empty circle",      nature: "the hundred healers, secrecy, vastness" },
  { name: "Purva Bhadrapada", lord: "Jupiter", deity: "Aja Ekapada",    symbol: "Front funeral cot legs", nature: "intensity, sacrificial fire" },
  { name: "Uttara Bhadrapada",lord: "Saturn",  deity: "Ahir Budhnya",   symbol: "Back funeral cot legs", nature: "depth, the serpent of the deep" },
  { name: "Revati",           lord: "Mercury", deity: "Pushan",         symbol: "Fish",              nature: "safe passage, completion, nurture" },
];

const NAK_SPAN = 360 / 27;        // 13°20′
const PADA_SPAN = NAK_SPAN / 4;   // 3°20′

export interface NakshatraPlacement {
  nakshatra: NakshatraInfo;
  pada: 1 | 2 | 3 | 4;
  navamsaSign: ZodiacSign;        // pada maps to a navamsa (D9) sign
  degreeInNakshatra: number;
}

export function nakshatraOf(siderealLon: number): NakshatraPlacement {
  const lon = norm360(siderealLon);
  const idx = Math.floor(lon / NAK_SPAN) % 27;
  const within = lon - idx * NAK_SPAN;
  const pada = (Math.floor(within / PADA_SPAN) + 1) as 1 | 2 | 3 | 4;
  // Navamsa: continuous count of 3°20′ segments from 0° sidereal Aries
  const navIdx = Math.floor(lon / PADA_SPAN) % 12;
  return {
    nakshatra: NAKSHATRAS[idx],
    pada,
    navamsaSign: ZODIAC_SIGNS[navIdx],
    degreeInNakshatra: within,
  };
}

// ─── Sidereal chart conversion ────────────────────────────────────────────────

export interface SiderealPlacement {
  name: PlanetName;
  siderealLon: number;
  sign: ZodiacSign;
  signDegree: number;
  house: number;                  // whole sign from sidereal ascendant
  retrograde: boolean;
  nakshatra: NakshatraPlacement;
}

export interface SiderealChart {
  ayanamsa: number;
  ascendant: { siderealLon: number; sign: ZodiacSign; signDegree: number; nakshatra: NakshatraPlacement };
  placements: SiderealPlacement[];
}

export function toSiderealChart(chart: ChartData, birthDatetime: string): SiderealChart {
  const ayanamsa = lahiriAyanamsa(new Date(birthDatetime));

  const ascLon = norm360(chart.ascendant - ayanamsa);
  const ascSignIdx = Math.floor(ascLon / 30);

  const placements: SiderealPlacement[] = chart.planets.map(p => {
    const sLon = norm360(p.longitude - ayanamsa);
    const signIdx = Math.floor(sLon / 30);
    return {
      name: p.name,
      siderealLon: sLon,
      sign: ZODIAC_SIGNS[signIdx],
      signDegree: sLon % 30,
      house: ((signIdx - ascSignIdx + 12) % 12) + 1,
      retrograde: p.retrograde,
      nakshatra: nakshatraOf(sLon),
    };
  });

  return {
    ayanamsa,
    ascendant: {
      siderealLon: ascLon,
      sign: ZODIAC_SIGNS[ascSignIdx],
      signDegree: ascLon % 30,
      nakshatra: nakshatraOf(ascLon),
    },
    placements,
  };
}

// ─── Western degree theory ────────────────────────────────────────────────────

const CARDINAL: ZodiacSign[] = ["Aries", "Cancer", "Libra", "Capricorn"];
const FIXED: ZodiacSign[]    = ["Taurus", "Leo", "Scorpio", "Aquarius"];

// Chaldean decan lords: descending order Mars→Sun→Venus→Mercury→Moon→Saturn→Jupiter,
// starting from Aries decan 1 = Mars.
const CHALDEAN_ORDER = ["Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter"];

export function chaldeanDecanLord(signIdx: number, decan: number): string {
  return CHALDEAN_ORDER[(signIdx * 3 + (decan - 1)) % 7];
}

export interface DegreeTestimony {
  planet: PlanetName;
  notes: string[];   // each note is a degree-level observation
}

export function degreeTestimonies(chart: ChartData): DegreeTestimony[] {
  return chart.planets.map(p => {
    const notes: string[] = [];
    const deg = p.signDegree;
    const signIdx = ZODIAC_SIGNS.indexOf(p.sign);

    // Decan
    const decan = Math.floor(deg / 10) + 1;
    notes.push(`Decan ${decan} of ${p.sign} (Chaldean lord: ${chaldeanDecanLord(signIdx, decan)})`);

    // Anaretic 29th degree
    if (deg >= 29) notes.push("ANARETIC 29° — final degree: urgency, mastery-or-crisis expression");
    // Ingress 0°
    if (deg < 1) notes.push("0° ingress degree — raw, unconditioned expression of the sign");

    // Critical degrees (classical lunar-mansion derived)
    const crit = CARDINAL.includes(p.sign) ? [0, 13, 26]
      : FIXED.includes(p.sign) ? [8.5, 21.5]
      : [4, 17];
    for (const c of crit) {
      if (Math.abs(deg - c) <= 1) {
        notes.push(`CRITICAL DEGREE ~${Math.round(c)}° — intensified, fated expression`);
        break;
      }
    }

    return { planet: p.name, notes };
  });
}

// ─── Prompt context builders ──────────────────────────────────────────────────

export function buildVedicContext(chart: ChartData, birthDatetime: string): string {
  const s = toSiderealChart(chart, birthDatetime);
  const lines = s.placements.map(p => {
    const n = p.nakshatra;
    return `${p.name}: ${p.signDegree.toFixed(1)}° ${p.sign} (sidereal), House ${p.house}${p.retrograde ? " Rx" : ""} | ` +
      `Nakshatra: ${n.nakshatra.name} pada ${n.pada} (lord ${n.nakshatra.lord}, deity ${n.nakshatra.deity}, ` +
      `"${n.nakshatra.nature}") | Navamsa: ${n.navamsaSign}`;
  });
  const an = s.ascendant.nakshatra;
  return `SIDEREAL (VEDIC) CHART — Lahiri ayanamsa ${s.ayanamsa.toFixed(2)}°:
Lagna (Ascendant): ${s.ascendant.signDegree.toFixed(1)}° ${s.ascendant.sign} | Nakshatra: ${an.nakshatra.name} pada ${an.pada} (lord ${an.nakshatra.lord})

PLACEMENTS:
${lines.join("\n")}`;
}

export function buildDegreeContext(chart: ChartData): string {
  const lines = degreeTestimonies(chart).map(t =>
    `${t.planet} @ ${chart.planets.find(p => p.name === t.planet)?.signDegree.toFixed(1)}°: ${t.notes.join(" · ")}`
  );
  return `WESTERN DEGREE-LEVEL TESTIMONY (tropical):
${lines.join("\n")}`;
}
