import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { LocationScore } from "@/lib/astrology/astrocartography";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ReadRequest {
  lat: number;
  lon: number;
  cityHint?: string;
  scores: LocationScore[];
  profileContext?: string; // brief natal chart summary
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ReadRequest;
    const { lat, lon, cityHint, scores, profileContext } = body;

    if (!scores || scores.length === 0) {
      return new Response(JSON.stringify({ error: "no location scores provided" }), { status: 400 });
    }

    const locationLabel = cityHint
      ? cityHint
      : `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;

    const linesSummary = scores
      .slice(0, 5)
      .map(s => `• ${s.planet} ${s.angle} (influence: ${(s.influence * 100).toFixed(0)}%) — ${s.theme.split("—")[0].trim()}`)
      .join("\n");

    const system = `You are Cosmora, a sophisticated astrocartography oracle. You speak with poetic precision — not vague mysticism, but grounded cosmic insight. You give actionable, emotionally resonant readings about how a specific location activates a person's birth chart.

Your readings are structured as:
1. A vivid opening that captures the FEELING of this location for this person (2-3 sentences)
2. The dominant planetary activation and what it means for daily life there (3-4 sentences)
3. Specific opportunities this location offers
4. Any cautions or shadow aspects to navigate
5. A brief timing note — what phase of life this location suits best

Keep the total response under 300 words. Be specific, not generic. Use the planetary lines as your source material.${profileContext ? `\n\nNATAL CONTEXT:\n${profileContext}` : ""}`;

    const userMessage = `Give me an astrocartography reading for ${locationLabel}.

Active planetary lines at this location:
${linesSummary}

Synthesize these influences into a cohesive reading about what life there would feel like — the energetic texture of this place for me personally.`;

    const stream = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system,
      messages: [{ role: "user", content: userMessage }],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    console.error("[astrocartography/read]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
