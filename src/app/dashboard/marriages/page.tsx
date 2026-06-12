"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { GuideModeToggle } from "@/components/ui/GuideModeToggle";
import {
  getActiveProfileId, getCachedChart,
  getGuideMode, type GuideMode,
  getMarriageReadings, saveMarriageReading, type MarriageReading,
  getUnlockedMarriages, unlockNextMarriage,
} from "@/lib/storage";
import type { ChartData } from "@/lib/astrology/types";
import {
  calculateMarriageSignificators, detectDivorceIndicators, getRemediesForIndicators,
  type MarriageSignificator, type MarriageNumber, type DivorceIndicator, type RemedyTrack,
} from "@/lib/astrology/marriages";

const MONO = "'Fragment Mono', monospace";
const SERIF = "'Cormorant Garamond', serif";

const ORDINAL: Record<MarriageNumber, string> = { 1: "FIRST", 2: "SECOND", 3: "THIRD", 4: "FOURTH" };
const OFFSET_LABEL: Record<MarriageNumber, string> = {
  1: "7th from Moon", 2: "2nd from Moon", 3: "9th from Moon", 4: "3rd from Moon",
};

const TRACK_META: Record<RemedyTrack, { label: string; color: string }> = {
  vedic:      { label: "VEDIC",      color: "#E8A33D" },
  western:    { label: "WESTERN",    color: "#4ECDC4" },
  archetypal: { label: "ARCHETYPAL", color: "#7B6FD4" },
};

// ─── Remedy expander ───────────────────────────────────────────────────────────

