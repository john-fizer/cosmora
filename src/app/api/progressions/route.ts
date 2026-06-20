import { NextRequest, NextResponse } from "next/server";
import { calculateChart } from "@/lib/astrology/calculator";
import { buildProgressionResult } from "@/lib/astrology/progressions";
import type { HouseSystem } from "@/lib/astrology/types";

export async function POST(req: NextRequest) {
  try {
    const { birthDatetime, latitude, longitude, timezone, houseSystem } = await req.json();
    if (!birthDatetime || latitude == null || longitude == null) {
      return NextResponse.json({ error: "birthDatetime, latitude, longitude required" }, { status: 400 });
    }

    const birth = new Date(birthDatetime);
    if (isNaN(birth.getTime()))
      return NextResponse.json({ error: "Invalid birthDatetime" }, { status: 400 });
    const today = new Date();
    const ageYears = (today.getTime() - birth.getTime()) / (365.25 * 86400000);
    if (ageYears <= 0)
      return NextResponse.json({ error: "birthDatetime must be in the past" }, { status: 400 });

    // Secondary progressions: 1 day after birth = 1 year of life
    const progDate = new Date(birth.getTime() + ageYears * 86400000);
    const progDateISO = progDate.toISOString();

    const [birthDate, birthTimeFull] = birthDatetime.split("T");
    const birthTime = (birthTimeFull || "00:00:00").slice(0, 8);
    const progDateStr = progDateISO.split("T")[0];
    const progTimeStr = progDateISO.split("T")[1].slice(0, 8);

    const hs = (houseSystem || "whole_sign") as HouseSystem;

    // calculateChart is synchronous — do NOT use await or Promise.all
    const natal = calculateChart({
      birthDate,
      birthTime,
      latitude,
      longitude,
      timezone: timezone || "UTC",
      houseSystem: hs,
    });
    const progressed = calculateChart({
      birthDate: progDateStr,
      birthTime: progTimeStr,
      latitude,
      longitude,
      timezone: timezone || "UTC",
      houseSystem: hs,
    });

    const result = buildProgressionResult(natal, progressed, ageYears, progDateISO);
    return NextResponse.json({ result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Progressions calculation failed", detail: String(e) }, { status: 500 });
  }
}
