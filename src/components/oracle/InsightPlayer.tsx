"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PLANET_VOICES, type VoicePlanet } from "@/lib/oracle/voice";
import type { Aspect } from "@/lib/astrology/types";

interface InsightPlayerProps {
  text: string;
  messageId: number;
  planet: VoicePlanet;
  aspects?: Aspect[];
  autoPlay?: boolean;
}

// Global blob URL cache keyed by messageId+planet so we never re-generate the same audio
const audioCache = new Map<string, string>();

type PlayState = "idle" | "loading" | "playing" | "paused" | "error";

function WaveformBars({ color }: { color: string }) {
  const h = [0.5, 1.0, 0.7, 0.9, 0.55];
  return (
    <div className="flex items-end gap-px" style={{ height: 10 }}>
      {h.map((ratio, i) => (
        <motion.div
          key={i}
          animate={{ height: [2, Math.round(10 * ratio), 2] }}
          transition={{ duration: 0.45 + i * 0.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.06 }}
          style={{ width: 2, background: color, borderRadius: 1 }}
        />
      ))}
    </div>
  );
}

export function InsightPlayer({ text, messageId, planet, aspects = [], autoPlay }: InsightPlayerProps) {
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [progress, setProgress]   = useState(0);
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const playedRef = useRef(false);

  const profile  = PLANET_VOICES[planet];
  const cacheKey = `${messageId}-${planet}`;

  const generate = useCallback(async (): Promise<string> => {
    if (audioCache.has(cacheKey)) return audioCache.get(cacheKey)!;

    setPlayState("loading");
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, planet, aspects }),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    audioCache.set(cacheKey, url);
    return url;
  }, [cacheKey, text, planet, aspects]);

  const play = useCallback(async () => {
    try {
      const url = await generate();

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const audio = audioRef.current;
      audio.src = url;

      audio.ontimeupdate = () => {
        if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
      };
      audio.onended = () => { setPlayState("idle"); setProgress(0); };
      audio.onerror = () => setPlayState("error");

      await audio.play();
      setPlayState("playing");
    } catch {
      setPlayState("error");
    }
  }, [generate]);

  const handleClick = () => {
    if (playState === "loading") return;
    if (playState === "playing") {
      audioRef.current?.pause();
      setPlayState("paused");
    } else if (playState === "paused") {
      audioRef.current?.play().catch(() => setPlayState("error"));
      setPlayState("playing");
    } else {
      play();
    }
  };

  // Auto-play once when first mounted with autoPlay=true
  useEffect(() => {
    if (autoPlay && !playedRef.current) {
      playedRef.current = true;
      play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const isActive = playState === "playing" || playState === "paused";

  return (
    <div className="flex items-center gap-2 mt-2">
      {/* Play / pause / loading button */}
      <motion.button
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleClick}
        title={playState === "loading" ? "Generating…" : playState === "playing" ? "Pause" : "Play insight"}
        className="flex items-center justify-center rounded-full flex-shrink-0 cursor-pointer"
        style={{
          width: 24, height: 24,
          background: isActive ? `${profile.color}20` : playState === "error" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${isActive ? profile.color + "55" : playState === "error" ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)"}`,
          boxShadow: isActive ? `0 0 10px ${profile.color}28` : "none",
          color: isActive ? profile.color : playState === "error" ? "#ef4444" : "#475569",
          transition: "all 0.2s",
        }}
      >
        {playState === "loading" ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
            style={{
              width: 9, height: 9, borderRadius: "50%",
              border: `1.5px solid ${profile.color}`,
              borderTopColor: "transparent",
            }}
          />
        ) : playState === "playing" ? (
          // Pause icon
          <svg viewBox="0 0 10 10" fill="currentColor" style={{ width: 8, height: 8 }}>
            <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" />
            <rect x="6" y="1" width="2.5" height="8" rx="0.5" />
          </svg>
        ) : playState === "error" ? (
          <span style={{ fontSize: 9 }}>!</span>
        ) : (
          // Play icon
          <svg viewBox="0 0 10 10" fill="currentColor" style={{ width: 8, height: 8 }}>
            <polygon points="2.5,1 9,5 2.5,9" />
          </svg>
        )}
      </motion.button>

      {/* Waveform + progress */}
      <AnimatePresence>
        {playState === "playing" && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <WaveformBars color={profile.color} />
            {/* Progress bar */}
            <div className="rounded-full overflow-hidden" style={{ width: 64, height: 2, background: "rgba(255,255,255,0.08)", flexShrink: 0 }}>
              <div style={{ height: "100%", width: `${progress}%`, background: profile.color, transition: "width 0.25s linear" }} />
            </div>
          </motion.div>
        )}
        {playState === "paused" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="rounded-full overflow-hidden" style={{ width: 64, height: 2, background: "rgba(255,255,255,0.08)" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: `${profile.color}88`, transition: "width 0.25s linear" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Planet symbol while playing */}
      <AnimatePresence>
        {isActive && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            style={{ fontSize: 11, color: profile.color, flexShrink: 0 }}
            title={`${profile.planet} — ${profile.archetype}`}
          >
            {profile.symbol}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Error label */}
      {playState === "error" && (
        <span style={{ fontSize: 8, color: "#ef4444", letterSpacing: 0.5 }}>TTS unavailable</span>
      )}
    </div>
  );
}