function RemedySection({ indicators, mode }: { indicators: DivorceIndicator[]; mode: GuideMode }) {
  const [open, setOpen] = useState(false);
  const [openTrack, setOpenTrack] = useState<string | null>(null);
  const groups = getRemediesForIndicators(indicators);
  if (!groups.length) return null;

  return (
    <div className="mt-5">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 cursor-pointer group"
        style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", color: "#C8A55B" }}
      >
        <span className="group-hover:underline underline-offset-4">
          {open ? "REMEDIES" : "INTERESTED IN FINDING OUT HOW TO REMEDY THIS?"}
        </span>
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>→</motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="pt-5 space-y-6">
              {groups.map(({ indicator, remedies }) => (
                <div key={indicator.id}>
                  <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", color: "rgba(232,163,61,0.7)" }} className="mb-3">
                    FOR · {indicator.chip.toUpperCase()}
                  </p>
                  <div className="space-y-2">
                    {remedies.map(r => {
                      const key = `${indicator.id}-${r.track}`;
                      const expanded = openTrack === key;
                      const meta = TRACK_META[r.track];
                      return (
                        <div key={key} className="rounded-xl overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${expanded ? meta.color + "44" : "rgba(255,255,255,0.06)"}` }}>
                          <button
                            onClick={() => setOpenTrack(expanded ? null : key)}
                            className="w-full flex items-center justify-between px-4 py-3 cursor-pointer text-left"
                          >
                            <span className="flex items-center gap-3">
                              <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.18em", color: meta.color }}>
                                {meta.label}
                              </span>
                              <span style={{ fontSize: 13, color: "rgba(234,230,244,0.85)" }}>{r.title}</span>
                            </span>
                            <motion.span animate={{ rotate: expanded ? 45 : 0 }} style={{ color: "rgba(234,230,244,0.3)" }}>+</motion.span>
                          </button>
                          <AnimatePresence>
                            {expanded && (
                              <motion.div
                                initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                style={{ overflow: "hidden" }}
                              >
                                <p className="px-4 pb-4 text-sm leading-relaxed" style={{ color: "rgba(234,230,244,0.6)" }}>
                                  {mode === "spirit" ? r.spirit : r.star}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── One marriage card ─────────────────────────────────────────────────────────

function MarriageCard({
  sig, chart, profileId, mode, isLatestUnlocked, onUnlockNext, canUnlockNext,
}: {
  sig: MarriageSignificator;
  chart: ChartData;
  profileId: string;
  mode: GuideMode;
  isLatestUnlocked: boolean;
  canUnlockNext: boolean;
  onUnlockNext: () => void;
}) {
  const [reading, setReading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const indicators = detectDivorceIndicators(chart, sig);

  const fetchReading = useCallback(async () => {
    // Reuse the latest archived reading for this marriage + mode
    const cached = getMarriageReadings(profileId).find(
      r => r.guideMode === mode && r.significators.length === 1 && r.significators[0].marriage === sig.marriage
    );
    if (cached) { setReading(cached.finalText); return; }

    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/marriages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chart, profileId, guideMode: mode, marriage: sig.marriage }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { starText: string; finalText: string; significators: MarriageSignificator[]; generatedAt: string };
      setReading(data.finalText);

      // Archive locally + server-side
      const saved: MarriageReading = saveMarriageReading({
        profileId,
        generatedAt: data.generatedAt,
        guideMode: mode,
        starText: data.starText,
        finalText: data.finalText,
        significators: data.significators,
      });
      fetch("/api/marriages/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saved),
      }).catch(() => {});
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [chart, profileId, mode, sig.marriage]);

  useEffect(() => { setReading(null); fetchReading(); }, [fetchReading]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="liquid-glass-cosmos rounded-3xl p-7 lg:p-9"
    >
      {/* Meta line */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-6"
        style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: "rgba(200,165,91,0.75)" }}>
        <span style={{ color: "#C8A55B" }}>✦ {ORDINAL[sig.marriage]} UNION</span>
        <span style={{ color: "rgba(200,165,91,0.3)" }}>·</span>
        <span>MOON IN {sig.moonSign.toUpperCase()}</span>
        <span style={{ color: "rgba(200,165,91,0.3)" }}>·</span>
        <span>{OFFSET_LABEL[sig.marriage].toUpperCase()}: {sig.marriageSign.toUpperCase()}</span>
        <span style={{ color: "rgba(200,165,91,0.3)" }}>·</span>
        <span>RULER: {sig.ruler.toUpperCase()} ({sig.rulerDignity.toUpperCase()})</span>
      </div>

      {/* Reading body */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.p key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ fontFamily: SERIF, fontStyle: "italic", color: "rgba(234,230,244,0.4)" }} className="text-lg py-8">
            Reading the cosmos...
          </motion.p>
        )}
        {error && !loading && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8">
            <p style={{ fontFamily: SERIF, fontStyle: "italic", color: "rgba(234,230,244,0.4)" }} className="text-lg mb-3">
              Signal lost.
            </p>
            <button onClick={fetchReading} className="cursor-pointer"
              style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: "#C8A55B" }}>
              RE-ESTABLISH LINK →
            </button>
          </motion.div>
        )}
        {reading && !loading && (
          <motion.div key={`reading-${mode}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 text-[15px] leading-[1.85]" style={{ color: "rgba(234,230,244,0.78)" }}>
            {reading.split(/\n\n+/).map((para, i) => <p key={i}>{para}</p>)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divorce indicators strip */}
      {indicators.length > 0 && reading && !loading && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="mt-7 rounded-2xl p-5"
          style={{ background: "rgba(232,163,61,0.05)", border: "1px solid rgba(232,163,61,0.18)" }}
        >
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {indicators.map(ind => (
              <span key={ind.id} className="rounded-full px-3 py-1"
                style={{
                  fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.14em",
                  color: ind.severity === "strong" ? "#E8A33D" : "rgba(232,163,61,0.65)",
                  background: "rgba(232,163,61,0.08)",
                  border: `1px solid rgba(232,163,61,${ind.severity === "strong" ? 0.4 : 0.2})`,
                }}>
                {ind.chip.toUpperCase()}
              </span>
            ))}
          </div>
          <div className="space-y-2.5">
            {indicators.map(ind => (
              <p key={ind.id} className="text-[13px] leading-relaxed" style={{ color: "rgba(234,230,244,0.55)" }}>
                {mode === "spirit" ? ind.spiritText : ind.starText}
              </p>
            ))}
          </div>

          {/* Remedy expander lives inside the indicator panel */}
          <RemedySection indicators={indicators} mode={mode} />
        </motion.div>
      )}

      {/* Divorce unlock — quiet, below the fold of the card */}
      {isLatestUnlocked && canUnlockNext && reading && !loading && (
        <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <AnimatePresence mode="wait">
            {!confirming ? (
              <motion.div key="ask" exit={{ opacity: 0 }} className="flex items-center gap-4">
                <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: "rgba(234,230,244,0.35)" }}>
                  Has this union ended?
                </p>
                <button
                  onClick={() => setConfirming(true)}
                  className="rounded-full px-4 py-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    fontFamily: MONO, fontSize: 9, letterSpacing: "0.16em",
                    color: "rgba(234,230,244,0.45)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}>
                  YES, IT HAS
                </button>
              </motion.div>
            ) : (
              <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-center gap-4">
                <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: "rgba(234,230,244,0.5)" }}>
                  The {ORDINAL[(sig.marriage + 1) as MarriageNumber].toLowerCase()} union reading will be revealed.
                </p>
                <button
                  onClick={onUnlockNext}
                  className="rounded-full px-4 py-1.5 cursor-pointer"
                  style={{
                    fontFamily: MONO, fontSize: 9, letterSpacing: "0.16em",
                    color: "#C8A55B", border: "1px solid rgba(200,165,91,0.4)",
                    background: "rgba(200,165,91,0.08)",
                  }}>
                  CONTINUE →
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="cursor-pointer"
                  style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.16em", color: "rgba(234,230,244,0.3)" }}>
                  NOT YET
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MarriagesPage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [mode, setMode] = useState<GuideMode>("star");
  const [unlocked, setUnlocked] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = getActiveProfileId();
    setProfileId(id);
    if (id) {
      setChart(getCachedChart(id));
      setUnlocked(getUnlockedMarriages(id));
    }
    setMode(getGuideMode());
    setReady(true);

    const onMode = (e: Event) => setMode((e as CustomEvent<GuideMode>).detail);
    window.addEventListener("cosmora-guide-mode", onMode);
    return () => window.removeEventListener("cosmora-guide-mode", onMode);
  }, []);

  const significators = chart ? calculateMarriageSignificators(chart) : [];
  const visible = significators.slice(0, unlocked);

  return (
    <div className="min-h-screen">
      <DashboardBg />

      <div className="relative z-10 md:ml-[68px] mb-[60px] md:mb-0 px-5 lg:px-10 py-10 max-w-3xl mx-auto">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-wrap items-end justify-between gap-5"
        >
          <div>
            <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.3em", color: "rgba(200,165,91,0.6)" }} className="mb-3">
              UNIONS · MOON-COUNT TECHNIQUE
            </p>
            <h1 className="text-4xl text-white mb-2" style={{ fontWeight: 400, letterSpacing: "-0.02em" }}>
              Marriage <em style={{ fontFamily: SERIF, fontStyle: "italic", color: "rgba(234,230,244,0.65)" }}>Patterns</em>
            </h1>
            <p className="text-sm max-w-md leading-relaxed" style={{ color: "rgba(234,230,244,0.4)" }}>
              {mode === "spirit"
                ? "The record of your unions, read from the blueprint — one chapter at a time."
                : "Significators counted from the Moon — ruler, dignity, aspects, and receptions for each union."}
            </p>
          </div>
          <GuideModeToggle />
        </motion.header>

        {/* States */}
        {ready && (!profileId || !chart) && (
          <div className="liquid-glass-cosmos rounded-3xl p-10 text-center">
            <p style={{ fontFamily: SERIF, fontStyle: "italic" }} className="text-xl mb-4 text-white/60">
              No chart in the instrument.
            </p>
            <p className="text-sm mb-6" style={{ color: "rgba(234,230,244,0.4)" }}>
              Calculate your natal chart first — the marriage technique reads from your Moon.
            </p>
            <Link href="/dashboard/chart"
              style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: "#C8A55B" }}>
              OPEN CHART →
            </Link>
          </div>
        )}

        {/* Marriage cards — progressive reveal */}
        {profileId && chart && (
          <div className="space-y-8">
            {visible.map(sig => (
              <MarriageCard
                key={`${sig.marriage}`}
                sig={sig}
                chart={chart}
                profileId={profileId}
                mode={mode}
                isLatestUnlocked={sig.marriage === unlocked}
                canUnlockNext={unlocked < 4}
                onUnlockNext={() => setUnlocked(unlockNextMarriage(profileId))}
              />
            ))}
          </div>
        )}

        {/* Archive link */}
        {profileId && chart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="mt-12 text-center">
            <Link href="/dashboard/marriages/archive"
              className="hover:opacity-80 transition-opacity"
              style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.2em", color: "rgba(234,230,244,0.35)" }}>
              PAST READINGS →
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
