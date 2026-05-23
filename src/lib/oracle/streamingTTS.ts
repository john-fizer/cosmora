"use client";

import { useRef, useState, useCallback } from "react";
import type { VoicePlanet } from "./voice";
import type { Aspect } from "@/lib/astrology/types";

const SENTENCE_RE = /[.!?]+(?=\s|$)/g;
const MAX_BUFFER = 160;

// Silent WAV — plays inside a user gesture to unlock browser autoplay policy
const SILENT_WAV = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAEBAAEAQBwAAEAcAAABAAgAZGF0YQQAAAAAAA==";

// Per-planet Web Speech tuning — last-resort fallback when all server providers fail
const WEB_SPEECH_TUNING: Record<VoicePlanet, { rate: number; pitch: number; gender: "male" | "female" | "neutral" }> = {
  Sun:     { rate: 0.92, pitch: 0.85, gender: "male"    },
  Moon:    { rate: 0.88, pitch: 1.10, gender: "female"  },
  Mercury: { rate: 1.05, pitch: 1.05, gender: "neutral" },
  Venus:   { rate: 0.90, pitch: 1.15, gender: "female"  },
  Mars:    { rate: 1.00, pitch: 0.80, gender: "male"    },
  Jupiter: { rate: 0.85, pitch: 0.90, gender: "male"    },
  Saturn:  { rate: 0.80, pitch: 0.75, gender: "male"    },
  Uranus:  { rate: 0.95, pitch: 1.00, gender: "neutral" },
  Neptune: { rate: 0.82, pitch: 1.20, gender: "female"  },
};

function extractComplete(buf: string): { sentences: string[]; remainder: string } {
  const sentences: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  SENTENCE_RE.lastIndex = 0;

  while ((m = SENTENCE_RE.exec(buf)) !== null) {
    const end = m.index + m[0].length;
    const s = buf.slice(last, end).trim();
    if (s.length >= 12) sentences.push(s);
    last = end;
    while (last < buf.length && buf[last] === " ") last++;
  }

  let remainder = buf.slice(last);
  if (remainder.length > MAX_BUFFER) {
    const cutAt = remainder.lastIndexOf(" ", MAX_BUFFER);
    const cut = cutAt > 20 ? cutAt : MAX_BUFFER;
    const forced = remainder.slice(0, cut).trim();
    if (forced.length >= 12) sentences.push(forced);
    remainder = remainder.slice(cut).trimStart();
  }

  return { sentences, remainder };
}

interface QueueItem {
  blobUrl: string | null;
  failed: boolean;
}

