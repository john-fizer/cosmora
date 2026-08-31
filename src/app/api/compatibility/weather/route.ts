import { NextRequest, NextResponse } from "next/server";
import { calculateTransits } from "@/lib/astrology/transits";
import type { ChartData } from "@/lib/astrology/types";

// Daily synastry weather: reuses the same transit-to-natal engine
// /dashboard/transits already uses (calculateTransits), run once per
// person against today's real sky. No new aspect math — just calling
// the existing, already-tested engine twice against the same moment.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chartA, chartB, date } = body as { chartA: ChartData; chartB: ChartData; date?: string };

    if (!chartA || !chartB) {
      return NextResponse.json({ error: "chartA and chartB required" }, { status: 400 });
    }

    const transitDate = date ? new Date(date) : new Date();
    const toA = calculateTransits(chartA, transitDate);
    const toB = calculateTransits(chartB, transitDate);

    return NextResponse.json({
      date: transitDate.toISOString(),
      toA: toA.aspects,
      toB: toB.aspects,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Weather calculation failed", detail: String(e) }, { status: 500 });
  }
}
