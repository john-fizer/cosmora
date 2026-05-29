/**
 * Astrology calculation engine.
 * Planet positions: astronomy-engine (Don Cross, IAU VSOP87 reduced series, arcsecond accuracy).
 * Houses / aspects / lots / profections: Meeus "Astronomical Algorithms" (2nd ed.).
 */

import * as Astronomy from "astronomy-engine";
import {
  ZodiacSign, PlanetName, PlanetPosition, HouseCusp, Aspect,
  ChartData, AnnualProfection,
  ZODIAC_SIGNS, TRADITIONAL_RULERS, DOMICILE, EXALTATION,
  BirthProfile,
} from "./types";

// ─── Utilities ─────────────────────────────────────────────────────────────

export function toJulianDay(utcDate: Date): number {
  let Y = utcDate.getUTCFullYear();
  let M = utcDate.getUTCMonth() + 1;
  const D =
    utcDate.getUTCDate() +
    utcDate.getUTCHours() / 24 +
    utcDate.getUTCMinutes() / 1440 +
    utcDate.getUTCSeconds() / 86400;
  if (M <= 2) { Y -= 1; M += 12; }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
}

function jdToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

function T(jd: number) { return (jd - 2451545.0) / 36525; }

function norm360(a: number): number { return ((a % 360) + 360) % 360; }
function toRad(d: number) { return (d * Math.PI) / 180; }
function toDeg(r: number) { return (r * 180) / Math.PI; }

// ─── Planet positions (astronomy-engine) ───────────────────────────────────

const BODY_MAP: Partial<Record<PlanetName, Astronomy.Body>> = {
  Sun:     Astronomy.Body.Sun,
  Moon:    Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus:   Astronomy.Body.Venus,
  Mars:    Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn:  Astronomy.Body.Saturn,
  Uranus:  Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune,
  Pluto:   Astronomy.Body.Pluto,
};

function bodyEclipticLon(name: PlanetName, date: Date): number {
  if (name === "Sun") {
    return norm360(Astronomy.SunPosition(date).elon);
  }
  const body = BODY_MAP[name];
  if (!body) return 0;
  // GeoVector gives aberration-corrected geocentric equatorial vector;
  // Ecliptic() converts to ecliptic coords — elon is geocentric ecliptic longitude.
  const vec = Astronomy.GeoVector(body, date, true);
  return norm360(Astronomy.Ecliptic(vec).elon);
}

function getPlanetPos(name: PlanetName, jd: number): { lon: number; speed: number; retrograde: boolean } {
  const date = jdToDate(jd);
  const nextDate = jdToDate(jd + 1);
  const lon = bodyEclipticLon(name, date);
  const lonNext = bodyEclipticLon(name, nextDate);
  let speed = lonNext - lon;
  if (speed > 180) speed -= 360;
  if (speed < -180) speed += 360;
  return { lon, speed, retrograde: speed < 0 };
}

// ─── North Node (Meeus formula, accurate to ~0.05°) ────────────────────────

function northNodeLongitude(jd: number): number {
  const t = T(jd);
  return norm360(125.0445479 - 1934.1362608 * t + 0.0020754 * t * t + t * t * t / 467441);
}

// ─── Sidereal Time & Ascendant ─────────────────────────────────────────────

function greenwichSiderealTime(jd: number): number {
  const t = T(jd);
  const theta0 = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * t * t - t * t * t / 38710000;
  return norm360(theta0);
}

function ascendant(jd: number, lat: number, lon: number): number {
  const gst = greenwichSiderealTime(jd);
  const lst = norm360(gst + lon);
  const ramc = toRad(lst);
  const epsilon = toRad(23.4393 - 0.013 * T(jd));
  const latR = toRad(lat);
  const asc = toDeg(Math.atan2(Math.cos(ramc), -(Math.sin(epsilon) * Math.tan(latR) + Math.cos(epsilon) * Math.sin(ramc))));
  return norm360(asc);
}

function midheaven(jd: number, lon: number): number {
  const gst = greenwichSiderealTime(jd);
  const lst = norm360(gst + lon);
  const ramc = toRad(lst);
  const epsilon = toRad(23.4393 - 0.013 * T(jd));
  const mc = toDeg(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(epsilon)));
  return norm360(mc);
}

// ─── House Systems ─────────────────────────────────────────────────────────

function wholeSignHouses(ascLon: number): HouseCusp[] {
  const ascSign = Math.floor(ascLon / 30) * 30;
  return Array.from({ length: 12 }, (_, i) => {
    const lon = norm360(ascSign + i * 30);
    const signIdx = Math.floor(lon / 30);
    return { house: i + 1, longitude: lon, sign: ZODIAC_SIGNS[signIdx], signDegree: lon % 30 };
  });
}

