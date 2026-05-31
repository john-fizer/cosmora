import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ChartData } from "@/lib/astrology/types";
import type { ReportType, ReportSection } from "@/lib/reports/types";
import { PLANET_SYMBOLS } from "@/lib/astrology/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Chart context builder (mirrors chat route) ────────────────────────────────

function buildChartContext(chart: ChartData): string {
  const planets = chart.planets.map(pl =>
    `${PLANET_SYMBOLS[pl.name] ?? pl.name} ${pl.name}: ${pl.signDegree.toFixed(1)}° ${pl.sign} H${pl.house}${pl.retrograde ? " Rx" : ""}${pl.dignity ? ` [${pl.dignity}]` : ""}`
  ).join("\n");

  const aspects = chart.aspects.slice(0, 20).map(a =>
    `${a.planet1} ${a.type} ${a.planet2} (${a.orb.toFixed(1)}°${a.exact ? " exact" : ""}${a.applying ? " applying" : ""})`
  ).join("\n");

  const prof = chart.annualProfection;
  const ascSign = chart.houses[0]?.sign ?? "Unknown";

  return `NATAL CHART:
Rising: ${ascSign} | MC: ${chart.midheaven.toFixed(1)}° | Sect: ${chart.sect}
House System: ${chart.houseSystem}

PLANETS:
${planets}

ASPECTS:
${aspects}

TIMING:
Age ${prof.age} | Activated House ${prof.activatedHouse} (${prof.activatedSign}) | Lord of Year: ${prof.lordOfYear}
Lot of Fortune: ${chart.lotOfFortune.toFixed(1)}° | Lot of Spirit: ${chart.lotOfSpirit.toFixed(1)}°`;
}

// ─── Technique definitions per report type ─────────────────────────────────────

interface Technique {
  id: string;
  label: string;
  areaOfLife: string;
  prompt: string;
}

