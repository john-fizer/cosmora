import { angularSeparation } from "./longitude.js";

export const MAJOR_ASPECTS = [
  { type: "conjunction", angle: 0 },
  { type: "sextile", angle: 60 },
  { type: "square", angle: 90 },
  { type: "trine", angle: 120 },
  { type: "opposition", angle: 180 },
] as const;

const DEFAULT_ORB_DEGREES = 8;

export interface AspectHit {
  aspectType: string;
  exactAngle: number;
  actualAngle: number;
  orb: number;
}

export function detectAspect(a: number, b: number): AspectHit | null {
  const actualAngle = angularSeparation(a, b);
  let best: AspectHit | null = null;
  for (const { type, angle } of MAJOR_ASPECTS) {
    const orb = Math.abs(actualAngle - angle);
    if (orb <= DEFAULT_ORB_DEGREES && (best === null || orb < best.orb)) {
      best = { aspectType: type, exactAngle: angle, actualAngle, orb };
    }
  }
  return best;
}