function placidusHouses(jd: number, lat: number, lon: number, ascLon: number, mcLon: number): HouseCusp[] {
  const cusps: HouseCusp[] = [];
  const fixedHouses: Record<number, number> = {
    1: ascLon, 4: norm360(mcLon + 180), 7: norm360(ascLon + 180), 10: mcLon,
  };
  for (let h = 1; h <= 12; h++) {
    let lon360: number;
    if (fixedHouses[h] !== undefined) {
      lon360 = fixedHouses[h];
    } else {
      const frac = ((h - 1) % 3) / 3;
      const q = h <= 6 ? Math.floor((h - 1) / 3) : Math.floor((h - 7) / 3);
      const base = [ascLon, norm360(ascLon + 90), norm360(ascLon + 180), norm360(ascLon + 270)][q];
      lon360 = norm360(base + frac * 90);
    }
    const signIdx = Math.floor(lon360 / 30);
    cusps.push({ house: h, longitude: lon360, sign: ZODIAC_SIGNS[signIdx], signDegree: lon360 % 30 });
  }
  return cusps;
}

function equalHouses(ascLon: number): HouseCusp[] {
  return Array.from({ length: 12 }, (_, i) => {
    const lon = norm360(ascLon + i * 30);
    const signIdx = Math.floor(lon / 30);
    return { house: i + 1, longitude: lon, sign: ZODIAC_SIGNS[signIdx], signDegree: lon % 30 };
  });
}

function porphyryHouses(ascLon: number, mcLon: number): HouseCusp[] {
  const icLon = norm360(mcLon + 180);
  const descLon = norm360(ascLon + 180);
  // Divide each quadrant into 3 equal parts
  const quad1 = (ascLon - icLon + 360) % 360 / 3;
  const quad2 = (mcLon - ascLon + 360) % 360 / 3;
  const cusps: HouseCusp[] = [];
  const angles = [
    icLon,
    norm360(icLon + quad1), norm360(icLon + 2 * quad1),
    ascLon,
    norm360(ascLon + quad2), norm360(ascLon + 2 * quad2),
    mcLon,
    norm360(mcLon + quad1), norm360(mcLon + 2 * quad1),
    descLon,
    norm360(descLon + quad2), norm360(descLon + 2 * quad2),
  ];
  // Re-map to house 1 starting at ASC
  // Standard: H1=ASC, H4=IC, H7=DESC, H10=MC
  const ordered = [ascLon, ...angles.slice(4, 6), mcLon, ...angles.slice(7, 9), descLon, ...angles.slice(1, 3), icLon, ...angles.slice(10, 12)];
  for (let h = 0; h < 12; h++) {
    const lon360 = norm360(ordered[h]);
    cusps.push({ house: h + 1, longitude: lon360, sign: ZODIAC_SIGNS[Math.floor(lon360 / 30)], signDegree: lon360 % 30 });
  }
  return cusps;
}

function houseOf(lon: number, houses: HouseCusp[]): number {
  for (let i = 0; i < 12; i++) {
    const cusp = houses[i].longitude;
    const nextCusp = houses[(i + 1) % 12].longitude;
    if (nextCusp > cusp) {
      if (lon >= cusp && lon < nextCusp) return i + 1;
    } else {
      if (lon >= cusp || lon < nextCusp) return i + 1;
    }
  }
  return 1;
}

// ─── Essential Dignity ─────────────────────────────────────────────────────

function dignity(planet: PlanetName, sign: ZodiacSign): string {
  if (DOMICILE[planet]?.includes(sign)) return "domicile";
  if (EXALTATION[planet] === sign) return "exaltation";
  const domSigns = DOMICILE[planet] ?? [];
  const detriment = domSigns.map(s => ZODIAC_SIGNS[(ZODIAC_SIGNS.indexOf(s) + 6) % 12]);
  if (detriment.includes(sign)) return "detriment";
  const exalt = EXALTATION[planet];
  if (exalt) {
    if (ZODIAC_SIGNS[(ZODIAC_SIGNS.indexOf(exalt) + 6) % 12] === sign) return "fall";
  }
  return "peregrine";
}

// ─── Aspects ───────────────────────────────────────────────────────────────

const ASPECT_ANGLES = [
  { type: "conjunction" as const, angle: 0,   orb: 8 },
  { type: "opposition"  as const, angle: 180, orb: 8 },
  { type: "trine"       as const, angle: 120, orb: 7 },
  { type: "square"      as const, angle: 90,  orb: 7 },
  { type: "sextile"     as const, angle: 60,  orb: 5 },
  { type: "quincunx"    as const, angle: 150, orb: 3 },
];

