"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { ProGate } from "@/components/ui/ProGate";
import {
  SIGN_SYMBOLS, PLANET_SYMBOLS, ZODIAC_SIGNS, TRADITIONAL_RULERS,
} from "@/lib/astrology/types";
import type { ChartData, ZodiacSign, PlanetName } from "@/lib/astrology/types";
import { getActiveProfileId, getProfile, getCachedChart, getOraclePersona } from "@/lib/storage";
import type { StoredProfile } from "@/lib/storage";
import { useClientSnapshot } from "@/lib/useClientSnapshot";
import {
  buildZRData, buildL1Periods, buildSubPeriods, signHouseDiff,
  ZR_MAX_LEVEL, ZR_HOUSE_THEMES,
} from "@/lib/astrology/zodiacalReleasing";
import type { ZRPeriod } from "@/lib/astrology/zodiacalReleasing";
import { FullReportCard } from "@/components/reports/FullReportCard";

// ─── Constants ────────────────────────────────────────────────────────────────

const SIGN_COLORS: Record<ZodiacSign, string> = {
  Aries: "#ef4444", Taurus: "#22c55e", Gemini: "#eab308", Cancer: "#38bdf8",
  Leo: "#f97316", Virgo: "#4ade80", Libra: "#facc15", Scorpio: "#dc2626",
  Sagittarius: "#f59e0b", Capricorn: "#94a3b8", Aquarius: "#06b6d4", Pisces: "#7B6FD4",
};

const PLANET_COLORS: Partial<Record<PlanetName, string>> = {
  Sun: "#fbbf24", Moon: "#BFB6E8", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#7B6FD4",
};

const LEVEL_COLORS = ["#06b6d4", "#a78bfa", "#f472b6", "#f59e0b", "#34d399", "#818cf8", "#fb7185", "#facc15"];
const LEVEL_LABELS = [
  "L1 · MAJOR PERIOD", "L2 · MINOR PERIOD", "L3 · SUB-PERIOD", "L4 · SUB-SUB-PERIOD",
  "L5 · FINE WINDOW", "L6 · FINER WINDOW", "L7 · PRECISE WINDOW", "L8 · EXACT WINDOW",
];

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