function getTechniques(type: ReportType, chartContext: string, birthYear: number): Technique[] {
  const base = `You are Cosmora, the world's most advanced astrological intelligence. You analyze charts with precision, referencing specific placements. Write in flowing paragraphs — authoritative, specific, never generic. No bullet points. Reference exact degrees and placements.\n\nNATIVE'S CHART:\n${chartContext}`;

  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  const map: Record<ReportType, Technique[]> = {
    natal_delineation: [
      { id: "solar_identity", label: "Sun Sign & House", areaOfLife: "Identity", prompt: `${base}\n\nWrite a precise, deeply specific analysis of this native's Sun — its sign, degree, house position, aspects, and dignity. What is the core solar mission? How does this placement shape their fundamental identity and life purpose? 3–4 paragraphs. Be specific to the exact placements you see.` },
      { id: "lunar_emotional", label: "Moon & Emotional Body", areaOfLife: "Emotions", prompt: `${base}\n\nAnalyze the native's Moon in depth — sign, house, aspects, dignity, phase if discernible. What is their emotional default? What do they need to feel safe? How do their instincts operate? Where do they retreat? 3–4 paragraphs.` },
      { id: "rising_persona", label: "Rising Sign & Persona", areaOfLife: "Expression", prompt: `${base}\n\nAnalyze the Ascendant and chart ruler in depth. How does this native move through the world? What is the mask, the instinctive presentation, the style of engagement? Follow the chart ruler to its house and aspects. 3–4 paragraphs.` },
      { id: "aspect_matrix", label: "Dominant Aspects & Patterns", areaOfLife: "Patterns", prompt: `${base}\n\nIdentify the most significant aspect patterns and configurations in this chart. Stellia, T-squares, grand trines, oppositions that define the chart architecture. What are the dominant tensions and gifts? What story do the aspects tell about this person's core dynamics? 3–4 paragraphs.` },
      { id: "chart_synthesis", label: "Overall Synthesis", areaOfLife: "Synthesis", prompt: `${base}\n\nSynthesize the chart as a whole. What is this person's core archetype? What is their life's central challenge and gift? What does the chart most want to express? Write as a brilliant, grounded astrologer delivering the essential truth about this native — the paragraph someone would frame and read again. 2–3 paragraphs.` },
    ],

    life_pivots: [
      { id: "progressed_luminaries", label: "Progressed Sun & Moon", areaOfLife: "Inner Evolution", prompt: `${base}\n\nAnalyze the native's progressed chart themes. The progressed Sun advances ~1° per year, suggesting where their identity is evolving. The progressed Moon moves ~1 sign per 2.5 years. Based on their current age of ${age}, what phase are the progressed luminaries in? What life chapter are they entering? 3–4 paragraphs.` },
      { id: "outer_transits", label: "Outer Planet Transits", areaOfLife: "Collective Forces", prompt: `${base}\n\nAnalyze which outer planet transits (Saturn, Uranus, Neptune, Pluto) are most significant for this native currently (they are ${age} years old, current year ${currentYear}). What houses and natal planets are these transits activating? What structural changes, breakthroughs, or dissolutions are indicated? 3–4 paragraphs.` },
      { id: "profection_activation", label: "Annual Profection", areaOfLife: "Yearly Theme", prompt: `${base}\n\nDeep dive into this native's annual profection. They are activating House ${(age % 12) + 1} this year, with lord of the year being the chart's relevant ruler. What life area is lit up this year? What themes will dominate? How does the lord of the year's natal condition affect the quality of this year? 3–4 paragraphs.` },
      { id: "pivotal_synthesis", label: "The Turning Point", areaOfLife: "Integration", prompt: `${base}\n\nSynthesize what is being renegotiated in this native's life right now. Where are the bonds loosening — which obligations, identities, relationships, or structures are being released or restructured? What is wanting to be born? Write with the clarity of someone who has seen this pattern before. 3 paragraphs.` },
    ],

    past_lives: [
      { id: "south_node", label: "South Node Lineage", areaOfLife: "Past Life Patterns", prompt: `${base}\n\nAnalyze the South Node in depth — sign, house, ruler, aspects. What did this soul master in prior lifetimes? What familiar territory do they return to compulsively? What gifts are already earned? Write as if reading the soul's prior resume. 3–4 paragraphs.` },
      { id: "twelfth_house", label: "12th House Excavation", areaOfLife: "Hidden Past", prompt: `${base}\n\nExplore the 12th house — its sign, any planets within it, its ruler's placement. What karmic material is stored here? What patterns operate unconsciously? What must be released rather than acted upon? 3–4 paragraphs.` },
      { id: "saturn_karma", label: "Saturn's Karmic Role", areaOfLife: "Debt & Mastery", prompt: `${base}\n\nAnalyze Saturn's position as the great karmic accountant. What debts is this native working off? Where are they building mastery through difficulty? What does Saturn in this sign and house demand? 3 paragraphs.` },
      { id: "north_node_calling", label: "North Node & Soul Direction", areaOfLife: "Soul's Future", prompt: `${base}\n\nAnalyze the North Node — the soul's evolutionary direction. What qualities are underdeveloped and must be cultivated? What feels unfamiliar but necessary? How does the North Node house and sign point toward this life's purpose? 3–4 paragraphs.` },
    ],

    love_life: [
      { id: "venus_natal", label: "Venus: Desire & Beauty", areaOfLife: "Love Nature", prompt: `${base}\n\nAnalyze Venus in depth — sign, house, aspects, dignity. How does this native love? What do they find beautiful and desirable? What do they need to feel valued? How do they attract and what do they attract? 3–4 paragraphs.` },
      { id: "partnership_houses", label: "5th, 7th & 8th House Dynamics", areaOfLife: "Relationship Architecture", prompt: `${base}\n\nAnalyze the 5th house (romance, creative love), 7th house (committed partnership, the kind of partner attracted), and 8th house (depth, merging, transformation through intimacy) together. What pattern emerges about how this native moves through relationship stages? 3–4 paragraphs.` },
      { id: "love_timing", label: "Current Love Transits", areaOfLife: "Timing", prompt: `${base}\n\nFor this native at age ${age} in ${currentYear}: which current transits are activating their love sphere? Any significant transits to Venus, the 5th or 7th house ruler, or across their partnership axis? What window is opening or closing for love? 3 paragraphs.` },
      { id: "love_synthesis", label: "The Relationship Blueprint", areaOfLife: "Synthesis", prompt: `${base}\n\nSynthesize this native's complete love and relationship pattern. What do they keep attracting and why? What wound is playing out in relationships? What would a truly reciprocal relationship look like for them specifically? Be precise, compassionate, and grounded. 3 paragraphs.` },
    ],

    vocation: [
      { id: "mc_career", label: "MC & 10th House", areaOfLife: "Public Role", prompt: `${base}\n\nAnalyze the Midheaven and 10th house in depth — sign, ruler, planets within, aspects to the MC. What is this native's most visible and powerful professional expression? What reputation are they building in the world? 3–4 paragraphs.` },
      { id: "north_node_purpose", label: "North Node & Calling", areaOfLife: "Soul's Purpose", prompt: `${base}\n\nHow does this native's North Node relate to their vocation? What work would feel like destiny rather than a job? Where does the call of the soul align with livelihood? 3 paragraphs.` },
      { id: "jupiter_saturn_career", label: "Jupiter, Saturn & Wealth", areaOfLife: "Expansion & Structure", prompt: `${base}\n\nAnalyze Jupiter (opportunity, abundance, vision) and Saturn (discipline, career mastery, earned status) as they relate to career and wealth. What does Jupiter expand in this native's professional life? What does Saturn demand they master? 3–4 paragraphs.` },
      { id: "vocation_synthesis", label: "The Professional Blueprint", areaOfLife: "Synthesis", prompt: `${base}\n\nSynthesize the vocation picture. What is this native built to do? Where does their natural authority lie? What combination of skills and calling represents their highest professional expression? Give one clear, specific answer. 2–3 paragraphs.` },
    ],

    solar_return: [
      { id: "sr_overview", label: "Solar Return Overview", areaOfLife: "Annual Theme", prompt: `${base}\n\nThe native is ${age} years old in ${currentYear}. Analyze their solar return chart themes. The SR Ascendant, SR ruling planet, and where the Sun falls in the SR chart set the dominant tone for the year. What is the overarching theme of this solar year? 3–4 paragraphs.` },
      { id: "sr_key_planets", label: "Key SR Planet Positions", areaOfLife: "Key Activations", prompt: `${base}\n\nFor this native's solar return year (age ${age}): which natal house areas are most activated? What does the SR Moon (monthly emotional cycle) and SR Mercury (communication themes) indicate? Any SR planets conjunct natal planets? 3–4 paragraphs.` },
      { id: "sr_timing", label: "Quarterly Windows", areaOfLife: "Timing", prompt: `${base}\n\nBreak the solar year into quarterly windows based on lunar cycle and ingress timing. Which quarter (Spring/Summer/Fall/Winter) carries the most significant activation for this native? What should they prioritize and when? 3 paragraphs.` },
    ],

    saturn_return: [
      { id: "natal_saturn", label: "Natal Saturn Placement", areaOfLife: "Saturn's Natal Mandate", prompt: `${base}\n\nAnalyze Saturn's natal placement in depth — sign, house, aspects, dignity. What has Saturn been demanding since birth? What has this native been learning to build with discipline? What is Saturn's foundational theme in this life? 3–4 paragraphs.` },
      { id: "sr_activation", label: "The Return's House Activation", areaOfLife: "The Reckoning", prompt: `${base}\n\nThe Saturn return (approximately ages 27–30 and 56–60) activates Saturn's natal house. For this native at age ${age}: if they are approaching or in a Saturn return, what life area is being completely restructured? What is being tested and what is being consolidated? 3–4 paragraphs.` },
      { id: "sr_harvest", label: "What Must Be Released & What Remains", areaOfLife: "The Harvest", prompt: `${base}\n\nSaturn returns always involve a sorting — what was built on borrowed time collapses, what was built on genuine foundation strengthens. For this native: what structures in their life are due for dissolution? What is genuinely theirs and will survive the return? 3–4 paragraphs.` },
      { id: "sr_synthesis", label: "The New Architecture", areaOfLife: "What Comes Next", prompt: `${base}\n\nAfter the Saturn return, who does this native become? What is the new structure they are building? What authority are they stepping into? Give a visionary but grounded picture of the post-return identity and life architecture. 3 paragraphs.` },
    ],
  };

  return map[type] ?? [];
}

