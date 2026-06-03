import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VOICE_HINTS: Record<string, string> = {
  oracle: "Use technical astrological language — placements, aspects, transits, house numbers.",
  guide:  "Use plain English — no jargon. Frame as timing cycles, patterns, or energetic themes.",
  human:  "Write like a real person asking a friend — casual, warm, direct. No astrology terms.",
};

export async function POST(req: NextRequest) {
  try {
    const { lastUserMessage, lastAssistantMessage, persona = "oracle" } = await req.json() as {
      lastUserMessage: string;
      lastAssistantMessage: string;
      persona?: string;
    };

    if (!lastUserMessage || !lastAssistantMessage) {
      return Response.json({ suggestions: [] });
    }

    const voiceHint = VOICE_HINTS[persona] ?? VOICE_HINTS.oracle;

    const prompt = `You are generating follow-up question suggestions for a cosmic guidance chat.

The user just asked: "${lastUserMessage.slice(0, 300)}"

The guide just responded: "${lastAssistantMessage.slice(0, 500)}..."

Generate exactly 3 brief, specific follow-up questions the user might want to ask next.
Requirements:
- Each question explores a DIFFERENT angle (e.g., timing, practical application, deeper pattern, relationship theme)
- Make them specific to the content discussed, not generic
- Keep each question under 12 words
- Voice style: ${voiceHint}
- Do NOT repeat questions similar to what was already asked

Return ONLY a JSON array of 3 strings. No explanation, no numbering, no extra text. Example:
["When does this energy peak this year?", "How does my Saturn placement affect this?", "What can I do to work with this energy?"]`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "[]";
    const match = text.match(/\[[\s\S]*\]/);
    const raw = match ? JSON.parse(match[0]) : [];
    const suggestions = (Array.isArray(raw) ? raw : []).slice(0, 3).map(String);

    return Response.json({ suggestions });
  } catch {
    return Response.json({ suggestions: [] });
  }
}
