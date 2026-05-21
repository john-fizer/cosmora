import { calculateCurrentSky } from "./calculator";
import type { PlanetPosition, PlanetName, ZodiacSign, HouseCusp, ChartData } from "./types";

export type TransitAspectType =
  | "conjunction" | "opposition" | "trine" | "square" | "sextile" | "quincunx";

export interface TransitAspect {
  transitPlanet: PlanetName;
  transitSign: ZodiacSign;
  transitLon: number;
  transitRetrograde: boolean;
  natalPlanet: PlanetName;
  natalSign: ZodiacSign;
  natalLon: number;
  natalHouse: number;
  type: TransitAspectType;
  orb: number;
  exact: boolean;
  applying: boolean;
  daysToExact: number | null;
}

export interface Ingress {
  planet: PlanetName;
  fromSign: ZodiacSign;
  toSign: ZodiacSign;
  date: string;
  daysUntil: number;
  retrograde: boolean;
}

export interface TransitsData {
  date: string;
  transitPlanets: PlanetPosition[];
  aspects: TransitAspect[];
  ingresses: Ingress[];
}

const ASPECT_DEFS: { type: TransitAspectType; angle: number; orb: number }[] = [
  { type: "conjunction", angle: 0,   orb: 2 },
  { type: "opposition",  angle: 180, orb: 2 },
  { type: "trine",       angle: 120, orb: 1.5 },
  { type: "square",      angle: 90,  orb: 1.5 },
  { type: "sextile",     angle: 60,  orb: 1 },
  { type: "quincunx",    angle: 150, orb: 0.5 },
];

function angDist(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function houseOfLon(lon: number, houses: HouseCusp[]): number {
  for (let i = 0; i < 12; i++) {
    const cusp = houses[i].longitude;
    const next = houses[(i + 1) % 12].longitude;
    if (next > cusp) {
      if (lon >= cusp && lon < next) return i + 1;
    } else {
      if (lon >= cusp || lon < next) return i + 1;
    }
  }
  return 1;
}

function computeTransitAspects(
  transit: PlanetPosition[],
  natal: PlanetPosition[]
): TransitAspect[] {
  const aspects: TransitAspect[] = [];

  for (const tp of transit) {
    for (const np of natal) {
      const dist = angDist(tp.longitude, np.longitude);

      for (const { type, angle, orb } of ASPECT_DEFS) {
        const orbVal = Math.abs(dist - angle);
        if (orbVal > orb) continue;

        // Applying: tomorrow's orb is smaller than today's
        const tomorrowLon = ((tp.longitude + tp.speed) % 360 + 360) % 360;
        const tomorrowDist = angDist(tomorrowLon, np.longitude);
        const tomorrowOrb = Math.abs(tomorrowDist - angle);
        const applying = tomorrowOrb < orbVal;

        const relSpeed = Math.abs(tp.speed - np.speed);
        const daysToExact =
          applying && relSpeed > 0.001 ? +(orbVal / relSpeed).toFixed(1) : null;

        aspects.push({
          transitPlanet: tp.name,
          transitSign: tp.sign,
          transitLon: tp.longitude,
          transitRetrograde: tp.retrograde,
          natalPlanet: np.name,
          natalSign: np.sign,
          natalLon: np.longitude,
          natalHouse: np.house,
          type,
          orb: +orbVal.toFixed(2),
          exact: orbVal < 0.3,
          applying,
          daysToExact,
        });
      }
    }
  }

  return aspects.sort((a, b) => {
    // Applying before separating, then by orb
    if (a.applying !== b.applying) return a.applying ? -1 : 1;
    return a.orb - b.orb;
  });
}

// Ingress scan config: max days to look ahead per planet
const INGRESS_CONFIG: { planet: PlanetName; maxDays: number }[] = [
  { planet: "Moon",    maxDays: 15 },
  { planet: "Sun",     maxDays: 90 },
  { planet: "Mercury", maxDays: 90 },
  { planet: "Venus",   maxDays: 120 },
  { planet: "Mars",    maxDays: 200 },
  { planet: "Jupiter", maxDays: 400 },
  { planet: "Saturn",  maxDays: 400 },
];

function findUpcomingIngresses(startDate: Date): Ingress[] {
  const ingresses: Ingress[] = [];
  const MAX_DAYS = INGRESS_CONFIG.reduce((m, c) => Math.max(m, c.maxDays), 0);

  const todayPlanets = calculateCurrentSky(startDate);
  const currentSigns = new Map<PlanetName, ZodiacSign>();
  const found = new Map<PlanetName, boolean>();

  for (const { planet } of INGRESS_CONFIG) {
    const p = todayPlanets.find(pl => pl.name === planet);
    if (p) currentSigns.set(planet, p.sign);
    found.set(planet, false);
  }

  for (let day = 1; day <= MAX_DAYS; day++) {
    // Break early if all planets found
    if (INGRESS_CONFIG.every(({ planet, maxDays }) => found.get(planet) || day > maxDays)) break;

    const d = new Date(startDate.getTime() + day * 86400000);
    const planets = calculateCurrentSky(d);

    for (const { planet, maxDays } of INGRESS_CONFIG) {
      if (found.get(planet) || day > maxDays) continue;
      const p = planets.find(pl => pl.name === planet);
      if (!p) continue;
      const prev = currentSigns.get(planet)!;
      if (p.sign !== prev) {
        ingresses.push({
          planet,
          fromSign: prev,
          toSign: p.sign,
          date: d.toISOString().split("T")[0],
          daysUntil: day,
          retrograde: p.retrograde,
        });
        found.set(planet, true);
      }
    }
  }

  return ingresses.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function calculateTransits(natal: ChartData, transitDate: Date = new Date()): TransitsData {
  const raw = calculateCurrentSky(transitDate);

  // Assign the natal house each transiting planet is currently in
  const transitPlanets: PlanetPosition[] = raw.map(p => ({
    ...p,
    house: houseOfLon(p.longitude, natal.houses),
  }));

  const aspects = computeTransitAspects(raw, natal.planets);
  const ingresses = findUpcomingIngresses(transitDate);

  return {
    date: transitDate.toISOString(),
    transitPlanets,
    aspects,
    ingresses,
  };
}
