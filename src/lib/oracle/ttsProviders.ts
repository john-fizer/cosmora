import type { VoicePlanet } from "./voice";
import { PLANET_VOICES, aspectAwareSettings } from "./voice";
import type { Aspect } from "@/lib/astrology/types";

// ─── Provider chain per planet ────────────────────────────────────────────────
// Distributes load across free tiers. First provider with a valid key wins.
// Web Speech (browser) is the client-side last resort — not listed here.
export const PLANET_PROVIDER_CHAIN: Record<VoicePlanet, string[]> = {
  Sun:     ["azure",      "google",     "elevenlabs", "openai"],
  Moon:    ["openai",     "elevenlabs", "azure",      "google"],
  Mercury: ["elevenlabs", "openai",     "google",     "azure" ],
  Venus:   ["google",     "azure",      "elevenlabs", "openai"],
  Mars:    ["azure",      "elevenlabs", "google",     "openai"],
  Jupiter: ["openai",     "google",     "azure",      "elevenlabs"],
  Saturn:  ["google",     "elevenlabs", "azure",      "openai"],
  Uranus:  ["elevenlabs", "azure",      "openai",     "google"],
  Neptune: ["openai",     "google",     "elevenlabs", "azure" ],
};

// ─── OpenAI voice map ─────────────────────────────────────────────────────────
const OPENAI_VOICES: Record<VoicePlanet, string> = {
  Sun:     "onyx",    // deep, authoritative
  Moon:    "shimmer", // gentle, ethereal
  Mercury: "alloy",   // neutral, precise
  Venus:   "nova",    // warm, feminine
  Mars:    "echo",    // intense, driven
  Jupiter: "fable",   // warm, expansive
  Saturn:  "onyx",    // measured, deep
  Uranus:  "alloy",   // detached, neutral
  Neptune: "shimmer", // dreamy, dissolving
};

// ─── Azure Neural voice map ───────────────────────────────────────────────────
const AZURE_VOICES: Record<VoicePlanet, { name: string; gender: "Male" | "Female" }> = {
  Sun:     { name: "en-US-ChristopherNeural", gender: "Male"   },
  Moon:    { name: "en-US-SaraNeural",        gender: "Female" },
  Mercury: { name: "en-US-TonyNeural",        gender: "Male"   },
  Venus:   { name: "en-US-AriaNeural",        gender: "Female" },
  Mars:    { name: "en-US-DavisNeural",       gender: "Male"   },
  Jupiter: { name: "en-US-AndrewNeural",      gender: "Male"   },
  Saturn:  { name: "en-GB-RyanNeural",        gender: "Male"   },
  Uranus:  { name: "en-US-EricNeural",        gender: "Male"   },
  Neptune: { name: "en-GB-LibbyNeural",       gender: "Female" },
};

// ─── Google Cloud Neural2 voice map ──────────────────────────────────────────
interface GoogleVoice { name: string; languageCode: string; speakingRate: number; pitch: number }
const GOOGLE_VOICES: Record<VoicePlanet, GoogleVoice> = {
  Sun:     { name: "en-US-Neural2-D", languageCode: "en-US", speakingRate: 0.93, pitch: -2.0 },
  Moon:    { name: "en-US-Neural2-F", languageCode: "en-US", speakingRate: 0.88, pitch:  1.5 },
  Mercury: { name: "en-US-Neural2-I", languageCode: "en-US", speakingRate: 1.10, pitch:  0.5 },
  Venus:   { name: "en-US-Neural2-C", languageCode: "en-US", speakingRate: 0.92, pitch:  2.0 },
  Mars:    { name: "en-US-Neural2-J", languageCode: "en-US", speakingRate: 1.02, pitch: -3.0 },
  Jupiter: { name: "en-US-Neural2-A", languageCode: "en-US", speakingRate: 0.87, pitch: -1.0 },
  Saturn:  { name: "en-US-Neural2-D", languageCode: "en-US", speakingRate: 0.80, pitch: -4.0 },
  Uranus:  { name: "en-US-Neural2-I", languageCode: "en-US", speakingRate: 0.98, pitch:  0.0 },
  Neptune: { name: "en-US-Neural2-H", languageCode: "en-US", speakingRate: 0.84, pitch:  3.0 },
};

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const ELEVENLABS_MODEL = "eleven_turbo_v2_5"; // fastest + cheapest ElevenLabs model

