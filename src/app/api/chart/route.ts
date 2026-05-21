import { NextRequest, NextResponse } from "next/server";
import { calculateChart } from "@/lib/astrology/calculator";
import type { HouseSystem } from "@/lib/astrology/types";

async function resolveTimezone(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return "UTC";
    const data = await res.json() as { timeZone?: string };
    return data.timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { birthDate, birthTime, latitude, longitude, timezone, houseSystem } = body;

    if (!birthDate || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "birthDate, latitude, longitude required" }, { status: 400 });
    }

    let tz: string = timezone || "UTC";
    if (tz === "UTC" && (latitude !== 0 || longitude !== 0)) {
      tz = await resolveTimezone(Number(latitude), Number(longitude));
    }

    const chart = calculateChart({
      birthDate,
      birthTime: birthTime || "12:00",
      latitude: Number(latitude),
      longitude: Number(longitude),
      timezone: tz,
      houseSystem: (houseSystem || "whole_sign") as HouseSystem,
    });

    return NextResponse.json(chart);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Chart calculation failed", detail: String(e) }, { status: 500 });
  }
}
