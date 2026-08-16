import { NextRequest } from "next/server";
import { createHash } from "crypto";
import type { VoicePlanet } from "@/lib/oracle/voice";
import type { Aspect } from "@/lib/astrology/types";
import { synthesizeWithWaterfall } from "@/lib/oracle/ttsProviders";

// In-memory cache so replaying the same reading doesn't re-bill a TTS
// provider on every play — keyed on exactly what affects the generated
// audio (text + planet + aspects, since aspects shift ElevenLabs voice
// settings). Process-lifetime only (resets on server restart); a small
// LRU cap keeps memory bounded.
const CACHE_LIMIT = 200;
const cache = new Map<string, { buffer: ArrayBuffer; provider: string }>();

function cacheKey(text: string, planet: string, aspects: Aspect[]): string {
  return createHash("sha256").update(JSON.stringify({ text, planet, aspects })).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { text: string; planet: VoicePlanet; aspects?: Aspect[] };
    const { text, planet, aspects = [] } = body;

    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "text required" }), { status: 400 });
    }

    const key = cacheKey(text, planet, aspects);
    const cached = cache.get(key);
    if (cached) {
      // Bump to most-recently-used.
      cache.delete(key);
      cache.set(key, cached);
      return new Response(cached.buffer, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400",
          "X-TTS-Provider": cached.provider,
          "X-TTS-Cache": "hit",
        },
      });
    }

    const { blob, provider } = await synthesizeWithWaterfall(text, planet, aspects);
    const buffer = await blob.arrayBuffer();

    cache.set(key, { buffer, provider });
    if (cache.size > CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }

    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "X-TTS-Provider": provider,
        "X-TTS-Cache": "miss",
      },
    });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    console.error("[TTS route] all providers failed:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 503 });
  }
}
