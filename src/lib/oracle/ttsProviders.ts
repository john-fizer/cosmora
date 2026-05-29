import type { VoicePlanet } from "./voice";
import { PLANET_VOICES, aspectAwareSettings } from "./voice";
import type { Aspect } from "@/lib/astrology/types";

// ─── Provider chain per planet ────────────────────────────────────────────────
// Cartesia is primary for all — best latency + you already have a key.
// Falls back through other providers in order; Web Speech is client-side last resort.
export const PLANET_PROVIDER_CHAIN: Record<VoicePlanet, string[]> = {
  Sun:     ["cartesia", "azure",      "google",     "elevenlabs", "openai"],
  Moon:    ["cartesia", "openai",     "elevenlabs", "azure",      "google"],
  Mercury: ["cartesia", "elevenlabs", "openai",     "google",     "azure" ],
  Venus:   ["cartesia", "google",     "azure",      "elevenlabs", "openai"],
  Mars:    ["cartesia", "azure",      "elevenlabs", "google",     "openai"],
  Jupiter: ["cartesia", "openai",     "google",     "azure",      "elevenlabs"],
  Saturn:  ["cartesia", "google",     "elevenlabs", "azure",      "openai"],
  Uranus:  ["cartesia", "elevenlabs", "azure",      "openai",     "google"],
  Neptune: ["cartesia", "openai",     "google",     "elevenlabs", "azure" ],
};

// ─── Cartesia voice map ───────────────────────────────────────────────────────
// Voices chosen for archetypal fit from the live voice library
const CARTESIA_VOICES: Record<VoicePlanet, string> = {
  Sun:     "79f8b5fb-2cc8-479a-80df-29f7a7cf1a3e", // Theo — steady, confident narrator
  Moon:    "2f251ac3-89a9-4a77-a452-704b474ccd01", // Lucy — reassuring British female
  Mercury: "47c38ca4-5f35-497b-b1a3-415245fb35e1", // Daniel — clear, crisp, precise
  Venus:   "62ae83ad-4f6a-430b-af41-a9bede9286ca", // Gemma — emotive British female
  Mars:    "5ee9feff-1265-424a-9d7f-8e4d431a12c7", // Ronald — intense, deep male
  Jupiter: "ef191366-f52f-447a-a398-ed8c0f2943a1", // Archie — warm British conversationalist
  Saturn:  "a5136bf9-224c-4d76-b823-52bd5efcffcc", // Jameson — measured, laid-back male
  Uranus:  "86e30c1d-714b-4074-a1f2-1cb6b552fb49", // Carson — curious, detached young male
  Neptune: "a33f7a4c-100f-41cf-a1fd-5822e8fc253f", // Lauren — expressive storytelling female
};

// ─── OpenAI voice map ─────────────────────────────────────────────────────────
const OPENAI_VOICES: Record<VoicePlanet, string> = {
  Sun:     "onyx",
  Moon:    "shimmer",
  Mercury: "alloy",
  Venus:   "nova",
  Mars:    "echo",
  Jupiter: "fable",
  Saturn:  "onyx",
  Uranus:  "alloy",
  Neptune: "shimmer",
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
const ELEVENLABS_MODEL = "eleven_turbo_v2_5";

// ─── Provider synthesizers ────────────────────────────────────────────────────

async function synthesizeCartesia(text: string, planet: VoicePlanet): Promise<Blob> {
  const key = process.env.CARTESIA_API_KEY;
  if (!key) throw new Error("no CARTESIA_API_KEY");

  const res = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": key,
      "Cartesia-Version": "2026-03-01",
    },
    body: JSON.stringify({
      model_id: "sonic-3.5",
      transcript: text.slice(0, 4000),
      voice: { mode: "id", id: CARTESIA_VOICES[planet] },
      output_format: { container: "mp3", bit_rate: 128000, sample_rate: 44100 },
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.status.toString());
    throw new Error(`Cartesia ${res.status}: ${msg}`);
  }
  return res.blob();
}

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
    body: JSON.stringify({ model: "tts-1", input: text.slice(0, 4096), voice: OPENAI_VOICES[planet], speed: 1.0 }),
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
  const escaped = text.replace(/[<>&'"]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c]!));
  const ssml = `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' xml:gender='${voice.gender}' name='${voice.name}'>${escaped}</voice></speak>`;

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
  cartesia:   (t, p)    => synthesizeCartesia(t, p),
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
