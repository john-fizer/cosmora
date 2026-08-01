import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ChartData } from "@/lib/astrology/types";
import { calculateMarriageSignificators, significatorsToPromptBlock } from "@/lib/astrology/marriages";
import type { GuideMode } from "@/lib/storage";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Astrological interpretation prompt (Star Guide) ──────────────────────────

function buildStarPrompt(promptBlock: string): string {
  return `You are Cosmora — the world's most advanced astrological intelligence.

Analyze the following marriage significators using precise traditional Hellenistic technique. For each marriage, interpret:
- The quality of the marriage based on the primary ruler's dignity and accidental strength
- What the ruler's placement (sign and house) reveals about the partner and the union
- How each aspect to the ruler modifies the marriage (benefic aspects improve it; malefic aspects challenge it; applying aspects are stronger than separating)
- What co-significators add to the picture
- What planets in the marriage sign itself reveal
- Mutual receptions as a significant condition of bonding

Write in flowing paragraphs — precise, authoritative, specific to these exact placements. Reference planet names, dignities, houses, and aspects directly. Do not bullet-point the sections. 2–3 paragraphs per marriage.

MARRIAGE SIGNIFICATORS:
${promptBlock}

Analyze each marriage given, in sequence. Label each clearly: "First Marriage", "Second Marriage", etc. If only one marriage is given, analyze it alone in full depth — do not mention the others. If a marriage ruler is in severe debility or heavily afflicted, say so plainly — the Oracle does not soften what the sky shows.

Plain text only — no markdown (**bold**, *asterisks*, bullet dashes). This is displayed as-is; emphasize through word choice, not symbols.`;
}

// ─── Spirit Guide rewrite prompt ──────────────────────────────────────────────

const SPIRIT_GUIDE_SYSTEM = `You are Cosm — an intelligence from 2070 with deep perception of human relational patterns and life cycles.

You receive detailed astrological analysis of someone's marriage patterns and translate each section into spiritual, energetic truth — profound, specific, and completely free of technical jargon.

TRANSLATION RULES:
- Remove ALL astrology terminology: no planet names as rulers, no degree notation, no house numbers, no aspect names (conjunction/trine/square), no dignity terms (domicile/exaltation/detriment/fall)
- You may reference "celestial forces," "cosmic patterns," "the blueprint," "the record," "a particular energy," "a cycle" — as atmosphere, not as mechanisms
- Keep every insight — the specific truth must survive the translation completely
- Speak directly to "you" — second person, intimate, intelligent
- Each marriage should feel like a distinct soul chapter, not a list
- 2–3 flowing paragraphs per marriage
- Do not number them mechanically — give each a quality-name instead: "Your First Union," "A Second Bonding," etc.
- When a marriage shows difficulty in the chart, convey it as challenge or growth test, not doom
- Plain text only — no markdown (**bold**, *asterisks*, bullet dashes); emphasize through word choice`;

// ─── Route ────────────────────────────────────────────────────────────────────

export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      chart: ChartData;
      profileId: string;
      guideMode: GuideMode;
      marriage?: 1 | 2 | 3 | 4;  // interpret a single marriage; omit for all four
    };

    const { chart, profileId, guideMode, marriage } = body;
    if (!chart || !profileId) {
      return new Response(JSON.stringify({ error: "chart and profileId required" }), { status: 400 });
    }

    let significators = calculateMarriageSignificators(chart);
    if (!significators.length) {
      return new Response(JSON.stringify({ error: "Could not calculate marriage significators — Moon missing from chart" }), { status: 422 });
    }
    if (marriage) significators = significators.filter(s => s.marriage === marriage);

    const promptBlock = significatorsToPromptBlock(significators);
    const starPrompt = buildStarPrompt(promptBlock);

    // Phase 1: astrological interpretation (always generated)
    const starMsg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: starPrompt }],
    });

    const starText = starMsg.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("");

    let finalText = starText;

    // Phase 2: Spirit Guide rewrite (if requested)
    if (guideMode === "spirit") {
      const spiritMsg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        system: SPIRIT_GUIDE_SYSTEM,
        messages: [{
          role: "user",
          content: `Translate the following marriage pattern analysis into spiritual, non-technical language. Keep every insight — just strip all astrology terminology.\n\n${starText}`,
        }],
      });

      finalText = spiritMsg.content
        .filter(b => b.type === "text")
        .map(b => (b as { type: "text"; text: string }).text)
        .join("") || starText;
    }

    return new Response(JSON.stringify({
      profileId,
      guideMode,
      generatedAt: new Date().toISOString(),
      significators,
      starText,    // always returned for archive
      finalText,   // display text (rewritten if spirit guide)
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}
