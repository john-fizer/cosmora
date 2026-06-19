// ─── Precise line-crossing detection + city activation ────────────────────────
// A city activates only when a planetary line crosses CLOSE to it. Distance is
// measured to the line *segments* (great-circle interior), not just the sampled
// vertices the way scoreLocation does — so "close proximity" is accurate.

import type { AstroLine, AstroLinePlanet, AstroLineAngle } from "./astrocartography";
import { scoreLocation, type LocationScore } from "./astrocartography";
import type { City, Region } from "./cities";

// ─── Energy categories (derived from the dominant crossing planet) ────────────
export type EnergyCategory =
  | "Career" | "Love" | "Wealth" | "Creativity" | "Spirituality" | "Transformation";

export const ENERGY_CATEGORIES: EnergyCategory[] = [
  "Career", "Love", "Wealth", "Creativity", "Spirituality", "Transformation",
];

export const ENERGY_COLORS: Record<EnergyCategory, string> = {
  Career: "#4488FF", Love: "#FF71D1", Wealth: "#FFD700",
  Creativity: "#B06AFF", Spirituality: "#2DFFB3", Transformation: "#FF4040",
};

export const PLANET_TO_CATEGORY: Record<AstroLinePlanet, EnergyCategory> = {
  Sun: "Career", Mercury: "Career", Saturn: "Transformation", Mars: "Transformation",
  Moon: "Love", Venus: "Love",
  Jupiter: "Wealth",
  Uranus: "Creativity",
  Neptune: "Spirituality",
};

// ─── Spherical geometry (unit vectors, radians) ───────────────────────────────
type Vec3 = [number, number, number];

function toVec(latDeg: number, lonDeg: number): Vec3 {
  const lat = (latDeg * Math.PI) / 180, lon = (lonDeg * Math.PI) / 180;
  const cl = Math.cos(lat);
  return [cl * Math.cos(lon), cl * Math.sin(lon), Math.sin(lat)];
}
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
function norm(a: Vec3): Vec3 {
  const m = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / m, a[1] / m, a[2] / m];
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** angular separation between two unit vectors, in radians */
const arc = (a: Vec3, b: Vec3) => Math.acos(clamp(dot(a, b), -1, 1));

/** Angular distance (degrees) from point P to the great-circle segment A→B. */
export function distanceToSegmentDeg(
  pLat: number, pLon: number, aLat: number, aLon: number, bLat: number, bLon: number,
): number {
  const p = toVec(pLat, pLon), a = toVec(aLat, aLon), b = toVec(bLat, bLon);
  const ab = arc(a, b);
  if (ab < 1e-9) return (arc(p, a) * 180) / Math.PI;
  const n = norm(cross(a, b));                 // normal to the great circle through A,B
  // distance from P to the (infinite) great circle
  const offCircle = Math.asin(clamp(Math.abs(dot(p, n)), 0, 1));
  // foot of perpendicular: P projected onto the circle plane
  const f = norm([p[0] - dot(p, n) * n[0], p[1] - dot(p, n) * n[1], p[2] - dot(p, n) * n[2]]);
  // is the foot within the A→B arc? (sum of sub-arcs ≈ whole arc)
  const within = arc(a, f) + arc(f, b) <= ab + 1e-6;
  const d = within ? offCircle : Math.min(arc(p, a), arc(p, b));
  return (d * 180) / Math.PI;
}

export interface NearestCrossing {
  planet: AstroLinePlanet;
  angle: AstroLineAngle;
  distanceDeg: number;
}

/** Nearest planetary line to a point, measured to segment interiors. */
export function nearestCrossing(lines: AstroLine[], lat: number, lon: number): NearestCrossing | null {
  let best: NearestCrossing | null = null;
  for (const line of lines) {
    for (const seg of line.segments) {
      for (let i = 0; i < seg.length - 1; i++) {
        const a = seg[i], b = seg[i + 1];
        const d = distanceToSegmentDeg(lat, lon, a.lat, a.lon, b.lat, b.lon);
        if (!best || d < best.distanceDeg) best = { planet: line.planet, angle: line.angle, distanceDeg: d };
      }
    }
  }
  return best;
}

// ─── Active city = a line crosses close + passes the active filters ───────────
export interface CitySpot {
  city: string;
  lat: number;
  lon: number;
  scores: LocationScore[];
  power: number;
  region?: Region;
  skyline?: { tier: "landmark" | "procedural"; landmark?: City["landmark"]; height: number; density: number };
  category?: EnergyCategory;
  nearestDeg?: number;
}

export interface ActiveCityOpts {
  /** max distance (deg) a line may be from a city to activate it (~1.6° ≈ 175 km) */
  thresholdDeg?: number;
  categories?: Set<EnergyCategory> | null;   // null = all
  planets?: Set<AstroLinePlanet> | null;     // null = all
  angles?: Set<AstroLineAngle> | null;       // null = all
  /** drop a city if a higher-power one is already within this many degrees */
  minSepDeg?: number;
  /** max simultaneous skylines */
  cap?: number;
}

export function activeCities(cities: City[], lines: AstroLine[], opts: ActiveCityOpts = {}): CitySpot[] {
  const {
    thresholdDeg = 1.6, categories = null, planets = null, angles = null,
    minSepDeg = 7, cap = 14,
  } = opts;
  if (!lines.length) return [];

  // Restrict to the lines the user has enabled, so gating respects the filters.
  const activeLines = lines.filter(
    l => (!planets || planets.has(l.planet)) && (!angles || angles.has(l.angle)),
  );
  if (!activeLines.length) return [];

  const candidates: CitySpot[] = [];
  for (const c of cities) {
    const near = nearestCrossing(activeLines, c.lat, c.lon);
    if (!near || near.distanceDeg > thresholdDeg) continue;       // ① must be crossed closely

    const scores = scoreLocation(activeLines, c.lat, c.lon);
    const dominant = scores[0]?.planet ?? near.planet;
    const category = PLANET_TO_CATEGORY[dominant];
    if (categories && !categories.has(category)) continue;        // ② category filter

    const power = Math.min(99, Math.round(scores.reduce((acc, s) => acc + s.influence * 100, 0)));
    candidates.push({
      city: c.name, lat: c.lat, lon: c.lon, scores, power, region: c.region,
      category, nearestDeg: Math.round(near.distanceDeg * 100) / 100,
      skyline: {
        tier: c.landmark ? "landmark" : "procedural",
        landmark: c.landmark, height: c.height, density: c.density,
      },
    });
  }

  // ③ de-clutter: closest crossing wins ties; greedily drop crowded neighbours.
  candidates.sort((a, b) =>
    b.power - a.power || (a.nearestDeg ?? 0) - (b.nearestDeg ?? 0),
  );
  const kept: CitySpot[] = [];
  for (const cand of candidates) {
    const crowded = kept.some(k => {
      const dLat = k.lat - cand.lat;
      let dLon = Math.abs(k.lon - cand.lon); if (dLon > 180) dLon = 360 - dLon;
      const dLonScaled = dLon * Math.cos((cand.lat * Math.PI) / 180);
      return Math.hypot(dLat, dLonScaled) < minSepDeg;
    });
    if (!crowded) kept.push(cand);
    if (kept.length >= cap) break;                                // ④ cap
  }
  return kept;
}
