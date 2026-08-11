import type { ChartData, PlanetName } from "@/lib/astrology/types";
import { PLANET_COLORS } from "@/lib/astrology/astrocartography";
import type { LifeEvent } from "./types";
import type { SkyState } from "./sky-state";

/** Unit-circle (radius=1) x/z for a longitude — matches the orrery's lonToVec3 convention (y=0, z=-sin). */
export function lonToUnitXZ(lon: number): { x: number; z: number } {
  const rad = (lon * Math.PI) / 180;
  return { x: Math.cos(rad), z: -Math.sin(rad) };
}

/** Natal anchor positions keyed exactly like TransitHit.natalPoint: planet names + Ascendant + Midheaven. */
export function natalAnchors(chart: ChartData): Record<string, { x: number; z: number }> {
  const anchors: Record<string, { x: number; z: number }> = {
    Ascendant: lonToUnitXZ(chart.ascendant),
    Midheaven: lonToUnitXZ(chart.midheaven),
  };
  for (const p of chart.planets) anchors[p.name] = lonToUnitXZ(p.longitude);
  return anchors;
}

export interface EventNodePosition {
  eventId: string;
  x: number;
  z: number;
  dominantPlanet: PlanetName | null; // null when the strongest hit is Ascendant/Midheaven (no PLANET_COLORS entry) or there's no valid anchor at all
}

/**
 * Position for one event's lit node: the orb-weighted average of its activated
 * natal points' unit-circle positions (weight = 1/(orb+1), so smaller orb pulls
 * harder; +1 keeps it finite at orb=0). Since it's an average of unit vectors
 * with non-negative weights, the resultant magnitude is always in [0, 1] —
 * concentrated activation (points agree) lands near magnitude 1, spread/
 * conflicting activation lands closer to 0. Falls back to the profection lord's
 * (or dasha/firdaria major's) anchor position when there are no transit hits at
 * all, so no event is ever left unplaced.
 */
export function eventNodePosition(event: LifeEvent, skyState: SkyState, chart: ChartData): EventNodePosition {
  const anchors = natalAnchors(chart);
  const hits = skyState.transitHits.filter(h => h.natalPoint in anchors);

  if (hits.length === 0) {
    const fallbackId = skyState.profection.lordOfYear || skyState.dasha.major || skyState.firdaria.major;
    const pos = anchors[fallbackId] ?? { x: 0, z: 0 };
    const dominantPlanet = fallbackId in PLANET_COLORS ? (fallbackId as PlanetName) : null;
    return { eventId: event.id, x: pos.x, z: pos.z, dominantPlanet };
  }

  let sumX = 0, sumZ = 0, sumW = 0;
  for (const h of hits) {
    const w = 1 / (h.orb + 1);
    const a = anchors[h.natalPoint];
    sumX += a.x * w;
    sumZ += a.z * w;
    sumW += w;
  }
  const strongest = [...hits].sort((a, b) => a.orb - b.orb)[0];
  const dominantPlanet = strongest.natalPoint in PLANET_COLORS ? (strongest.natalPoint as PlanetName) : null;

  return { eventId: event.id, x: sumX / sumW, z: sumZ / sumW, dominantPlanet };
}
