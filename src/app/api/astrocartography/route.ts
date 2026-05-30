import { NextRequest } from "next/server";
import { calculateAstroLines } from "@/lib/astrology/astrocartography";

export async function POST(req: NextRequest) {
  try {
    const { birthDatetime } = await req.json() as { birthDatetime: string };
    if (!birthDatetime) {
      return new Response(JSON.stringify({ error: "birthDatetime required" }), { status: 400 });
    }
    const lines = calculateAstroLines(birthDatetime);
    return new Response(JSON.stringify({ lines }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    console.error("[astrocartography]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
