"use client";

/**
 * Pressure Windows — stacked-technique convergence.
 * Three timing systems read in parallel; the briefing tells you what to DO.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { Panel, DataReadout, GlowButton, HoloChip, Em } from "@/components/ui/primitives";
import { GuideModeToggle } from "@/components/ui/GuideModeToggle";
import { COLOR, FONT, SOLAR, EASE_CELESTIAL } from "@/lib/design/tokens";
import { getActiveProfileId, getCachedChart, getProfile, getGuideMode, type GuideMode } from "@/lib/storage";
import type { ChartData } from "@/lib/astrology/types";
import type { PressureReport, PressureLevel } from "@/lib/astrology/pressureWindows";

type Result = PressureReport & { briefing: string };

const LEVEL_META: Record<PressureLevel, { color: string; label: string; sub: string }> = {
  clear:    { color: "#5BB98C", label: "CLEAR",    sub: "The window is open" },
  elevated: { color: "#E8A33D", label: "ELEVATED", sub: "Pressure is building" },
  critical: { color: "#D4564E", label: "CRITICAL", sub: "The wall is real — here is the protocol" },
};

const SOURCE_LABEL: Record<string, string> = {
  transits: "TRANSITS", profection: "PROFECTION", releasing: "RELEASING",
};

function ScoreGauge({ score, level }: { score: number; level: PressureLevel }) {
  const meta = LEVEL_META[level];
  const R = 76, C = 2 * Math.PI * R;
  return (
    <div className="relative w-[200px] h-[200px] mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        <circle cx="100" cy="100" r={R} fill="none" stroke={COLOR.border} strokeWidth="5" />
        <motion.circle
          cx="100" cy="100" r={R} fill="none"
          stroke={meta.color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - score / 100) }}
          transition={{ duration: 1.6, ease: [...EASE_CELESTIAL] }}
          style={{ filter: `drop-shadow(0 0 8px ${meta.color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontFamily: FONT.data, fontSize: 38, color: COLOR.text1 }}>{score}</span>
        <span style={{ fontFamily: FONT.data, fontSize: 9, letterSpacing: "0.26em", color: meta.color }}>{meta.label}</span>
      </div>
    </div>
  );
}

export default function PressurePage() {
  const [chart, setChart] = useState<ChartData | null>(null);
  const [birthDt, setBirthDt] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [mode, setMode] = useState<GuideMode>("star");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = getActiveProfileId();
    setProfileId(id);
    if (id) {
      setChart(getCachedChart(id));
      const p = getProfile(id);
      if (p) setBirthDt(`${p.birthDate}T${p.birthTime}`);
    }
    setMode(getGuideMode());
    setReady(true);
    const onMode = (e: Event) => setMode((e as CustomEvent<GuideMode>).detail);
    window.addEventListener("cosmora-guide-mode", onMode);
    return () => window.removeEventListener("cosmora-guide-mode", onMode);
  }, []);

  useEffect(() => {
    if (!chart || !birthDt) return;
    let cancelled = false;
    setLoading(true); setError(false); setResult(null);
    fetch("/api/pressure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chart, birthDatetime: birthDt, guideMode: mode }),
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { if (!cancelled) setResult(d); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [chart, birthDt, mode]);

  const meta = result ? LEVEL_META[result.level] : null;

  return (
    <div className="min-h-screen">
      <DashboardBg />
      <div className="relative z-10 md:ml-[68px] mb-[60px] md:mb-0 px-5 lg:px-10 py-10 max-w-3xl mx-auto">

        <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <DataReadout items={["WINDOWS · STACKED-TECHNIQUE CONVERGENCE"]} color="solar" size={10} />
            <h1 className="text-4xl mt-3 mb-2" style={{ fontFamily: FONT.body, fontWeight: 400, letterSpacing: "-0.02em", color: COLOR.text1 }}>
              Pressure <Em>Windows</Em>
            </h1>
            <p className="text-sm max-w-md leading-relaxed" style={{ color: COLOR.text2 }}>
              {mode === "spirit"
                ? "Three independent cycles, read together. When they agree, the season is real — and there is a protocol."
                : "Transits, profections, and zodiacal releasing cross-checked for convergence. Agreement between systems is the signal."}
            </p>
          </div>
          <GuideModeToggle />
        </motion.header>

        {ready && (!profileId || !chart || !birthDt) && (
          <Panel pad={40} className="text-center">
            <p style={{ fontFamily: FONT.display, fontStyle: "italic", fontSize: 20, color: COLOR.text2 }} className="mb-5">
              No chart in the instrument.
            </p>
            <Link href="/dashboard/chart"><GlowButton variant="ghost">Open chart →</GlowButton></Link>
          </Panel>
        )}

        {loading && (
          <Panel pad={48} className="text-center">
            <p style={{ fontFamily: FONT.display, fontStyle: "italic", fontSize: 19, color: COLOR.text3 }}>
              Reading the cosmos...
            </p>
            <p style={{ fontFamily: FONT.data, fontSize: 9, letterSpacing: "0.22em", color: SOLAR(0.5) }} className="mt-3">
              CROSS-CHECKING THREE TIMING SYSTEMS
            </p>
          </Panel>
        )}

        {error && !loading && (
          <Panel pad={40} className="text-center">
            <p style={{ fontFamily: FONT.display, fontStyle: "italic", fontSize: 20, color: COLOR.text2 }} className="mb-4">Signal lost.</p>
            <GlowButton variant="ghost" onClick={() => setMode(m => m)}>Re-establish link</GlowButton>
          </Panel>
        )}

        {result && meta && !loading && (
          <div className="space-y-6">
            {/* Gauge */}
            <Panel glow pad={36}>
              <ScoreGauge score={result.score} level={result.level} />
              <p className="text-center mt-4" style={{ fontFamily: FONT.display, fontStyle: "italic", fontSize: 17, color: COLOR.text2 }}>
                {meta.sub}
              </p>
              <div className="flex justify-center gap-2 mt-5">
                {(["transits", "profection", "releasing"] as const).map(src => (
                  <HoloChip key={src} tone="solar"
                    active={result.signals.some(s => s.source === src)}>
                    {SOURCE_LABEL[src]}
                  </HoloChip>
                ))}
              </div>
            </Panel>

            {/* Signals */}
            {result.signals.length > 0 && (
              <Panel pad={28}>
                <DataReadout items={[`${result.signals.length} ACTIVE SIGNALS · ${result.activeSources} SYSTEMS IN AGREEMENT`]} color="muted" size={9} />
                <div className="mt-5 space-y-4">
                  {result.signals.map((s, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <span style={{
                        fontFamily: FONT.data, fontSize: 8.5, letterSpacing: "0.14em",
                        color: SOLAR(0.7), border: `1px solid ${SOLAR(0.25)}`,
                        borderRadius: 999, padding: "3px 10px", flexShrink: 0, marginTop: 2,
                      }}>
                        {SOURCE_LABEL[s.source]}
                      </span>
                      <div>
                        <p style={{ fontFamily: FONT.body, fontSize: 13.5, color: COLOR.text1 }}>{s.label}</p>
                        <p style={{ fontFamily: FONT.body, fontSize: 12, lineHeight: 1.65, color: COLOR.text2 }} className="mt-1">
                          {s.detail}{s.easesBy && <span style={{ color: SOLAR(0.65) }}> Releases ~{s.easesBy}.</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {/* Briefing + protocol */}
            <Panel glow pad={32}>
              <DataReadout items={[mode === "spirit" ? "THE SEASON · GUIDANCE" : "ORACLE BRIEFING · PROTOCOL"]} color="solar" size={9} />
              <div className="mt-5 space-y-4 text-[14.5px] leading-[1.85]" style={{ fontFamily: FONT.body, color: "rgba(234,230,244,0.78)" }}>
                {result.briefing.split(/\n\n+/).map((p, i) => (
                  <p key={i} style={/^\d+[.)]/.test(p.trim()) ? { paddingLeft: 12, borderLeft: `2px solid ${SOLAR(0.35)}` } : undefined}>
                    {p}
                  </p>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
