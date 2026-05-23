import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PLANET_SYMBOLS } from "@/lib/astrology/types";
import type { ChartData, PlanetName } from "@/lib/astrology/types";
import { buildKnowledgeContext } from "@/lib/oracle/knowledge";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Chart context ────────────────────────────────────────────────────────────

function buildChartContext(chart: ChartData): string {
  const ascSign = chart.houses[0]?.sign ?? "Unknown";
  const planetSummary = chart.planets.map(pl =>
    `${PLANET_SYMBOLS[pl.name as PlanetName] ?? pl.name} ${pl.name}: ${pl.signDegree.toFixed(1)}° ${pl.sign} (H${pl.house})${pl.retrograde ? " Rx" : ""}${pl.dignity ? ` [${pl.dignity}]` : ""}`
  ).join("\n");
  const aspects = chart.aspects.slice(0, 10).map(a =>
    `${a.planet1} ${a.type} ${a.planet2} (${a.orb.toFixed(1)}°${a.exact ? ", exact" : ""})`
  ).join("\n");
  const prof = chart.annualProfection;
  return `
${ascSign} Rising | ${chart.sect} chart | ${chart.houseSystem} houses
Ascendant: ${chart.ascendant.toFixed(1)}° | Midheaven: ${chart.midheaven.toFixed(1)}°

PLANETS:
${planetSummary}

ASPECTS:
${aspects}

TIMING: Age ${prof.age} — House ${prof.activatedHouse} (${prof.activatedSign}) profection, Lord of Year: ${prof.lordOfYear}
`.trim();
}

// ─── Agent system prompts ─────────────────────────────────────────────────────

function claudeSystemPrompt(chartCtx: string, knowledgeCtx: string): string {
  return `You are Cosmora's Claude agent — a Hellenistic/traditional astrology intelligence.

Your approach: sect doctrine, essential dignity, annual profections, applying/separating aspects, Hellenistic house meanings. You weight traditional factors heavily. You speak in complete paragraphs, precisely referencing the native's chart. Be thorough — your response will be compared with another model's analysis.

${knowledgeCtx ? `DOCTRINE:\n${knowledgeCtx}\n` : ""}
CHART:
${chartCtx}

Give your full independent analysis. Do not hedge or be vague. Commit to specific interpretations.`;
}

function llamaSystemPrompt(chartCtx: string): string {
  return `You are Cosmora's Llama agent — a modern psychological astrology intelligence.

Your approach: psychological archetypes, developmental themes, house as life domain rather than fortune, aspects as inner dynamics, Chiron wounds, evolutionary soul purpose. You weight modern/humanistic factors. Reference the chart specifically. Be thorough — your response will be compared with another model's analysis.

CHART:
${chartCtx}

Give your full independent analysis. Do not hedge or be vague. Commit to specific interpretations.`;
}

function synthesisSystemPrompt(): string {
  return `You are Cosmora's synthesis engine. Two independent astrological intelligences — one traditional/Hellenistic, one modern/psychological — have analyzed the same chart question. Synthesize their readings into one definitive oracle response.

STRUCTURE:
1. CONSENSUS — What both analyses agree on. State these as high-confidence, authoritative insights. No hedging.
2. VARIANCE — Where they diverge and why it matters. Don't just list differences — explain what the disagreement reveals about the complexity of this placement or question. This is often the most interesting part.
3. THE ORACLE'S VERDICT — Your synthesized conclusion. Take a position. The native needs clarity, not a both-sides summary. What is the dominant signal from both lenses combined?

Voice: You are Cosmora — precise, cosmic, direct. Write in flowing paragraphs, not bullets. End with one concrete action or awareness the native can carry forward.`;
}

// ─── Run Claude (non-streaming, for parallel research) ────────────────────────

async function runClaude(
  message: string,
  chart: ChartData | undefined,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

  const chartCtx = chart ? buildChartContext(chart) : "";
  const knowledgeCtx = chart ? buildKnowledgeContext(chart, message) : "";
  const system = claudeSystemPrompt(chartCtx, knowledgeCtx);

  const msgs: Anthropic.MessageParam[] = [
    ...history.slice(-8).map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: message },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    system,
    messages: msgs,
  });

  return response.content
    .filter(b => b.type === "text")
    .map(b => (b as Anthropic.TextBlock).text)
    .join("");
}

// ─── Run Llama via Groq (non-streaming, for parallel research) ────────────────

async function runLlama(
  message: string,
  chart: ChartData | undefined,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

  const { default: OpenAI } = await import("openai");
  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const chartCtx = chart ? buildChartContext(chart) : "";
  const system = llamaSystemPrompt(chartCtx);

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1200,
    stream: false,
    messages: [
      { role: "system", content: system },
      ...history.slice(-8).map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user", content: message },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

// ─── Stream synthesis via Claude ──────────────────────────────────────────────

async function streamSynthesis(
  question: string,
  claudeAnalysis: string,
  llamaAnalysis: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const system = synthesisSystemPrompt();
  const userContent = `QUESTION: ${question}

TRADITIONAL/HELLENISTIC ANALYSIS (Claude):
${claudeAnalysis}

MODERN/PSYCHOLOGICAL ANALYSIS (Llama):
${llamaAnalysis}

Synthesize these into the definitive Cosmora oracle response.`;

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: userContent }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
      ));
    }
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      message: string;
      chart?: ChartData;
      history?: { role: "user" | "assistant"; content: string }[];
    };
    const { message, chart, history = [] } = body;

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Message required" }), { status: 400 });
    }

    const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
    const hasGroq = Boolean(process.env.GROQ_API_KEY);

    if (!hasAnthropic && !hasGroq) {
      return new Response(JSON.stringify({ error: "No API keys configured" }), { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // ── Phase 1: parallel research ────────────────────────────────────
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "agent_start", agent: "claude" })}\n\n`
          ));
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "agent_start", agent: "llama" })}\n\n`
          ));

          const [claudeResult, llamaResult] = await Promise.allSettled([
            hasAnthropic ? runClaude(message, chart, history) : Promise.resolve(""),
            hasGroq      ? runLlama(message, chart, history)  : Promise.resolve(""),
          ]);

          const claudeText = claudeResult.status === "fulfilled" ? claudeResult.value : `Error: ${claudeResult.reason}`;
          const llamaText  = llamaResult.status  === "fulfilled" ? llamaResult.value  : `Error: ${llamaResult.reason}`;

          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "agent_done", agent: "claude", text: claudeText })}\n\n`
          ));
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "agent_done", agent: "llama", text: llamaText })}\n\n`
          ));

          // ── Phase 2: synthesis ────────────────────────────────────────────
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "synthesizing" })}\n\n`
          ));

          if (hasAnthropic && claudeText && llamaText) {
            await streamSynthesis(message, claudeText, llamaText, controller, encoder);
          } else {
            // Fallback: just stream whichever we have
            const fallback = claudeText || llamaText;
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ text: fallback })}\n\n`
            ));
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (e) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ error: String(e) })}\n\n`
          ));
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
    return new Response(JSON.stringify({ error: "Dual oracle failed" }), { status: 500 });
  }
}