function computeAspects(planets: PlanetPosition[]): Aspect[] {
  const aspects: Aspect[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];
      let diff = Math.abs(p1.longitude - p2.longitude);
      if (diff > 180) diff = 360 - diff;
      for (const { type, angle, orb } of ASPECT_ANGLES) {
        const orbVal = Math.abs(diff - angle);
        if (orbVal <= orb) {
          aspects.push({
            planet1: p1.name, planet2: p2.name,
            type, orb: orbVal, exact: orbVal < 1, applying: p1.speed < p2.speed,
          });
        }
      }
    }
  }
  return aspects;
}

// ─── Lots ──────────────────────────────────────────────────────────────────

function lotOfFortune(asc: number, sun: number, moon: number, isDay: boolean): number {
  return isDay ? norm360(asc + moon - sun) : norm360(asc + sun - moon);
}

function lotOfSpirit(asc: number, sun: number, moon: number, isDay: boolean): number {
  return isDay ? norm360(asc + sun - moon) : norm360(asc + moon - sun);
}

// ─── Annual Profections ────────────────────────────────────────────────────

export function annualProfection(
  birthDate: Date,
  currentDate: Date,
  ascLon: number
): AnnualProfection {
  const bY = birthDate.getUTCFullYear(), bM = birthDate.getUTCMonth(), bD = birthDate.getUTCDate();
  const cY = currentDate.getUTCFullYear(), cM = currentDate.getUTCMonth(), cD = currentDate.getUTCDate();
  let age = cY - bY;
  if (cM < bM || (cM === bM && cD < bD)) age--;
  const activatedHouse = (age % 12) + 1;
  const ascSignIdx = Math.floor(ascLon / 30);
  const activatedSignIdx = (ascSignIdx + activatedHouse - 1) % 12;
  const activatedSign = ZODIAC_SIGNS[activatedSignIdx];
  const lordOfYear = TRADITIONAL_RULERS[activatedSign];
  return { age, activatedHouse, activatedSign, lordOfYear };
}

// ─── Timezone-aware local→UTC conversion ──────────────────────────────────

function localBirthToUTC(
  year: number, month: number, day: number,
  hour: number, min: number, sec: number,
  timezone: string
): Date {
  const approx = new Date(Date.UTC(year, month - 1, day, hour, min, sec));

  // Handle explicit offset strings: "+05:30" or "-08:00"
  const offsetMatch = timezone.match(/^([+-])(\d{2}):(\d{2})$/);
  if (offsetMatch) {
    const sign = offsetMatch[1] === "+" ? 1 : -1;
    const offsetMin = sign * (parseInt(offsetMatch[2]) * 60 + parseInt(offsetMatch[3]));
    return new Date(approx.getTime() - offsetMin * 60000);
  }

  // Handle IANA timezone names via Intl API (Node.js 16+)
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(approx);
    const tzPart = parts.find(p => p.type === "timeZoneName")?.value ?? "";
    const m = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (m) {
      const sign = m[1] === "+" ? 1 : -1;
      const offsetMin = sign * (parseInt(m[2]) * 60 + (m[3] ? parseInt(m[3]) : 0));
      return new Date(approx.getTime() - offsetMin * 60000);
    }
  } catch {
    // Unknown timezone — treat birth time as UTC
  }

  return approx;
}

// ─── Chaldean decans (Ptolemaic faces) ────────────────────────────────────
// Sequence starting at Aries 0°: Mars Sun Venus Mercury Moon Saturn Jupiter (repeating)
// Each sign has 3 decans (0–9°, 10–19°, 20–29°).

const CHALDEAN_DECAN_ORDER: PlanetName[] = ["Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter"];

function getDecan(lon: number): { decan: number; decanLord: PlanetName } {
  const signIdx = Math.floor(lon / 30);
  const degWithin = lon % 30;
  const decanWithin = Math.floor(degWithin / 10);  // 0, 1, or 2
  const absoluteDecan = signIdx * 3 + decanWithin;
  return {
    decan: decanWithin + 1,
    decanLord: CHALDEAN_DECAN_ORDER[absoluteDecan % 7],
  };
}

// ─── Planet list order ─────────────────────────────────────────────────────

const CHART_PLANETS: PlanetName[] = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
];

// ─── Main chart calculator ─────────────────────────────────────────────────

