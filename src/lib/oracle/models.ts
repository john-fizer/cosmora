/**
 * Oracle model configuration.
 * Client-safe: no API keys. Server routing handles provider selection.
 */

export type OracleProvider = "anthropic" | "openai" | "google" | "groq";

export interface OracleModel {
  id: string;
  provider: OracleProvider;
  name: string;
  tagline: string;
  description: string;
  speed: "instant" | "fast" | "balanced" | "deep";
  tokens: number;
  icon: string;
  color: string;
  envKey: string;
}

export const ORACLE_MODELS: OracleModel[] = [
  {
    id: "claude-opus-4-7",
    provider: "anthropic",
    name: "Cosmora Oracle",
    tagline: "Deep · Precise · Hellenistic",
    description: "Full depth astrological intelligence. Best for complex readings, timing analysis, and nuanced interpretations.",
    speed: "deep",
    tokens: 2048,
    icon: "✦",
    color: "#a78bfa",
    envKey: "ANTHROPIC_API_KEY",
  },
  {
    id: "claude-sonnet-4-6",
    provider: "anthropic",
    name: "Cosmora Swift",
    tagline: "Fast · Balanced · Modern",
    description: "Same intelligence, 2× faster. Great for daily questions, quick transit checks, and follow-up questions.",
    speed: "balanced",
    tokens: 1500,
    icon: "◉",
    color: "#06b6d4",
    envKey: "ANTHROPIC_API_KEY",
  },
  {
    id: "claude-haiku-4-5-20251001",
    provider: "anthropic",
    name: "Cosmora Flash",
    tagline: "Instant · Focused · Quick",
    description: "Lightning fast. Use for quick lookups, short questions, and when speed matters most.",
    speed: "instant",
    tokens: 800,
    icon: "◈",
    color: "#22c55e",
    envKey: "ANTHROPIC_API_KEY",
  },
  {
    id: "gpt-4o",
    provider: "openai",
    name: "GPT-4 Oracle",
    tagline: "OpenAI · Alternative lens",
    description: "GPT-4o through the Cosmora framework. Offers a different interpretive perspective on the same chart data.",
    speed: "balanced",
    tokens: 1500,
    icon: "◐",
    color: "#f59e0b",
    envKey: "OPENAI_API_KEY",
  },
  {
    id: "gemini-2.0-flash",
    provider: "google",
    name: "Gemini Oracle",
    tagline: "Google · Free tier available",
    description: "Gemini 2.0 Flash via Google AI Studio. Free API key at aistudio.google.com — no credit card needed.",
    speed: "fast",
    tokens: 1200,
    icon: "◑",
    color: "#ef4444",
    envKey: "GOOGLE_AI_KEY",
  },
  {
    id: "llama-3.3-70b-versatile",
    provider: "groq",
    name: "Llama Oracle",
    tagline: "Free · Fast · Open Source",
    description: "Meta Llama 3.3 70B via Groq. Completely free API key at console.groq.com — no credit card needed.",
    speed: "fast",
    tokens: 1200,
    icon: "⬡",
    color: "#f97316",
    envKey: "GROQ_API_KEY",
  },
];

export const DEFAULT_MODEL_ID = "claude-opus-4-7";

export function getModelById(id: string): OracleModel {
  return ORACLE_MODELS.find(m => m.id === id) ?? ORACLE_MODELS[0];
}

export const SPEED_LABELS: Record<OracleModel["speed"], string> = {
  instant: "< 2s",
  fast: "2-5s",
  balanced: "5-12s",
  deep: "10-25s",
};
