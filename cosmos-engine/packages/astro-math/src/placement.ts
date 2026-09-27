import { normalizeLongitude, angularSeparation } from "./longitude.js";

export interface Placement {
  x: number;
  y: number;
  z: number;
}

export function polarPlacement(longitudeDegrees: number, radius: number, layerDepth: number): Placement {
  const angle = (normalizeLongitude(longitudeDegrees) * Math.PI) / 180;
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
    z: layerDepth,
  };
}

export interface BodyPosition {
  body: string;
  zodiacLongitude: number;
}

export interface NearestBodyResult {
  body: string;
  separation: number;
}

export function nearestBody(targetLongitude: number, bodies: BodyPosition[]): NearestBodyResult {
  let best: NearestBodyResult | null = null;
  for (const candidate of bodies) {
    const separation = angularSeparation(targetLongitude, candidate.zodiacLongitude);
    if (best === null || separation < best.separation) {
      best = { body: candidate.body, separation };
    }
  }
  if (best === null) {
    throw new Error("nearestBody requires at least one candidate body");
  }
  return best;
}
