import { ZODIAC_SIGNS } from "./types";
import type { ChartData, PlanetName, ZodiacSign, Aspect } from "./types";

// ─── Synastry computation ─────────────────────────────────────────────────────

export const ASPECT_ANGLES = [
  { type: "conjunction" as const, angle: 0,   orb: 8, harmony: 0.5 },
  { type: "opposition"  as const, angle: 180, orb: 8, harmony: -0.5 },
  { type: "trine"       as const, angle: 120, orb: 7, harmony: 1 },
  { type: "square"      as const, angle: 90,  orb: 7, harmony: -1 },
  { type: "sextile"     as const, angle: 60,  orb: 5, harmony: 0.8 },
  { type: "quincunx"    as const, angle: 150, orb: 3, harmony: -0.3 },
];

export const PLANET_WEIGHT: Partial<Record<PlanetName, number>> = {
  Sun: 3, Moon: 3, Mercury: 1.5, Venus: 2.5, Mars: 2,
  Jupiter: 1.5, Saturn: 1.5, Uranus: 1, Neptune: 1, Pluto: 1,
};

export interface SynastryAspect extends Aspect {
  personAplanet: PlanetName;
  personBplanet: PlanetName;
  harmony: number;
}

export function computeSynastry(chartA: ChartData, chartB: ChartData): SynastryAspect[] {
  const aspects: SynastryAspect[] = [];
  for (const pA of chartA.planets) {
    for (const pB of chartB.planets) {
      let diff = Math.abs(pA.longitude - pB.longitude);
      if (diff > 180) diff = 360 - diff;
      for (const { type, angle, orb, harmony } of ASPECT_ANGLES) {
        const orbVal = Math.abs(diff - angle);
        if (orbVal <= orb) {
          aspects.push({
            planet1: pA.name,
            planet2: pB.name,
            personAplanet: pA.name,
            personBplanet: pB.name,
            type,
            orb: orbVal,
            exact: orbVal < 1,
            applying: pA.speed < pB.speed,
            harmony,
          });
        }
      }
    }
  }
  // Sort: lowest orb first
  return aspects.sort((a, b) => a.orb - b.orb);
}

export function computeScore(aspects: SynastryAspect[]): {
  total: number;
  harmony: number;
  tension: number;
  breakdown: { category: string; score: number; label: string }[];
} {
  let rawScore = 0;
  let harmonyScore = 0;
  let tensionScore = 0;

  // Weight by planet importance and harmony
  for (const asp of aspects) {
    const wA = PLANET_WEIGHT[asp.personAplanet] ?? 1;
    const wB = PLANET_WEIGHT[asp.personBplanet] ?? 1;
    const weight = Math.sqrt(wA * wB);
    const orbFactor = 1 - asp.orb / 10;
    rawScore += asp.harmony * weight * orbFactor;
    if (asp.harmony > 0) harmonyScore += asp.harmony * weight * orbFactor;
    else tensionScore += Math.abs(asp.harmony) * weight * orbFactor;
  }

  // Normalize to 0–100
  const total = Math.round(Math.min(100, Math.max(0, 50 + rawScore * 5)));

  // Category breakdown (by planet pairs)
  const romantic = aspects.filter(a =>
    (["Venus", "Moon", "Sun"].includes(a.personAplanet) && ["Venus", "Moon", "Sun"].includes(a.personBplanet))
  );
  const intellectual = aspects.filter(a =>
    (["Mercury", "Sun", "Uranus"].includes(a.personAplanet) || ["Mercury", "Sun", "Uranus"].includes(a.personBplanet))
  );
  const growth = aspects.filter(a =>
    (["Jupiter", "Saturn"].includes(a.personAplanet) || ["Jupiter", "Saturn"].includes(a.personBplanet))
  );

  const catScore = (cats: SynastryAspect[]) => {
    let s = 0;
    for (const a of cats) {
      const orbF = 1 - a.orb / 10;
      s += a.harmony * orbF;
    }
    return Math.round(Math.min(100, Math.max(0, 50 + s * 8)));
  };

  return {
    total,
    harmony: Math.round(harmonyScore * 10),
    tension: Math.round(tensionScore * 10),
    breakdown: [
      { category: "Romance", score: catScore(romantic), label: "Love & Attraction" },
      { category: "Mind", score: catScore(intellectual), label: "Mental Connection" },
      { category: "Growth", score: catScore(growth), label: "Expansion & Stability" },
    ],
  };
}

