import { NextRequest, NextResponse } from "next/server";
import type { ChartData } from "@/lib/astrology/types";
import { buildTransitForecast } from "@/lib/astrology/transitForecast";

export const maxDuration = 60;

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

    const events = buildTransitForecast(natal, months);
    return NextResponse.json({ events });
  } catch (e) {
    console.error("[transits/forecast]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