// ─── Provider synthesizers ────────────────────────────────────────────────────

async function synthesizeElevenLabs(text: string, planet: VoicePlanet, aspects: Aspect[]): Promise<Blob> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("no ELEVENLABS_API_KEY");

  const profile = PLANET_VOICES[planet];
  const settings = aspectAwareSettings(profile.settings, aspects);

  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${profile.voiceId}/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": key },
    body: JSON.stringify({ text: text.slice(0, 3000), model_id: ELEVENLABS_MODEL, voice_settings: settings }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.status.toString());
    throw new Error(`ElevenLabs ${res.status}: ${msg}`);
  }
  return res.blob();
}

async function synthesizeOpenAI(text: string, planet: VoicePlanet): Promise<Blob> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("no OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({
      model: "tts-1",
      input: text.slice(0, 4096),
      voice: OPENAI_VOICES[planet],
      speed: 1.0,
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.status.toString());
    throw new Error(`OpenAI TTS ${res.status}: ${msg}`);
  }
  return res.blob();
}

async function synthesizeAzure(text: string, planet: VoicePlanet): Promise<Blob> {
  const key    = process.env.AZURE_TTS_KEY;
  const region = process.env.AZURE_TTS_REGION ?? "eastus";
  if (!key) throw new Error("no AZURE_TTS_KEY");

  const voice = AZURE_VOICES[planet];
  const ssml = `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' xml:gender='${voice.gender}' name='${voice.name}'>${text.replace(/[<>&'"]/g, c => ({ "<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;" }[c]!))}</voice></speak>`;

  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
    },
    body: ssml,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.status.toString());
    throw new Error(`Azure TTS ${res.status}: ${msg}`);
  }
  return res.blob();
}

async function synthesizeGoogle(text: string, planet: VoicePlanet): Promise<Blob> {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) throw new Error("no GOOGLE_TTS_API_KEY");

  const voice = GOOGLE_VOICES[planet];
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text: text.slice(0, 5000) },
      voice: { languageCode: voice.languageCode, name: voice.name },
      audioConfig: { audioEncoding: "MP3", speakingRate: voice.speakingRate, pitch: voice.pitch },
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.status.toString());
    throw new Error(`Google TTS ${res.status}: ${msg}`);
  }
  const json = await res.json() as { audioContent?: string };
  if (!json.audioContent) throw new Error("Google TTS: empty audioContent");
  const bytes = Buffer.from(json.audioContent, "base64");
  return new Blob([bytes], { type: "audio/mpeg" });
}

// ─── Waterfall ────────────────────────────────────────────────────────────────

const SYNTHESIZERS: Record<string, (text: string, planet: VoicePlanet, aspects: Aspect[]) => Promise<Blob>> = {
  elevenlabs: (t, p, a) => synthesizeElevenLabs(t, p, a),
  openai:     (t, p)    => synthesizeOpenAI(t, p),
  azure:      (t, p)    => synthesizeAzure(t, p),
  google:     (t, p)    => synthesizeGoogle(t, p),
};

export async function synthesizeWithWaterfall(
  text: string,
  planet: VoicePlanet,
  aspects: Aspect[],
): Promise<{ blob: Blob; provider: string }> {
  const chain = PLANET_PROVIDER_CHAIN[planet];
  const errors: string[] = [];

  for (const name of chain) {
    const fn = SYNTHESIZERS[name];
    if (!fn) continue;
    try {
      const blob = await fn(text, planet, aspects);
      return { blob, provider: name };
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      errors.push(`${name}: ${msg}`);
      console.warn(`[TTS waterfall] ${planet} — ${name} failed:`, msg);
    }
  }

  throw new Error(`All TTS providers failed for ${planet}: ${errors.join(" | ")}`);
}
