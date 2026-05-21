import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { lastUserMessage, lastAssistantMessage } = await req.json() as {
      lastUserMessage: string;
      lastAssistantMessage: string;
    };

    if (!lastUserMessage || !lastAssistantMessage) {
      return Response.json({ suggestions: [] });
    }

    const prompt = `You are generating follow-up question suggestions for an astrology chat.

The user just asked: "${lastUserMessage.slice(0, 300)}"

The astrologer just responded: "${lastAssistantMessage.slice(0, 500)}..."

Generate exactly 3 brief, specific follow-up questions the user might want to ask next.
Requirements:
- Each question explores a DIFFERENT angle (e.g., timing, practical application, deeper chart layer, relationship theme)
- Make them specific to the astrological content, not generic
- Keep each question under 12 words
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
