"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardBg } from "@/components/ui/DashboardBg";
import {
  SIGN_SYMBOLS, PLANET_SYMBOLS, ZODIAC_SIGNS, TRADITIONAL_RULERS,
} from "@/lib/astrology/types";
import type { ChartData, ZodiacSign, PlanetName } from "@/lib/astrology/types";
import { getActiveProfileId, getProfile, getCachedChart, getOraclePersona } from "@/lib/storage";
import type { StoredProfile } from "@/lib/storage";
import {
  buildZRData, buildL1Periods, buildSubPeriods, signHouseDiff,
  ZR_MINOR_YEARS, ZR_TOTAL_YEARS,
} from "@/lib/astrology/zodiacalReleasing";
import type { ZRPeriod } from "@/lib/astrology/zodiacalReleasing";

// ─── Constants ────────────────────────────────────────────────────────────────

const SIGN_COLORS: Record<ZodiacSign, string> = {
  Aries: "#ef4444", Taurus: "#22c55e", Gemini: "#eab308", Cancer: "#38bdf8",
  Leo: "#f97316", Virgo: "#4ade80", Libra: "#facc15", Scorpio: "#dc2626",
  Sagittarius: "#f59e0b", Capricorn: "#94a3b8", Aquarius: "#06b6d4", Pisces: "#8b5cf6",
};

const PLANET_COLORS: Partial<Record<PlanetName, string>> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#8b5cf6",
};

const HOUSE_THEMES: Record<number, string> = {
  1: "Identity & Self", 2: "Resources & Values", 3: "Mind & Communication",
  4: "Home & Roots", 5: "Creativity & Pleasure", 6: "Health & Service",
  7: "Partnership & Other", 8: "Transformation & Depth", 9: "Wisdom & Expansion",
  10: "Career & Legacy", 11: "Community & Vision", 12: "Shadow & Retreat",
};

