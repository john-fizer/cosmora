import type { Aspect } from "@/lib/astrology/types";

export type VoicePlanet =
  | "Sun" | "Moon" | "Mercury" | "Venus" | "Mars"
  | "Jupiter" | "Saturn" | "Uranus" | "Neptune";

export interface ElevenLabsVoiceSettings {
  stability: number;          // 0–1  low = expressive, high = consistent
  similarity_boost: number;   // 0–1
  style: number;              // 0–1  exaggeration level
  use_speaker_boost: boolean;
}

export interface PlanetVoiceProfile {
  planet: VoicePlanet;
  symbol: string;
  voiceId: string;       // ElevenLabs voice ID
  voiceName: string;
  gender: "masculine" | "feminine" | "neutral";
  archetype: string;
  description: string;
  color: string;
  settings: ElevenLabsVoiceSettings;
}

// ─── 9 Planet → ElevenLabs voice mappings ────────────────────────────────────
// Saturn/Uranus share cold-authority register (Sam / Thomas)
// Jupiter/Neptune share slow-resonant register (Josh / Domi)

export const PLANET_VOICES: Record<VoicePlanet, PlanetVoiceProfile> = {
  Sun: {
    planet: "Sun", symbol: "☉",
    voiceId: "pNInz6obpgDQGcFmaJgB",   // Adam — deep, powerful, commanding
    voiceName: "Adam",
    gender: "masculine",
    archetype: "The Sovereign",
    description: "Commanding, warm, authoritative — the light that reveals",
    color: "#f59e0b",
    settings: { stability: 0.72, similarity_boost: 0.80, style: 0.18, use_speaker_boost: true },
  },
  Moon: {
    planet: "Moon", symbol: "☽",
    voiceId: "21m00Tcm4TlvDq8ikWAM",   // Rachel — calm, gentle, intuitive
    voiceName: "Rachel",
    gender: "feminine",
    archetype: "The Oracle",
    description: "Soft, intuitive, emotionally resonant — the voice from deep water",
    color: "#c7d2fe",
    settings: { stability: 0.40, similarity_boost: 0.78, style: 0.10, use_speaker_boost: true },
  },
  Mercury: {
    planet: "Mercury", symbol: "☿",
    voiceId: "IKne3meq5aSn9XLyUdCD",   // Charlie — energetic, clear, quick
    voiceName: "Charlie",
    gender: "neutral",
    archetype: "The Messenger",
    description: "Quick, precise, sharp-minded — information at light speed",
    color: "#06b6d4",
    settings: { stability: 0.55, similarity_boost: 0.75, style: 0.28, use_speaker_boost: true },
  },
  Venus: {
    planet: "Venus", symbol: "♀",
    voiceId: "EXAVITQu4vr4xnSDxMaL",   // Bella — soft, warm, melodic
    voiceName: "Bella",
    gender: "feminine",
    archetype: "The Beloved",
    description: "Melodic, seductive, beautifully balanced — beauty made sound",
    color: "#f472b6",
    settings: { stability: 0.65, similarity_boost: 0.80, style: 0.13, use_speaker_boost: true },
  },
  Mars: {
    planet: "Mars", symbol: "♂",
    voiceId: "VR6AewLTigWG4xSOukaG",   // Arnold — crisp, forceful, intense
    voiceName: "Arnold",
    gender: "masculine",
    archetype: "The Warrior",
    description: "Direct, forceful, cuts straight to the truth — no hesitation",
    color: "#ef4444",
    settings: { stability: 0.58, similarity_boost: 0.78, style: 0.38, use_speaker_boost: true },
  },
  Jupiter: {
    planet: "Jupiter", symbol: "♃",
    voiceId: "TxGEqnHWrfWFTfGW9XjX",   // Josh — deep, resonant, warm
    voiceName: "Josh",
    gender: "masculine",
    archetype: "The Philosopher",
    description: "Expansive, generous, deeply wise — wisdom from high ground",
    color: "#f97316",
    settings: { stability: 0.70, similarity_boost: 0.82, style: 0.15, use_speaker_boost: true },
  },
  Saturn: {
    planet: "Saturn", symbol: "♄",
    voiceId: "yoZ06aMxZJJ28mfd3POQ",   // Sam — raspy, gravelly, measured
    voiceName: "Sam",
    gender: "masculine",
    archetype: "The Architect",
    description: "Measured, grave, speaks with the weight of time itself",
    color: "#94a3b8",
    settings: { stability: 0.80, similarity_boost: 0.75, style: 0.07, use_speaker_boost: false },
  },
  Uranus: {
    planet: "Uranus", symbol: "♅",
    voiceId: "GBv7mTt0atIp3Br8iCZE",   // Thomas — crisp, detached, cold
    voiceName: "Thomas",
    gender: "neutral",
    archetype: "The Revolutionary",
    description: "Electric, detached, speaks disruption as prophecy",
    color: "#34d399",
    settings: { stability: 0.62, similarity_boost: 0.72, style: 0.24, use_speaker_boost: true },
  },
  Neptune: {
    planet: "Neptune", symbol: "♆",
    voiceId: "AZnzlk1XvdvUeBnXmlld",   // Domi — strong, ethereal, feminine
    voiceName: "Domi",
    gender: "feminine",
    archetype: "The Mystic",
    description: "Dreamy, dissolving — speaks from beyond the veil",
    color: "#818cf8",
    settings: { stability: 0.38, similarity_boost: 0.76, style: 0.11, use_speaker_boost: true },
  },
};

export const VOICE_PLANET_ORDER: VoicePlanet[] = [
  "Sun", "Moon", "Mercury",
  "Venus", "Mars", "Jupiter",
  "Saturn", "Uranus", "Neptune",
];

// ─── Aspect-aware voice settings ─────────────────────────────────────────────
// Harsh aspects → lower stability (more strained/emotional) + higher style
// Harmonious aspects → higher stability (smoother) + lower style

export function aspectAwareSettings(
  base: ElevenLabsVoiceSettings,
  aspects: Aspect[]
): ElevenLabsVoiceSettings {
  const harsh   = aspects.some(a => a.type === "square"  || a.type === "opposition");
  const harmony = aspects.some(a => a.type === "trine"   || a.type === "sextile");
  if (harsh) {
    return { ...base, stability: Math.max(0.15, base.stability - 0.18), style: Math.min(0.80, base.style + 0.22) };
  }
  if (harmony) {
    return { ...base, stability: Math.min(0.95, base.stability + 0.10), style: Math.max(0, base.style - 0.05) };
  }
  return base;
}
