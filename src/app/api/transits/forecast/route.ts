import { NextRequest, NextResponse } from "next/server";
import { calculateCurrentSky } from "@/lib/astrology/calculator";
import type { ChartData, PlanetName, ZodiacSign } from "@/lib/astrology/types";
import type { TransitAspectType } from "@/lib/astrology/transits";

export const maxDuration = 60;

export interface ForecastEvent {
  date: string;
  type: "aspect" | "ingress" | "station";
  transitPlanet: PlanetName;
  transitRetrograde: boolean;
  aspectType?: TransitAspectType;
  natalPlanet?: PlanetName;
  natalHouse?: number;
  natalSign?: ZodiacSign;
  significance: "major" | "standard" | "minor";
  fromSign?: ZodiacSign;
  toSign?: ZodiacSign;
  theme?: string;
}

const ASPECT_DEFS: { type: TransitAspectType; angle: number; orb: number }[] = [
  { type: "conjunction", angle: 0,   orb: 2 },
  { type: "opposition",  angle: 180, orb: 2 },
  { type: "trine",       angle: 120, orb: 1.5 },
  { type: "square",      angle: 90,  orb: 1.5 },
  { type: "sextile",     angle: 60,  orb: 1 },
  { type: "quincunx",    angle: 150, orb: 0.5 },
];

const OUTER = new Set<PlanetName>(["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]);
const KEY_NATAL = new Set<PlanetName>(["Sun", "Moon"]);

const PLANET_THEMES: Partial<Record<PlanetName, string>> = {
  Sun: "identity", Moon: "emotions", Mercury: "mind", Venus: "love & values",
  Mars: "drive", Jupiter: "expansion", Saturn: "discipline",
  Uranus: "liberation", Neptune: "dissolution", Pluto: "transformation",
  NorthNode: "destiny", Chiron: "healing",
};

const ASPECT_VERB: Record<TransitAspectType, string> = {
  conjunction: "merges with",
  opposition: "opposes",
  trine: "harmonizes with",
  square: "clashes with",
  sextile: "opens doors to",
  quincunx: "adjusts",
};

function buildTheme(t: PlanetName, a: TransitAspectType, n: PlanetName): string {
  const tt = PLANET_THEMES[t] ?? t.toLowerCase();
  const nt = PLANET_THEMES[n] ?? n.toLowerCase();
  return `${tt} ${ASPECT_VERB[a]} natal ${nt}`;
}

function angDist(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function getSig(
  transitPlanet: PlanetName,
  eventType: "aspect" | "ingress" | "station",
  natalPlanet?: PlanetName,
  aspectType?: TransitAspectType,
): "major" | "standard" | "minor" {
  if (eventType === "station") return "major";
  if (eventType === "ingress") return OUTER.has(transitPlanet) ? "standard" : "minor";
  if (!natalPlanet || !aspectType) return "minor";
  const hardAspect = ["conjunction", "opposition", "square"].includes(aspectType);
  if (OUTER.has(transitPlanet) && KEY_NATAL.has(natalPlanet)) return "major";
  if (OUTER.has(transitPlanet)) return "standard";
  if (KEY_NATAL.has(natalPlanet) && hardAspect) return "standard";
  return "minor";
}

export async function POST(req: NextRequest) {
  try {
    const { natal, months, customerId } = await req.json() as { natal: ChartData; months: number; customerId?: string };

    // Pro-gate
    const { isPro } = await import("@/lib/subscription");
    if (!isPro(customerId ?? null)) {
      return NextResponse.json({ error: "pro_required" }, { status: 403 });
    }

    if (!natal) {
      return NextResponse.json({ error: "natal chart required" }, { status: 400 });
    }

    const days = Math.round((months || 3) * 30.44);
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const events: ForecastEvent[] = [];

    // Rolling 3-day window: prev / curr / next
    // Initialize from day -1 (for ingress/station baseline) and day 0
    let prev = calculateCurrentSky(new Date(today.getTime() - 86400000));
    let curr = calculateCurrentSky(today);

    // Ingress/station baseline: track signs and retrograde state as of yesterday
    const lastSign = new Map<PlanetName, ZodiacSign>();
    const lastRx   = new Map<PlanetName, boolean>();
    for (const p of prev) {
      lastSign.set(p.name as PlanetName, p.sign as ZodiacSign);
      lastRx.set(p.name as PlanetName, p.retrograde);
    }

    for (let d = 0; d <= days; d++) {
      const date    = new Date(today.getTime() + d * 86400000);
      const dateStr = date.toISOString().split("T")[0];
      const next    = calculateCurrentSky(new Date(today.getTime() + (d + 1) * 86400000));

      for (const tp of curr) {
        const tName = tp.name as PlanetName;

        // ── Retrograde stations ────────────────────────────────────────────────
        const prevRx = lastRx.get(tName);
        if (prevRx !== undefined && prevRx !== tp.retrograde) {
          events.push({
            date: dateStr,
            type: "station",
            transitPlanet: tName,
            transitRetrograde: tp.retrograde,
            significance: "major",
            theme: tp.retrograde ? `${tName} stations retrograde` : `${tName} stations direct`,
          });
        }
        lastRx.set(tName, tp.retrograde);

        // ── Sign ingresses ─────────────────────────────────────────────────────
        const prevSig = lastSign.get(tName);
        if (prevSig && prevSig !== (tp.sign as ZodiacSign)) {
          events.push({
            date: dateStr,
            type: "ingress",
            transitPlanet: tName,
            transitRetrograde: tp.retrograde,
            fromSign: prevSig,
            toSign: tp.sign as ZodiacSign,
            significance: getSig(tName, "ingress"),
            theme: `${tName} enters ${tp.sign}`,
          });
          lastSign.set(tName, tp.sign as ZodiacSign);
        }

        // ── Exact aspect hits (local orb minimum) ──────────────────────────────
        const prevTp = prev.find(p => p.name === tName);
        const nextTp = next.find(p => p.name === tName);
        if (!prevTp || !nextTp) continue;

        for (const np of natal.planets) {
          for (const { type: aType, angle, orb: maxOrb } of ASPECT_DEFS) {
            const orbP = Math.abs(angDist(prevTp.longitude, np.longitude) - angle);
            const orbC = Math.abs(angDist(tp.longitude,     np.longitude) - angle);
            const orbN = Math.abs(angDist(nextTp.longitude, np.longitude) - angle);

            if (orbC < orbP && orbC < orbN && orbC <= maxOrb) {
              events.push({
                date: dateStr,
                type: "aspect",
                transitPlanet: tName,
                transitRetrograde: tp.retrograde,
                aspectType: aType,
                natalPlanet: np.name,
                natalHouse: np.house,
                natalSign: np.sign as ZodiacSign,
                significance: getSig(tName, "aspect", np.name, aType),
                theme: buildTheme(tName, aType, np.name),
              });
            }
          }
        }
      }

      prev = curr;
      curr = next;
    }

    events.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ events });
  } catch (e) {
    console.error("[transits/forecast]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
