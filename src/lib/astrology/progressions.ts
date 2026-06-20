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
