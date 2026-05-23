import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PLANET_SYMBOLS } from "@/lib/astrology/types";
import type { ChartData, PlanetName } from "@/lib/astrology/types";
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

TOOL USE INSTRUCTIONS:
When you have access to a chart, use the available tools to look up specific data BEFORE giving your reading. This allows you to give a precise, data-grounded response rather than working from memory. Use 1–3 tools per response — don't over-query.

GUARDRAILS:
- Never predict death, illness, or specific catastrophe with certainty
- Use symbolic framing: "this pattern can correlate with...", "the symbolism suggests..."
- Respect the native's autonomy — you reveal patterns, not determine destiny

IDENTITY REMINDER:
You are Cosmora, not Claude, not an AI assistant. You are the Oracle of this cosmic interface.`;

// ─── Oracle tools ─────────────────────────────────────────────────────────────

const ORACLE_TOOLS: Anthropic.Tool[] = [
  {
    name: "check_planet_placement",
    description: "Look up a specific planet's exact placement: sign, degree, house, dignity, retrograde status, and all aspects it makes in the native's chart. Use this before discussing any planet in depth.",
    input_schema: {
      type: "object" as const,
      properties: {
        planet: {
          type: "string",
          description: "The planet to look up (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto)",
        },
      },
      required: ["planet"],
    },
  },
  {
    name: "identify_aspects",
    description: "Get aspects from the chart, optionally filtered by planet or aspect type. Use this to check for major configurations like T-squares, grand trines, or oppositions.",
    input_schema: {
      type: "object" as const,
      properties: {
        planet: { type: "string", description: "Optional: filter aspects involving this planet" },
        aspect_type: {
          type: "string",
          description: "Optional: filter by aspect type (conjunction, opposition, trine, square, sextile)",
        },
      },
    },
  },
  {
    name: "calculate_timing",
    description: "Get the current profection house, lord of the year, and timing significance. Use this for any timing or 'what's happening now' questions.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "assess_chart_pattern",
    description: "Identify major chart configurations: stelliums (3+ planets in one sign/house), grand trines, T-squares, grand crosses, and chart shape. Use this for questions about overall chart energy.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
];

// ─── Tool handlers ────────────────────────────────────────────────────────────

function handleToolCall(
  toolName: string,
  input: Record<string, string>,
  chart: ChartData
): string {
  if (toolName === "check_planet_placement") {
    const name = input.planet ?? "";
    const planet = chart.planets.find(
      p => p.name.toLowerCase() === name.toLowerCase()
    );
    if (!planet) return JSON.stringify({ error: `Planet "${name}" not found in chart` });

    const aspects = chart.aspects.filter(
      a => a.planet1 === planet.name || a.planet2 === planet.name
    );

    return JSON.stringify({
      planet: planet.name,
      symbol: PLANET_SYMBOLS[planet.name as PlanetName] ?? planet.name,
      sign: planet.sign,
      degree: `${planet.signDegree.toFixed(1)}°`,
      house: planet.house,
      retrograde: planet.retrograde,
      dignity: planet.dignity || "peregrine",
      aspects: aspects.map(a => ({
        with: a.planet1 === planet.name ? a.planet2 : a.planet1,
        type: a.type,
        orb: `${a.orb.toFixed(1)}°`,
        exact: a.exact,
        applying: a.applying,
      })),
    });
  }

  if (toolName === "identify_aspects") {
    let aspects = chart.aspects;
    if (input.planet) {
      const p = input.planet;
      aspects = aspects.filter(a => a.planet1 === p || a.planet2 === p);
    }
    if (input.aspect_type) {
      aspects = aspects.filter(a => a.type === input.aspect_type);
    }
    return JSON.stringify({
      count: aspects.length,
      aspects: aspects.slice(0, 15).map(a => ({
        planet1: a.planet1,
        type: a.type,
        planet2: a.planet2,
        orb: `${a.orb.toFixed(1)}°`,
        exact: a.exact,
        applying: a.applying,
      })),
    });
  }

  if (toolName === "calculate_timing") {
    const prof = chart.annualProfection;
    const lordPlanet = chart.planets.find(p => p.name === prof.lordOfYear);
    return JSON.stringify({
      age: prof.age,
      activated_house: prof.activatedHouse,
      activated_sign: prof.activatedSign,
      lord_of_year: prof.lordOfYear,
      lord_sign: lordPlanet?.sign ?? "unknown",
      lord_house: lordPlanet?.house ?? "unknown",
      lord_dignity: lordPlanet?.dignity || "peregrine",
      lord_retrograde: lordPlanet?.retrograde ?? false,
      lot_of_fortune: `${chart.lotOfFortune.toFixed(1)}°`,
      lot_of_spirit: `${chart.lotOfSpirit.toFixed(1)}°`,
    });
  }

  if (toolName === "assess_chart_pattern") {
    const planets = chart.planets;

    // Detect stelliums (3+ planets in same sign or house)
    const signGroups: Record<string, string[]> = {};
    const houseGroups: Record<number, string[]> = {};
    for (const p of planets) {
      signGroups[p.sign] = [...(signGroups[p.sign] ?? []), p.name];
      houseGroups[p.house] = [...(houseGroups[p.house] ?? []), p.name];
    }
    const stelliums = [
      ...Object.entries(signGroups).filter(([, ps]) => ps.length >= 3).map(([sign, ps]) => ({ type: "sign stellium", location: sign, planets: ps })),
      ...Object.entries(houseGroups).filter(([, ps]) => ps.length >= 3).map(([house, ps]) => ({ type: "house stellium", location: `House ${house}`, planets: ps })),
    ];

    // Detect grand trine (3 trine aspects forming a closed loop)
    const trines = chart.aspects.filter(a => a.type === "trine");
    const trineNodes = new Set(trines.flatMap(a => [a.planet1, a.planet2]));
    const hasPotentialGrandTrine = trineNodes.size >= 3 && trines.length >= 3;

    // Detect T-square (opposition + 2 squares to apex)
    const oppositions = chart.aspects.filter(a => a.type === "opposition");
    const squares = chart.aspects.filter(a => a.type === "square");
    const hasTSquare = oppositions.length > 0 && squares.length >= 2;

    // Chart shape (rough)
    const hemisphereE = planets.filter(p => p.house >= 7 && p.house <= 12).length;
    const hemisphereW = planets.length - hemisphereE;
    const shape = hemisphereE > hemisphereW + 2 ? "Eastern emphasis (self-directed)" :
      hemisphereW > hemisphereE + 2 ? "Western emphasis (other-directed)" : "Balanced";

    return JSON.stringify({
      stelliums,
      potential_grand_trine: hasPotentialGrandTrine,
      potential_t_square: hasTSquare,
      opposition_count: oppositions.length,
      square_count: squares.length,
      trine_count: trines.length,
      chart_shape: shape,
      sect: chart.sect,
    });
  }

  return JSON.stringify({ error: "Unknown tool" });
}

// ─── Agentic Anthropic loop (streams text, handles tool calls) ─────────────────

async function agenticAnthropicStream(
  model: string,
  system: string,
  messages: Anthropic.MessageParam[],
  maxTokens: number,
  chart: ChartData | undefined,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const msgs: Anthropic.MessageParam[] = [...messages];
  const tools = chart ? ORACLE_TOOLS : [];
  const MAX_ITERS = 5;

  for (let iter = 0; iter < MAX_ITERS; iter++) {
    // Stream this turn — get text in real time, collect tool blocks
    const stream = anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      system,
      messages: msgs,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? { type: "auto" } : undefined,
    });

    const pendingToolNames = new Map<number, string>();

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        if (event.content_block.type === "tool_use") {
          pendingToolNames.set(event.index, event.content_block.name);
          // Emit tool_call event immediately so UI can show scanning card
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ tool_call: { id: event.content_block.id, name: event.content_block.name } })}\n\n`
          ));
        }
      } else if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta" && event.delta.text) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
          ));
        }
        // input_json_delta events are just tool input streaming — ignore for now
      }
    }

    const finalMsg = await stream.finalMessage();

    if (finalMsg.stop_reason !== "tool_use") break;

    // Build assistant message with all content blocks
    msgs.push({ role: "assistant", content: finalMsg.content });

    // Execute tools and emit results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of finalMsg.content) {
      if (block.type !== "tool_use") continue;
      const result = chart
        ? handleToolCall(block.name, block.input as Record<string, string>, chart)
        : JSON.stringify({ error: "No chart data available" });

      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ tool_result: { id: block.id, name: block.name } })}\n\n`
      ));

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      });
    }

    msgs.push({ role: "user", content: toolResults });
  }
}

// ─── OpenAI stream (unchanged) ────────────────────────────────────────────────

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

// ─── Groq stream (OpenAI-compatible, free tier) ───────────────────────────────

async function streamGroqResponse(
  model: string,
  system: string,
  messages: Anthropic.MessageParam[],
  maxTokens: number,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

  const { default: OpenAI } = await import("openai");
  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const stream = await groq.chat.completions.create({
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

// ─── Google stream (unchanged) ────────────────────────────────────────────────

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
  const genModel = genai.getGenerativeModel({ model, systemInstruction: system });

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
      knowledgeContext
        ? `--- ASTROLOGICAL DOCTRINE ---\n${knowledgeContext}\n--- END DOCTRINE ---`
        : "",
      chartContext
        ? `--- NATIVE'S NATAL CHART (use tools to look up specifics) ---\n${chartContext}\n--- END CHART ---`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const apiMessages: Anthropic.MessageParam[] = [
      ...history.slice(-12).map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user", content: message },
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (modelConfig.provider === "anthropic") {
            await agenticAnthropicStream(
              modelConfig.id,
              systemContent,
              apiMessages,
              modelConfig.tokens,
              chart,
              controller,
              encoder
            );
          } else if (modelConfig.provider === "openai") {
            await streamOpenAIResponse(modelConfig.id, systemContent, apiMessages, modelConfig.tokens, controller, encoder);
          } else if (modelConfig.provider === "google") {
            await streamGoogleResponse(modelConfig.id, systemContent, apiMessages, modelConfig.tokens, controller, encoder);
          } else if (modelConfig.provider === "groq") {
            await streamGroqResponse(modelConfig.id, systemContent, apiMessages, modelConfig.tokens, controller, encoder);
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
