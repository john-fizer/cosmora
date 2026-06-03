import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getPersonaById, COSMORA_IDENTITY } from "@/lib/oracle/personas";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      prompt: string;
      maxTokens?: number;
      persona?: string;
    };

    const { prompt, maxTokens = 400, persona = "oracle" } = body;

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "prompt required" }), { status: 400 });
    }

    const personaDef = getPersonaById(persona);
    const system = personaDef.chatSystemPrompt || COSMORA_IDENTITY;

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