function periodKey(p: ZRPeriod): string {
  return `${p.level}-${p.sign}-${p.start.getTime()}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function CurrentCascade({ chain }: { chain: ZRPeriod[] }) {
  if (!chain.length) return null;
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {chain.map((p, i) => {
        const color = SIGN_COLORS[p.sign];
        const levelColor = LEVEL_COLORS[p.level - 1];
        return (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[13px]" style={{ color: "#1e293b" }}>→</span>}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
              style={{ background: `${color}10`, border: `1px solid ${color}30` }}
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

// ─── Tree table ───────────────────────────────────────────────────────────────

function ZRTreeRow({
  period, chain, expanded, onToggle, onSelect, isSelected, profectionSign, registerRef,
}: {
  period: ZRPeriod;
  chain: ZRPeriod[];
  expanded: Set<string>;
  onToggle: (key: string) => void;
  onSelect: (period: ZRPeriod, chain: ZRPeriod[]) => void;
  isSelected: (period: ZRPeriod) => boolean;
  profectionSign?: ZodiacSign;
  registerRef: (key: string, el: HTMLDivElement | null) => void;
}) {
  const key = periodKey(period);
  const isOpen = expanded.has(key);
  const canExpand = period.level < ZR_MAX_LEVEL;
  const children = useMemo(
    () => (isOpen && canExpand ? buildSubPeriods(period, period.level + 1) : []),
    [isOpen, canExpand, period]
  );

  const color = SIGN_COLORS[period.sign];
  const levelColor = LEVEL_COLORS[period.level - 1];
  const lord = TRADITIONAL_RULERS[period.sign];
  const lordColor = PLANET_COLORS[lord] ?? "#94a3b8";
  const selected = isSelected(period);
  const profHouse = profectionSign ? signHouseDiff(profectionSign, period.sign) : null;

  return (
    <>
      <motion.div
        ref={el => registerRef(key, el)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => onSelect(period, chain)}
        className="w-full text-left flex items-center gap-2 py-2 pr-3 rounded-lg cursor-pointer transition-colors"
        style={{
          paddingLeft: 8 + (period.level - 1) * 20,
          background: selected ? `${color}14` : period.isCurrent ? `${color}0A` : "transparent",
          borderLeft: period.isCurrent ? `2px solid ${color}` : period.isLooseningOfBonds ? "2px solid #f59e0b" : "2px solid transparent",
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); if (canExpand) onToggle(key); }}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded cursor-pointer text-[11px]"
          style={{ color: canExpand ? "#64748b" : "transparent", background: canExpand ? "rgba(255,255,255,0.04)" : "transparent" }}
        >
          {canExpand ? (isOpen ? "▾" : "▸") : ""}
        </button>

        <span className="text-[10px] font-bold tracking-wider flex-shrink-0 w-6" style={{ color: levelColor }}>L{period.level}</span>
        <span className="text-base flex-shrink-0" style={{ color }}>{SIGN_SYMBOLS[period.sign]}</span>
        <span className="text-[13px] font-bold flex-shrink-0 w-20" style={{ color: period.isCurrent ? color : "#94a3b8" }}>{period.sign}</span>

        <span className="text-[12px] flex-shrink-0 hidden sm:inline" style={{ color: "#475569" }}>
          {fmtDate(period.start)} → {fmtDate(period.end)}
        </span>
        <span className="text-[12px] flex-shrink-0" style={{ color: "#334155" }}>· {fmtDuration(period.years)}</span>

        <span className="text-[12px] truncate flex-1 hidden md:inline" style={{ color: "#334155" }}>
          {period.level > 1 ? ZR_HOUSE_THEMES[period.derivedHouse] : ""}
        </span>

        <span className="flex-shrink-0 flex items-center gap-1 ml-auto">
          {period.isCurrent && (
            <span className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color }}>NOW</span>
          )}
          {period.isLooseningOfBonds && <LooseningBadge />}
          {profHouse && profectionSign && (
            <span
              className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded hidden sm:inline"
              style={{ background: `${SIGN_COLORS[profectionSign]}15`, color: SIGN_COLORS[profectionSign] }}
              title={`H${profHouse} from this year's profection sign`}
            >
              H{profHouse}
            </span>
          )}
          <span className="text-[12px] w-6 text-right" style={{ color: lordColor }}>{PLANET_SYMBOLS[lord]}</span>
        </span>
      </motion.div>

      <AnimatePresence initial={false}>
        {isOpen && children.map((c) => (
          <ZRTreeRow
            key={periodKey(c)}
            period={c}
            chain={[...chain, c]}
            expanded={expanded}
            onToggle={onToggle}
            onSelect={onSelect}
            isSelected={isSelected}
            profectionSign={profectionSign}
            registerRef={registerRef}
          />
        ))}
      </AnimatePresence>
    </>
  );
}

// ─── Reading Panel ────────────────────────────────────────────────────────────

