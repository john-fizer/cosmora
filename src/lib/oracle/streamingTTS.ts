"use client";

import { useRef, useState, useCallback } from "react";
import type { VoicePlanet } from "./voice";
import type { Aspect } from "@/lib/astrology/types";

// Sentence boundary: .  ?  !  followed by whitespace or end of string.
// Min 12 chars to skip "Dr." / "e.g." fragments.
const SENTENCE_RE = /[.!?]+(?=\s|$)/g;
const MAX_BUFFER = 160; // force-flush long sentences that never end

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
    // skip leading whitespace for next sentence
    while (last < buf.length && buf[last] === " ") last++;
  }

  // Force-flush if remainder is very long (no sentence ender arrived)
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
  const [isActive, setIsActive] = useState(false);

  const queue     = useRef<QueueItem[]>([]);
  const playIdx   = useRef(0);
  const audio     = useRef<HTMLAudioElement | null>(null);
  const textBuf   = useRef("");
  const stopped   = useRef(false);
  const fetching  = useRef(0); // in-flight TTS requests

  const tryPlay = useCallback((fromIdx: number) => {
    if (stopped.current) return;
    playIdx.current = fromIdx;
    const item = queue.current[fromIdx];

    if (!item) {
      // Nothing queued yet — wait for next fetch to resolve
      if (fetching.current === 0) setIsActive(false);
      return;
    }

    if (item.failed) { tryPlay(fromIdx + 1); return; }
    if (!item.blobUrl) return; // still loading — resolve callback will call tryPlay

    if (!audio.current) audio.current = new Audio();
    audio.current.src = item.blobUrl;
    audio.current.onended  = () => tryPlay(fromIdx + 1);
    audio.current.onerror  = () => tryPlay(fromIdx + 1);
    audio.current.play().catch(() => tryPlay(fromIdx + 1));
  }, []);

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
        if (!res.ok) throw new Error(`TTS ${res.status}`);
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        queue.current[idx].blobUrl = url;
        fetching.current--;
        // If playhead is waiting on this exact item, start playing
        if (playIdx.current === idx && !stopped.current) tryPlay(idx);
      })
      .catch(() => {
        queue.current[idx].failed = true;
        fetching.current--;
        if (playIdx.current === idx && !stopped.current) tryPlay(idx + 1);
      });

    // Start playhead if nothing is playing yet
    if (playIdx.current === idx && idx === 0) {
      setIsActive(true);
      // playhead will start once blobUrl resolves
    }
  }, [planet, aspects, tryPlay]);

  /** Feed a text token as it arrives from the LLM stream */
  const feed = useCallback((token: string) => {
    if (stopped.current) return;
    textBuf.current += token;
    const { sentences, remainder } = extractComplete(textBuf.current);
    textBuf.current = remainder;
    for (const s of sentences) enqueueSentence(s);
  }, [enqueueSentence]);

  /** Call when the LLM stream ends — flushes any remaining buffer */
  const flush = useCallback(() => {
    const leftover = textBuf.current.trim();
    if (leftover.length >= 4) enqueueSentence(leftover);
    textBuf.current = "";
  }, [enqueueSentence]);

  /** Stop playback and clear queue (call when user sends a new message) */
  const stop = useCallback(() => {
    stopped.current = true;
    audio.current?.pause();
    queue.current = [];
    playIdx.current = 0;
    fetching.current = 0;
    textBuf.current = "";
    setIsActive(false);
    // Reset for next use
    stopped.current = false;
  }, []);

  return { feed, flush, stop, isActive };
}
