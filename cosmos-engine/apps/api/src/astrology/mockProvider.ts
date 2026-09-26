import { createHash } from "node:crypto";
import { signAndDegree } from "@cosmos-engine/astro-math";
import type { PlanetaryPoint } from "@cosmos-engine/schemas";

const BODIES = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
];

function seedFor(profileId: string, birthDate: string, body: string): number {
  const hash = createHash("sha256").update(`${profileId}:${birthDate}:${body}`).digest();
  // Use the first 4 bytes as an unsigned 32-bit int, map into 0-360 degrees.
  const intValue = hash.readUInt32BE(0);
  return (intValue % 36000) / 100;
}

export function computeMockNatalPoints(profileId: string, birthDate: string): PlanetaryPoint[] {
  return BODIES.map((body) => {
    const zodiacLongitude = seedFor(profileId, birthDate, body);
    const { sign, degreeInSign } = signAndDegree(zodiacLongitude);
    return {
      id: `mock-${profileId}-${body}`,
      body,
      chartContext: "natal" as const,
      timestamp: `${birthDate}T00:00:00Z`,
      zodiacLongitude,
      sign,
      degreeInSign,
      house: null,
      speed: null,
      retrograde: null,
      declination: null,
      rightAscension: null,
    };
  });
}