// ─── Run one technique agent ───────────────────────────────────────────────────

async function runTechnique(technique: Technique): Promise<{ technique: Technique; body: string; confidence: number }> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    messages: [{ role: "user", content: technique.prompt }],
  });

  const body = msg.content
    .filter(b => b.type === "text")
    .map(b => (b as { type: "text"; text: string }).text)
    .join("") || "";

  // Confidence: based on how specific the response is (heuristic)
  const hasNumbers = /\d+°|\d+%|house \d/i.test(body);
  const hasPlanetNames = /\b(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)\b/i.test(body);
  const wordCount = body.split(/\s+/).length;
  const confidence = Math.min(0.95, 0.55 + (hasNumbers ? 0.15 : 0) + (hasPlanetNames ? 0.15 : 0) + (wordCount > 200 ? 0.1 : 0));

  return { technique, body, confidence };
}

// ─── Synthesis agent ───────────────────────────────────────────────────────────

async function synthesize(
  type: ReportType,
  results: { technique: Technique; body: string; confidence: number }[],
  chartContext: string
): Promise<{ headline: string; overallConfidence: number }> {
  const summaries = results.map(r => `[${r.technique.label}]\n${r.body.slice(0, 400)}`).join("\n\n---\n\n");

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `You are synthesizing an astrological report of type "${type}" for the following native.\n\nCHART:\n${chartContext}\n\nTECHNIQUE SUMMARIES:\n${summaries}\n\nWrite ONE paragraph (2–3 sentences) that is the essential truth and lede of this entire report — the single most important thing the native needs to understand right now. Precise. Specific to their chart. Unforgettable. Do not start with "I" or "This report". Respond with only the paragraph.`,
    }],
  });

  const headline = msg.content.filter(b => b.type === "text").map(b => (b as { type: "text"; text: string }).text).join("").trim();
  const avgConfidence = results.reduce((a, r) => a + r.confidence, 0) / results.length;

  return { headline, overallConfidence: Math.round(avgConfidence * 100) / 100 };
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      reportType: ReportType;
      chart: ChartData;
      birthDatetime: string;
      profileId: string;
      reportId: string;
    };

    const { reportType, chart, birthDatetime } = body;
    if (!reportType || !chart) {
      return new Response(JSON.stringify({ error: "reportType and chart required" }), { status: 400 });
    }

    const chartContext = buildChartContext(chart);
    const birthYear = new Date(birthDatetime).getFullYear();
    const techniques = getTechniques(reportType, chartContext, birthYear);

    if (!techniques.length) {
      return new Response(JSON.stringify({ error: "Unknown report type" }), { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const emit = (data: object) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        try {
          emit({ type: "start", totalTechniques: techniques.length });

          // ── Phase 1: Run all technique agents in parallel ──────────────────
          const techPromises = techniques.map(async (tech, i) => {
            emit({ type: "technique_start", index: i, label: tech.label, area: tech.areaOfLife });
            const result = await runTechnique(tech);
            emit({ type: "technique_done", index: i, label: tech.label });
            return result;
          });

          const results = await Promise.all(techPromises);

          emit({ type: "synthesizing" });

          // ── Phase 2: Synthesis ─────────────────────────────────────────────
          const { headline, overallConfidence } = await synthesize(reportType, results, chartContext);

          // ── Phase 3: Build section objects ────────────────────────────────
          const sections: ReportSection[] = results.map((r, i) => ({
            id: `sec_${i}_${r.technique.id}`,
            heading: r.technique.label,
            subheading: r.technique.areaOfLife,
            body: r.body,
            confidence: r.confidence,
            technique: r.technique.id,
            areaOfLife: r.technique.areaOfLife,
            convergenceCount: 1,
          }));

          emit({
            type: "complete",
            headline,
            overallConfidence,
            sections,
            techniquesSummary: techniques.map(t => t.label),
          });

        } catch (e) {
          emit({ type: "error", message: String(e) });
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}