export function getRelationshipArchetype(aspects: SynastryAspect[]): { name: string; description: string; color: string } {
  const scores = { soulBond: 0, romanticFire: 0, karmic: 0, mental: 0, growth: 0 };
  const luminaries = new Set(["Sun", "Moon"]);
  for (const asp of aspects) {
    const pA = asp.personAplanet, pB = asp.personBplanet;
    const w = (1 - asp.orb / 10) * (asp.harmony > 0 ? 1 : 0.5);
    if (luminaries.has(pA) && luminaries.has(pB)) scores.soulBond += w * 2;
    if ((pA === "Venus" && pB === "Mars") || (pA === "Mars" && pB === "Venus")) scores.romanticFire += w * 2;
    if (pA === "Venus" || pB === "Venus") scores.romanticFire += w * 0.5;
    if (pA === "Saturn" || pB === "Saturn") scores.karmic += w;
    if (pA === "Mercury" || pB === "Mercury") scores.mental += w;
    if (pA === "Jupiter" || pB === "Jupiter") scores.growth += w;
  }
  const [top] = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const archMap: Record<string, { name: string; description: string; color: string }> = {
    soulBond:     { name: "Soul Bond",         description: "Deep recognition and emotional attunement — you feel like you've known each other before.", color: "#9C8AC4" },
    romanticFire: { name: "Magnetic Union",     description: "Intense attraction and creative chemistry — a passionate, activating connection.",            color: "#f472b6" },
    karmic:       { name: "Karmic Contract",    description: "This relationship brings lessons, structure, and long-term commitment themes.",              color: "#94a3b8" },
    mental:       { name: "Meeting of Minds",   description: "Intellectual synergy and mutual fascination — you think alike and stimulate each other.",    color: "#06b6d4" },
    growth:       { name: "Growth Partnership", description: "This connection expands your worldview, beliefs, and sense of possibility.",                 color: "#f59e0b" },
  };
  return archMap[top?.[0]] ?? archMap.soulBond;
}

// ─── Composite midpoints ──────────────────────────────────────────────────────

export type CompositePlanet = { name: PlanetName; longitude: number; sign: ZodiacSign; signDegree: number; house: number };

function getLonToHouse(lon: number, houses: ChartData["houses"]): number {
  for (let i = 0; i < houses.length; i++) {
    const curr = houses[i].longitude;
    const next = houses[(i + 1) % 12].longitude;
    if (curr <= next) { if (lon >= curr && lon < next) return i + 1; }
    else { if (lon >= curr || lon < next) return i + 1; }
  }
  return 1;
}

export function computeComposite(chartA: ChartData, chartB: ChartData): CompositePlanet[] {
  return chartA.planets.reduce<CompositePlanet[]>((acc, pA) => {
    const pB = chartB.planets.find(p => p.name === pA.name);
    if (!pB) return acc;
    let mid = (pA.longitude + pB.longitude) / 2;
    if (Math.abs(pA.longitude - pB.longitude) > 180) mid = (mid + 180) % 360;
    mid = ((mid % 360) + 360) % 360;
    const sign = ZODIAC_SIGNS[Math.floor(mid / 30)] as ZodiacSign;
    acc.push({ name: pA.name, longitude: mid, sign, signDegree: mid % 30, house: getLonToHouse(mid, chartA.houses) });
    return acc;
  }, []);
}

// Plain-text description of the strongest synastry aspects, for grounding AI
// prompts in the exact computed aspects rather than letting the model invent them.
export function describeSynastry(aspects: SynastryAspect[], maxItems: number = 15): string {
  if (!aspects.length) return "No synastry aspects found within orb.";
  return aspects.slice(0, maxItems).map(a =>
    `${a.personAplanet} ${a.type} ${a.personBplanet} (orb ${a.orb.toFixed(1)}°${a.exact ? ", exact" : ""}, harmony ${a.harmony > 0 ? "+" : ""}${a.harmony})`
  ).join("\n  ");
}

export function describeComposite(composite: CompositePlanet[]): string {
  if (!composite.length) return "No composite placements computed.";
  return composite.map(p => `${p.name} ${p.sign} ${p.signDegree.toFixed(1)}° H${p.house}`).join("\n  ");
}