const LEVEL_COLORS = ["#06b6d4", "#a78bfa", "#f472b6", "#f59e0b"];
const LEVEL_LABELS = ["L1 · MAJOR PERIOD", "L2 · MINOR PERIOD", "L3 · SUB-MINOR", "L4 · FINE GRAIN"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function fmtDuration(years: number): string {
  if (years >= 1) {
    const y = Math.floor(years);
    const m = Math.round((years - y) * 12);
    if (m === 0) return `${y} yr${y !== 1 ? "s" : ""}`;
    return `${y}y ${m}m`;
  }
  const months = years * 12;
  if (months >= 1) {
    const m = Math.floor(months);
    const d = Math.round((months - m) * 30);
    if (d === 0) return `${m} mo`;
    return `${m}mo ${d}d`;
  }
  const days = Math.round(years * 365.25);
  return `${days} days`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LevelPill({ level, active, onClick }: {
  level: 1 | 2 | 3 | 4;
  active: boolean;
  onClick: () => void;
}) {
  const color = LEVEL_COLORS[level - 1];
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-bold tracking-widest cursor-pointer transition-all duration-200"
      style={{
        background: active ? `${color}25` : "transparent",
        color: active ? color : "#334155",
        border: active ? `1px solid ${color}50` : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      L{level}
    </motion.button>
  );
}

function LooseningBadge() {
  return (
    <motion.span
      animate={{ opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="text-[11px] font-bold tracking-widest px-2 py-0.5 rounded flex-shrink-0"
      style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.35)" }}
    >
      ⟳ LOOSENING
    </motion.span>
  );
}

function CurrentCascade({ l1, l2, l3, l4 }: {
  l1?: ZRPeriod;
  l2?: ZRPeriod;
  l3?: ZRPeriod;
  l4?: ZRPeriod;
}) {
  const periods = [l1, l2, l3, l4].filter(Boolean) as ZRPeriod[];
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {periods.map((p, i) => {
        const color = SIGN_COLORS[p.sign];
        const levelColor = LEVEL_COLORS[p.level - 1];
        return (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[13px]" style={{ color: "#1e293b" }}>→</span>}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
              style={{
                background: `${color}10`,
                border: `1px solid ${color}30`,
              }}
            >
              <span className="text-[11px] font-bold tracking-widest" style={{ color: levelColor }}>L{p.level}</span>
              <span className="text-base" style={{ color }}>{SIGN_SYMBOLS[p.sign]}</span>
              <span className="text-[13px] font-semibold" style={{ color }}>{p.sign}</span>
              {p.isLooseningOfBonds && <span className="text-[11px]" style={{ color: "#f59e0b" }}>⟳</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PeriodBar({ periods, onHover }: { periods: ZRPeriod[]; onHover?: (p: ZRPeriod | null) => void }) {
  if (!periods.length) return null;
  const totalMs = periods.reduce((s, p) => s + (p.end.getTime() - p.start.getTime()), 0);

  return (
    <div className="flex h-3 rounded-full overflow-hidden w-full" style={{ gap: 1 }}>
      {periods.map((p, i) => {
        const w = ((p.end.getTime() - p.start.getTime()) / totalMs) * 100;
        const color = SIGN_COLORS[p.sign];
        return (
          <motion.div
            key={i}
            className="h-full cursor-pointer relative"
            style={{
              width: `${w}%`,
              background: p.isCurrent ? color : p.isPast ? `${color}30` : `${color}50`,
              boxShadow: p.isCurrent ? `0 0 8px ${color}80` : "none",
              flexShrink: 0,
            }}
            whileHover={{ scaleY: 1.5 }}
            onMouseEnter={() => onHover?.(p)}
            onMouseLeave={() => onHover?.(null)}
          />
        );
      })}
    </div>
  );
}

function PeriodCard({
  period,
  parentSign,
  isSelected,
  onClick,
  profectionSign,
}: {
  period: ZRPeriod;
  parentSign?: ZodiacSign;
  isSelected: boolean;
  onClick: () => void;
  profectionSign?: ZodiacSign;
}) {
  const color = SIGN_COLORS[period.sign];
  const lord = TRADITIONAL_RULERS[period.sign];
  const lordColor = PLANET_COLORS[lord] ?? "#94a3b8";
  const profectionHouse = profectionSign ? signHouseDiff(profectionSign, period.sign) : null;
  const profectionColor = profectionSign ? SIGN_COLORS[profectionSign] : "#f59e0b";

  return (
    <motion.button
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200"
      style={{
        background: isSelected
          ? `${color}12`
          : period.isCurrent
          ? `${color}08`
          : "rgba(255,255,255,0.02)",
        border: isSelected
          ? `1px solid ${color}35`
          : period.isCurrent
          ? `1px solid ${color}20`
          : "1px solid rgba(255,255,255,0.04)",
        borderLeft: period.isCurrent
          ? `3px solid ${color}`
          : period.isLooseningOfBonds
          ? "3px solid #f59e0b"
          : `3px solid ${color}30`,
      }}
    >
      {/* Current pulse */}
      {period.isCurrent && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        />
      )}
      {!period.isCurrent && (
        <div className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: period.isPast ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)" }}
        />
      )}

      {/* Sign glyph */}
      <span className="text-lg flex-shrink-0 mt-0.5" style={{ color }}>{SIGN_SYMBOLS[period.sign]}</span>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-bold" style={{ color: period.isCurrent ? color : "#94a3b8" }}>
            {period.sign}
          </span>
          {period.isCurrent && (
            <span className="text-[11px] font-bold tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: `${color}20`, color }}>
              NOW
            </span>
          )}
          {period.isLooseningOfBonds && <LooseningBadge />}
          {parentSign && !period.isLooseningOfBonds && (
            <span className="text-[11px] font-bold tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: "rgba(255,255,255,0.05)", color: "#475569" }}>
              H{period.derivedHouse} ZR
            </span>
          )}
          {/* Profection-relative house (derivative relativity) */}
          {profectionHouse && profectionSign && (
            <span
              className="text-[11px] font-bold tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: `${profectionColor}15`, color: profectionColor, border: `1px solid ${profectionColor}30` }}
              title={`H${profectionHouse} relative to this year's profection sign (${profectionSign})`}
            >
              H{profectionHouse} {SIGN_SYMBOLS[profectionSign]}
            </span>
          )}
        </div>
        <p className="text-[13px] mt-0.5" style={{ color: "#475569" }}>
          {fmtDate(period.start)} → {fmtDate(period.end)} · {fmtDuration(period.years)}
        </p>
        {parentSign && (
          <p className="text-[13px] mt-0.5" style={{ color: "#334155" }}>
            {HOUSE_THEMES[period.derivedHouse] ?? ""}
            {profectionHouse && profectionSign && (
              <span style={{ color: "#1e293b" }}>
                {" "}· <span style={{ color: profectionColor }}>{HOUSE_THEMES[profectionHouse]}</span> this year
              </span>
            )}
          </p>
        )}
      </div>

      {/* Lord */}
      <div className="flex-shrink-0 text-right">
        <span className="text-sm" style={{ color: lordColor }}>{PLANET_SYMBOLS[lord]}</span>
        <p className="text-[11px] font-bold" style={{ color: lordColor }}>{lord}</p>
      </div>
    </motion.button>
  );
}

// ─── Reading Panel ────────────────────────────────────────────────────────────

function ReadingPanel({
  period,
  chain,
  chart,
  lot,
  onClose,
  profectionSign,
}: {
  period: ZRPeriod;
  chain: ZRPeriod[];
  chart: ChartData;
  lot: "fortune" | "spirit";
  onClose: () => void;
  profectionSign?: ZodiacSign;
}) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [started, setStarted] = useState(false);
  const color = SIGN_COLORS[period.sign];
  const lord = TRADITIONAL_RULERS[period.sign];
  const lordColor = PLANET_COLORS[lord] ?? "#94a3b8";

  const generate = () => {
    if (streaming) return;
    setStarted(true);
    setStreaming(true);
    setText("");

    const lotLon = lot === "fortune" ? chart.lotOfFortune : chart.lotOfSpirit;
    const lotSign = ZODIAC_SIGNS[Math.floor(lotLon / 30)];

    const chainDesc = chain.map((p, i) => {
      const lines = [`L${p.level} ${p.sign} (${fmtDate(p.start)} – ${fmtDate(p.end)})`];
      if (i > 0) lines.push(`H${p.derivedHouse} of L${chain[i - 1].level}: ${HOUSE_THEMES[p.derivedHouse]}`);
      if (p.isLooseningOfBonds) lines.push("⚠ LOOSENING OF BONDS — L2 in opposition to L1");
      return lines.join(" · ");
    }).join("\n  ");

    const looseningNote = chain.some(p => p.isLooseningOfBonds)
      ? "\n\nLOOSENING OF BONDS IS ACTIVE: The current L2 period is in the 7th sign (opposition) from the L1 period. In Hellenistic astrology, this is a classic marker of major life restructuring — old bonds, obligations, or identities releasing. The soul is being repositioned."
      : "";

    const sun = chart.planets.find(p => p.name === "Sun");
    const moon = chart.planets.find(p => p.name === "Moon");

    const profHouse = profectionSign ? signHouseDiff(profectionSign, period.sign) : null;
    const profectionLayer = profectionSign && profHouse
      ? `\nDERIVATIVE RELATIVITY (PROFECTION OVERLAY):
Current profection year: Age ${chart.annualProfection.age}, H${chart.annualProfection.activatedHouse} (${profectionSign}) activated — lord of year: ${chart.annualProfection.lordOfYear}
${period.sign} is H${profHouse} counted from this year's profection sign (${profectionSign})
Profection-relative theme: ${HOUSE_THEMES[profHouse]}
This means: the ZR period's general themes are filtered THIS year through a ${HOUSE_THEMES[profHouse].toLowerCase()} lens because the profection wheel has placed ${profectionSign} as the current frame of reference. What is permanently true about this ZR period shifts in emphasis to "${HOUSE_THEMES[profHouse]}" this year specifically.`
      : "";

    const prompt = `You are a traditional Hellenistic astrologer interpreting a Zodiacal Releasing chart.

LOT OF ${lot.toUpperCase()}: ${lotSign}
NESTED TIMING CHAIN:
  ${chainDesc}${looseningNote}${profectionLayer}

NATAL CONTEXT:
- Sun: ${sun?.sign ?? "?"} H${sun?.house ?? "?"}
- Moon: ${moon?.sign ?? "?"} H${moon?.house ?? "?"}
- Sect: ${chart.sect}

READING REQUESTED FOR: L${period.level} ${period.sign} period
${period.level > 1 ? `ZR derived house: H${period.derivedHouse} of parent (${HOUSE_THEMES[period.derivedHouse]}).` : ""}
${profHouse && profectionSign ? `Profection-relative house: H${profHouse} from ${profectionSign} (${HOUSE_THEMES[profHouse]}) — THIS YEAR'S specific lens.` : ""}

Interpret this timing window in 3 focused paragraphs:
1. What life area and themes this period activates based on its sign, derived house position, and ${lord} as its lord — be specific to the natal context
2. ${profHouse && profectionSign ? `How the DERIVATIVE RELATIVITY shifts the emphasis: the ZR period reads as "${HOUSE_THEMES[period.derivedHouse]}" generally, but the profection wheel this year places the focus on "${HOUSE_THEMES[profHouse]}" — explain how these two lenses compound` : `What the ${period.level > 1 ? `nested quality (H${period.derivedHouse} of the ${chain[period.level - 2]?.sign ?? "parent"} chapter)` : "overarching chapter theme"} means for this person's lived experience right now`}
3. What to lean into, what to watch for, and ${period.isLooseningOfBonds ? "what specifically is being released or restructured in this loosening of bonds period" : "one key actionable insight for this window"}

Under 280 words. Be specific to the placements shown.`;

    let fullText = "";
    const persona = getOraclePersona();
    fetch("/api/oracle/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, maxTokens: 500, persona }),
    }).then(async (res) => {
      if (!res.ok || !res.body) { setStreaming(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setText(fullText);
      }
      setStreaming(false);
    }).catch(() => setStreaming(false));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full"
      style={{
        background: "rgba(4,4,20,0.97)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Panel header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl" style={{ color }}>{SIGN_SYMBOLS[period.sign]}</span>
          <div>
            <p className="text-[11px] font-bold tracking-widest" style={{ color: LEVEL_COLORS[period.level - 1] }}>
              {LEVEL_LABELS[period.level - 1]}
            </p>
            <p className="text-[15px] font-bold" style={{ color }}>{period.sign}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
          style={{ background: "rgba(255,255,255,0.05)", color: "#475569" }}
        >
          ×
        </button>
      </div>

      {/* Period info */}
      <div className="flex-shrink-0 px-4 py-3 space-y-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px]" style={{ color: "#475569" }}>
            {fmtDate(period.start)} → {fmtDate(period.end)}
          </span>
          <span className="text-[13px]" style={{ color: "#334155" }}>·</span>
          <span className="text-[13px]" style={{ color: "#64748b" }}>{fmtDuration(period.years)}</span>
          {period.isCurrent && (
            <span className="text-[11px] font-bold tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: `${color}20`, color }}>
              ACTIVE NOW
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div>
            <p className="text-[11px] tracking-widest font-bold" style={{ color: "#334155" }}>LORD</p>
            <div className="flex items-center gap-1.5">
              <span style={{ color: lordColor }}>{PLANET_SYMBOLS[lord]}</span>
              <span className="text-[13px] font-bold" style={{ color: lordColor }}>{lord}</span>
            </div>
          </div>
          {period.level > 1 && (
            <div>
              <p className="text-[11px] tracking-widest font-bold" style={{ color: "#334155" }}>DERIVED HOUSE</p>
              <p className="text-[13px] font-bold" style={{ color: LEVEL_COLORS[period.level - 1] }}>H{period.derivedHouse}</p>
            </div>
          )}
          {period.level > 1 && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] tracking-widest font-bold" style={{ color: "#334155" }}>ACTIVATES</p>
              <p className="text-[13px]" style={{ color: "#64748b" }}>{HOUSE_THEMES[period.derivedHouse]}</p>
            </div>
          )}
        </div>

        {period.isLooseningOfBonds && (
          <motion.div
            animate={{ borderColor: ["rgba(245,158,11,0.2)", "rgba(245,158,11,0.5)", "rgba(245,158,11,0.2)"] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="rounded-xl p-3"
            style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.3)" }}
          >
            <p className="text-[12px] font-bold tracking-widest mb-1" style={{ color: "#f59e0b" }}>
              ⟳ LOOSENING OF BONDS
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "#92400e" }}>
              L2 {period.sign} sits in the 7th sign from L1 {chain[0]?.sign ?? ""}. In traditional Hellenistic timing, this opposition marks a major life pivot — structures dissolve, identities release, and a fundamental repositioning is underway.
            </p>
          </motion.div>
        )}
      </div>

      {/* Timing chain */}
      {chain.length > 1 && (
        <div className="flex-shrink-0 px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-[11px] font-bold tracking-widest mb-2" style={{ color: "#1e293b" }}>NESTED CHAIN</p>
          <div className="flex flex-wrap gap-1 items-center">
            {chain.map((p, i) => {
              const c = SIGN_COLORS[p.sign];
              return (
                <div key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-[11px]" style={{ color: "#1e293b" }}>›</span>}
                  <span
                    className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: `${c}15`,
                      color: p === period ? c : `${c}80`,
                      border: p === period ? `1px solid ${c}40` : "1px solid transparent",
                    }}
                  >
                    L{p.level} {SIGN_SYMBOLS[p.sign]} {p.sign}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reading area */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: "thin" }}>
        {!started ? (
          <div className="space-y-3">
            <p className="text-[13px]" style={{ color: "#475569" }}>
              {period.level === 1
                ? `AI reading for the ${period.sign} L1 major period — the overarching life chapter ruled by ${lord}.`
                : `AI reading for ${period.sign} at L${period.level} — H${period.derivedHouse} (${HOUSE_THEMES[period.derivedHouse]}) of the ${chain[period.level - 2]?.sign ?? "parent"} chapter.`}
            </p>
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: `0 0 24px ${color}25` }}
              whileTap={{ scale: 0.97 }}
              onClick={generate}
              className="w-full py-2.5 rounded-xl text-[13px] font-bold tracking-widest cursor-pointer"
              style={{
                background: `${color}15`,
                border: `1px solid ${color}35`,
                color,
              }}
            >
              ✦ GENERATE READING
            </motion.button>
          </div>
        ) : !text && streaming ? (
          <div className="flex items-center gap-3 py-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-3 h-3 rounded-full border border-t-transparent flex-shrink-0"
              style={{ borderColor: color }}
            />
            <span className="text-[13px]" style={{ color: "#475569" }}>Consulting the stars…</span>
          </div>
        ) : (
          <div className="space-y-3">
            {text.split("\n\n").filter(Boolean).map((para, i) => (
              <p key={i} className="text-[14px] leading-relaxed" style={{ color: "#94a3b8" }}>
                {para}
                {streaming && i === text.split("\n\n").filter(Boolean).length - 1 && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                    className="inline-block ml-0.5 w-0.5 h-3.5 align-middle rounded-full"
                    style={{ background: color }}
                  />
                )}
              </p>
            ))}
            {!streaming && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => { setText(""); setStarted(false); }}
                className="mt-2 px-3 py-1.5 rounded-lg text-[12px] font-bold tracking-widest cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", color: "#475569", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                REGENERATE ↺
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReleasingPage() {
  const [chart, setChart] = useState<ChartData | null>(null);
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Lot selector
  const [lot, setLot] = useState<"fortune" | "spirit">("fortune");

  // Level navigation
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3 | 4>(1);

  // Drill-down state: which period at each level is "selected" (for showing its sub-periods)
  const [drilledL1, setDrilledL1] = useState<ZRPeriod | null>(null);
  const [drilledL2, setDrilledL2] = useState<ZRPeriod | null>(null);
  const [drilledL3, setDrilledL3] = useState<ZRPeriod | null>(null);

  // Selected period for reading
  const [selectedPeriod, setSelectedPeriod] = useState<ZRPeriod | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setLoading(false); return; }
    setProfile(getProfile(id));
    setChart(getCachedChart(id));
    setLoading(false);
  }, []);

  const lotLon = useMemo(() => {
    if (!chart) return 0;
    return lot === "fortune" ? chart.lotOfFortune : chart.lotOfSpirit;
  }, [chart, lot]);

  // Derivative relativity: current profection year sign rotates the ZR reading
  const profectionSign = chart?.annualProfection.activatedSign;

  // L1 periods
  const l1 = useMemo(() => {
    if (!chart) return [];
    return buildL1Periods(lotLon, chart.birthDatetime);
  }, [chart, lotLon]);

  const currentL1 = useMemo(() => l1.find(p => p.isCurrent), [l1]);

  // Effective drill context (falls back to current)
  const effectiveL1 = drilledL1 ?? currentL1;

  // L2 periods within effectiveL1
  const l2 = useMemo(() => {
    if (!effectiveL1) return [];
    return buildSubPeriods(effectiveL1, 2);
  }, [effectiveL1]);

  const currentL2 = useMemo(() => l2.find(p => p.isCurrent), [l2]);
  const effectiveL2 = drilledL2 ?? currentL2;

  // L3 periods within effectiveL2
  const l3 = useMemo(() => {
    if (!effectiveL2) return [];
    return buildSubPeriods(effectiveL2, 3);
  }, [effectiveL2]);

  const currentL3 = useMemo(() => l3.find(p => p.isCurrent), [l3]);
  const effectiveL3 = drilledL3 ?? currentL3;

  // L4 periods within effectiveL3
  const l4 = useMemo(() => {
    if (!effectiveL3) return [];
    return buildSubPeriods(effectiveL3, 4);
  }, [effectiveL3]);

  const currentL4 = useMemo(() => l4.find(p => p.isCurrent), [l4]);

  // The currently displayed periods for the active level
  const activePeriods = useMemo(() => {
    if (activeLevel === 1) return l1;
    if (activeLevel === 2) return l2;
    if (activeLevel === 3) return l3;
    return l4;
  }, [activeLevel, l1, l2, l3, l4]);

  // The parent period for the active level (used for "H# of parent" labels)
  const activeParentPeriod = useMemo(() => {
    if (activeLevel === 1) return null;
    if (activeLevel === 2) return effectiveL1;
    if (activeLevel === 3) return effectiveL2;
    return effectiveL3;
  }, [activeLevel, effectiveL1, effectiveL2, effectiveL3]);

  // Chain of periods leading to selectedPeriod
  const selectedChain = useMemo((): ZRPeriod[] => {
    if (!selectedPeriod) return [];
    const chain: ZRPeriod[] = [];
    if (effectiveL1) chain.push(effectiveL1);
    if (selectedPeriod.level === 1) return [selectedPeriod];
    if (effectiveL2 && selectedPeriod.level >= 2) {
      chain.push(effectiveL2);
      if (selectedPeriod.level === 2) {
        chain[chain.length - 1] = selectedPeriod;
        return chain;
      }
    }
    if (effectiveL3 && selectedPeriod.level >= 3) {
      if (chain.length > 1) chain.pop();
      chain.push(effectiveL2 ?? selectedPeriod);
      chain.push(effectiveL3);
      if (selectedPeriod.level === 3) {
        chain[chain.length - 1] = selectedPeriod;
        return chain;
      }
    }
    chain.push(selectedPeriod);
    return chain;
  }, [selectedPeriod, effectiveL1, effectiveL2, effectiveL3]);

  // Simplified chain builder for reading panel
  const buildChainForPeriod = (p: ZRPeriod): ZRPeriod[] => {
    if (p.level === 1) return [p];
    if (p.level === 2) return [effectiveL1!, p].filter(Boolean);
    if (p.level === 3) return [effectiveL1!, effectiveL2!, p].filter(Boolean);
    return [effectiveL1!, effectiveL2!, effectiveL3!, p].filter(Boolean);
  };

  const handlePeriodClick = (p: ZRPeriod) => {
    setSelectedPeriod(p);
    // Drill down to show sub-periods
    if (p.level === 1) {
      setDrilledL1(p);
      setDrilledL2(null);
      setDrilledL3(null);
      setActiveLevel(2);
    } else if (p.level === 2) {
      setDrilledL2(p);
      setDrilledL3(null);
      setActiveLevel(3);
    } else if (p.level === 3) {
      setDrilledL3(p);
      setActiveLevel(4);
    }
  };

  // ─── Empty states ───────────────────────────────────────────────────────────
  if (!loading && !chart) {
    return (
      <div className="h-screen flex overflow-hidden" style={{ background: "#00000f" }}>
        <DashboardBg />
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 md:ml-[68px] mb-[60px] md:mb-0 px-6">
          <div className="text-center">
            <p className="text-[14px] font-bold tracking-[0.2em] mb-2" style={{ color: "#334155" }}>NO CHART DATA</p>
            <p className="text-[14px] max-w-xs mx-auto mb-4" style={{ color: "#475569" }}>Enter your birth data to unlock Zodiacal Releasing.</p>
          </div>
          <Link href="/onboarding">
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="px-6 py-3 rounded-xl text-[14px] font-bold tracking-wider cursor-pointer"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white", border: "1px solid rgba(124,58,237,0.4)" }}
            >
              Begin Your Chart →
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  const lotLonDisplay = lotLon;
  const lotSignDisplay = ZODIAC_SIGNS[Math.floor(lotLonDisplay / 30)] as ZodiacSign;
  const lotColor = SIGN_COLORS[lotSignDisplay];

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#00000f" }}>
      <DashboardBg />
      <div className="nebula-orb" style={{ width: 500, height: 500, left: "-5%", top: "-10%", background: "rgba(6,182,212,0.04)", filter: "blur(100px)" }} />
      <div className="nebula-orb" style={{ width: 400, height: 400, right: "0%", bottom: "0%", background: "rgba(124,58,237,0.04)", filter: "blur(80px)" }} />

      <Sidebar />

      <div className="flex-1 flex min-h-0 min-w-0 md:ml-[68px] mb-[60px] md:mb-0 relative z-10">

        {/* ── LEFT/CENTER PANEL ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">

          {/* Top bar */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-3"
            style={{
              borderBottom: "1px solid rgba(6,182,212,0.1)",
              background: "rgba(1,1,14,0.85)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer"
                  style={{ color: "#64748b" }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                  Dashboard
                </motion.button>
              </Link>
              <span style={{ color: "#1e293b" }}>/</span>
              <span className="text-[13px] font-bold tracking-widest" style={{ color: "#06b6d4" }}>ZODIACAL RELEASING</span>
            </div>

            {/* Lot toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {(["fortune", "spirit"] as const).map(l => (
                <motion.button
                  key={l}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setLot(l);
                    setDrilledL1(null);
                    setDrilledL2(null);
                    setDrilledL3(null);
                    setActiveLevel(1);
                    setSelectedPeriod(null);
                  }}
                  className="px-3 py-1 rounded-lg text-[12px] font-bold tracking-widest cursor-pointer transition-all duration-200"
                  style={{
                    background: lot === l ? (l === "fortune" ? "rgba(6,182,212,0.2)" : "rgba(139,92,246,0.2)") : "transparent",
                    color: lot === l ? (l === "fortune" ? "#06b6d4" : "#8b5cf6") : "#334155",
                    border: lot === l ? `1px solid ${l === "fortune" ? "rgba(6,182,212,0.4)" : "rgba(139,92,246,0.4)"}` : "1px solid transparent",
                  }}
                >
                  {l === "fortune" ? "☽ FORTUNE" : "☉ SPIRIT"}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            <div className="px-4 md:px-6 py-5 max-w-3xl">

              {/* Lot info + explainer */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 mb-5"
                style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.15)" }}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <p className="text-[13px] font-bold tracking-widest mb-1" style={{ color: "#06b6d4" }}>
                      ZODIACAL RELEASING · LOT OF {lot.toUpperCase()}
                    </p>
                    <p className="text-[13px] leading-relaxed" style={{ color: "#64748b" }}>
                      A Hellenistic timing system dividing life into nested sign-periods. L1 defines the overarching life chapter. L2 within L1 fine-tunes the theme. L3 and L4 reveal precise windows within the broader arc. When L2 reaches the 7th sign from L1, the <span style={{ color: "#f59e0b" }}>Loosening of Bonds</span> activates — a major life transition.
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0"
                    style={{ background: `${lotColor}12`, border: `1px solid ${lotColor}30` }}
                  >
                    <span className="text-xl" style={{ color: lotColor }}>{SIGN_SYMBOLS[lotSignDisplay]}</span>
                    <div>
                      <p className="text-[11px] font-bold tracking-widest" style={{ color: "#475569" }}>
                        LOT OF {lot.toUpperCase()}
                      </p>
                      <p className="text-[14px] font-bold" style={{ color: lotColor }}>
                        {lotSignDisplay} {(lotLonDisplay % 30).toFixed(1)}°
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Current cascade display */}
              {currentL1 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="mb-5"
                >
                  <p className="text-[11px] font-bold tracking-widest mb-2" style={{ color: "#334155" }}>CURRENT TIMING</p>
                  <CurrentCascade
                    l1={currentL1}
                    l2={currentL2}
                    l3={currentL3 ?? undefined}
                    l4={currentL4 ?? undefined}
                  />
                  {(currentL2?.isLooseningOfBonds) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex items-start gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}
                    >
                      <motion.span
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="text-base flex-shrink-0 mt-0.5"
                        style={{ color: "#f59e0b" }}
                      >
                        ⟳
                      </motion.span>
                      <div>
                        <p className="text-[13px] font-bold" style={{ color: "#f59e0b" }}>Loosening of Bonds is Active</p>
                        <p className="text-[13px]" style={{ color: "#92400e" }}>
                          L2 {currentL2?.sign} is in the 7th sign from L1 {currentL1?.sign} — a Hellenistic marker of major life repositioning. Old structures are releasing; a fundamental pivot is underway.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Derivative Relativity panel */}
              {profectionSign && chart && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="rounded-2xl p-3 mb-5"
                  style={{ background: `${SIGN_COLORS[profectionSign]}08`, border: `1px solid ${SIGN_COLORS[profectionSign]}20` }}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold tracking-widest mb-1" style={{ color: SIGN_COLORS[profectionSign] }}>
                        ◑ DERIVATIVE RELATIVITY · PROFECTION OVERLAY
                      </p>
                      <p className="text-[13px] leading-relaxed" style={{ color: "#475569" }}>
                        Age {chart.annualProfection.age} · H{chart.annualProfection.activatedHouse} activated this year.
                        Each ZR period is also read as a house counted from{" "}
                        <span style={{ color: SIGN_COLORS[profectionSign] }}>{SIGN_SYMBOLS[profectionSign]} {profectionSign}</span>{" "}
                        as the new frame of reference — showing <em>this year&apos;s specific emphasis</em> within the ZR arc.
                        The gold badge on each period is its house from {profectionSign}.
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl flex-shrink-0"
                      style={{ background: `${SIGN_COLORS[profectionSign]}15`, border: `1px solid ${SIGN_COLORS[profectionSign]}30` }}
                    >
                      <span className="text-base" style={{ color: SIGN_COLORS[profectionSign] }}>{SIGN_SYMBOLS[profectionSign]}</span>
                      <div>
                        <p className="text-[10px] font-bold tracking-widest" style={{ color: "#475569" }}>THIS YEAR</p>
                        <p className="text-[13px] font-bold" style={{ color: SIGN_COLORS[profectionSign] }}>{profectionSign}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Level tabs */}
              <div className="flex items-center gap-1 mb-4">
                {([1, 2, 3, 4] as const).map(lvl => (
                  <LevelPill
                    key={lvl}
                    level={lvl}
                    active={activeLevel === lvl}
                    onClick={() => setActiveLevel(lvl)}
                  />
                ))}

                {/* Breadcrumb showing drill context */}
                {(drilledL1 || drilledL2 || drilledL3) && (
                  <div className="flex items-center gap-1 ml-2 overflow-hidden">
                    <span className="text-[11px]" style={{ color: "#1e293b" }}>|</span>
                    {effectiveL1 && activeLevel >= 2 && (
                      <button
                        onClick={() => {
                          setActiveLevel(1);
                          setDrilledL1(null); setDrilledL2(null); setDrilledL3(null);
                        }}
                        className="text-[11px] font-bold px-1.5 py-0.5 rounded cursor-pointer"
                        style={{ color: SIGN_COLORS[effectiveL1.sign], background: `${SIGN_COLORS[effectiveL1.sign]}12` }}
                      >
                        {SIGN_SYMBOLS[effectiveL1.sign]} {effectiveL1.sign}
                      </button>
                    )}
                    {effectiveL2 && activeLevel >= 3 && (
                      <>
                        <span className="text-[11px]" style={{ color: "#1e293b" }}>›</span>
                        <button
                          onClick={() => { setActiveLevel(2); setDrilledL2(null); setDrilledL3(null); }}
                          className="text-[11px] font-bold px-1.5 py-0.5 rounded cursor-pointer"
                          style={{ color: SIGN_COLORS[effectiveL2.sign], background: `${SIGN_COLORS[effectiveL2.sign]}12` }}
                        >
                          {SIGN_SYMBOLS[effectiveL2.sign]} {effectiveL2.sign}
                        </button>
                      </>
                    )}
                    {effectiveL3 && activeLevel === 4 && (
                      <>
                        <span className="text-[11px]" style={{ color: "#1e293b" }}>›</span>
                        <button
                          onClick={() => { setActiveLevel(3); setDrilledL3(null); }}
                          className="text-[11px] font-bold px-1.5 py-0.5 rounded cursor-pointer"
                          style={{ color: SIGN_COLORS[effectiveL3.sign], background: `${SIGN_COLORS[effectiveL3.sign]}12` }}
                        >
                          {SIGN_SYMBOLS[effectiveL3.sign]} {effectiveL3.sign}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Level label */}
              <div className="mb-3">
                <p className="text-[11px] font-bold tracking-widest mb-1" style={{ color: LEVEL_COLORS[activeLevel - 1] }}>
                  {LEVEL_LABELS[activeLevel - 1]}
                  {activeParentPeriod && (
                    <span style={{ color: "#334155" }}> · within {activeParentPeriod.sign}</span>
                  )}
                </p>
                {activeLevel >= 2 && activeParentPeriod && (
                  <p className="text-[13px]" style={{ color: "#475569" }}>
                    Sub-periods counted from {SIGN_SYMBOLS[activeParentPeriod.sign]} {activeParentPeriod.sign} as H1 — showing which area of the {activeParentPeriod.sign} chapter each period activates
                  </p>
                )}
              </div>

              {/* Timeline bar */}
              <div className="mb-4">
                <PeriodBar periods={activePeriods} />
              </div>

              {/* Period list */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeLevel}-${effectiveL1?.sign}-${effectiveL2?.sign}-${effectiveL3?.sign}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1.5"
                >
                  {activePeriods.length === 0 ? (
                    <div className="text-center py-8" style={{ color: "#334155" }}>
                      <p className="text-[13px]">No periods found for this level. Select a period above to drill down.</p>
                    </div>
                  ) : (
                    activePeriods.map((p, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.025 }}
                      >
                        <PeriodCard
                          period={p}
                          parentSign={activeParentPeriod?.sign}
                          isSelected={selectedPeriod === p}
                          onClick={() => handlePeriodClick(p)}
                          profectionSign={profectionSign}
                        />
                      </motion.div>
                    ))
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Click hint */}
              {activePeriods.length > 0 && (
                <p className="text-center text-[12px] mt-4" style={{ color: "#1e293b" }}>
                  Click any period to drill into sub-periods and get an AI reading ↓
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (reading) ──────────────────────────────────────────── */}
        <AnimatePresence>
          {selectedPeriod && chart && (
            <motion.div
              ref={panelRef}
              key="reading-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-shrink-0 overflow-hidden hidden md:flex flex-col"
              style={{ maxWidth: 360 }}
            >
              <ReadingPanel
                period={selectedPeriod}
                chain={buildChainForPeriod(selectedPeriod)}
                chart={chart}
                lot={lot}
                onClose={() => setSelectedPeriod(null)}
                profectionSign={profectionSign}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
