import { NextRequest, NextResponse } from "next/server";
import { calculateChart, toJulianDay } from "@/lib/astrology/calculator";
import type { HouseSystem } from "@/lib/astrology/types";
import * as Astronomy from "astronomy-engine";

function norm360(a: number): number { return ((a % 360) + 360) % 360; }

// Find the exact JD when the Sun returns to its natal longitude in a given year
function findSolarReturnJD(natalSunLon: number, year: number): number {
  // Start search from Mar 1 of target year (Sun moves ~1°/day, natal lon could be any date)
  const approxDate = new Date(Date.UTC(year, 2, 1)); // Mar 1
  let jd = toJulianDay(approxDate);

  // Coarse pass: step by 1 day to bracket
  let prev = norm360(Astronomy.SunPosition(new Date((jd - 2440587.5) * 86400000)).elon);
  for (let i = 0; i < 370; i++) {
    jd += 1;
    const curr = norm360(Astronomy.SunPosition(new Date((jd - 2440587.5) * 86400000)).elon);
    // Detect crossing (accounting for wrap-around near 0°/360°)
    const diffPrev = norm360(natalSunLon - prev + 180) - 180;
    const diffCurr = norm360(natalSunLon - curr + 180) - 180;
    if (diffPrev * diffCurr <= 0) {
      // Binary search to refine to minute precision
      let lo = jd - 1, hi = jd;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        const midLon = norm360(Astronomy.SunPosition(new Date((mid - 2440587.5) * 86400000)).elon);
        const d = norm360(natalSunLon - midLon + 180) - 180;
        if (Math.sign(d) === Math.sign(diffPrev)) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    }
    prev = curr;
  }
  return jd; // fallback
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { natalSunLon, year, latitude, longitude, timezone, houseSystem } = body;

    if (natalSunLon === undefined || year === undefined || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "natalSunLon, year, latitude, longitude required" }, { status: 400 });
    }

    const srJD = findSolarReturnJD(Number(natalSunLon), Number(year));
    const srDate = new Date((srJD - 2440587.5) * 86400000);

    // Calculate chart for the solar return moment at the specified location
    const birthDate = srDate.toISOString().split("T")[0];
    const h = srDate.getUTCHours().toString().padStart(2, "0");
    const m = srDate.getUTCMinutes().toString().padStart(2, "0");
    const s = srDate.getUTCSeconds().toString().padStart(2, "0");
    const birthTime = `${h}:${m}:${s}`;

    const chart = calculateChart({
      birthDate,
      birthTime,
      latitude: Number(latitude),
      longitude: Number(longitude),
      timezone: timezone || "UTC",
      houseSystem: (houseSystem || "whole_sign") as HouseSystem,
    });

    return NextResponse.json({ chart, srDatetime: srDate.toISOString() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Solar return calculation failed", detail: String(e) }, { status: 500 });
  }
}
