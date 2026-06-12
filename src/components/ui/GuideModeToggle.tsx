"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getGuideMode, setGuideMode, type GuideMode } from "@/lib/storage";

/**
 * Star ✦ / Spirit ◈ — the global voice switch.
 * Star Guide: full astrology. Spirit Guide: spiritual language, zero jargon.
 * Saved preference; dispatches `cosmora-guide-mode` so open pages react live.
 */
export function GuideModeToggle({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<GuideMode>("star");

  useEffect(() => {
    setMode(getGuideMode());
    const onChange = (e: Event) => setMode((e as CustomEvent<GuideMode>).detail);
    window.addEventListener("cosmora-guide-mode", onChange);
    return () => window.removeEventListener("cosmora-guide-mode", onChange);
  }, []);

  const pick = (m: GuideMode) => { setMode(m); setGuideMode(m); };

  const OPTIONS: { id: GuideMode; glyph: string; label: string; color: string }[] = [
    { id: "star",   glyph: "✦", label: "Star",   color: "#C8A55B" },
    { id: "spirit", glyph: "◈", label: "Spirit", color: "#7B6FD4" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Guide mode"
      className="relative flex items-center rounded-full"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: 2,
      }}
    >
      {OPTIONS.map(opt => {
        const active = mode === opt.id;
        return (
          <button
            key={opt.id}
            role="radio"
            aria-checked={active}
            onClick={() => pick(opt.id)}
            className="relative flex items-center gap-1.5 rounded-full cursor-pointer"
            style={{
              padding: compact ? "3px 8px" : "5px 12px",
              fontFamily: "'Fragment Mono', monospace",
              fontSize: compact ? 9 : 10,
              letterSpacing: "0.14em",
              color: active ? opt.color : "rgba(234,230,244,0.35)",
              transition: "color 0.25s",
              zIndex: 1,
            }}
          >
            {active && (
              <motion.span
                layoutId="guide-mode-pill"
                className="absolute inset-0 rounded-full"
                style={{
                  background: `${opt.color}1A`,
                  border: `1px solid ${opt.color}55`,
                  boxShadow: `0 0 12px ${opt.color}33`,
                  zIndex: -1,
                }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span style={{ fontSize: compact ? 10 : 12 }}>{opt.glyph}</span>
            {!compact && <span className="uppercase">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