export function useStreamingTTS(planet: VoicePlanet, aspects: Aspect[] = []) {
  const [isActive, setIsActive]       = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  const queue          = useRef<QueueItem[]>([]);
  const playIdx        = useRef(0);
  const audio          = useRef<HTMLAudioElement | null>(null);
  const textBuf        = useRef("");
  const stopped        = useRef(false);
  const fetching       = useRef(0);
  const unlocked       = useRef(false);
  const webSpeechCount = useRef(0);

  // ── Web Speech (last resort) ───────────────────────────────────────────────

  const speakWithBrowser = useCallback((text: string) => {
    if (stopped.current) return;
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth) return;

    const tuning = WEB_SPEECH_TUNING[planet];
    const utt    = new SpeechSynthesisUtterance(text);
    utt.rate     = tuning.rate;
    utt.pitch    = tuning.pitch;
    utt.volume   = 1;

    const voices = synth.getVoices();
    if (voices.length > 0) {
      const en = voices.filter(v => v.lang.startsWith("en"));
      const gendered = en.filter(v => {
        const n = v.name.toLowerCase();
        if (tuning.gender === "female") return ["samantha","karen","victoria","moira","tessa","fiona","zira","hazel"].some(x => n.includes(x));
        if (tuning.gender === "male")   return ["daniel","alex","tom","oliver","aaron","david","mark","james","ryan"].some(x => n.includes(x));
        return true;
      });
      utt.voice = (gendered[0] ?? en[0]) ?? null;
    }

    setIsActive(true);
    setActiveProvider("browser");
    webSpeechCount.current++;

    utt.onend = () => {
      webSpeechCount.current--;
      if (webSpeechCount.current === 0 && fetching.current === 0 && !stopped.current) {
        setIsActive(false);
        setActiveProvider(null);
      }
    };
    utt.onerror = (e) => {
      if (e.error !== "interrupted") console.warn("[StreamTTS] SpeechSynthesis error:", e.error);
      webSpeechCount.current = Math.max(0, webSpeechCount.current - 1);
    };

    synth.speak(utt);
  }, [planet]);

  // ── ElevenLabs / server waterfall player ──────────────────────────────────

  const tryPlay = useCallback((fromIdx: number) => {
    if (stopped.current) return;
    playIdx.current = fromIdx;
    const item = queue.current[fromIdx];

    if (!item) {
      if (fetching.current === 0) { setIsActive(false); setActiveProvider(null); }
      return;
    }
    if (item.failed) { tryPlay(fromIdx + 1); return; }
    if (!item.blobUrl) return;

    if (!audio.current) audio.current = new Audio();
    audio.current.src = item.blobUrl;
    audio.current.onended = () => tryPlay(fromIdx + 1);
    audio.current.onerror = () => tryPlay(fromIdx + 1);
    audio.current.play().catch(err => {
      console.warn("[StreamTTS] play() blocked:", err?.name);
      tryPlay(fromIdx + 1);
    });
  }, []);

  // ── Sentence dispatch ──────────────────────────────────────────────────────

  const enqueueSentence = useCallback((sentence: string) => {
    if (stopped.current || !sentence.trim()) return;
    const idx = queue.current.length;
    queue.current.push({ blobUrl: null, failed: false });
    fetching.current++;

    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: sentence, planet, aspects }),
    })
      .then(async res => {
        if (!res.ok) {
          const msg = await res.text().catch(() => res.status.toString());
          throw new Error(`${res.status}: ${msg}`);
        }
        const provider = res.headers.get("X-TTS-Provider");
        if (provider) setActiveProvider(provider);
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        queue.current[idx].blobUrl = url;
        fetching.current--;
        if (playIdx.current === idx && !stopped.current) tryPlay(idx);
      })
      .catch(err => {
        console.warn("[StreamTTS] server TTS failed, falling back to browser:", (err as Error).message);
        queue.current[idx].failed = true;
        fetching.current--;
        // Server waterfall exhausted — use Web Speech for this sentence
        speakWithBrowser(sentence);
        if (playIdx.current === idx && !stopped.current) tryPlay(idx + 1);
      });

    if (playIdx.current === idx && idx === 0) setIsActive(true);
  }, [planet, aspects, tryPlay, speakWithBrowser]);

  // ── Public API ─────────────────────────────────────────────────────────────

  const feed = useCallback((token: string) => {
    if (stopped.current) return;
    textBuf.current += token;
    const { sentences, remainder } = extractComplete(textBuf.current);
    textBuf.current = remainder;
    for (const s of sentences) enqueueSentence(s);
  }, [enqueueSentence]);

  const flush = useCallback(() => {
    const leftover = textBuf.current.trim();
    if (leftover.length >= 4) enqueueSentence(leftover);
    textBuf.current = "";
  }, [enqueueSentence]);

  const unlock = useCallback(() => {
    if (unlocked.current) return;
    const a = new Audio(SILENT_WAV);
    a.volume = 0;
    a.play().then(() => { unlocked.current = true; }).catch(() => {});
  }, []);

  const stop = useCallback(() => {
    stopped.current = true;
    audio.current?.pause();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    queue.current = [];
    playIdx.current = 0;
    fetching.current = 0;
    webSpeechCount.current = 0;
    textBuf.current = "";
    setIsActive(false);
    setActiveProvider(null);
    stopped.current = false;
  }, []);

  return { feed, flush, stop, unlock, isActive, activeProvider };
}
