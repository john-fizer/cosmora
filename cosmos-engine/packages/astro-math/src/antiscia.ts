import { normalizeLongitude } from "./longitude.js";

/** Reflection about the solstitial (Cancer/Capricorn, 90/270 deg) axis. */
export function antiscion(longitude: number): number {
  return normalizeLongitude(180 - longitude);
}

/** Reflection about the equinoctial (Aries/Libra, 0/180 deg) axis. */
export function contraAntiscion(longitude: number): number {
  return normalizeLongitude(360 - longitude);
}
