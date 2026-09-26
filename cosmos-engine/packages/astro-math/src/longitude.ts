export const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

export function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

export function signAndDegree(longitude: number): { sign: string; degreeInSign: number } {
  const normalized = normalizeLongitude(longitude);
  const signIndex = Math.floor(normalized / 30);
  const degreeInSign = normalized - signIndex * 30;
  return { sign: ZODIAC_SIGNS[signIndex], degreeInSign };
}

export function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(normalizeLongitude(a) - normalizeLongitude(b));
  return diff > 180 ? 360 - diff : diff;
}
