import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ChartData } from "@/lib/astrology/types";
import { getPersonaById, COSMORA_IDENTITY } from "@/lib/oracle/personas";
import { buildChartContext, DELINEATION_METHODOLOGY } from "@/lib/oracle/chartContext";
import { isPro, getOracleUsageToday, incrementOracleUsage, FREE_ORACLE_DAILY_LIMIT } from "@/lib/subscription";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      prompt: string;
      maxTokens?: number;
      persona?: string;
      customerId?: string;
      chart?: ChartData;
    };

    const { prompt, maxTokens = 400, persona = "oracle", customerId, chart } = body;

    // Rate-gate free users
    if (customerId && !isPro(customerId)) {
      const used = getOracleUsageToday(customerId);
      if (used >= FREE_ORACLE_DAILY_LIMIT) {
        return new Response(
          JSON.stringify({ error: "daily_limit", limit: FREE_ORACLE_DAILY_LIMIT }),
          { status: 429 }
        );
      }
      incrementOracleUsage(customerId);
    }

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "prompt required" }), { status: 400 });
    }

    const personaDef = getPersonaById(persona);
    const baseIdentity = personaDef.chatSystemPrompt || COSMORA_IDENTITY;
    // This route has no tool-use loop (unlike /api/chat), so callers embed
    // chart facts straight into `prompt` — but with no dispositor table or
    // delineation order to follow, the model was free to invent a plausible-
    // sounding starting point instead of the correct one, the same failure
    // mode /api/chat had before its chart-grounding fix. Passing a `chart`
    // now gets the same precomputed dispositor table and methodology.
    const system = chart
      ? `${baseIdentity}\n\n${DELINEATION_METHODOLOGY}\n\n--- NATIVE'S NATAL CHART (this is the real chart on file — ground every claim in it) ---\n${buildChartContext(chart)}\n--- END CHART ---`
      : baseIdentity;

    const stream = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
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
    console.error("[oracle/stream]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
