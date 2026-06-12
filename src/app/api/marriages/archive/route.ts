import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import type { MarriageReading } from "@/lib/storage";

// POST — save a reading to the DB archive
export async function POST(req: NextRequest) {
  try {
    const reading = await req.json() as MarriageReading;
    if (!reading.id || !reading.profileId) {
      return new Response(JSON.stringify({ error: "id and profileId required" }), { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO marriage_readings
        (id, profile_id, generated_at, guide_mode, star_text, final_text, significators)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      reading.id,
      reading.profileId,
      reading.generatedAt,
      reading.guideMode,
      reading.starText,
      reading.finalText,
      JSON.stringify(reading.significators),
    );

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}

// GET — retrieve archive for a profile
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profileId");
    if (!profileId) {
      return new Response(JSON.stringify({ error: "profileId required" }), { status: 400 });
    }

    const db = getDb();
    const rows = db.prepare(`
      SELECT id, profile_id, generated_at, guide_mode, star_text, final_text, significators
      FROM marriage_readings
      WHERE profile_id = ?
      ORDER BY generated_at DESC
      LIMIT 50
    `).all(profileId) as Array<{
      id: string;
      profile_id: string;
      generated_at: string;
      guide_mode: string;
      star_text: string;
      final_text: string;
      significators: string;
    }>;

    const readings: MarriageReading[] = rows.map(r => ({
      id: r.id,
      profileId: r.profile_id,
      generatedAt: r.generated_at,
      guideMode: r.guide_mode as "star" | "spirit",
      starText: r.star_text,
      finalText: r.final_text,
      significators: JSON.parse(r.significators),
    }));

    return new Response(JSON.stringify(readings), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}