export function calculateChart(
  profile: Pick<BirthProfile, "birthDate" | "birthTime" | "latitude" | "longitude" | "timezone" | "houseSystem">
): ChartData {
  const [year, month, day] = profile.birthDate.split("-").map(Number);
  const [hour, min, sec] = profile.birthTime.split(":").map(Number);

  const utcDate = localBirthToUTC(year, month, day, hour || 0, min || 0, sec || 0, profile.timezone || "UTC");
  const jd = toJulianDay(utcDate);

  const ascLon = profile.latitude && profile.longitude
    ? ascendant(jd, profile.latitude, profile.longitude)
    : 0;
  const mcLon = profile.latitude && profile.longitude
    ? midheaven(jd, profile.longitude)
    : 0;

  const houses: HouseCusp[] =
    profile.houseSystem === "placidus" ? placidusHouses(jd, profile.latitude, profile.longitude, ascLon, mcLon) :
    profile.houseSystem === "equal"    ? equalHouses(ascLon) :
    profile.houseSystem === "porphyry" ? porphyryHouses(ascLon, mcLon) :
    wholeSignHouses(ascLon);

  const buildPlanet = (name: PlanetName, lon: number, spd: number, retro: boolean): PlanetPosition => {
    const signIdx = Math.floor(lon / 30);
    const sign = ZODIAC_SIGNS[signIdx];
    const { decan, decanLord } = getDecan(lon);
    return {
      name, longitude: lon, sign, signDegree: lon % 30,
      house: houseOf(lon, houses), retrograde: retro, speed: spd,
      dignity: dignity(name, sign), decan, decanLord,
    };
  };

  const planets: PlanetPosition[] = [
    ...CHART_PLANETS.map(name => {
      const { lon, speed, retrograde } = getPlanetPos(name, jd);
      return buildPlanet(name, lon, speed, retrograde);
    }),
    buildPlanet("NorthNode", northNodeLongitude(jd), -0.053, true),
  ];

  const sunLon  = planets.find(p => p.name === "Sun")!.longitude;
  const moonLon = planets.find(p => p.name === "Moon")!.longitude;

  const isDay = (() => {
    // Sun above the horizon = diff >= 180° from ASC going forward through MC to DESC
    // Sun below the horizon (night) = diff 0–180° from ASC going through IC to DESC
    const diff = norm360(sunLon - ascLon);
    return diff >= 180;
  })();
  const sect: "day" | "night" = isDay ? "day" : "night";

  const aspects = computeAspects(planets);
  const fortune = lotOfFortune(ascLon, sunLon, moonLon, isDay);
  const spirit  = lotOfSpirit(ascLon, sunLon, moonLon, isDay);
  const profection = annualProfection(utcDate, new Date(), ascLon);

  return {
    calculatedAt: new Date().toISOString(),
    birthDatetime: utcDate.toISOString(),
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone,
    houseSystem: profile.houseSystem,
    sect,
    ascendant: ascLon,
    midheaven: mcLon,
    planets,
    houses,
    aspects,
    annualProfection: profection,
    lotOfFortune: fortune,
    lotOfSpirit: spirit,
  };
}

// ─── Secondary Progressions (day-for-a-year) ──────────────────────────────

export interface ProgressedPlanet {
  name: PlanetName;
  natalLon: number;
  progressedLon: number;
  sign: ZodiacSign;
  signDegree: number;
  house: number;
  retrograde: boolean;
  movement: number; // degrees moved from natal
}

export function calculateProgressions(
  profile: Pick<BirthProfile, "birthDate" | "birthTime" | "latitude" | "longitude" | "timezone" | "houseSystem">,
  targetDate: Date
): ProgressedPlanet[] {
  const [year, month, day] = profile.birthDate.split("-").map(Number);
  const [hour, min, sec] = profile.birthTime.split(":").map(Number);
  const birthUTC = localBirthToUTC(year, month, day, hour || 0, min || 0, sec || 0, profile.timezone || "UTC");
  const birthJD = toJulianDay(birthUTC);

  // Days from birth to target = years of life = days to progress
  const daysSinceBirth = (targetDate.getTime() - birthUTC.getTime()) / 86400000;
  const progressedJD = birthJD + daysSinceBirth; // 1 day per year

  // Re-compute natal
  const natalPlanets = CHART_PLANETS.map(name => ({
    name,
    lon: getPlanetPos(name, birthJD).lon,
  }));

  const [aY, aM, aD] = profile.birthDate.split("-").map(Number);
  const ascLon = profile.latitude && profile.longitude
    ? ascendant(birthJD, profile.latitude, profile.longitude)
    : 0;
  const houses = wholeSignHouses(ascLon);

  return natalPlanets.map(({ name, lon: natalLon }) => {
    const { lon: pLon, retrograde, speed } = getPlanetPos(name, progressedJD);
    const movement = norm360(pLon - natalLon + 180) - 180;
    const signIdx = Math.floor(pLon / 30);
    const sign = ZODIAC_SIGNS[signIdx];
    return {
      name,
      natalLon,
      progressedLon: pLon,
      sign,
      signDegree: pLon % 30,
      house: houseOf(pLon, houses),
      retrograde,
      movement,
    };
  });
}

