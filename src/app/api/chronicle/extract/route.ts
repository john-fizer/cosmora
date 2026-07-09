import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ExtractedEvent {
  title: string;
  eventType: string;
  startsAt: string;          // YYYY-MM-DD, best guess
  endsAt?: string;
  datePrecision: "exact" | "month" | "year" | "period";
  domains: string[];
  emotionalTone: string[];
  emotionalValence: number;  // -1..1
  emotionalIntensity: number;// 0..1
  peopleNames: string[];     // names as they appear in the text
  confidence: number;        // 0..1 extraction confidence
  sourceText: string;        // the span this event came from
}

export interface ExtractedPerson {
  name: string;
  relationshipType: string;
  matchesExistingId?: string;
}

const EVENT_TYPES = "birth,death,family,parenting,relationship_start,relationship_end,conflict,reconciliation,career_start,career_end,promotion,money,legal,move,travel,education,health,recovery,loss,creative,achievement,decision,identity_shift,spiritual_awakening,dream,synchronicity,song,repeated_pattern,other";

const SYSTEM = `You are the Reality Engine: you extract structured life events from personal narratives. You separate fact from interpretation. You never invent details not present in the text.

Return ONLY a JSON object, no markdown fences, matching exactly:
{
  "events": [{
    "title": "short factual title",
    "eventType": "one of: ${EVENT_TYPES}",
    "startsAt": "YYYY-MM-DD (use -01 or -01-01 padding for partial dates)",
    "endsAt": "YYYY-MM-DD or omit",
    "datePrecision": "exact | month | year | period",
    "domains": ["subset of: family,identity,career,love,health,money,spirit,creative,home,community"],
    "emotionalTone": ["subset of: love,grief,fear,liberation,pressure,joy,anger,awe,shame,hope"],
    "emotionalValence": -1 to 1,
    "emotionalIntensity": 0 to 1,
    "peopleNames": ["names or roles as written, e.g. 'my ex', 'dad'"],
    "confidence": 0 to 1,
    "sourceText": "the exact phrase(s) from the narrative this event came from"
  }],
  "people": [{ "name": "as written", "relationshipType": "partner|parent|child|sibling|friend|mentor|rival|other", "matchesExistingId": "id if it matches a provided existing person, else omit" }]
}

Confidence ladder: 1.0 exact date stated, 0.8 exact date implied, 0.6 month/year stated, 0.4 approximate life period, 0.2 uncertain memory.
Multiple events per narrative are expected. Emotional values reflect what the narrator expresses, not your judgment.`;

async function callExtraction(text: string, existingPeople: { id: string; name: string }[], previousError?: string): Promise<string> {
  const userMsg = `Existing people (match against these if the narrative mentions them): ${JSON.stringify(existingPeople)}\n\nNarrative:\n${text}${previousError ? `\n\nYour previous response failed to parse: ${previousError}. Return ONLY valid JSON.` : ""}`;
  const resp = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    temperature: 0,
    system: SYSTEM,
    messages: [{ role: "user", content: userMsg }],
  });
  const block = resp.content[0];
  return block.type === "text" ? block.text : "";
}

function parseResult(raw: string): { events: ExtractedEvent[]; people: ExtractedPerson[] } {
  // tolerate accidental code fences
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.events)) throw new Error("missing events array");
  return { events: parsed.events, people: Array.isArray(parsed.people) ? parsed.people : [] };
}

export async function POST(req: NextRequest) {
  try {
    const { text, existingPeople = [] } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return NextResponse.json({ error: "text too short" }, { status: 400 });
    }
    let raw = await callExtraction(text, existingPeople);
    try {
      return NextResponse.json(parseResult(raw));
    } catch (e1) {
      // one retry with the parse error appended
      raw = await callExtraction(text, existingPeople, String(e1));
      try {
        return NextResponse.json(parseResult(raw));
      } catch {
        return NextResponse.json({ error: "extraction failed after retry" }, { status: 502 });
      }
    }
  } catch {
    return NextResponse.json({ error: "extraction request failed" }, { status: 500 });
  }
}
