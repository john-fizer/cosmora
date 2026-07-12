export type ChronicleEventType =
  | "birth" | "death" | "family" | "parenting"
  | "relationship_start" | "relationship_end" | "conflict" | "reconciliation"
  | "career_start" | "career_end" | "promotion" | "money" | "legal"
  | "move" | "travel" | "education"
  | "health" | "recovery" | "loss"
  | "creative" | "achievement" | "decision" | "identity_shift"
  | "spiritual_awakening" | "dream" | "synchronicity" | "song" | "repeated_pattern"
  | "other";

export type EdgeType = "echoes" | "follows" | "caused_by" | "part_of";
export type DatePrecision = "exact" | "month" | "year" | "period";

export interface EventLink { eventId: string; type: EdgeType; }

export interface Provenance {
  source: "manual" | "ai_extracted" | "import";
  sourceRef?: string;
  confidence: number; // MTDS ladder — see confidenceForPrecision
}

export interface Reflection {
  id: string;
  date: string;
  text: string;
  outcomeConfirmation?: "confirmed" | "partially" | "did_not_happen";
}

export interface LifeEvent {
  id: string;
  schemaVersion: 1;
  title: string;
  eventType: ChronicleEventType;
  startsAt: string;           // ISO date YYYY-MM-DD
  endsAt?: string;
  datePrecision: DatePrecision;
  location?: { name: string; lat?: number; lon?: number };
  domains: string[];
  emotionalTone: string[];
  emotionalValence: number;   // -1..1
  emotionalIntensity: number; // 0..1
  narrative: string;          // user's verbatim words — never overwritten
  people: string[];           // Person ids
  links: EventLink[];
  reflections: Reflection[];
  provenance: Provenance;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  name: string;
  relationshipType: string;
  birthDate?: string;
}

export interface ChronicleData {
  schemaVersion: 1;
  events: LifeEvent[];
  people: Person[];
}

export const DOMAINS = ["family","identity","career","love","health","money","spirit","creative","home","community"] as const;
export const TONES = ["love","grief","fear","liberation","pressure","joy","anger","awe","shame","hope"] as const;

export const EVENT_TYPE_META: Record<ChronicleEventType, { glyph: string; color: string; label: string }> = {
  birth:               { glyph: "✶", color: "#C8A55B", label: "Birth" },
  death:               { glyph: "✝", color: "#94a3b8", label: "Death" },
  family:              { glyph: "⌂", color: "#38bdf8", label: "Family" },
  parenting:           { glyph: "☽", color: "#BFB6E8", label: "Parenting" },
  relationship_start:  { glyph: "♡", color: "#f472b6", label: "Relationship Start" },
  relationship_end:    { glyph: "♡̸", color: "#fb7185", label: "Relationship End" },
  conflict:            { glyph: "⚔", color: "#ef4444", label: "Conflict" },
  reconciliation:      { glyph: "☌", color: "#4ade80", label: "Reconciliation" },
  career_start:        { glyph: "△", color: "#f59e0b", label: "Career Start" },
  career_end:          { glyph: "▽", color: "#f59e0b", label: "Career End" },
  promotion:           { glyph: "↑", color: "#fbbf24", label: "Promotion" },
  money:               { glyph: "◈", color: "#22c55e", label: "Money" },
  legal:               { glyph: "§", color: "#94a3b8", label: "Legal" },
  move:                { glyph: "⌖", color: "#06b6d4", label: "Move" },
  travel:              { glyph: "✈", color: "#67e8f9", label: "Travel" },
  education:           { glyph: "✎", color: "#a78bfa", label: "Education" },
  health:              { glyph: "✚", color: "#f87171", label: "Health" },
  recovery:            { glyph: "❊", color: "#4ade80", label: "Recovery" },
  loss:                { glyph: "☂", color: "#64748b", label: "Loss" },
  creative:            { glyph: "✧", color: "#e879f9", label: "Creative" },
  achievement:         { glyph: "★", color: "#facc15", label: "Achievement" },
  decision:            { glyph: "⑂", color: "#C8A55B", label: "Decision" },
  identity_shift:      { glyph: "◐", color: "#7B6FD4", label: "Identity Shift" },
  spiritual_awakening: { glyph: "☉", color: "#C8A55B", label: "Spiritual Awakening" },
  dream:               { glyph: "☾", color: "#818cf8", label: "Dream" },
  synchronicity:       { glyph: "∞", color: "#2dd4bf", label: "Synchronicity" },
  song:                { glyph: "♪", color: "#f0abfc", label: "Song" },
  repeated_pattern:    { glyph: "↻", color: "#fb923c", label: "Repeated Pattern" },
  other:               { glyph: "·", color: "#6677AA", label: "Other" },
};

// MTDS confidence ladder (09-Event-Ingestion)
export function confidenceForPrecision(p: DatePrecision): number {
  switch (p) {
    case "exact": return 1.0;
    case "month": return 0.6;
    case "year": return 0.4;
    case "period": return 0.4;
  }
}

export function validateEvent(e: LifeEvent, allEventIds: Set<string>): string[] {
  const errors: string[] = [];
  if (!(e.eventType in EVENT_TYPE_META)) errors.push(`unknown eventType ${e.eventType}`);
  if (!["exact", "month", "year", "period"].includes(e.datePrecision)) errors.push(`unknown datePrecision ${e.datePrecision}`);
  if (!e.title.trim()) errors.push("title empty");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.startsAt)) errors.push("startsAt not ISO date");
  if (e.endsAt && e.endsAt < e.startsAt) errors.push("endsAt before startsAt");
  if (e.emotionalValence < -1 || e.emotionalValence > 1) errors.push("valence out of range");
  if (e.emotionalIntensity < 0 || e.emotionalIntensity > 1) errors.push("intensity out of range");
  for (const l of e.links) if (!allEventIds.has(l.eventId)) errors.push(`link to missing event ${l.eventId}`);
  return errors;
}
