import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PLANET_SYMBOLS } from "@/lib/astrology/types";
import type { ChartData } from "@/lib/astrology/types";
import { selectSkills, formatSkillsForPrompt } from "@/lib/skills";
import { buildKnowledgeContext } from "@/lib/oracle/knowledge";
import { getModelById, DEFAULT_MODEL_ID } from "@/lib/oracle/models";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Chart context builder ────────────────────────────────────────────────────

function buildChartContext(chart: ChartData): string {
  const p = chart.planets;
  const ascSign = chart.houses[0]?.sign ?? "Unknown";

  const planetSummary = p.map(pl =>
    `${PLANET_SYMBOLS[pl.name] ?? pl.name} ${pl.name}: ${pl.signDegree.toFixed(1)}° ${pl.sign} (House ${pl.house})${pl.retrograde ? " Rx" : ""}${pl.dignity ? ` [${pl.dignity}]` : ""}`
  ).join("\n");

  const aspects = chart.aspects.slice(0, 12).map(a =>
    `${a.planet1} ${a.type} ${a.planet2} (orb ${a.orb.toFixed(1)}°${a.exact ? ", exact" : ""}${a.applying ? ", applying" : ""})`
  ).join("\n");

  const prof = chart.annualProfection;

  return `
CHART SUMMARY:
- Native: ${ascSign} Rising
- Ascendant: ${chart.ascendant.toFixed(1)}° ${ascSign}
- Midheaven: ${chart.midheaven.toFixed(1)}°
- Sect: ${chart.sect} chart
- House System: ${chart.houseSystem}

NATAL PLANETS:
${planetSummary}

KEY ASPECTS:
${aspects}

ANNUAL PROFECTION:
Age ${prof.age}: Activated House ${prof.activatedHouse} (${prof.activatedSign}) — Lord of Year: ${prof.lordOfYear}
Lot of Fortune: ${chart.lotOfFortune.toFixed(1)}° | Lot of Spirit: ${chart.lotOfSpirit.toFixed(1)}°
`.trim();
}

// ─── System prompt ────────────────────────────────────────────────────────────

const COSMORA_IDENTITY = `You are Cosmora — the world's most advanced astrological intelligence, operating from a 2070 cosmic observatory.

Your astrological foundation:
- Sect doctrine (day/night chart distinctions change how malefics and benefics operate)
- Essential dignity (domicile, exaltation, triplicity, detriment, fall, peregrine)
- Annual profections and Lord of the Year timing
- Whole Sign and Placidus house interpretation
- Aspect doctrine: applying vs separating, exact aspects as key signatures
- Hellenistic foundations + psychological modern synthesis

Your voice:
- Precise and grounded, never vague or generic
- You reference SPECIFIC placements from the native's chart
- You distinguish between their natal blueprint and current timing (transits/profections)
- You speak in complete paragraphs — cosmic intelligence doesn't bullet everything
- You give one clear practical takeaway at the end of each reading

GUARDRAILS:
- Never predict death, illness, or specific catastrophe with certainty
- Use symbolic framing: "this pattern can correlate with...", "the symbolism suggests..."
- Respect the native's autonomy — you reveal patterns, not determine destiny

IDENTITY REMINDER:
You are Cosmora, not Claude, not an AI assistant. You are the Oracle of this cosmic interface.`;

// ─── Multi-model stream handler ───────────────────────────────────────────────

async function streamAnthropicResponse(
  model: string,
  system: string,
  messages: Anthropic.MessageParam[],
  maxTokens: number,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const stream = await anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    system,
    messages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
    }
  }
}

async function streamOpenAIResponse(
  model: string,
  system: string,
  messages: Anthropic.MessageParam[],
  maxTokens: number,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = await openai.chat.completions.create({
    model,
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: "system", content: system },
      ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content as string })),
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (text) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
    }
  }
}

async function streamGoogleResponse(
  model: string,
  system: string,
  messages: Anthropic.MessageParam[],
  maxTokens: number,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  if (!process.env.GOOGLE_AI_KEY) throw new Error("GOOGLE_AI_KEY not configured");

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genai = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
  const genModel = genai.getGenerativeModel({
    model,
    systemInstruction: system,
  });

  const history = messages.slice(0, -1).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content as string }],
  }));

  const lastMessage = messages[messages.length - 1];
  const chat = genModel.startChat({ history });
  const result = await chat.sendMessageStream(lastMessage.content as string);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
    }
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      chart,
      history = [],
      modelId = DEFAULT_MODEL_ID,
    } = body as {
      message: string;
      chart?: ChartData;
      history?: { role: "user" | "assistant"; content: string }[];
      modelId?: string;
    };

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Message required" }), { status: 400 });
    }

    const modelConfig = getModelById(modelId);
    const chartContext = chart ? buildChartContext(chart) : "";
    const knowledgeContext = chart ? buildKnowledgeContext(chart, message) : "";
    const skills = selectSkills(message);
    const skillsSection = formatSkillsForPrompt(skills);

    const systemContent = [
      COSMORA_IDENTITY,
      skillsSection,
      knowledgeContext ? `--- ASTROLOGICAL DOCTRINE (use this to ground your response) ---\n${knowledgeContext}\n--- END DOCTRINE ---` : "",
      chartContext ? `--- NATIVE'S NATAL CHART ---\n${chartContext}\n--- END CHART ---` : "",
    ].filter(Boolean).join("\n\n");

    const apiMessages: Anthropic.MessageParam[] = [
      ...history.slice(-12).map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user", content: message },
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (modelConfig.provider === "anthropic") {
            await streamAnthropicResponse(modelConfig.id, systemContent, apiMessages, modelConfig.tokens, controller, encoder);
          } else if (modelConfig.provider === "openai") {
            await streamOpenAIResponse(modelConfig.id, systemContent, apiMessages, modelConfig.tokens, controller, encoder);
          } else if (modelConfig.provider === "google") {
            await streamGoogleResponse(modelConfig.id, systemContent, apiMessages, modelConfig.tokens, controller, encoder);
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Chat failed" }), { status: 500 });
  }
}
