import { NextRequest, NextResponse } from "next/server";

// POST /api/reports/feedback
// Receives feedback submission for server-side logging / future DB ingestion.
// Client-side persistence is handled by src/lib/reports/storage.ts (localStorage).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { reportId, profileId, sectionFeedback, overallAccuracy, notes, consentToTrain, qualityFlag } = body;

    if (!reportId || !profileId || !Array.isArray(sectionFeedback) || typeof overallAccuracy !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Future: write to database here
    // For now, acknowledge receipt so the client can confirm server received it
    console.log("[feedback]", {
      reportId,
      profileId,
      overallAccuracy,
      sections: sectionFeedback.length,
      consentToTrain,
      qualityFlag,
      hasNotes: !!notes,
      receivedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
