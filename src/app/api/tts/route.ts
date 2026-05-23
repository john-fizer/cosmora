import { NextRequest } from "next/server";
import { PLANET_VOICES, aspectAwareSettings, type VoicePlanet } from "@/lib/oracle/voice";
import type { Aspect } from "@/lib/astrology/types";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const MODEL_ID = "eleven_v3";
const MAX_CHARS = 3000;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json() as {
      text: string;
      planet: VoicePlanet;
      aspects?: Aspect[];
    };

    const { text, planet, aspects = [] } = body;
    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "text required" }), { status: 400 });
    }

    const profile = PLANET_VOICES[planet];
    if (!profile) {
      return new Response(JSON.stringify({ error: "unknown planet" }), { status: 400 });
    }

    const voice_settings = aspectAwareSettings(profile.settings, aspects);
    const truncated = text.slice(0, MAX_CHARS);

    const elRes = await fetch(
      `${ELEVENLABS_BASE}/text-to-speech/${profile.voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({ text: truncated, model_id: MODEL_ID, voice_settings }),
      }
    );

    if (!elRes.ok) {
      const err = await elRes.text();
      return new Response(JSON.stringify({ error: `ElevenLabs: ${err}` }), {
        status: elRes.status, headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(elRes.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}
