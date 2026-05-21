import { NextRequest, NextResponse } from "next/server";
import { calculateTransits } from "@/lib/astrology/transits";
import type { ChartData } from "@/lib/astrology/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { natal, date } = body as { natal: ChartData; date?: string };

    if (!natal) {
      return NextResponse.json({ error: "natal chart required" }, { status: 400 });
    }

    const transitDate = date ? new Date(date) : new Date();
    const transits = calculateTransits(natal, transitDate);
    return NextResponse.json(transits);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Transits calculation failed", detail: String(e) }, { status: 500 });
  }
}
