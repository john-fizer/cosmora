import { NextRequest } from "next/server";
import type { VoicePlanet } from "@/lib/oracle/voice";
import type { Aspect } from "@/lib/astrology/types";
import { synthesizeWithWaterfall } from "@/lib/oracle/ttsProviders";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { text: string; planet: VoicePlanet; aspects?: Aspect[] };
    const { text, planet, aspects = [] } = body;

    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "text required" }), { status: 400 });
    }

    const { blob, provider } = await synthesizeWithWaterfall(text, planet, aspects);
    const buffer = await blob.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "X-TTS-Provider": provider,
      },
    });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    console.error("[TTS route] all providers failed:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 503 });
  }
}
