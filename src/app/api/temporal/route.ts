import Anthropic from "@anthropic-ai/sdk";
import { calculateCurrentSky, annualProfection } from "@/lib/astrology/calculator";
import { calculateTransits } from "@/lib/astrology/transits";
import { buildL1Periods, buildSubPeriods } from "@/lib/astrology/zodiacalReleasing";
import type { ChartData } from "@/lib/astrology/types";
import type { ZRPeriod } from "@/lib/astrology/zodiacalReleasing";

export const maxDuration = 30;

const client = new Anthropic();

interface ParsedWindow {
  startDate: string;   // ISO date
  endDate: string;     // ISO date
  label: string;       // e.g. "Summer of 1999"
  midpointDate: string;
  isPast: boolean;
  isFuture: boolean;
}

async function parseTemporalQuery(query: string, birthDatetime: string): Promise<ParsedWindow> {
  const birthYear = new Date(birthDatetime).getFullYear();
  const today = new Date().toISOString().slice(0, 10);

  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: `You are a date-range parser for an astrology app. Given a natural language time reference, return ONLY a JSON object (no markdown, no explanation).

Rules:
- "summer of 99" → 1999 (assume 20th century for 2-digit years ≥27, else 21st)
- Seasons: spring=Mar-May, summer=Jun-Aug, fall/autumn=Sep-Nov, winter=Dec-Feb
- "early [year]" → Jan-Apr; "mid [year]" → Apr-Aug; "late [year]" → Sep-Dec
- Single year → full year (Jan 1 – Dec 31)
- Single month+year → that full month
- If the date is in the future relative to today (${today}), mark isFuture: true
- If before today, mark isPast: true
- If it straddles today, isPast: false, isFuture: false

Return exact JSON:
{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "label": "human readable label",
  "isPast": boolean,
  "isFuture": boolean
}`,
    messages: [{ role: "user", content: `Parse this time reference: "${query}"\nToday: ${today}\nNative birth year: ${birthYear}` }],
  });

  const text = (res.content[0] as { type: string; text: string }).text.trim();
  const parsed = JSON.parse(text);

  const start = new Date(parsed.startDate);
  const end = new Date(parsed.endDate);
  const mid = new Date((start.getTime() + end.getTime()) / 2);

  return {
    ...parsed,
    midpointDate: mid.toISOString().slice(0, 10),
  };
}

function findZRPeriodAt(lotLon: number, birthDatetime: string, targetDate: Date): {
  l1: ZRPeriod | null;
  l2: ZRPeriod | null;
} {
  const l1periods = buildL1Periods(lotLon, birthDatetime);
  const l1 = l1periods.find(p => p.start <= targetDate && targetDate <= p.end) ?? null;
  if (!l1) return { l1: null, l2: null };

  const l2periods = buildSubPeriods(l1, 2);
  const l2 = l2periods.find(p => p.start <= targetDate && targetDate <= p.end) ?? null;

  return { l1, l2 };
}

export async function POST(req: Request) {
  try {
    const { natal, dateQuery } = await req.json() as { natal: ChartData; dateQuery: string };

    // 1. Parse the date
    const window = await parseTemporalQuery(dateQuery, natal.birthDatetime);
    const midDate = new Date(window.midpointDate);
    const birthDate = new Date(natal.birthDatetime);

    // 2. Sky positions at midpoint
    const skyAtTime = calculateCurrentSky(midDate);

    // 3. Transits to natal at midpoint
    const transitsAtTime = calculateTransits(natal, midDate);

    // 4. Annual profection at that time
    const profection = annualProfection(birthDate, midDate, natal.ascendant);

    // 5. ZR periods at that time
    const lotFortuneLon = natal.lotOfFortune ?? natal.ascendant;
    const lotSpiritLon = natal.lotOfSpirit ?? natal.ascendant;
    const zrFortune = findZRPeriodAt(lotFortuneLon, natal.birthDatetime, midDate);
    const zrSpirit = findZRPeriodAt(lotSpiritLon, natal.birthDatetime, midDate);

    // 6. Top significant transit aspects (outer planets only, sorted by orb)
    const OUTER = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
    const significantAspects = transitsAtTime.aspects
      .filter(a => OUTER.includes(a.transitPlanet) || OUTER.includes(a.natalPlanet))
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 6);

    // 7. All aspects (for full context in reading)
    const allAspects = transitsAtTime.aspects.sort((a, b) => a.orb - b.orb).slice(0, 12);

    return Response.json({
      window,
      profection,
      skyAtTime,
      significantAspects,
      allAspects,
      zrFortune,
      zrSpirit,
    });
  } catch (err) {
    console.error("[temporal]", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
