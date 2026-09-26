import { normalizeLongitude } from "./longitude.js";

/** Near-arc midpoint: the point on the shorter arc between a and b. */
export function midpoint(a: number, b: number): number {
  const normA = normalizeLongitude(a);
  const normB = normalizeLongitude(b);
  const forwardDiff = normalizeLongitude(normB - normA);
  const step = forwardDiff > 180 ? forwardDiff - 360 : forwardDiff;
  return normalizeLongitude(normA + step / 2);
}
