import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ChartData } from "@/lib/astrology/types";
import type { GuideMode } from "@/lib/storage";
import { detectPressure } from "@/lib/astrology/pressureWindows";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

const STAR_SYSTEM = `You are Cosmora — the timing intelligence. You receive a deterministic pressure analysis: independent timing systems (transits, annual profections, zodiacal releasing) that have been cross-checked for convergence. Your job is the briefing a person needs when the sky is heavy:

1. WHAT IS HAPPENING — name the pressure plainly, citing the specific signals (planets, aspects, periods). No softening, no doom.
2. WHAT IT IS FOR — the developmental function of this configuration. Saturn pressure builds structure; loosening of bonds clears expired commitments.
3. THE PROTOCOL — 3 to 5 concrete, dated, actionable directives. Not affirmations: actions. ("Until Saturn separates in March: do not sign long-term agreements"; "Schedule the difficult conversation before the L2 period closes.")
4. WHEN IT EASES — the dates the signals release, and what becomes possible then.

Write in flowing authoritative prose with the protocol as a short numbered list. The Oracle does not hedge. Plain text only — no markdown (**bold**, *asterisks*), it is displayed as-is; emphasize through word choice.`;

const SPIRIT_SYSTEM = `You are Cosm — an intelligence that reads life pressure cycles. You receive a technical timing analysis and translate it into spiritual, jargon-free guidance for someone in a heavy season:

1. Name the season honestly — pressure is real, and it has a purpose.
2. Explain what this pressure is building or clearing in their life.
3. Give 3 to 5 concrete actions with timeframes — practical, grounded directives, not affirmations.
4. Tell them when the weight lifts, using plain dates.

NO astrology terminology: no planet names as causes, no aspects, no houses, no period jargon. Speak of "forces," "cycles," "the current season," "a structure being tested." Warm, direct, unflinching. Plain text only — no markdown (**bold**, *asterisks*); emphasize through word choice.`;

export async function POST(req: NextRequest) {
  try {
    const { chart, birthDatetime, guideMode = "star" } = await req.json() as {
      chart: ChartData; birthDatetime: string; guideMode?: GuideMode;
    };
    if (!chart || !birthDatetime) {
      return new Response(JSON.stringify({ error: "chart and birthDatetime required" }), { status: 400 });
    }

    const report = detectPressure(chart, birthDatetime);

    const signalBlock = report.signals.length
      ? report.signals.map(s =>
          `[${s.source.toUpperCase()}] (weight ${s.weight.toFixed(2)}) ${s.label}\n  ${s.detail}${s.easesBy ? `\n  Releases ~${s.easesBy}` : ""}`
        ).join("\n\n")
      : "No significant pressure signals. All three timing systems read clear.";

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1400,
      system: guideMode === "spirit" ? SPIRIT_SYSTEM : STAR_SYSTEM,
      messages: [{
        role: "user",
        content: `PRESSURE ANALYSIS — ${new Date().toISOString().slice(0, 10)}
Score: ${report.score}/100 · Level: ${report.level.toUpperCase()} · Independent systems in agreement: ${report.activeSources}

SIGNALS:
${signalBlock}

${report.level === "clear"
  ? "The sky is clear. Write a short briefing (2 paragraphs): confirm the open window, what this clear period is FOR, and 2-3 actions to take advantage of it before the next pressure season."
  : "Write the full pressure briefing with protocol."}`,
      }],
    });

    const briefing = msg.content.filter(b => b.type === "text").map(b => (b as { type: "text"; text: string }).text).join("");

    return new Response(JSON.stringify({ ...report, briefing, guideMode }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}
