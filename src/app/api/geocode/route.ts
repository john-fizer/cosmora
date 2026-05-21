import { NextRequest, NextResponse } from "next/server";

async function fetchTimezone(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`,
      { headers: { "Accept": "application/json" } }
    );
    if (!res.ok) return "UTC";
    const data = await res.json() as { timeZone?: string };
    return data.timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Cosmora/1.0 (astrology app)" },
    });
    const data = await res.json();

    const raw = data as Array<{
      display_name: string;
      lat: string;
      lon: string;
      address?: { country?: string; state?: string; city?: string; town?: string };
    }>;

    // Fetch timezone for each result in parallel
    const results = await Promise.all(
      raw.map(async (r) => {
        const latitude = parseFloat(r.lat);
        const longitude = parseFloat(r.lon);
        const timezone = await fetchTimezone(latitude, longitude);
        return {
          displayName: r.display_name,
          latitude,
          longitude,
          city: r.address?.city ?? r.address?.town ?? "",
          country: r.address?.country ?? "",
          timezone,
        };
      })
    );

    return NextResponse.json(results);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }
}