// ─── Firdaria (Hellenistic time lords) ────────────────────────────────────

export interface FirdarPeriod {
  lord: PlanetName;
  subLord: PlanetName | null;
  start: Date;
  end: Date;
  years: number;
  isCurrent: boolean;
  isPast: boolean;
  isMainPeriod: boolean;
}

// Day sect firdaria order and years
const DAY_FIRDARIA: Array<{ lord: PlanetName; years: number }> = [
  { lord: "Sun", years: 10 }, { lord: "Venus", years: 8 },
  { lord: "Mercury", years: 13 }, { lord: "Moon", years: 9 },
  { lord: "Saturn", years: 11 }, { lord: "Jupiter", years: 12 },
  { lord: "Mars", years: 7 }, { lord: "NorthNode", years: 3 },
  // NorthNode sub-period bridging, then cycle repeats
];

const NIGHT_FIRDARIA: Array<{ lord: PlanetName; years: number }> = [
  { lord: "Moon", years: 9 }, { lord: "Saturn", years: 11 },
  { lord: "Mercury", years: 13 }, { lord: "Venus", years: 8 },
  { lord: "Sun", years: 10 }, { lord: "Mars", years: 7 },
  { lord: "Jupiter", years: 12 }, { lord: "NorthNode", years: 3 },
];

// Sub-lord order within each firdar (traditional sequence)
const FIRDAR_SUB_ORDER: PlanetName[] = [
  "Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars",
];

export function calculateFirdaria(birthDatetime: string, isDay: boolean): FirdarPeriod[] {
  const birth = new Date(birthDatetime);
  const today = new Date();
  const sequence = isDay ? DAY_FIRDARIA : NIGHT_FIRDARIA;
  const periods: FirdarPeriod[] = [];

  let cursor = new Date(birth);

  for (const { lord, years } of sequence) {
    const mainEnd = new Date(cursor.getTime() + years * 365.25 * 86400000);

    // Main period
    periods.push({
      lord,
      subLord: null,
      start: new Date(cursor),
      end: new Date(mainEnd),
      years,
      isCurrent: today >= cursor && today < mainEnd,
      isPast: today >= mainEnd,
      isMainPeriod: true,
    });

    // Sub-periods: divide main period among 7 traditional planets starting with lord
    const startIdx = FIRDAR_SUB_ORDER.indexOf(lord as PlanetName);
    const subMs = (mainEnd.getTime() - cursor.getTime()) / 7;
    let subCursor = new Date(cursor);

    for (let i = 0; i < 7; i++) {
      const subLord = FIRDAR_SUB_ORDER[(startIdx + i) % 7];
      const subEnd = new Date(subCursor.getTime() + subMs);
      const actualEnd = subEnd < mainEnd ? subEnd : new Date(mainEnd);
      periods.push({
        lord,
        subLord,
        start: new Date(subCursor),
        end: actualEnd,
        years: subMs / (365.25 * 86400000),
        isCurrent: today >= subCursor && today < actualEnd,
        isPast: today >= actualEnd,
        isMainPeriod: false,
      });
      subCursor = actualEnd;
    }

    cursor = new Date(mainEnd);
  }

  return periods;
}

// ─── Current sky positions ─────────────────────────────────────────────────

export function calculateCurrentSky(date: Date): PlanetPosition[] {
  const jd = toJulianDay(date);

  const buildPlanet = (name: PlanetName, lon: number, spd: number, retro: boolean): PlanetPosition => {
    const signIdx = Math.floor(lon / 30);
    const sign = ZODIAC_SIGNS[signIdx];
    return {
      name, longitude: lon, sign, signDegree: lon % 30,
      house: 0, retrograde: retro, speed: spd,
      dignity: dignity(name, sign),
    };
  };

  return [
    ...CHART_PLANETS.map(name => {
      const { lon, speed, retrograde } = getPlanetPos(name, jd);
      return buildPlanet(name, lon, speed, retrograde);
    }),
    buildPlanet("NorthNode", northNodeLongitude(jd), -0.053, true),
  ];
}