function ReadingPanel({
  period, chain, chart, lot, onClose, profectionSign,
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
      if (i > 0) lines.push(`H${p.derivedHouse} of L${chain[i - 1].level}: ${ZR_HOUSE_THEMES[p.derivedHouse]}`);
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
Profection-relative theme: ${ZR_HOUSE_THEMES[profHouse]}
This means: the ZR period's general themes are filtered THIS year through a ${ZR_HOUSE_THEMES[profHouse].toLowerCase()} lens because the profection wheel has placed ${profectionSign} as the current frame of reference. What is permanently true about this ZR period shifts in emphasis to "${ZR_HOUSE_THEMES[profHouse]}" this year specifically.`
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
${period.level > 1 ? `ZR derived house: H${period.derivedHouse} of parent (${ZR_HOUSE_THEMES[period.derivedHouse]}).` : ""}
${profHouse && profectionSign ? `Profection-relative house: H${profHouse} from ${profectionSign} (${ZR_HOUSE_THEMES[profHouse]}) — THIS YEAR'S specific lens.` : ""}

Interpret this timing window in 3 focused paragraphs:
1. What life area and themes this period activates based on its sign, derived house position, and ${lord} as its lord — be specific to the natal context
2. ${profHouse && profectionSign ? `How the DERIVATIVE RELATIVITY shifts the emphasis: the ZR period reads as "${ZR_HOUSE_THEMES[period.derivedHouse]}" generally, but the profection wheel this year places the focus on "${ZR_HOUSE_THEMES[profHouse]}" — explain how these two lenses compound` : `What the ${period.level > 1 ? `nested quality (H${period.derivedHouse} of the ${chain[period.level - 2]?.sign ?? "parent"} chapter)` : "overarching chapter theme"} means for this person's lived experience right now`}
3. What to lean into, what to watch for, and ${period.isLooseningOfBonds ? "what specifically is being released or restructured in this loosening of bonds period" : "one key actionable insight for this window"}

Under 280 words. Be specific to the placements shown.`;

    let fullText = "";
    const persona = getOraclePersona();
    fetch("/api/oracle/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, chart, maxTokens: 500, persona }),
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
      style={{ background: "rgba(4,4,20,0.97)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <span className="text-xl" style={{ color }}>{SIGN_SYMBOLS[period.sign]}</span>
          <div>
            <p className="text-[11px] font-bold tracking-widest" style={{ color: LEVEL_COLORS[period.level - 1] }}>
              {LEVEL_LABELS[period.level - 1]}
            </p>
            <p className="text-[15px] font-bold" style={{ color }}>{period.sign}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: "rgba(255,255,255,0.05)", color: "#475569" }}>×</button>
      </div>

      <div className="flex-shrink-0 px-4 py-3 space-y-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px]" style={{ color: "#475569" }}>{fmtDate(period.start)} → {fmtDate(period.end)}</span>
          <span className="text-[13px]" style={{ color: "#334155" }}>·</span>
          <span className="text-[13px]" style={{ color: "#64748b" }}>{fmtDuration(period.years)}</span>
          {period.isCurrent && (
            <span className="text-[11px] font-bold tracking-widest px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color }}>ACTIVE NOW</span>
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
              <p className="text-[13px]" style={{ color: "#64748b" }}>{ZR_HOUSE_THEMES[period.derivedHouse]}</p>
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
            <p className="text-[12px] font-bold tracking-widest mb-1" style={{ color: "#f59e0b" }}>⟳ LOOSENING OF BONDS</p>
            <p className="text-[13px] leading-relaxed" style={{ color: "#92400e" }}>
              L2 {period.sign} sits in the 7th sign from L1 {chain[0]?.sign ?? ""}. In traditional Hellenistic timing, this opposition marks a major life pivot — structures dissolve, identities release, and a fundamental repositioning is underway.
            </p>
          </motion.div>
        )}
      </div>

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
                    style={{ background: `${c}15`, color: p === period ? c : `${c}80`, border: p === period ? `1px solid ${c}40` : "1px solid transparent" }}
                  >
                    L{p.level} {SIGN_SYMBOLS[p.sign]} {p.sign}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: "thin" }}>
        {!started ? (
          <div className="space-y-3">
            <p className="text-[13px]" style={{ color: "#475569" }}>
              {period.level === 1
                ? `AI reading for the ${period.sign} L1 major period — the overarching life chapter ruled by ${lord}.`
                : `AI reading for ${period.sign} at L${period.level} — H${period.derivedHouse} (${ZR_HOUSE_THEMES[period.derivedHouse]}) of the ${chain[period.level - 2]?.sign ?? "parent"} chapter.`}
            </p>
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: `0 0 24px ${color}25` }}
              whileTap={{ scale: 0.97 }}
              onClick={generate}
              className="w-full py-2.5 rounded-xl text-[13px] font-bold tracking-widest cursor-pointer"
              style={{ background: `${color}15`, border: `1px solid ${color}35`, color }}
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

interface ReleasingPageData {
  profileId: string | null;
  profile: StoredProfile | null;
  chart: ChartData | null;
}

const EMPTY_RELEASING_DATA: ReleasingPageData = { profileId: null, profile: null, chart: null };

function readReleasingProfile(): ReleasingPageData {
  const id = getActiveProfileId();
  if (!id) return { profileId: null, profile: null, chart: null };
  return { profileId: id, profile: getProfile(id), chart: getCachedChart(id) };
}

export default function ReleasingPage() {
  const { value: data, loading } = useClientSnapshot(readReleasingProfile, EMPTY_RELEASING_DATA);
  const { profileId, chart } = data;

  const [lot, setLot] = useState<"fortune" | "spirit">("fortune");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<{ period: ZRPeriod; chain: ZRPeriod[] } | null>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const lotLon = useMemo(() => {
    if (!chart) return 0;
    return lot === "fortune" ? chart.lotOfFortune : chart.lotOfSpirit;
  }, [chart, lot]);

  const profectionSign = chart?.annualProfection.activatedSign;

  const zrData = useMemo(() => {
    if (!chart) return null;
    return buildZRData(lotLon, (chart as ChartData & { birthDatetime?: string }).birthDatetime ?? "");
  }, [chart, lotLon]);

  const l1 = useMemo(() => {
    if (!chart) return [];
    return buildL1Periods(lotLon, (chart as ChartData & { birthDatetime?: string }).birthDatetime ?? "");
  }, [chart, lotLon]);

  // Seed the expanded set to the current L1→L3 path (revealing the current L4 row)
  // so the page opens already showing "now" without forcing a click-chain first.
  // This is the React-documented "adjust state during render" pattern (a plain
  // useState previous-value check, not a ref — refs can't be read/written mid-render).
  const [seededLot, setSeededLot] = useState<string | null>(null);
  if (zrData && seededLot !== lot) {
    setSeededLot(lot);
    setExpanded(new Set(zrData.currentChain.slice(0, 3).map(periodKey)));
    setSelected(null);
  }

  const toggle = useCallback((key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const registerRef = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(key, el);
    else rowRefs.current.delete(key);
  }, []);

  const jumpToNow = () => {
    if (!zrData?.currentL1) return;
    const key = periodKey(zrData.currentL1);
    rowRefs.current.get(key)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // ─── Empty states ───────────────────────────────────────────────────────────
  if (!loading && !chart) {
    return (
      <div className="h-screen flex overflow-hidden">
        <DashboardBg />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 md:ml-[68px] mb-[60px] md:mb-0 px-6">
          <div className="text-center">
            <p className="text-[14px] font-bold tracking-[0.2em] mb-2" style={{ color: "#334155" }}>NO CHART DATA</p>
            <p className="text-[14px] max-w-xs mx-auto mb-4" style={{ color: "#475569" }}>Enter your birth data to unlock Zodiacal Releasing.</p>
          </div>
          <Link href="/onboarding">
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="px-6 py-3 rounded-xl text-[14px] font-bold tracking-wider cursor-pointer"
              style={{ background: "linear-gradient(135deg, #7B6FD4, #7B6FD4)", color: "white", border: "1px solid rgba(123,111,212,0.4)" }}
            >
              Begin Your Chart →
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  if (!chart || !zrData) return null;

  const lotLonDisplay = lotLon;
  const lotSignDisplay = ZODIAC_SIGNS[Math.floor(lotLonDisplay / 30)] as ZodiacSign;
  const lotColor = SIGN_COLORS[lotSignDisplay];

  return (
    <ProGate feature="Zodiacal Releasing">
    <div className="h-screen flex overflow-hidden">
      <DashboardBg />
      <div className="nebula-orb" style={{ width: 500, height: 500, left: "-5%", top: "-10%", background: "rgba(6,182,212,0.04)", filter: "blur(100px)" }} />
      <div className="nebula-orb" style={{ width: 400, height: 400, right: "0%", bottom: "0%", background: "rgba(123,111,212,0.04)", filter: "blur(80px)" }} />

      <div className="flex-1 flex min-h-0 min-w-0 md:ml-[68px] mb-[60px] md:mb-0 relative z-10">

        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">

          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex-shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-4 md:px-6 py-3"
            style={{ borderBottom: "1px solid rgba(6,182,212,0.1)", background: "rgba(1,1,14,0.85)", backdropFilter: "blur(20px)" }}
          >
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer" style={{ color: "#64748b" }}>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                  Dashboard
                </motion.button>
              </Link>
              <span style={{ color: "#1e293b" }}>/</span>
              <span className="text-[13px] font-bold tracking-widest" style={{ color: "#06b6d4" }}>ZODIACAL RELEASING</span>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={jumpToNow}
                className="px-3 py-1 rounded-lg text-[12px] font-bold tracking-widest cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                ↓ JUMP TO NOW
              </motion.button>
              <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {(["fortune", "spirit"] as const).map(l => (
                  <motion.button
                    key={l}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setLot(l); setSelected(null); }}
                    className="px-3 py-1 rounded-lg text-[12px] font-bold tracking-widest cursor-pointer transition-all duration-200"
                    style={{
                      background: lot === l ? (l === "fortune" ? "rgba(6,182,212,0.2)" : "rgba(139,92,246,0.2)") : "transparent",
                      color: lot === l ? (l === "fortune" ? "#06b6d4" : "#7B6FD4") : "#334155",
                      border: lot === l ? `1px solid ${l === "fortune" ? "rgba(6,182,212,0.4)" : "rgba(139,92,246,0.4)"}` : "1px solid transparent",
                    }}
                  >
                    {l === "fortune" ? "☽︎ FORTUNE" : "☉︎ SPIRIT"}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            <div className="px-4 md:px-6 py-5 max-w-3xl">

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
                      A Hellenistic timing system dividing life into nested sign-periods, as deep as L{ZR_MAX_LEVEL}. L1 defines the overarching life chapter; each level inside it fine-tunes the theme down to week-scale windows. When L2 reaches the 7th sign from L1, the <span style={{ color: "#f59e0b" }}>Loosening of Bonds</span> activates — a major life transition.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0" style={{ background: `${lotColor}12`, border: `1px solid ${lotColor}30` }}>
                    <span className="text-xl" style={{ color: lotColor }}>{SIGN_SYMBOLS[lotSignDisplay]}</span>
                    <div>
                      <p className="text-[11px] font-bold tracking-widest" style={{ color: "#475569" }}>LOT OF {lot.toUpperCase()}</p>
                      <p className="text-[14px] font-bold" style={{ color: lotColor }}>{lotSignDisplay} {(lotLonDisplay % 30).toFixed(1)}°</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {zrData.currentChain.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-5">
                  <p className="text-[11px] font-bold tracking-widest mb-2" style={{ color: "#334155" }}>CURRENT TIMING</p>
                  <CurrentCascade chain={zrData.currentChain} />
                  {zrData.currentL2?.isLooseningOfBonds && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex items-start gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}
                    >
                      <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-base flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }}>⟳</motion.span>
                      <div>
                        <p className="text-[13px] font-bold" style={{ color: "#f59e0b" }}>Loosening of Bonds is Active</p>
                        <p className="text-[13px]" style={{ color: "#92400e" }}>
                          L2 {zrData.currentL2?.sign} is in the 7th sign from L1 {zrData.currentL1?.sign} — a Hellenistic marker of major life repositioning. Old structures are releasing; a fundamental pivot is underway.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {profectionSign && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="rounded-2xl p-3 mb-5"
                  style={{ background: `${SIGN_COLORS[profectionSign]}08`, border: `1px solid ${SIGN_COLORS[profectionSign]}20` }}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold tracking-widest mb-1" style={{ color: SIGN_COLORS[profectionSign] }}>◑ DERIVATIVE RELATIVITY · PROFECTION OVERLAY</p>
                      <p className="text-[13px] leading-relaxed" style={{ color: "#475569" }}>
                        Age {chart.annualProfection.age} · H{chart.annualProfection.activatedHouse} activated this year.
                        Each ZR period is also read as a house counted from{" "}
                        <span style={{ color: SIGN_COLORS[profectionSign] }}>{SIGN_SYMBOLS[profectionSign]} {profectionSign}</span>{" "}
                        as the new frame of reference — showing <em>this year&apos;s specific emphasis</em> within the ZR arc. The gold badge on each row is its house from {profectionSign}.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl flex-shrink-0" style={{ background: `${SIGN_COLORS[profectionSign]}15`, border: `1px solid ${SIGN_COLORS[profectionSign]}30` }}>
                      <span className="text-base" style={{ color: SIGN_COLORS[profectionSign] }}>{SIGN_SYMBOLS[profectionSign]}</span>
                      <div>
                        <p className="text-[10px] font-bold tracking-widest" style={{ color: "#475569" }}>THIS YEAR</p>
                        <p className="text-[13px] font-bold" style={{ color: SIGN_COLORS[profectionSign] }}>{profectionSign}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {profileId && (
                <FullReportCard reportTypeId="zodiacal_releasing" chart={chart} profileId={profileId} />
              )}

              <div className="mb-3">
                <p className="text-[11px] font-bold tracking-widest mb-1" style={{ color: "#334155" }}>
                  FULL LIFE TABLE · {ZR_HOUSE_THEMES[1] ? "EXPAND ANY CHAPTER" : ""}
                </p>
                <p className="text-[13px]" style={{ color: "#475569" }}>
                  Click a row to open it for a reading. Click the arrow to expand its sub-periods, down to L{ZR_MAX_LEVEL}.
                </p>
              </div>

              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                {l1.length === 0 ? (
                  <div className="text-center py-8" style={{ color: "#334155" }}>
                    <p className="text-[13px]">No periods found.</p>
                  </div>
                ) : (
                  l1.map((p) => (
                    <ZRTreeRow
                      key={periodKey(p)}
                      period={p}
                      chain={[p]}
                      expanded={expanded}
                      onToggle={toggle}
                      onSelect={(period, chain) => setSelected({ period, chain })}
                      isSelected={(period) => selected?.period === period}
                      profectionSign={profectionSign}
                      registerRef={registerRef}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {selected && chart && (
            <motion.div
              key="reading-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-shrink-0 overflow-hidden hidden md:flex flex-col"
              style={{ maxWidth: 360 }}
            >
              <ReadingPanel
                period={selected.period}
                chain={selected.chain}
                chart={chart}
                lot={lot}
                onClose={() => setSelected(null)}
                profectionSign={profectionSign}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </ProGate>
  );
}
