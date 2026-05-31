"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { ScanBar } from "@/components/three/HUDPanel";
import { PLANET_SYMBOLS, SIGN_SYMBOLS, ZODIAC_SIGNS, TRADITIONAL_RULERS } from "@/lib/astrology/types";
import type { ChartData, PlanetName, ZodiacSign, PlanetPosition } from "@/lib/astrology/types";
import { getActiveProfileId, getProfile, getCachedChart, getChatHistory, pushChatMessage } from "@/lib/storage";
import type { StoredProfile } from "@/lib/storage";
import { useWarpTo } from "@/components/ui/WarpTransition";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANET_COLORS: Partial<Record<PlanetName, string>> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#8b5cf6", NorthNode: "#64748b",
};

const SIGN_COLORS: Record<ZodiacSign, string> = {
  Aries: "#ef4444", Taurus: "#22c55e", Gemini: "#eab308", Cancer: "#38bdf8",
  Leo: "#f97316", Virgo: "#4ade80", Libra: "#facc15", Scorpio: "#dc2626",
  Sagittarius: "#f59e0b", Capricorn: "#94a3b8", Aquarius: "#06b6d4", Pisces: "#8b5cf6",
};

const ASPECT_COLORS: Record<string, string> = {
  conjunction: "#a855f7", opposition: "#ef4444", trine: "#22c55e",
  square: "#f59e0b", sextile: "#06b6d4", quincunx: "#94a3b8",
};

const ASPECT_GLYPHS: Record<string, string> = {
  conjunction: "☌", opposition: "☍", trine: "△", square: "□", sextile: "⚹", quincunx: "⚻",
};

const DIGNITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  domicile:   { label: "Domicile",   color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  exaltation: { label: "Exalted",    color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  detriment:  { label: "Detriment",  color: "#ef4444", bg: "rgba(239,68,68,0.10)"  },
  fall:       { label: "Fall",       color: "#f97316", bg: "rgba(249,115,22,0.10)" },
  peregrine:  { label: "Peregrine",  color: "#475569", bg: "rgba(71,85,105,0.10)"  },
};

const PLANET_KEYWORDS: Partial<Record<PlanetName, string>> = {
  Sun:       "Core identity, vitality, purpose",
  Moon:      "Emotions, instinct, inner world",
  Mercury:   "Mind, communication, perception",
  Venus:     "Love, values, aesthetic sense",
  Mars:      "Drive, courage, assertion",
  Jupiter:   "Expansion, wisdom, opportunity",
  Saturn:    "Discipline, structure, mastery",
  Uranus:    "Innovation, liberation, awakening",
  Neptune:   "Dreams, spirituality, dissolution",
  Pluto:     "Power, transformation, depth",
  NorthNode: "Karmic growth, destiny, evolution",
  Chiron:    "Wounds and healing, mentorship",
};

const SIGN_KEYWORDS: Record<ZodiacSign, string> = {
  Aries:       "Bold · Pioneer · Direct",
  Taurus:      "Steady · Sensual · Patient",
  Gemini:      "Curious · Versatile · Witty",
  Cancer:      "Nurturing · Protective · Intuitive",
  Leo:         "Expressive · Proud · Creative",
  Virgo:       "Analytical · Precise · Service",
  Libra:       "Harmonious · Diplomatic · Fair",
  Scorpio:     "Intense · Strategic · Penetrating",
  Sagittarius: "Expansive · Philosophical · Free",
  Capricorn:   "Ambitious · Patient · Pragmatic",
  Aquarius:    "Independent · Visionary · Inventive",
  Pisces:      "Compassionate · Dreamy · Fluid",
};

const ASPECT_QUALITY: Record<string, { label: string; color: string }> = {
  trine:       { label: "Harmonious · Natural flow",          color: "#22c55e" },
  sextile:     { label: "Supportive · Skill through effort",  color: "#06b6d4" },
  conjunction: { label: "Fusion · Intensified energy",        color: "#a855f7" },
  square:      { label: "Tension · Growth through friction",  color: "#f59e0b" },
  opposition:  { label: "Polarity · Balance & awareness",     color: "#ef4444" },
  quincunx:    { label: "Adjustment · Subtle friction",       color: "#94a3b8" },
};

const HOUSE_THEMES: Record<number, { name: string; keywords: string }> = {
  1:  { name: "Self",           keywords: "Identity · Appearance · Beginnings" },
  2:  { name: "Resources",      keywords: "Money · Possessions · Self-worth" },
  3:  { name: "Mind",           keywords: "Siblings · Communication · Local travel" },
  4:  { name: "Roots",          keywords: "Home · Family · Foundations" },
  5:  { name: "Creativity",     keywords: "Joy · Romance · Self-expression" },
  6:  { name: "Health",         keywords: "Work · Wellness · Service" },
  7:  { name: "Partnership",    keywords: "Relationships · Marriage · Others" },
  8:  { name: "Transformation", keywords: "Shared resources · Death · Rebirth" },
  9:  { name: "Wisdom",         keywords: "Philosophy · Travel · Higher mind" },
  10: { name: "Career",         keywords: "Ambition · Public role · Legacy" },
  11: { name: "Community",      keywords: "Friendships · Goals · Collective" },
  12: { name: "Shadow",         keywords: "Solitude · Hidden matters · Transcendence" },
};

const ELEMENT_SIGNS: Record<"Fire" | "Earth" | "Air" | "Water", ZodiacSign[]> = {
  Fire:  ["Aries", "Leo", "Sagittarius"],
  Earth: ["Taurus", "Virgo", "Capricorn"],
  Air:   ["Gemini", "Libra", "Aquarius"],
  Water: ["Cancer", "Scorpio", "Pisces"],
};

const MODALITY_SIGNS: Record<"Cardinal" | "Fixed" | "Mutable", ZodiacSign[]> = {
  Cardinal: ["Aries", "Cancer", "Libra", "Capricorn"],
  Fixed:    ["Taurus", "Leo", "Scorpio", "Aquarius"],
  Mutable:  ["Gemini", "Virgo", "Sagittarius", "Pisces"],
};

const ELEMENT_COLORS = { Fire: "#ef4444", Earth: "#22c55e", Air: "#eab308", Water: "#38bdf8" };
const MODALITY_COLORS = { Cardinal: "#a855f7", Fixed: "#f59e0b", Mutable: "#06b6d4" };

const READING_PROMPTS = [
  { id: "overview", label: "Full Reading",         prompt: "Give me a full natal chart reading covering my core identity (Sun, Moon, Ascendant), how I think and communicate (Mercury), love and values (Venus), drive and ambition (Mars), and any major aspect patterns shaping my personality. Use the sect of my chart throughout." },
  { id: "timing",   label: "Current Timing",       prompt: "What does my current annual profection tell me about this year? Who is my Lord of the Year, what themes does that planet rule in my chart, and what should I focus on right now?" },
  { id: "career",   label: "Career & Purpose",     prompt: "What does my chart say about my career, life purpose, and public role? Look at the 10th house, its ruler, any planets there, and how my MC relates to my overall chart sect and dignity patterns." },
  { id: "love",     label: "Love & Relationships", prompt: "Analyze my chart for relationship themes. Look at Venus, its sign and house, the 7th house and its ruler, the Moon, and the Lot of Fortune. What patterns do I have around love and partnership?" },
  { id: "strengths",label: "Gifts & Strengths",   prompt: "What are my chart's greatest strengths and natural gifts? Focus on planets in domicile or exaltation, the strongest placements by dignity, and any rare or powerful configurations in my chart." },
  { id: "shadow",   label: "Challenges",           prompt: "What are my chart's core challenges and growth edges? Look at planets in detriment or fall, difficult aspect patterns, and the harder houses. Frame this constructively as areas for growth rather than flaws." },
];

type InsightTab = "overview" | "planets" | "aspects" | "timing" | "oracle";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-bold tracking-[0.2em] uppercase" style={{ color: "#06b6d4" }}>{label}</span>
        {sub && <span className="text-[14px]" style={{ color: "#334155" }}>{sub}</span>}
      </div>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(6,182,212,0.2), transparent)" }} />
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Chart snapshot ───────────────────────────────────────────────────────────

function ChartSnapshot({ chart }: { chart: ChartData }) {
  const sun  = chart.planets.find(p => p.name === "Sun");
  const moon = chart.planets.find(p => p.name === "Moon");
  const asc  = chart.houses[0]?.sign;
  const prof = chart.annualProfection;

  const pills = [
    { label: "SUN",  value: sun  ? `${SIGN_SYMBOLS[sun.sign] ?? ""}${sun.sign}`   : "–", color: "#fbbf24" },
    { label: "MOON", value: moon ? `${SIGN_SYMBOLS[moon.sign] ?? ""}${moon.sign}` : "–", color: "#c4b5fd" },
    { label: "ASC",  value: asc  ? `${SIGN_SYMBOLS[asc] ?? ""}${asc}`             : "–", color: "#06b6d4" },
    { label: "SECT", value: chart.sect.toUpperCase(), color: chart.sect === "day" ? "#fbbf24" : "#c4b5fd" },
    { label: `AGE ${prof.age}`, value: `H${prof.activatedHouse} · ${prof.lordOfYear}`, color: "#f59e0b" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {pills.map(p => (
        <div key={p.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-[13px] tracking-widest font-bold" style={{ color: "#475569" }}>{p.label}</span>
          <span className="text-[14px] font-semibold" style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Convergence Radar ────────────────────────────────────────────────────────

function ConvergenceRadar({ chart }: { chart: ChartData }) {
  const prof = chart.annualProfection;
  const lordOfYear = chart.planets.find(p => p.name === prof.lordOfYear);

  // Score each of 12 houses
  const rawScores: number[] = Array(13).fill(0); // 1-indexed
  rawScores[prof.activatedHouse] += 40;
  if (lordOfYear) rawScores[lordOfYear.house] += 25;
  chart.planets.slice(0, 10).forEach(p => {
    const bonus = (p.dignity === "domicile" || p.dignity === "exaltation") ? 10 : 5;
    rawScores[p.house] = (rawScores[p.house] ?? 0) + bonus;
  });

  const max = Math.max(...rawScores.slice(1));
  const scores = rawScores.map(s => max > 0 ? s / max : 0);

  // SVG radar chart — 12 axes at 30° intervals, house 1 at top
  const CX = 110, CY = 110, R = 90;
  const angleFor = (h: number) => ((h - 1) * 30 - 90) * (Math.PI / 180);
  const pts = Array.from({ length: 12 }, (_, i) => {
    const r = scores[i + 1] * R;
    const a = angleFor(i + 1);
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as [number, number];
  });
  const polygon = pts.map(([x, y]) => `${x},${y}`).join(" ");

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Top 4 houses by score
  const ranked = Array.from({ length: 12 }, (_, i) => ({ h: i + 1, score: rawScores[i + 1] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .filter(x => x.score > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-2xl p-5"
      style={{ background: "rgba(4,4,28,0.7)", border: "1px solid rgba(99,102,241,0.18)" }}
    >
      <p className="text-[13px] font-bold tracking-widest mb-4" style={{ color: "#64748b" }}>
        CONVERGENCE SCORE — HOUSE ACTIVATION MAP
      </p>
      <div className="flex flex-col md:flex-row gap-6 items-center">
        {/* Radar SVG */}
        <div className="flex-shrink-0">
          <svg width={220} height={220} viewBox="0 0 220 220">
            {/* Grid rings */}
            {rings.map((f, ri) => (
              <polygon
                key={ri}
                points={Array.from({ length: 12 }, (_, i) => {
                  const a = angleFor(i + 1);
                  const r = f * R;
                  return `${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`;
                }).join(" ")}
                fill="none"
                stroke="rgba(99,102,241,0.12)"
                strokeWidth={1}
              />
            ))}
            {/* Axis lines */}
            {Array.from({ length: 12 }, (_, i) => {
              const a = angleFor(i + 1);
              return (
                <line key={i}
                  x1={CX} y1={CY}
                  x2={CX + R * Math.cos(a)}
                  y2={CY + R * Math.sin(a)}
                  stroke="rgba(99,102,241,0.1)" strokeWidth={1}
                />
              );
            })}
            {/* Filled polygon */}
            <motion.polygon
              points={polygon}
              fill="rgba(99,102,241,0.12)"
              stroke="url(#radarGrad)"
              strokeWidth={1.5}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              style={{ transformOrigin: `${CX}px ${CY}px` }}
            />
            {/* Defs */}
            <defs>
              <linearGradient id="radarGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            {/* House labels */}
            {Array.from({ length: 12 }, (_, i) => {
              const h = i + 1;
              const a = angleFor(h);
              const labelR = R + 14;
              const lx = CX + labelR * Math.cos(a);
              const ly = CY + labelR * Math.sin(a);
              const isActive = scores[h] > 0.3;
              return (
                <text key={h} x={lx} y={ly}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={isActive ? 8 : 7}
                  fontWeight={isActive ? "bold" : "normal"}
                  fill={isActive ? "#a5b4fc" : "#334155"}
                >
                  {h}
                </text>
              );
            })}
            {/* Dots on polygon vertices */}
            {pts.map(([x, y], i) => scores[i + 1] > 0.05 ? (
              <motion.circle key={i} cx={x} cy={y} r={2.5}
                fill="#6366f1"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.4 + i * 0.04, duration: 0.3 }}
                style={{ transformOrigin: `${x}px ${y}px` }}
              />
            ) : null)}
          </svg>
        </div>

        {/* Top houses list */}
        <div className="flex-1 space-y-3">
          <p className="text-[13px] tracking-widest font-bold" style={{ color: "#475569" }}>TOP ACTIVATED HOUSES</p>
          {ranked.map(({ h, score }, idx) => (
            <div key={h} className="flex items-center gap-3">
              <span className="text-[13px] font-bold w-6 text-right flex-shrink-0"
                style={{ color: idx === 0 ? "#a5b4fc" : "#475569" }}>
                H{h}
              </span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: idx === 0 ? "linear-gradient(90deg,#6366f1,#06b6d4)" : "rgba(99,102,241,0.4)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(score / (rawScores[ranked[0].h])) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.1 }}
                />
              </div>
              <div className="flex-shrink-0 text-right" style={{ minWidth: 90 }}>
                <p className="text-[13px] font-semibold" style={{ color: idx === 0 ? "#e2e8f0" : "#64748b" }}>
                  {HOUSE_THEMES[h]?.name}
                </p>
                <p className="text-[14px]" style={{ color: "#334155" }}>
                  {HOUSE_THEMES[h]?.keywords.split(" · ")[0]}
                </p>
              </div>
            </div>
          ))}
          <p className="text-[13px] leading-relaxed mt-2" style={{ color: "#334155" }}>
            Scores blend profection timing, lord placement,<br />
            and natal planet concentrations.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ chart, onAskOracle }: { chart: ChartData; onAskOracle: (prompt: string) => void }) {
  // Element counts
  const elements = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modalities = { Cardinal: 0, Fixed: 0, Mutable: 0 };
  chart.planets.slice(0, 10).forEach(p => {
    for (const [el, signs] of Object.entries(ELEMENT_SIGNS)) {
      if (signs.includes(p.sign)) { elements[el as keyof typeof elements]++; break; }
    }
    for (const [mod, signs] of Object.entries(MODALITY_SIGNS)) {
      if (signs.includes(p.sign)) { modalities[mod as keyof typeof modalities]++; break; }
    }
  });

  const dominantElement = (Object.entries(elements) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0];
  const dominantModality = (Object.entries(modalities) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0];

  // Strongest planets (by dignity)
  const dignifiedPlanets = chart.planets.filter(p =>
    p.dignity === "domicile" || p.dignity === "exaltation"
  );
  const challengedPlanets = chart.planets.filter(p =>
    p.dignity === "detriment" || p.dignity === "fall"
  );

  // Stelliums: 3+ planets in same sign
  const signCounts: Partial<Record<ZodiacSign, PlanetPosition[]>> = {};
  chart.planets.forEach(p => {
    if (!signCounts[p.sign]) signCounts[p.sign] = [];
    signCounts[p.sign]!.push(p);
  });
  const stelliums = (Object.entries(signCounts) as [ZodiacSign, PlanetPosition[]][])
    .filter(([, ps]) => ps.length >= 3);

  const prof = chart.annualProfection;
  const lordColor = PLANET_COLORS[prof.lordOfYear] ?? "#f59e0b";
  const sun  = chart.planets.find(p => p.name === "Sun");
  const moon = chart.planets.find(p => p.name === "Moon");
  const asc  = chart.houses[0];

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.06))",
          border: "1px solid rgba(124,58,237,0.25)",
          boxShadow: "0 0 60px rgba(124,58,237,0.08)",
        }}
      >
        <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#7c3aed" }}>CHART SIGNATURE</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "SUN",       value: sun?.sign,           color: "#fbbf24", symbol: PLANET_SYMBOLS.Sun },
            { label: "MOON",      value: moon?.sign,          color: "#c4b5fd", symbol: PLANET_SYMBOLS.Moon },
            { label: "RISING",    value: asc?.sign,           color: "#06b6d4", symbol: "↑" },
            { label: "SECT",      value: chart.sect === "day" ? "Day Chart" : "Night Chart",
                                                              color: chart.sect === "day" ? "#fbbf24" : "#c4b5fd", symbol: chart.sect === "day" ? "☀" : "☽" },
          ].map(({ label, value, color, symbol }) => value ? (
            <div key={label}>
              <p className="text-[14px] tracking-widest font-bold mb-1" style={{ color: "#334155" }}>{label}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-lg" style={{ color }}>{symbol}</span>
                <div>
                  <p className="text-[14px] font-bold" style={{ color }}>{value}</p>
                  <p className="text-[13px]" style={{ color: "#475569" }}>{SIGN_KEYWORDS[value as ZodiacSign]?.split(" · ")[0]}</p>
                </div>
              </div>
            </div>
          ) : null)}
        </div>

        <div className="mt-4 pt-4 flex flex-wrap gap-2" style={{ borderTop: "1px solid rgba(124,58,237,0.1)" }}>
          <span className="text-[13px] px-2.5 py-1 rounded-full font-bold"
            style={{ background: `${ELEMENT_COLORS[dominantElement as keyof typeof ELEMENT_COLORS]}18`, color: ELEMENT_COLORS[dominantElement as keyof typeof ELEMENT_COLORS] }}>
            {dominantElement} dominant
          </span>
          <span className="text-[13px] px-2.5 py-1 rounded-full font-bold"
            style={{ background: `${MODALITY_COLORS[dominantModality as keyof typeof MODALITY_COLORS]}18`, color: MODALITY_COLORS[dominantModality as keyof typeof MODALITY_COLORS] }}>
            {dominantModality} modality
          </span>
          {dignifiedPlanets.map(p => (
            <span key={p.name} className="text-[13px] px-2.5 py-1 rounded-full font-bold"
              style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
              {PLANET_SYMBOLS[p.name]} {p.name} {p.dignity}
            </span>
          ))}
        </div>
      </motion.div>

      {/* 3-column stat cards */}
      <div className="grid md:grid-cols-3 gap-3">
        {/* Lord of the year */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-4"
          style={{ background: `${lordColor}0d`, border: `1px solid ${lordColor}25` }}
        >
          <p className="text-[14px] font-bold tracking-widest mb-2" style={{ color: "#475569" }}>LORD OF THE YEAR</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl" style={{ color: lordColor }}>{PLANET_SYMBOLS[prof.lordOfYear]}</span>
            <div>
              <p className="text-[14px] font-bold" style={{ color: lordColor }}>{prof.lordOfYear}</p>
              <p className="text-[13px]" style={{ color: "#475569" }}>Age {prof.age} · H{prof.activatedHouse}</p>
            </div>
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: "#64748b" }}>
            {prof.activatedSign} house activated · {HOUSE_THEMES[prof.activatedHouse]?.name} themes dominate this year.
          </p>
          <button
            onClick={() => onAskOracle(READING_PROMPTS.find(r => r.id === "timing")!.prompt)}
            className="mt-3 text-[13px] font-bold tracking-widest cursor-pointer"
            style={{ color: lordColor }}
          >
            ASK ORACLE →
          </button>
        </motion.div>

        {/* Strongest placement */}
        {dignifiedPlanets[0] && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl p-4"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <p className="text-[14px] font-bold tracking-widest mb-2" style={{ color: "#475569" }}>STRONGEST PLACEMENT</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl" style={{ color: PLANET_COLORS[dignifiedPlanets[0].name] ?? "#94a3b8" }}>
                {PLANET_SYMBOLS[dignifiedPlanets[0].name]}
              </span>
              <div>
                <p className="text-[14px] font-bold" style={{ color: PLANET_COLORS[dignifiedPlanets[0].name] ?? "#94a3b8" }}>
                  {dignifiedPlanets[0].name}
                </p>
                <p className="text-[13px]" style={{ color: "#475569" }}>
                  {SIGN_SYMBOLS[dignifiedPlanets[0].sign]} {dignifiedPlanets[0].sign} · H{dignifiedPlanets[0].house}
                </p>
              </div>
            </div>
            <span className="text-[13px] px-2 py-0.5 rounded font-bold" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
              In {dignifiedPlanets[0].dignity}
            </span>
            {dignifiedPlanets.length > 1 && (
              <p className="text-[13px] mt-2" style={{ color: "#475569" }}>
                +{dignifiedPlanets.length - 1} more dignified planet{dignifiedPlanets.length > 2 ? "s" : ""}
              </p>
            )}
          </motion.div>
        )}

        {/* Stellium or notable pattern */}
        {stelliums[0] ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-4"
            style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)" }}
          >
            <p className="text-[14px] font-bold tracking-widest mb-2" style={{ color: "#475569" }}>STELLIUM</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg" style={{ color: SIGN_COLORS[stelliums[0][0]] }}>{SIGN_SYMBOLS[stelliums[0][0]]}</span>
              <div>
                <p className="text-[14px] font-bold" style={{ color: SIGN_COLORS[stelliums[0][0]] }}>{stelliums[0][0]}</p>
                <p className="text-[13px]" style={{ color: "#475569" }}>{stelliums[0][1].length} planets concentrated</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {stelliums[0][1].map(p => (
                <span key={p.name} className="text-base" style={{ color: PLANET_COLORS[p.name] ?? "#94a3b8" }}>
                  {PLANET_SYMBOLS[p.name]}
                </span>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-4"
            style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)" }}
          >
            <p className="text-[14px] font-bold tracking-widest mb-2" style={{ color: "#475569" }}>ASPECTS OVERVIEW</p>
            <div className="space-y-1.5">
              {(["trine", "conjunction", "square", "opposition", "sextile"] as const).map(type => {
                const count = chart.aspects.filter(a => a.type === type).length;
                if (!count) return null;
                const color = ASPECT_COLORS[type];
                return (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-[13px] w-4" style={{ color }}>{ASPECT_GLYPHS[type]}</span>
                    <span className="text-[13px] flex-1 capitalize" style={{ color: "#475569" }}>{type}</span>
                    <span className="text-[13px] font-bold" style={{ color }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Convergence Score Radar */}
      <ConvergenceRadar chart={chart} />

      {/* Sect Analysis */}
      {(() => {
        const isDay = chart.sect === "day";
        const sectLight  = isDay ? "Sun"     : "Moon"    as PlanetName;
        const sectBenefic = isDay ? "Jupiter" : "Venus"   as PlanetName;
        const sectMalefic = isDay ? "Saturn"  : "Mars"    as PlanetName;
        const outSectMalefic = isDay ? "Mars"    : "Saturn"  as PlanetName;
        const outSectBenefic = isDay ? "Venus"   : "Jupiter" as PlanetName;

        const DIURNAL: PlanetName[] = ["Sun", "Jupiter", "Saturn"];
        const NOCTURNAL: PlanetName[] = ["Moon", "Venus", "Mars"];
        const isInSect = (name: PlanetName) => isDay ? DIURNAL.includes(name) : NOCTURNAL.includes(name);

        const sectLightPlanet   = chart.planets.find(p => p.name === sectLight);
        const sectMaleficPlanet = chart.planets.find(p => p.name === sectMalefic);
        const outSectMalPlanet  = chart.planets.find(p => p.name === outSectMalefic);

        const sectLightColor   = isDay ? "#fbbf24" : "#c4b5fd";
        const sectBeneficColor = isDay ? "#f59e0b" : "#f472b6";
        const sectMaleficColor = isDay ? "#94a3b8" : "#ef4444";
        const outSectMalColor  = isDay ? "#ef4444" : "#94a3b8";

        const sevenPlanets: PlanetName[] = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

        return (
          <div>
            <SectionHeader label="Sect Analysis" sub={`${isDay ? "Day" : "Night"} chart — traditional Hellenistic sect`} />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 space-y-5"
              style={{ background: "rgba(4,4,28,0.7)", border: `1px solid ${sectLightColor}20` }}
            >
              {/* Sect light banner */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${sectLightColor}15`, border: `1px solid ${sectLightColor}30` }}>
                  <span style={{ color: sectLightColor }}>{isDay ? "☀" : "☽"}</span>
                </div>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: sectLightColor }}>
                    {isDay ? "Day Chart — Sun is your Sect Light" : "Night Chart — Moon is your Sect Light"}
                  </p>
                  <p className="text-[13px] mt-0.5 leading-relaxed" style={{ color: "#475569" }}>
                    {isDay
                      ? "Born with the Sun above the horizon. Solar principles dominate: will, clarity, conscious purpose."
                      : "Born with the Sun below the horizon. Lunar principles guide: emotion, instinct, receptive wisdom."}
                  </p>
                  {sectLightPlanet && (
                    <p className="text-[13px] mt-1 font-mono" style={{ color: "#334155" }}>
                      {sectLight} in {SIGN_SYMBOLS[sectLightPlanet.sign]} {sectLightPlanet.sign} · H{sectLightPlanet.house}
                      {sectLightPlanet.dignity && sectLightPlanet.dignity !== "peregrine" ? ` · ${sectLightPlanet.dignity}` : ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Key sect planets */}
              <div className="grid grid-cols-3 gap-3">
                {([
                  { label: "SECT LIGHT",   name: sectLight,      color: sectLightColor,   desc: "Primary luminary — life's guiding force" },
                  { label: "SECT BENEFIC", name: sectBenefic,    color: sectBeneficColor, desc: "Gifts and grace flow naturally" },
                  { label: "SECT MALEFIC", name: sectMalefic,    color: sectMaleficColor, desc: "Tests aligned with your growth path" },
                ] as { label: string; name: PlanetName; color: string; desc: string }[]).map(({ label, name, color, desc }) => {
                  const planet = chart.planets.find(p => p.name === name);
                  return (
                    <div key={label} className="rounded-xl p-3 text-center"
                      style={{ background: `${color}0a`, border: `1px solid ${color}20` }}>
                      <p className="text-[14px] font-bold tracking-widest mb-2" style={{ color: "#334155" }}>{label}</p>
                      <span className="text-2xl block mb-1" style={{ color }}>{PLANET_SYMBOLS[name]}</span>
                      <p className="text-[13px] font-bold" style={{ color }}>{name}</p>
                      {planet && (
                        <p className="text-[14px] mt-0.5" style={{ color: "#475569" }}>
                          {SIGN_SYMBOLS[planet.sign]} {planet.sign} · H{planet.house}
                        </p>
                      )}
                      <p className="text-[14px] mt-1.5 leading-tight" style={{ color: "#334155" }}>{desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* All 7 planets sect grid */}
              <div>
                <p className="text-[14px] font-bold tracking-widest mb-2" style={{ color: "#334155" }}>TRADITIONAL 7 — SECT STATUS</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {sevenPlanets.map(name => {
                    const planet = chart.planets.find(p => p.name === name);
                    if (!planet) return null;
                    const inSect = isInSect(name);
                    const color = PLANET_COLORS[name] ?? "#94a3b8";
                    return (
                      <div key={name} className="flex flex-col items-center gap-1 p-2 rounded-xl"
                        style={{
                          background: inSect ? `${color}10` : "rgba(255,255,255,0.02)",
                          border: `1px solid ${inSect ? `${color}30` : "rgba(255,255,255,0.05)"}`,
                        }}>
                        <span className="text-lg leading-none" style={{ color: inSect ? color : `${color}45` }}>
                          {PLANET_SYMBOLS[name]}
                        </span>
                        <span className="text-[14px]" style={{ color: inSect ? color : "#334155" }}>
                          {name.substring(0, 3).toUpperCase()}
                        </span>
                        <span className="text-[14px] font-bold" style={{ color: inSect ? "#22c55e" : "#475569" }}>
                          {inSect ? "✓" : "○"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Out-of-sect implications */}
              <div className="grid md:grid-cols-2 gap-3 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="rounded-xl p-3" style={{ background: `${outSectMalColor}08`, border: `1px solid ${outSectMalColor}20` }}>
                  <p className="text-[13px] font-bold mb-1.5" style={{ color: outSectMalColor }}>
                    {PLANET_SYMBOLS[outSectMalefic]} {outSectMalefic} — Out-of-Sect Malefic
                  </p>
                  <p className="text-[13px] leading-relaxed" style={{ color: "#475569" }}>
                    {isDay
                      ? "Mars is contrary to sect and may act with excess or aggression. Its drive lacks moderation — channel it consciously."
                      : "Saturn is contrary to sect and tends toward excessive restriction. Isolation and harsh limits must be actively balanced."}
                  </p>
                  {outSectMalPlanet && (
                    <p className="text-[14px] mt-2 font-mono" style={{ color: "#334155" }}>
                      Currently in {outSectMalPlanet.sign} · H{outSectMalPlanet.house}
                      {outSectMalPlanet.retrograde ? " · ℞" : ""}
                    </p>
                  )}
                </div>
                <div className="rounded-xl p-3" style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)" }}>
                  <p className="text-[13px] font-bold mb-1.5" style={{ color: "#a78bfa" }}>
                    {PLANET_SYMBOLS[outSectBenefic]} {outSectBenefic} — Out-of-Sect Benefic
                  </p>
                  <p className="text-[13px] leading-relaxed" style={{ color: "#475569" }}>
                    {isDay
                      ? "Venus brings gifts that may need cultivation — love, beauty, and pleasure require active engagement rather than passive reception."
                      : "Jupiter's expansion may scatter without focus — wisdom and abundance come through deliberate structure rather than blind faith."}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* Element & modality bars */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-4" style={{ background: "rgba(4,4,28,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#64748b" }}>ELEMENT BALANCE</p>
          <div className="space-y-2.5">
            {(Object.entries(elements) as [keyof typeof elements, number][]).map(([el, count]) => (
              <div key={el} className="flex items-center gap-2">
                <span className="text-[13px] font-bold w-10 flex-shrink-0" style={{ color: ELEMENT_COLORS[el] }}>{el}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / 10) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: ELEMENT_COLORS[el], boxShadow: `0 0 4px ${ELEMENT_COLORS[el]}` }}
                  />
                </div>
                <span className="text-[13px] font-bold w-4 text-right" style={{ color: ELEMENT_COLORS[el] }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: "rgba(4,4,28,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#64748b" }}>MODALITY BALANCE</p>
          <div className="space-y-2.5">
            {(Object.entries(modalities) as [keyof typeof modalities, number][]).map(([mod, count]) => (
              <div key={mod} className="flex items-center gap-2">
                <span className="text-[13px] font-bold w-14 flex-shrink-0" style={{ color: MODALITY_COLORS[mod] }}>{mod}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / 10) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: MODALITY_COLORS[mod], boxShadow: `0 0 4px ${MODALITY_COLORS[mod]}` }}
                  />
                </div>
                <span className="text-[13px] font-bold w-4 text-right" style={{ color: MODALITY_COLORS[mod] }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* House emphasis */}
      {(() => {
        const houseCounts: Record<number, PlanetPosition[]> = {};
        chart.planets.forEach(p => {
          if (!houseCounts[p.house]) houseCounts[p.house] = [];
          houseCounts[p.house].push(p);
        });
        const emphasized = Object.entries(houseCounts)
          .map(([h, ps]) => ({ house: Number(h), planets: ps }))
          .filter(x => x.planets.length >= 2)
          .sort((a, b) => b.planets.length - a.planets.length);
        if (!emphasized.length) return null;
        return (
          <div>
            <SectionHeader label="House Emphasis" sub="Houses with 2+ planets" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {emphasized.map(({ house, planets }) => (
                <div key={house} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(99,102,241,0.12)" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[13px] font-bold tracking-widest" style={{ color: "#4f46e5" }}>H{house}</span>
                    <span className="text-[13px] font-semibold" style={{ color: "#94a3b8" }}>
                      {HOUSE_THEMES[house]?.name}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {planets.map(p => (
                      <span key={p.name} className="text-base" style={{ color: PLANET_COLORS[p.name] ?? "#94a3b8" }}>
                        {PLANET_SYMBOLS[p.name]}
                      </span>
                    ))}
                  </div>
                  <p className="text-[13px] mt-1.5" style={{ color: "#334155" }}>
                    {HOUSE_THEMES[house]?.keywords}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Mutual Receptions + Chart Ruler */}
      {(() => {
        // Mutual reception: planet A in sign ruled by planet B AND planet B in sign ruled by planet A
        const mutualReceptions: Array<{ a: PlanetPosition; b: PlanetPosition; aSign: string; bSign: string }> = [];
        const sevenPlanets = chart.planets.filter(p => ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn"].includes(p.name));

        for (let i = 0; i < sevenPlanets.length; i++) {
          for (let j = i + 1; j < sevenPlanets.length; j++) {
            const pA = sevenPlanets[i];
            const pB = sevenPlanets[j];
            const aRulesB = TRADITIONAL_RULERS[pB.sign] === pA.name;
            const bRulesA = TRADITIONAL_RULERS[pA.sign] === pB.name;
            if (aRulesB && bRulesA) {
              mutualReceptions.push({ a: pA, b: pB, aSign: pA.sign, bSign: pB.sign });
            }
          }
        }

        // Chart Ruler: ruler of ASC sign
        const ascSign = chart.houses[0].sign;
        const chartRulerName = TRADITIONAL_RULERS[ascSign] as PlanetName | undefined;
        const chartRuler = chartRulerName ? chart.planets.find(p => p.name === chartRulerName) : null;
        const crColor = chartRulerName ? (PLANET_COLORS[chartRulerName] ?? "#94a3b8") : "#94a3b8";

        if (!mutualReceptions.length && !chartRuler) return null;

        return (
          <div className="space-y-3">
            {/* Chart Ruler */}
            {chartRuler && (
              <div>
                <SectionHeader label="Chart Ruler" sub={`Ruler of ${ascSign} Ascendant`} />
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 rounded-2xl p-4"
                  style={{ background: `${crColor}0a`, border: `1px solid ${crColor}25` }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: `${crColor}15`, border: `1px solid ${crColor}30`, color: crColor }}>
                    {PLANET_SYMBOLS[chartRulerName!]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] font-bold" style={{ color: crColor }}>{chartRulerName}</span>
                      <span className="text-[13px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${crColor}15`, color: crColor }}>CHART RULER</span>
                    </div>
                    <p className="text-[14px]" style={{ color: "#64748b" }}>
                      {chartRuler.sign} · House {chartRuler.house} · {chartRuler.dignity ? chartRuler.dignity.charAt(0).toUpperCase() + chartRuler.dignity.slice(1) : "Peregrine"}
                      {chartRuler.retrograde ? " · ℞" : ""}
                    </p>
                    <p className="text-[13px] mt-1" style={{ color: "#475569" }}>
                      Rules the {HOUSE_THEMES[1]?.name} — the most personal planet in your chart, coloring your entire life expression.
                    </p>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Mutual Receptions */}
            {mutualReceptions.length > 0 && (
              <div>
                <SectionHeader label="Mutual Receptions" sub="Each planet in the other's sign — hidden strength" />
                <div className="space-y-2">
                  {mutualReceptions.map(({ a, b, aSign, bSign }, i) => {
                    const aColor = PLANET_COLORS[a.name] ?? "#94a3b8";
                    const bColor = PLANET_COLORS[b.name] ?? "#94a3b8";
                    return (
                      <motion.div
                        key={`${a.name}-${b.name}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-center gap-3 rounded-xl p-3"
                        style={{ background: "rgba(4,4,28,0.6)", border: "1px solid rgba(99,102,241,0.15)" }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl" style={{ color: aColor }}>{PLANET_SYMBOLS[a.name]}</span>
                          <span className="text-[13px]" style={{ color: "#475569" }}>in {SIGN_SYMBOLS[b.sign as ZodiacSign]} {bSign}</span>
                        </div>
                        <span className="text-base" style={{ color: "#334155" }}>⇄</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl" style={{ color: bColor }}>{PLANET_SYMBOLS[b.name]}</span>
                          <span className="text-[13px]" style={{ color: "#475569" }}>in {SIGN_SYMBOLS[a.sign as ZodiacSign]} {aSign}</span>
                        </div>
                        <div className="ml-auto">
                          <span className="text-[13px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                            MUTUAL RX
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                  <p className="text-[13px] px-1" style={{ color: "#334155" }}>
                    These planets act as if in their own domicile — each gains strength and purpose through the other.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Quick oracle prompts */}
      <div>
        <SectionHeader label="Explore with Oracle" sub="AI-powered deep readings" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {READING_PROMPTS.map(rp => (
            <motion.button
              key={rp.id}
              whileHover={{ scale: 1.02, borderColor: "rgba(124,58,237,0.4)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onAskOracle(rp.prompt)}
              className="text-left p-3 rounded-xl cursor-pointer transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-[13px] font-bold tracking-wider" style={{ color: "#a78bfa" }}>{rp.label}</p>
              <p className="text-[13px] mt-1 leading-relaxed" style={{ color: "#475569" }}>
                {rp.prompt.substring(0, 60)}…
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Dispositor Tree ──────────────────────────────────────────────────────────

function DispositorTree({ chart }: { chart: ChartData }) {
  const planets = chart.planets.slice(0, 10);
  const W = 380, H = 320, CX = W / 2, CY = H / 2, R = 118;

  // Map planet name → index in our display order
  const DISPLAY_ORDER: PlanetName[] = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"];

  // Position each planet on the circle (starting top, clockwise)
  function angleFor(idx: number): number {
    return (idx / DISPLAY_ORDER.length) * 2 * Math.PI - Math.PI / 2;
  }
  function posFor(idx: number): [number, number] {
    const a = angleFor(idx);
    return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
  }

  // Build dispositor map: planet → traditional ruler of its sign
  const planetByName = new Map(planets.map(p => [p.name, p]));
  const dispositorOf = new Map<PlanetName, PlanetName>();
  for (const p of planets) {
    const ruler = TRADITIONAL_RULERS[p.sign] as PlanetName;
    if (ruler && ruler !== p.name && planetByName.has(ruler)) {
      dispositorOf.set(p.name, ruler);
    }
  }

  // Find final dispositors (in own sign = no pointer outward, or mutual reception)
  const finalDispositors = new Set<PlanetName>();
  planets.forEach(p => {
    if (!dispositorOf.has(p.name)) finalDispositors.add(p.name);
  });
  // Mutual reception: A disposits B AND B disposits A → both are final
  dispositorOf.forEach((bName, aName) => {
    if (dispositorOf.get(bName) === aName) {
      finalDispositors.add(aName);
      finalDispositors.add(bName);
    }
  });

  // Compute curved arrow path from planet A to planet B
  // Arc through a point pulled toward center
  function arcPath(fromIdx: number, toIdx: number): string {
    const [x1, y1] = posFor(fromIdx);
    const [x2, y2] = posFor(toIdx);
    const NODE_R = 20;

    // Direction vectors
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len, uy = dy / len;

    // Trim to node edge
    const sx = x1 + ux * NODE_R;
    const sy = y1 + uy * NODE_R;
    const ex = x2 - ux * NODE_R;
    const ey = y2 - uy * NODE_R;

    // Control point: midpoint pulled toward center by 40px
    const mx = (sx + ex) / 2, my = (sy + ey) / 2;
    const toCenterX = CX - mx, toCenterY = CY - my;
    const tCLen = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
    const pullStrength = Math.min(40, tCLen * 0.5);
    const cpx = mx + (toCenterX / tCLen) * pullStrength;
    const cpy = my + (toCenterY / tCLen) * pullStrength;

    return `M${sx.toFixed(1)},${sy.toFixed(1)} Q${cpx.toFixed(1)},${cpy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl p-5"
      style={{ background: "rgba(4,4,28,0.7)", border: "1px solid rgba(99,102,241,0.15)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-bold tracking-widest" style={{ color: "#64748b" }}>DISPOSITOR TREE — RULERSHIP FLOW</p>
        <div className="flex items-center gap-3 text-[14px] tracking-widest font-bold" style={{ color: "#334155" }}>
          <span>→ DISPOSITS</span>
          <span style={{ color: "#fbbf24" }}>◎ FINAL</span>
        </div>
      </div>

      <div className="flex justify-center">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: "100%", height: "auto" }}>
          <defs>
            <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="rgba(99,102,241,0.5)" />
            </marker>
            <marker id="arr-mutual" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="rgba(245,158,11,0.8)" />
            </marker>
            <filter id="glow-final">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Subtle circle guide */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(99,102,241,0.06)" strokeWidth={1} strokeDasharray="3 5" />

          {/* Arrows — draw all dispositor relationships */}
          {Array.from(dispositorOf.entries()).map(([fromName, toName]) => {
            const fromIdx = DISPLAY_ORDER.indexOf(fromName);
            const toIdx = DISPLAY_ORDER.indexOf(toName);
            if (fromIdx < 0 || toIdx < 0) return null;
            const isMutual = dispositorOf.get(toName) === fromName;
            return (
              <motion.path
                key={`${fromName}-${toName}`}
                d={arcPath(fromIdx, toIdx)}
                fill="none"
                stroke={isMutual ? "rgba(245,158,11,0.55)" : "rgba(99,102,241,0.35)"}
                strokeWidth={isMutual ? 1.5 : 1}
                strokeDasharray={isMutual ? "none" : "4 3"}
                markerEnd={isMutual ? "url(#arr-mutual)" : "url(#arr)"}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
            );
          })}

          {/* Planet nodes */}
          {DISPLAY_ORDER.map((name, idx) => {
            const p = planetByName.get(name);
            if (!p) return null;
            const [x, y] = posFor(idx);
            const color = PLANET_COLORS[name] ?? "#94a3b8";
            const isFinal = finalDispositors.has(name);
            const NODE_R = isFinal ? 22 : 18;
            const disp = dispositorOf.get(name);

            return (
              <motion.g
                key={name}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05 + idx * 0.06, duration: 0.35 }}
                style={{ transformOrigin: `${x}px ${y}px` }}
              >
                {/* Final dispositor glow */}
                {isFinal && (
                  <circle cx={x} cy={y} r={NODE_R + 8}
                    fill={`${color}10`}
                    stroke={`${color}30`}
                    strokeWidth={1}
                    filter="url(#glow-final)"
                  />
                )}

                {/* Node circle */}
                <circle cx={x} cy={y} r={NODE_R}
                  fill={isFinal ? `${color}22` : "rgba(4,4,28,0.85)"}
                  stroke={isFinal ? color : `${color}55`}
                  strokeWidth={isFinal ? 1.5 : 1}
                />

                {/* Planet glyph */}
                <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                  fontSize={isFinal ? 14 : 12} fill={color} fontFamily="serif">
                  {PLANET_SYMBOLS[name]}
                </text>

                {/* Planet name label */}
                <text
                  x={x}
                  y={y + NODE_R + 10}
                  textAnchor="middle"
                  dominantBaseline="hanging"
                  fontSize={7}
                  fontWeight={isFinal ? "bold" : "normal"}
                  fill={isFinal ? color : "#334155"}
                  letterSpacing={0.5}
                >
                  {name.substring(0, 3).toUpperCase()}
                </text>

                {/* Dignity indicator */}
                {(p.dignity === "domicile" || p.dignity === "exaltation") && (
                  <circle cx={x + NODE_R - 4} cy={y - NODE_R + 4} r={4}
                    fill={p.dignity === "domicile" ? "#22c55e" : "#fbbf24"}
                    stroke="rgba(0,0,15,0.8)" strokeWidth={1}
                  />
                )}

                {/* Retrograde indicator */}
                {p.retrograde && (
                  <text x={x - NODE_R + 2} y={y - NODE_R + 5}
                    fontSize={6} fill="#f97316" textAnchor="middle" dominantBaseline="central">
                    ℞
                  </text>
                )}

                {/* Dispositor label: small "→ X" next to arrow origin */}
                {disp && !isFinal && (
                  <text
                    x={x}
                    y={y + NODE_R + 20}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    fontSize={6}
                    fill="#1e293b"
                    letterSpacing={0.5}
                  >
                    → {disp.substring(0, 3).toUpperCase()}
                  </text>
                )}
              </motion.g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[14px] tracking-widest" style={{ color: "#334155" }}>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-px" style={{ background: "rgba(99,102,241,0.5)", border: "none" }} />
          <span style={{ background: "rgba(99,102,241,0.35)", height: 1, display: "inline-block", width: 16, borderBottom: "1px dashed rgba(99,102,241,0.5)" }} />
          disposits
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-px" style={{ background: "rgba(245,158,11,0.6)" }} />
          mutual reception
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(34,197,94,0.7)" }} />
          domicile
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(251,191,36,0.7)" }} />
          exaltation
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 13, color: "#f97316" }}>℞</span>
          retrograde
        </div>
      </div>
    </motion.div>
  );
}

// ─── Planets tab ──────────────────────────────────────────────────────────────

function PlanetsTab({ chart }: { chart: ChartData }) {
  const [selected, setSelected] = useState<PlanetName | null>(null);
  const warpTo = useWarpTo();

  return (
    <div className="space-y-3">
      <SectionHeader label="Natal Planets" sub="Click any planet for details" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {chart.planets.map((p, i) => {
          const color = PLANET_COLORS[p.name] ?? "#94a3b8";
          const signColor = SIGN_COLORS[p.sign];
          const dignity = p.dignity && p.dignity !== "peregrine" ? DIGNITY_LABELS[p.dignity] : null;
          const isOpen = selected === p.name;

          return (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelected(isOpen ? null : p.name)}
              className="rounded-xl overflow-hidden cursor-pointer transition-all duration-200"
              style={{
                background: isOpen ? "rgba(4,4,28,0.9)" : "rgba(4,4,28,0.6)",
                border: isOpen ? `1px solid ${color}35` : "1px solid rgba(255,255,255,0.06)",
                boxShadow: isOpen ? `0 0 24px ${color}12` : "none",
              }}
            >
              {/* Planet row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Symbol */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                  <span className="text-lg" style={{ color }}>{PLANET_SYMBOLS[p.name]}</span>
                </div>

                {/* Name + sign */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold" style={{ color: "#e2e8f0" }}>{p.name}</span>
                    {p.retrograde && <span className="text-[13px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>℞</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[14px]" style={{ color: signColor }}>{SIGN_SYMBOLS[p.sign]} {p.sign}</span>
                    <span className="text-[13px]" style={{ color: "#334155" }}>·</span>
                    <span className="text-[13px]" style={{ color: "#475569" }}>{p.signDegree.toFixed(1)}°</span>
                    <span className="text-[13px]" style={{ color: "#334155" }}>·</span>
                    <span className="text-[13px]" style={{ color: "#4f46e5" }}>H{p.house}</span>
                  </div>
                </div>

                {/* Dignity badge */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {dignity && (
                    <span className="text-[14px] font-bold px-2 py-0.5 rounded"
                      style={{ background: dignity.bg, color: dignity.color }}>
                      {dignity.label}
                    </span>
                  )}
                  <svg viewBox="0 0 20 20" fill="currentColor"
                    className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    style={{ color: "#334155" }}>
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
                  </svg>
                </div>
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1" style={{ borderTop: `1px solid ${color}18` }}>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-[14px] tracking-widest mb-1" style={{ color: "#334155" }}>PLANET ROLE</p>
                          <p className="text-[13px] leading-relaxed" style={{ color: "#64748b" }}>
                            {PLANET_KEYWORDS[p.name]}
                          </p>
                        </div>
                        <div>
                          <p className="text-[14px] tracking-widest mb-1" style={{ color: "#334155" }}>IN {p.sign.toUpperCase()}</p>
                          <p className="text-[13px] leading-relaxed" style={{ color: signColor }}>
                            {SIGN_KEYWORDS[p.sign]}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          { label: "HOUSE", value: `H${p.house} · ${HOUSE_THEMES[p.house]?.name ?? ""}` },
                          { label: "LONGITUDE", value: `${p.longitude.toFixed(2)}°` },
                          { label: "DIGNITY", value: p.dignity ? p.dignity.charAt(0).toUpperCase() + p.dignity.slice(1) : "Peregrine" },
                        ].map(r => (
                          <div key={r.label}>
                            <p className="text-[14px] tracking-widest mb-0.5" style={{ color: "#334155" }}>{r.label}</p>
                            <p className="text-[13px] font-medium" style={{ color: "#94a3b8" }}>{r.value}</p>
                          </div>
                        ))}
                      </div>
                      <motion.button
                        onClick={(e) => { e.stopPropagation(); warpTo(`/dashboard/chart/${p.name.toLowerCase()}`); }}
                        whileHover={{ scale: 1.02, borderColor: `${color}50` }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-2 rounded-xl text-[13px] font-bold tracking-widest cursor-pointer"
                        style={{
                          background: `${color}10`,
                          border: `1px solid ${color}25`,
                          color,
                        }}
                      >
                        FULL {p.name.toUpperCase()} READING →
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Essential Dignity Scores */}
      <div className="mt-6">
        <SectionHeader label="Essential Dignity Scores" sub="Planetary strength by traditional rulership" />
        <div className="rounded-2xl p-4" style={{ background: "rgba(4,4,28,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="space-y-2.5">
            {chart.planets.slice(0, 10).map((p, i) => {
              const color = PLANET_COLORS[p.name] ?? "#94a3b8";
              const score = p.dignity === "domicile" ? 10 :
                p.dignity === "exaltation" ? 8 :
                p.dignity === "fall" ? -7 :
                p.dignity === "detriment" ? -5 : 0;
              const pct = Math.round(((score + 10) / 20) * 100);
              const barColor = score >= 8 ? "#22c55e" : score >= 0 ? "#06b6d4" : "#ef4444";
              return (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-base w-5 flex-shrink-0" style={{ color }}>{PLANET_SYMBOLS[p.name]}</span>
                  <span className="text-[13px] font-medium w-16 flex-shrink-0" style={{ color: "#94a3b8" }}>{p.name}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden relative" style={{ background: "rgba(255,255,255,0.05)" }}>
                    {/* Midpoint marker at "0" */}
                    <div className="absolute top-0 bottom-0 w-px" style={{ left: "50%", background: "rgba(255,255,255,0.08)" }} />
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: barColor,
                        boxShadow: `0 0 4px ${barColor}80`,
                        width: `${Math.abs(score) / 10 * 50}%`,
                        marginLeft: score >= 0 ? "50%" : `${50 - Math.abs(score) / 10 * 50}%`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.abs(score) / 10 * 50}%` }}
                      transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.04 }}
                    />
                  </div>
                  <span className="text-[13px] font-bold w-16 text-right flex-shrink-0" style={{ color: barColor }}>
                    {p.dignity ? p.dignity.charAt(0).toUpperCase() + p.dignity.slice(1) : "Peregrine"}
                  </span>
                  <span className="text-[13px] font-mono w-6 text-right flex-shrink-0" style={{ color: barColor }}>
                    {score > 0 ? "+" : ""}{score}
                  </span>
                </motion.div>
              );
            })}
          </div>
          <p className="text-[14px] mt-3 pt-3 tracking-widest" style={{ color: "#1e293b", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            DOMICILE +10 · EXALTATION +8 · PEREGRINE 0 · DETRIMENT −5 · FALL −7
          </p>
        </div>
      </div>

      {/* Almuten Figuris */}
      {(() => {
        const DIGNITY_PTS: Record<string, number> = {
          domicile: 10, exaltation: 8, peregrine: 0, detriment: -5, fall: -7,
        };
        const DAY_SECT_PLANETS  = new Set<PlanetName>(["Sun", "Jupiter", "Saturn"]);
        const NIGHT_SECT_PLANETS = new Set<PlanetName>(["Moon", "Venus", "Mars"]);
        const isDay = chart.sect === "day";

        const scores = chart.planets.slice(0, 10).map(p => {
          const essential = DIGNITY_PTS[p.dignity ?? "peregrine"] ?? 0;
          const angular   = [1, 4, 7, 10].includes(p.house) ? 3 : [2, 5, 8, 11].includes(p.house) ? 2 : 1;
          const sectBonus = isDay ? (DAY_SECT_PLANETS.has(p.name) ? 2 : 0) : (NIGHT_SECT_PLANETS.has(p.name) ? 2 : 0);
          const retroPenalty = p.retrograde ? -1 : 0;
          const total = essential + angular + sectBonus + retroPenalty;
          return { planet: p, total, essential, angular, sectBonus, retroPenalty };
        }).sort((a, b) => b.total - a.total);

        const winner = scores[0];
        const winnerColor = PLANET_COLORS[winner.planet.name] ?? "#94a3b8";
        const maxTotal = Math.max(...scores.map(s => s.total));
        const minTotal = Math.min(...scores.map(s => s.total));
        const range = maxTotal - minTotal || 1;

        return (
          <div className="mt-6">
            <SectionHeader label="Almuten Figuris" sub="The most dignified planet — overall chart ruler by total dignity score" />
            <div className="space-y-3">
              {/* Winner card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl p-4 flex items-center gap-4"
                style={{
                  background: `linear-gradient(135deg, ${winnerColor}10, rgba(4,4,28,0.8))`,
                  border: `1px solid ${winnerColor}30`,
                  boxShadow: `0 0 40px ${winnerColor}08`,
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl"
                  style={{ background: `${winnerColor}18`, border: `1px solid ${winnerColor}35` }}
                >
                  <span style={{ color: winnerColor }}>{PLANET_SYMBOLS[winner.planet.name]}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-black" style={{ color: winnerColor }}>{winner.planet.name}</span>
                    <span className="text-[13px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${winnerColor}18`, color: winnerColor }}>ALMUTEN</span>
                    <span className="text-[13px] font-mono font-bold" style={{ color: "#475569" }}>Score {winner.total > 0 ? "+" : ""}{winner.total}</span>
                  </div>
                  <p className="text-[14px] leading-relaxed" style={{ color: "#64748b" }}>
                    {winner.planet.sign} · House {winner.planet.house} · {winner.planet.dignity ? winner.planet.dignity.charAt(0).toUpperCase() + winner.planet.dignity.slice(1) : "Peregrine"}
                    {winner.planet.retrograde ? " · ℞ Retrograde" : ""}
                  </p>
                  <p className="text-[13px] mt-1" style={{ color: "#334155" }}>
                    Essential {winner.essential > 0 ? "+" : ""}{winner.essential}  ·  Angular +{winner.angular}  ·  Sect +{winner.sectBonus}{winner.retroPenalty ? `  ·  Rx ${winner.retroPenalty}` : ""}
                  </p>
                </div>
              </motion.div>

              {/* All planet scores bar chart */}
              <div className="rounded-xl p-4" style={{ background: "rgba(4,4,28,0.5)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="space-y-2">
                  {scores.map((s, i) => {
                    const color = PLANET_COLORS[s.planet.name] ?? "#94a3b8";
                    const barPct = Math.max(0, (s.total - minTotal) / range * 100);
                    return (
                      <motion.div
                        key={s.planet.name}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-2"
                      >
                        <span className="text-[14px] w-5 flex-shrink-0" style={{ color }}>{PLANET_SYMBOLS[s.planet.name]}</span>
                        <span className="text-[13px] w-14 flex-shrink-0" style={{ color: i === 0 ? color : "#475569", fontWeight: i === 0 ? "700" : "400" }}>{s.planet.name}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: i === 0 ? color : `${color}60`, boxShadow: i === 0 ? `0 0 4px ${color}` : "none" }}
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.04 }}
                          />
                        </div>
                        <span className="text-[13px] font-mono w-8 text-right flex-shrink-0" style={{ color: i === 0 ? color : "#334155" }}>
                          {s.total > 0 ? "+" : ""}{s.total}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
                <p className="text-[14px] mt-3 pt-3 tracking-widest" style={{ color: "#1e293b", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  ESSENTIAL DIGNITY + ANGULAR HOUSE + SECT BONUS − RETROGRADE PENALTY
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Dispositor Tree */}
      <div className="mt-6">
        <SectionHeader label="Dispositor Tree" sub="Planetary rulership chain — who governs whom" />
        <DispositorTree chart={chart} />
      </div>

      {/* House cusps */}
      <div className="mt-6">
        <SectionHeader label="House Cusps" sub="Whole sign house system" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {chart.houses.map((h, i) => {
            const signColor = SIGN_COLORS[h.sign];
            const isAngular = [0, 3, 6, 9].includes(i);
            const angleLabel = ["ASC", null, null, "IC", null, null, "DSC", null, null, "MC", null, null][i];
            return (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: isAngular ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)",
                  border: isAngular ? "1px solid rgba(124,58,237,0.15)" : "1px solid rgba(255,255,255,0.04)",
                }}>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold" style={{ color: isAngular ? "#a78bfa" : "#334155" }}>H{i + 1}</span>
                    {angleLabel && <span className="text-[14px] font-bold" style={{ color: "#7c3aed" }}>{angleLabel}</span>}
                  </div>
                </div>
                <span className="text-base" style={{ color: signColor }}>{SIGN_SYMBOLS[h.sign]}</span>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: signColor }}>{h.sign}</p>
                  <p className="text-[13px]" style={{ color: "#334155" }}>{h.longitude.toFixed(1)}°</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Chart Pattern Detector ───────────────────────────────────────────────────

type PatternType = "Grand Trine" | "T-Square" | "Grand Cross" | "Yod" | "Stellium" | "Mystic Rectangle" | "Opposition";

interface DetectedPattern {
  type: PatternType;
  planets: PlanetName[];
  description: string;
  color: string;
  element?: string;
}

const ELEMENT_SIGNS_MAP: Record<ZodiacSign, "Fire" | "Earth" | "Air" | "Water"> = {
  Aries:"Fire", Leo:"Fire", Sagittarius:"Fire",
  Taurus:"Earth", Virgo:"Earth", Capricorn:"Earth",
  Gemini:"Air", Libra:"Air", Aquarius:"Air",
  Cancer:"Water", Scorpio:"Water", Pisces:"Water",
};

const ELEMENT_COLORS_MAP = { Fire:"#ef4444", Earth:"#22c55e", Air:"#eab308", Water:"#38bdf8" };

const PATTERN_COLORS: Record<PatternType, string> = {
  "Grand Trine":       "#22c55e",
  "T-Square":          "#f59e0b",
  "Grand Cross":       "#ef4444",
  "Yod":               "#a855f7",
  "Stellium":          "#06b6d4",
  "Mystic Rectangle":  "#3b82f6",
  "Opposition":        "#f97316",
};

const PATTERN_DESCRIPTIONS: Record<PatternType, string> = {
  "Grand Trine":       "Three planets in mutual trine — natural talent, ease, and protection in one element",
  "T-Square":          "Two oppositions meeting at an apex planet — dynamic tension driving growth",
  "Grand Cross":       "Four planets in square/opposition — intense cross-pressure demanding integration",
  "Yod":               "Two sextile planets quincunx a third — fated adjustment and spiritual mission",
  "Stellium":          "Three or more planets concentrated in one sign — extraordinary focused energy",
  "Mystic Rectangle":  "Two trines + two sextiles + two oppositions — organized creative tension",
  "Opposition":        "Planets in direct polarity — awareness through contrast and relationship",
};

function detectPatterns(chart: ChartData): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const aspects = chart.aspects;
  const planets = chart.planets.slice(0, 10);
  const ORBLIMIT = 10;

  const hasAspect = (p1: PlanetName, p2: PlanetName, type: string) =>
    aspects.some(a =>
      a.type === type && a.orb <= ORBLIMIT &&
      ((a.planet1 === p1 && a.planet2 === p2) || (a.planet1 === p2 && a.planet2 === p1))
    );

  // ─ Stellium: 3+ planets in same sign
  const signGroups: Record<string, PlanetName[]> = {};
  planets.forEach(p => {
    signGroups[p.sign] = signGroups[p.sign] ? [...signGroups[p.sign], p.name] : [p.name];
  });
  Object.entries(signGroups).forEach(([sign, ps]) => {
    if (ps.length >= 3) {
      patterns.push({
        type: "Stellium",
        planets: ps,
        description: `${ps.length} planets in ${sign} — ${PATTERN_DESCRIPTIONS["Stellium"]}`,
        color: PATTERN_COLORS["Stellium"],
      });
    }
  });

  // ─ Grand Trine: 3 planets all trine each other
  const pNames = planets.map(p => p.name);
  for (let i = 0; i < pNames.length - 2; i++) {
    for (let j = i + 1; j < pNames.length - 1; j++) {
      if (!hasAspect(pNames[i], pNames[j], "trine")) continue;
      for (let k = j + 1; k < pNames.length; k++) {
        if (hasAspect(pNames[i], pNames[k], "trine") && hasAspect(pNames[j], pNames[k], "trine")) {
          const trio = [pNames[i], pNames[j], pNames[k]];
          const elements = trio.map(n => ELEMENT_SIGNS_MAP[planets.find(p => p.name === n)!.sign]);
          const el = elements[0] === elements[1] && elements[1] === elements[2] ? elements[0] : undefined;
          patterns.push({
            type: "Grand Trine",
            planets: trio,
            description: el
              ? `${el} Grand Trine — ${PATTERN_DESCRIPTIONS["Grand Trine"]}`
              : PATTERN_DESCRIPTIONS["Grand Trine"],
            color: el ? ELEMENT_COLORS_MAP[el] : PATTERN_COLORS["Grand Trine"],
            element: el,
          });
        }
      }
    }
  }

  // ─ Opposition pairs (for further pattern checks)
  const oppPairs: [PlanetName, PlanetName][] = aspects
    .filter(a => a.type === "opposition" && a.orb <= ORBLIMIT)
    .map(a => [a.planet1, a.planet2]);

  // ─ T-Square: 2 planets in opposition + 1 squares both
  for (const [p1, p2] of oppPairs) {
    pNames.forEach(apex => {
      if (apex === p1 || apex === p2) return;
      if (hasAspect(p1, apex, "square") && hasAspect(p2, apex, "square")) {
        patterns.push({
          type: "T-Square",
          planets: [p1, p2, apex],
          description: `${p1}–${p2} opposition · ${apex} apex — ${PATTERN_DESCRIPTIONS["T-Square"]}`,
          color: PATTERN_COLORS["T-Square"],
        });
      }
    });
  }

  // ─ Grand Cross: two opposition pairs, all squaring each other
  for (let i = 0; i < oppPairs.length - 1; i++) {
    for (let j = i + 1; j < oppPairs.length; j++) {
      const [a, b] = oppPairs[i];
      const [c, d] = oppPairs[j];
      if ([a, b].includes(c) || [a, b].includes(d)) continue;
      if (hasAspect(a, c, "square") && hasAspect(a, d, "square") &&
          hasAspect(b, c, "square") && hasAspect(b, d, "square")) {
        patterns.push({
          type: "Grand Cross",
          planets: [a, b, c, d],
          description: PATTERN_DESCRIPTIONS["Grand Cross"],
          color: PATTERN_COLORS["Grand Cross"],
        });
      }
    }
  }

  // ─ Yod: 2 planets in sextile, both quincunx a third
  const sextPairs: [PlanetName, PlanetName][] = aspects
    .filter(a => a.type === "sextile" && a.orb <= ORBLIMIT)
    .map(a => [a.planet1, a.planet2]);
  for (const [p1, p2] of sextPairs) {
    pNames.forEach(apex => {
      if (apex === p1 || apex === p2) return;
      if (hasAspect(p1, apex, "quincunx") && hasAspect(p2, apex, "quincunx")) {
        patterns.push({
          type: "Yod",
          planets: [p1, p2, apex],
          description: `${p1} & ${p2} point to ${apex} — ${PATTERN_DESCRIPTIONS["Yod"]}`,
          color: PATTERN_COLORS["Yod"],
        });
      }
    });
  }

  // De-duplicate (same planet set)
  const seen = new Set<string>();
  return patterns.filter(p => {
    const key = `${p.type}:${[...p.planets].sort().join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function ChartPatterns({ chart }: { chart: ChartData }) {
  const patterns = useMemo(() => detectPatterns(chart), [chart]);
  if (patterns.length === 0) return null;

  return (
    <div>
      <SectionHeader label="Major Chart Patterns" sub="Geometric configurations shaping your chart" />
      <div className="space-y-2">
        {patterns.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${p.color}28`, background: `${p.color}08` }}
          >
            <div className="flex items-start gap-4 px-4 py-3">
              {/* Pattern glyph / badge */}
              <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${p.color}18`, border: `1px solid ${p.color}30` }}>
                  {p.type === "Grand Trine" && (
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={p.color} strokeWidth={1.8}>
                      <polygon points="12,3 21,21 3,21" />
                    </svg>
                  )}
                  {p.type === "T-Square" && (
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={p.color} strokeWidth={1.8}>
                      <rect x={3} y={3} width={18} height={18} />
                      <line x1={12} y1={3} x2={12} y2={21} />
                    </svg>
                  )}
                  {p.type === "Grand Cross" && (
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={p.color} strokeWidth={1.8}>
                      <rect x={3} y={3} width={18} height={18} />
                      <line x1={3} y1={12} x2={21} y2={12} />
                      <line x1={12} y1={3} x2={12} y2={21} />
                    </svg>
                  )}
                  {p.type === "Yod" && (
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={p.color} strokeWidth={1.8}>
                      <path d="M12 3 L21 18 L3 18 Z" /><circle cx={12} cy={3} r={1.5} fill={p.color} />
                    </svg>
                  )}
                  {(p.type === "Stellium") && (
                    <span style={{ color: p.color, fontSize: 16 }}>✦</span>
                  )}
                  {(p.type === "Mystic Rectangle" || p.type === "Opposition") && (
                    <span style={{ color: p.color, fontSize: 14 }}>☍</span>
                  )}
                </div>
                {p.element && (
                  <span className="text-[14px] font-bold tracking-widest" style={{ color: p.color }}>
                    {p.element.substring(0, 4).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[13px] font-bold" style={{ color: p.color }}>{p.type}</span>
                  <div className="flex gap-1 flex-wrap">
                    {p.planets.map(name => (
                      <span key={name} className="text-[13px] px-1.5 py-0.5 rounded-md"
                        style={{ background: `${PLANET_COLORS[name] ?? "#94a3b8"}18`, color: PLANET_COLORS[name] ?? "#94a3b8", border: `1px solid ${PLANET_COLORS[name] ?? "#94a3b8"}25` }}>
                        {PLANET_SYMBOLS[name]} {name}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: "#64748b" }}>{p.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Aspects tab ──────────────────────────────────────────────────────────────

function AspectsTab({ chart }: { chart: ChartData }) {
  const [filter, setFilter] = useState<string>("all");
  const types = ["all", "trine", "sextile", "conjunction", "square", "opposition", "quincunx"];

  const filtered = filter === "all"
    ? chart.aspects
    : chart.aspects.filter(a => a.type === filter);

  const exactAspects = chart.aspects.filter(a => a.exact);
  const harmoniousCount = chart.aspects.filter(a => ["trine", "sextile"].includes(a.type)).length;
  const tensionCount = chart.aspects.filter(a => ["square", "opposition"].includes(a.type)).length;

  return (
    <div className="space-y-5">
      {/* Patterns */}
      <ChartPatterns chart={chart} />

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "TOTAL ASPECTS", value: chart.aspects.length, color: "#7c3aed" },
          { label: "HARMONIOUS",    value: harmoniousCount,      color: "#22c55e" },
          { label: "TENSE",         value: tensionCount,          color: "#ef4444" },
        ].map(({ label, value, color }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-3 text-center"
            style={{ background: `${color}0a`, border: `1px solid ${color}20` }}
          >
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-[14px] tracking-widest mt-0.5 font-bold" style={{ color: "#475569" }}>{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Exact aspects highlight */}
      {exactAspects.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
          <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#7c3aed" }}>EXACT ASPECTS · MOST POWERFUL</p>
          <div className="flex flex-wrap gap-2">
            {exactAspects.map((a, i) => {
              const color = ASPECT_COLORS[a.type] ?? "#94a3b8";
              return (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                  style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                  <span style={{ color: PLANET_COLORS[a.planet1] ?? "#94a3b8" }}>{PLANET_SYMBOLS[a.planet1]}</span>
                  <span className="text-[14px] font-bold" style={{ color }}>{ASPECT_GLYPHS[a.type]}</span>
                  <span style={{ color: PLANET_COLORS[a.planet2] ?? "#94a3b8" }}>{PLANET_SYMBOLS[a.planet2]}</span>
                  <span className="text-[13px] font-bold" style={{ color }}>{a.orb.toFixed(2)}°</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Power Aspects — top 5 by composite strength */}
      {(() => {
        const ASPECT_WEIGHT: Record<string, number> = {
          conjunction: 3, opposition: 2, trine: 1.5, square: 1.5, sextile: 1, quincunx: 0.5,
        };
        const DIGNITY_STRENGTH: Record<string, number> = {
          domicile: 2, exaltation: 1.5, peregrine: 1, detriment: 0.5, fall: 0.25,
        };
        const getPlanetStrength = (name: PlanetName) => {
          const p = chart.planets.find(pl => pl.name === name);
          return DIGNITY_STRENGTH[p?.dignity ?? "peregrine"] ?? 1;
        };

        const scored = chart.aspects.map(a => {
          const exactness = Math.max(0, 10 - a.orb);
          const typeW = ASPECT_WEIGHT[a.type] ?? 1;
          const strength = getPlanetStrength(a.planet1) * getPlanetStrength(a.planet2);
          const applyingBonus = a.applying ? 1.15 : a.exact ? 1.25 : 1;
          const score = exactness * typeW * strength * applyingBonus;
          return { ...a, score };
        }).sort((a, b) => b.score - a.score).slice(0, 5);

        const maxScore = scored[0]?.score ?? 1;

        return (
          <div>
            <SectionHeader label="Power Aspects" sub="Top 5 by exactness · type weight · dignity strength" />
            <div className="space-y-2">
              {scored.map((a, i) => {
                const color = ASPECT_COLORS[a.type] ?? "#94a3b8";
                const p1Color = PLANET_COLORS[a.planet1] ?? "#94a3b8";
                const p2Color = PLANET_COLORS[a.planet2] ?? "#94a3b8";
                const barPct = (a.score / maxScore) * 100;
                return (
                  <motion.div
                    key={`${a.planet1}-${a.planet2}-${a.type}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-xl p-3"
                    style={{ background: `${color}08`, border: `1px solid ${color}20` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[13px] font-black w-4" style={{ color: "#475569" }}>#{i + 1}</span>
                      <span className="text-lg" style={{ color: p1Color }}>{PLANET_SYMBOLS[a.planet1]}</span>
                      <span className="text-base font-bold" style={{ color }}>{ASPECT_GLYPHS[a.type]}</span>
                      <span className="text-lg" style={{ color: p2Color }}>{PLANET_SYMBOLS[a.planet2]}</span>
                      <span className="text-[13px] font-bold capitalize ml-1" style={{ color }}>{a.type}</span>
                      <span className="text-[13px] font-mono ml-auto" style={{ color: "#475569" }}>{a.orb.toFixed(2)}°</span>
                      {a.exact && <span className="text-[14px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>EXACT</span>}
                      {a.applying && !a.exact && <span className="text-[14px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>APPL.</span>}
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: color, boxShadow: `0 0 4px ${color}` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.06 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Type filter */}
      <div className="flex gap-1 flex-wrap">
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className="px-2.5 py-1 rounded-lg text-[13px] font-bold tracking-widest cursor-pointer transition-all duration-200"
            style={{
              background: filter === t ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.03)",
              border: filter === t ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.06)",
              color: filter === t ? "#a78bfa" : "#475569",
            }}>
            {t === "all" ? "ALL" : ASPECT_GLYPHS[t]}
            {t !== "all" && <span className="ml-1 capitalize">{t}</span>}
          </button>
        ))}
      </div>

      {/* Aspects list */}
      <div className="space-y-1.5">
        {filtered.map((a, i) => {
          const color = ASPECT_COLORS[a.type] ?? "#94a3b8";
          const quality = ASPECT_QUALITY[a.type];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.025 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: a.exact ? `${color}0d` : "rgba(255,255,255,0.02)",
                border: a.exact ? `1px solid ${color}25` : "1px solid rgba(255,255,255,0.04)",
              }}
            >
              {/* Planets */}
              <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0" style={{ width: 120 }}>
                <span className="text-base" style={{ color: PLANET_COLORS[a.planet1] ?? "#94a3b8" }}>{PLANET_SYMBOLS[a.planet1]}</span>
                <span className="text-[13px] font-medium" style={{ color: "#475569" }}>{a.planet1}</span>
                <span className="text-[14px] font-bold mx-1" style={{ color }}>{ASPECT_GLYPHS[a.type]}</span>
                <span className="text-base" style={{ color: PLANET_COLORS[a.planet2] ?? "#94a3b8" }}>{PLANET_SYMBOLS[a.planet2]}</span>
                <span className="text-[13px] font-medium" style={{ color: "#475569" }}>{a.planet2}</span>
              </div>

              {/* Quality */}
              <div className="flex-1 min-w-0 hidden md:block">
                <p className="text-[13px] truncate" style={{ color: quality?.color ?? "#94a3b8" }}>
                  {quality?.label}
                </p>
              </div>

              {/* Orb + exact */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {a.exact && (
                  <span className="text-[14px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: `${color}18`, color }}>EXACT</span>
                )}
                <span className="text-[13px]" style={{ color: "#475569" }}>{a.orb.toFixed(2)}°</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Timing tab ───────────────────────────────────────────────────────────────

// ─── Live convergence computation (shared with dashboard widget) ──────────────

const OUTER_PLANET_NAMES: PlanetName[] = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

interface TransitHit { transitPlanet: PlanetName; natalPlanet: PlanetName; natalHouse: number; type: string; orb: number; exact: boolean; applying: boolean; }

function computeTimingConvergence(chart: ChartData, transits: TransitHit[]): {
  score: number; label: string; color: string;
  factors: { text: string; pts: number }[];
} {
  const factors: { text: string; pts: number }[] = [];
  let score = 0;
  const lord = chart.annualProfection.lordOfYear;
  const profHouse = chart.annualProfection.activatedHouse;
  const lordPlanetData = chart.planets.find(p => p.name === lord);

  if (lordPlanetData?.dignity === "domicile") { score += 18; factors.push({ text: `${lord} in domicile`, pts: 18 }); }
  else if (lordPlanetData?.dignity === "exaltation") { score += 14; factors.push({ text: `${lord} exalted`, pts: 14 }); }
  else if (lordPlanetData?.dignity === "detriment" || lordPlanetData?.dignity === "fall") score -= 8;

  const towardLord = transits.filter(t => t.natalPlanet === lord && OUTER_PLANET_NAMES.includes(t.transitPlanet) && t.applying && t.orb <= 3);
  if (towardLord.length >= 2) { score += 32; factors.push({ text: `${towardLord.length}× outer transits to ${lord}`, pts: 32 }); }
  else if (towardLord.length === 1) { const pts = towardLord[0].exact ? 22 : 16; score += pts; factors.push({ text: `${towardLord[0].transitPlanet}→${lord} (${towardLord[0].orb.toFixed(1)}°)`, pts }); }

  const inProfHouse = transits.filter(t => t.natalHouse === profHouse && t.applying && t.orb <= 5);
  if (inProfHouse.length >= 2) { score += 20; factors.push({ text: `H${profHouse} has ${inProfHouse.length} transits`, pts: 20 }); }
  else if (inProfHouse.length === 1) { score += 10; factors.push({ text: `Transit activating H${profHouse}`, pts: 10 }); }

  const lordTransiting = transits.filter(t => t.transitPlanet === lord && t.applying && t.orb <= 2 && (t.natalPlanet === "Sun" || t.natalPlanet === "Moon"));
  if (lordTransiting.length > 0) { score += 15; factors.push({ text: `${lord} activates natal luminaries`, pts: 15 }); }

  const exact = transits.filter(t => t.exact);
  if (exact.length > 0) { score += Math.min(exact.length * 5, 15); factors.push({ text: `${exact.length} exact transit${exact.length > 1 ? "s" : ""}`, pts: Math.min(exact.length * 5, 15) }); }

  score = Math.max(5, Math.min(100, score));
  const label = score >= 75 ? "PEAK" : score >= 50 ? "HIGH" : score >= 30 ? "ACTIVE" : "QUIET";
  const color = score >= 75 ? "#a855f7" : score >= 50 ? "#06b6d4" : score >= 30 ? "#f59e0b" : "#334155";
  return { score, label, color, factors };
}

// ─── Timing tab ───────────────────────────────────────────────────────────────

function TimingTab({ chart }: { chart: ChartData }) {
  const prof = chart.annualProfection;
  const lordColor = PLANET_COLORS[prof.lordOfYear] ?? "#f59e0b";
  const signColor = SIGN_COLORS[prof.activatedSign];
  const lordPlanet = chart.planets.find(p => p.name === prof.lordOfYear);

  const [transitHits, setTransitHits] = useState<TransitHit[]>([]);
  useEffect(() => {
    fetch("/api/transits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ natal: chart }),
    }).then(r => r.ok ? r.json() : null)
      .then((data: { aspects?: TransitHit[] } | null) => { if (data?.aspects) setTransitHits(data.aspects); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Next profection: next birthday
  const today = new Date();
  const nextBirthday = (() => {
    const birth = new Date(chart.birthDatetime);
    const next = new Date(birth);
    next.setUTCFullYear(today.getUTCFullYear() + (prof.age + 1));
    return next;
  })();
  const daysUntilNext = Math.ceil((nextBirthday.getTime() - today.getTime()) / 86400000);

  // Next profection sign
  const ascSignIdx = Math.floor(chart.ascendant / 30);
  const nextSignIdx = (ascSignIdx + prof.age + 1) % 12;
  const nextSign = ZODIAC_SIGNS[nextSignIdx];
  const nextLord = TRADITIONAL_RULERS[nextSign];

  // Lot of Fortune
  const lotSign = ZODIAC_SIGNS[Math.floor(chart.lotOfFortune / 30)];

  return (
    <div className="space-y-5">
      {/* Hero timing card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5"
        style={{
          background: `linear-gradient(135deg, ${lordColor}0d, rgba(4,4,28,0.8))`,
          border: `1px solid ${lordColor}28`,
          boxShadow: `0 0 40px ${lordColor}0a`,
        }}
      >
        <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#475569" }}>
          CURRENT PROFECTION YEAR · AGE {prof.age}
        </p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl" style={{ color: lordColor }}>{PLANET_SYMBOLS[prof.lordOfYear]}</span>
              <div>
                <p className="text-xl font-bold" style={{ color: lordColor }}>{prof.lordOfYear}</p>
                <p className="text-[13px]" style={{ color: "#475569" }}>Lord of the Year</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[14px] px-2.5 py-0.5 rounded-lg font-bold"
                style={{ background: `${signColor}15`, color: signColor }}>
                {SIGN_SYMBOLS[prof.activatedSign]} {prof.activatedSign}
              </span>
              <span className="text-[13px]" style={{ color: "#475569" }}>
                House {prof.activatedHouse} activated
              </span>
            </div>
          </div>

          {lordPlanet && (
            <div className="text-right">
              <p className="text-[14px] tracking-widest mb-1" style={{ color: "#334155" }}>LORD IN YOUR CHART</p>
              <p className="text-[13px] font-semibold" style={{ color: SIGN_COLORS[lordPlanet.sign] }}>
                {SIGN_SYMBOLS[lordPlanet.sign]} {lordPlanet.sign}
              </p>
              <p className="text-[13px]" style={{ color: "#475569" }}>H{lordPlanet.house}</p>
              {lordPlanet.dignity && lordPlanet.dignity !== "peregrine" && (
                <p className="text-[13px] mt-0.5 font-bold"
                  style={{ color: DIGNITY_LABELS[lordPlanet.dignity]?.color }}>
                  {DIGNITY_LABELS[lordPlanet.dignity]?.label}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 grid grid-cols-3 gap-3" style={{ borderTop: `1px solid ${lordColor}15` }}>
          <div>
            <p className="text-[14px] tracking-widest mb-1" style={{ color: "#334155" }}>THEME</p>
            <p className="text-[13px] font-medium" style={{ color: "#94a3b8" }}>
              {HOUSE_THEMES[prof.activatedHouse]?.name}
            </p>
          </div>
          <div>
            <p className="text-[14px] tracking-widest mb-1" style={{ color: "#334155" }}>DAYS LEFT</p>
            <p className="text-[13px] font-bold" style={{ color: "#94a3b8" }}>{daysUntilNext} days</p>
          </div>
          <div>
            <p className="text-[14px] tracking-widest mb-1" style={{ color: "#334155" }}>SECT</p>
            <p className="text-[13px] font-bold" style={{ color: chart.sect === "day" ? "#fbbf24" : "#c4b5fd" }}>
              {chart.sect === "day" ? "☀ Day" : "☽ Night"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Next year preview */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-4"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#334155" }}>
          NEXT PROFECTION YEAR · AGE {prof.age + 1}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-2xl" style={{ color: PLANET_COLORS[nextLord] ?? "#94a3b8" }}>
            {PLANET_SYMBOLS[nextLord]}
          </span>
          <div className="flex-1">
            <p className="text-[14px] font-bold" style={{ color: "#94a3b8" }}>
              {nextLord} year · {SIGN_SYMBOLS[nextSign]} {nextSign}
            </p>
            <p className="text-[13px]" style={{ color: "#475569" }}>
              Begins {formatDate(nextBirthday)} · {daysUntilNext} days away
            </p>
          </div>
        </div>
      </motion.div>

      {/* 12-house cycle overview */}
      <div>
        <SectionHeader label="12-Year Profection Cycle" sub="Repeating house activation pattern" />
        <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => {
            const signIdx = (ascSignIdx + i) % 12;
            const sign = ZODIAC_SIGNS[signIdx];
            const lord = TRADITIONAL_RULERS[sign];
            const isActive = prof.activatedHouse === i + 1;
            const signColor2 = SIGN_COLORS[sign];
            return (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl"
                style={{
                  background: isActive ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.02)",
                  border: isActive ? "1px solid rgba(124,58,237,0.35)" : "1px solid rgba(255,255,255,0.04)",
                  boxShadow: isActive ? "0 0 16px rgba(124,58,237,0.15)" : "none",
                }}
              >
                <span className="text-[14px] font-bold tracking-wider" style={{ color: isActive ? "#a78bfa" : "#334155" }}>H{i + 1}</span>
                <span className="text-base" style={{ color: signColor2 }}>{SIGN_SYMBOLS[sign]}</span>
                <span className="text-[14px] font-bold" style={{ color: PLANET_COLORS[lord] ?? "#94a3b8" }}>
                  {PLANET_SYMBOLS[lord]}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Lots */}
      <div>
        <SectionHeader label="Arabic Lots" sub="Hellenistic sensitive points" />
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Lot of Fortune",  lon: chart.lotOfFortune, color: "#f59e0b", desc: "Material prosperity · Life's fortune & body" },
            { label: "Lot of Spirit",   lon: chart.lotOfSpirit,  color: "#a78bfa", desc: "Soul's path · Action & intention" },
          ].map(({ label, lon, color, desc }) => {
            const sign = ZODIAC_SIGNS[Math.floor(lon / 30)];
            const degree = lon % 30;
            const house = chart.houses.findIndex((h, i) => {
              const next = chart.houses[(i + 1) % 12];
              const lon2 = lon % 360;
              const hLon = h.longitude;
              const nLon = next.longitude;
              if (hLon <= nLon) return lon2 >= hLon && lon2 < nLon;
              return lon2 >= hLon || lon2 < nLon;
            }) + 1;
            return (
              <div key={label} className="rounded-xl p-3.5"
                style={{ background: `${color}0a`, border: `1px solid ${color}20` }}>
                <p className="text-[14px] font-bold tracking-widest mb-2" style={{ color: "#475569" }}>{label.toUpperCase()}</p>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xl" style={{ color: SIGN_COLORS[sign] }}>{SIGN_SYMBOLS[sign]}</span>
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: SIGN_COLORS[sign] }}>{sign}</p>
                    <p className="text-[13px]" style={{ color: "#475569" }}>{degree.toFixed(1)}° · H{house > 0 ? house : 1}</p>
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: "#64748b" }}>{desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Convergence Score */}
      {transitHits.length > 0 && (() => {
        const { score, label, color, factors } = computeTimingConvergence(chart, transitHits);
        const R = 34;
        const circ = 2 * Math.PI * R;
        const dash = (score / 100) * circ * 0.75;
        const gap = circ - dash;
        return (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl p-5"
            style={{ background: `${color}0a`, border: `1px solid ${color}18` }}
          >
            <p className="text-[13px] font-bold tracking-widest mb-4" style={{ color }}>
              LIVE TIMING ALIGNMENT — TRANSIT-BASED CONVERGENCE
            </p>
            <div className="flex items-center gap-4">
              {/* Arc gauge */}
              <div className="flex-shrink-0 relative" style={{ width: 78, height: 78 }}>
                <svg width={78} height={78} style={{ transform: "rotate(135deg)" }} viewBox="0 0 78 78">
                  <circle cx={39} cy={39} r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={6} strokeDasharray={`${circ * 0.75} ${circ}`} strokeLinecap="round" />
                  <motion.circle
                    cx={39} cy={39} r={R} fill="none" stroke={color} strokeWidth={6}
                    strokeDasharray={`${dash} ${gap + circ * 0.25}`}
                    strokeLinecap="round"
                    initial={{ strokeDasharray: `0 ${circ}` }}
                    animate={{ strokeDasharray: `${dash} ${gap + circ * 0.25}` }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                    style={{ filter: `drop-shadow(0 0 5px ${color}80)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.3rem", fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
                  <span style={{ fontSize: "0.42rem", fontWeight: 700, letterSpacing: "0.12em", color }}>{label}</span>
                </div>
              </div>
              {/* Factors */}
              <div className="flex-1 min-w-0 space-y-1.5">
                {factors.length === 0 ? (
                  <p className="text-[13px]" style={{ color: "#334155" }}>No major alignments active right now. This is normal — windows of high convergence are relatively brief.</p>
                ) : factors.slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-[13px] leading-snug flex-1" style={{ color: "#475569" }}>{f.text}</span>
                    <span className="text-[14px] font-bold flex-shrink-0" style={{ color }}>+{f.pts}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* Link to full timeline */}
      <Link href="/dashboard/timeline">
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="w-full py-3 rounded-xl text-[13px] font-bold tracking-widest cursor-pointer"
          style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}
        >
          VIEW FULL TIMELINE → PROFECTIONS · ZOD. RELEASING · PROGRESSIONS · FIRDARIA
        </motion.button>
      </Link>
    </div>
  );
}

// ─── Oracle tab (AI chat) ─────────────────────────────────────────────────────

function MessageBubble({ role, content, streaming = false }: { role: "user" | "assistant"; content: string; streaming?: boolean }) {
  if (role === "user") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm text-[14px] leading-relaxed"
          style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)", color: "#c4b5fd" }}>
          {content}
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
      <div className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center mt-1"
        style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 16px rgba(124,58,237,0.5)" }}>
        <span className="text-[13px] text-white font-bold">✦</span>
      </div>
      <div className="flex-1 px-4 py-3 rounded-2xl rounded-tl-sm text-[14px] leading-relaxed"
        style={{ background: "rgba(4,4,28,0.8)", border: "1px solid rgba(99,102,241,0.2)", color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
        {content}
        {streaming && (
          <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
            className="inline-block w-1.5 h-4 ml-1 align-middle rounded-sm" style={{ background: "#7c3aed" }} />
        )}
      </div>
    </motion.div>
  );
}

function OracleTab({
  chart, messages, input, setInput, streaming, streamText, send, profileId, setMessages,
}: {
  chart: ChartData | null;
  messages: { role: "user" | "assistant"; content: string }[];
  input: string;
  setInput: (v: string) => void;
  streaming: boolean;
  streamText: string;
  send: (text: string) => void;
  profileId: string | null;
  setMessages: (m: { role: "user" | "assistant"; content: string }[]) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const allMessages = streaming
    ? [...messages, { role: "assistant" as const, content: streamText }]
    : messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const isEmpty = allMessages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Empty state */}
      <AnimatePresence>
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center py-12 gap-8"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.15))",
                  border: "1px solid rgba(124,58,237,0.35)",
                  boxShadow: "0 0 40px rgba(124,58,237,0.25), 0 0 80px rgba(124,58,237,0.1)",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="url(#og)" strokeWidth="1.2" className="w-10 h-10">
                  <defs>
                    <linearGradient id="og" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-base font-bold" style={{ color: "#e2e8f0" }}>Cosmora Oracle</p>
                <p className="text-[13px] mt-1" style={{ color: "#475569" }}>
                  {chart ? "Ask anything about your chart" : "Connect your chart to begin"}
                </p>
              </div>
            </motion.div>

            {chart && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full max-w-xl">
                {READING_PROMPTS.map(rp => (
                  <motion.button
                    key={rp.id}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => send(rp.prompt)}
                    disabled={streaming}
                    className="flex flex-col items-start gap-1.5 p-3 rounded-xl cursor-pointer text-left disabled:opacity-40"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <p className="text-[13px] font-bold tracking-wider" style={{ color: "#a78bfa" }}>{rp.label}</p>
                    <p className="text-[13px] leading-relaxed" style={{ color: "#475569" }}>
                      {rp.prompt.substring(0, 55)}…
                    </p>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      {!isEmpty && (
        <div className="flex-1 overflow-y-auto py-4 space-y-4" style={{ scrollbarWidth: "thin" }}>
          {allMessages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content}
              streaming={streaming && i === allMessages.length - 1 && m.role === "assistant"} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Quick prompts when chat has content */}
      {!isEmpty && !streaming && chart && (
        <div className="flex-shrink-0 py-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-2" style={{ minWidth: "max-content" }}>
            {READING_PROMPTS.map(rp => (
              <motion.button key={rp.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => send(rp.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-bold tracking-widest cursor-pointer whitespace-nowrap"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(99,102,241,0.15)", color: "#64748b" }}>
                {rp.label.toUpperCase()}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Clear button if messages exist */}
      {messages.length > 0 && (
        <div className="flex justify-end pb-1">
          <button
            onClick={() => { setMessages([]); if (profileId) localStorage.removeItem(`cosmora_chat_${profileId}`); }}
            className="text-[13px] font-bold tracking-widest px-2.5 py-1 rounded-lg cursor-pointer"
            style={{ color: "#475569", border: "1px solid rgba(239,68,68,0.15)" }}
          >
            CLEAR CHAT
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 pt-2" style={{ borderTop: "1px solid rgba(99,102,241,0.1)" }}>
        <ScanBar color="#7c3aed" />
        <div className="flex items-end gap-3 p-3 rounded-2xl mt-2"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(124,58,237,0.2)" }}>
          <div className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center mb-0.5"
            style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 14px rgba(124,58,237,0.4)" }}>
            <span className="text-[13px] text-white font-bold">✦</span>
          </div>
          <textarea
            ref={inputRef} rows={1} value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder={chart ? "Ask about your chart, timing, relationships…" : "Create a birth profile to begin…"}
            disabled={streaming || !chart}
            className="flex-1 bg-transparent text-[14px] outline-none resize-none leading-relaxed disabled:opacity-40"
            style={{ color: "#e2e8f0", minHeight: 24, maxHeight: 120 }}
          />
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => send(input)}
            disabled={streaming || !input.trim() || !chart}
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed mb-0.5"
            style={{ background: input.trim() && !streaming ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(124,58,237,0.3)" }}
          >
            {streaming
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-3.5 h-3.5 rounded-full border border-t-transparent" style={{ borderColor: "#7c3aed" }} />
              : <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
            }
          </motion.button>
        </div>
        <p className="text-[13px] text-center mt-1.5" style={{ color: "#1e293b" }}>Shift+Enter for new line · Enter to send</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [chart, setChart] = useState<ChartData | null>(null);
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<InsightTab>("overview");

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setLoading(false); return; }
    setProfileId(id);
    setProfile(getProfile(id));
    setChart(getCachedChart(id));
    const history = getChatHistory(id);
    if (history.length > 0) setMessages(history);
    setLoading(false);
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg = { role: "user" as const, content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    if (profileId) pushChatMessage(profileId, userMsg);
    setInput("");
    setStreaming(true);
    setStreamText("");
    setActiveTab("oracle");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), chart: chart ?? undefined, history: messages.slice(-12) }),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            const assistantMsg = { role: "assistant" as const, content: accumulated };
            setMessages(prev => [...prev, assistantMsg]);
            if (profileId) pushChatMessage(profileId, assistantMsg);
            setStreamText("");
            setStreaming(false);
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) { accumulated += parsed.text; setStreamText(accumulated); }
            if (parsed.error) throw new Error(parsed.error);
          } catch { /* skip parse errors */ }
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${String(e)}` }]);
      setStreamText("");
      setStreaming(false);
    }
  }, [chart, messages, streaming, profileId]);

  const TABS: { id: InsightTab; label: string }[] = [
    { id: "overview", label: "OVERVIEW"  },
    { id: "planets",  label: "PLANETS"   },
    { id: "aspects",  label: "ASPECTS"   },
    { id: "timing",   label: "TIMING"    },
    { id: "oracle",   label: "ORACLE"    },
  ];

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#00000f" }}>
      <DashboardBg />
      <div className="nebula-orb" style={{ width: 500, height: 500, left: "10%", top: "0%", background: "rgba(124,58,237,0.06)", filter: "blur(100px)" }} />
      <div className="nebula-orb" style={{ width: 400, height: 400, right: "5%", bottom: "10%", background: "rgba(6,182,212,0.04)", filter: "blur(80px)" }} />

      <Sidebar />

      <div className="flex-1 flex flex-col min-h-0 min-w-0 md:ml-[68px] mb-[60px] md:mb-0 relative z-10 overflow-x-hidden">

        {/* Top bar */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-3"
          style={{ borderBottom: "1px solid rgba(6,182,212,0.1)", background: "rgba(1,1,14,0.85)", backdropFilter: "blur(20px)" }}
        >
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer" style={{ color: "#64748b" }}>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
                Dashboard
              </motion.button>
            </Link>
            <span style={{ color: "#1e293b" }}>/</span>
            <span className="text-[13px] font-bold tracking-widest gradient-text">INSIGHTS</span>
            {profile && (
              <>
                <span style={{ color: "#1e293b" }}>/</span>
                <span className="text-[13px] font-medium hidden md:inline" style={{ color: "#64748b" }}>{profile.name}</span>
              </>
            )}
          </div>
          <Link href="/dashboard/chart">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="text-[13px] font-bold tracking-widest px-3 py-1.5 rounded-lg cursor-pointer"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
              VIEW CHART
            </motion.button>
          </Link>
        </motion.div>

        {/* Chart snapshot */}
        {chart && (
          <div className="flex-shrink-0 px-4 md:px-6 py-2.5" style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
            <ChartSnapshot chart={chart} />
          </div>
        )}

        {/* Tab row */}
        <div className="flex-shrink-0 flex items-center gap-1 px-4 md:px-6 py-2 overflow-x-auto"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", scrollbarWidth: "none" }}>
          {TABS.map(({ id, label }) => (
            <motion.button key={id} whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-bold tracking-widest cursor-pointer transition-all duration-200"
              style={{
                background: activeTab === id ? "rgba(124,58,237,0.25)" : "transparent",
                color: activeTab === id ? "#a78bfa" : "#334155",
                border: activeTab === id ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.05)",
              }}>
              {label}
              {label === "ORACLE" && messages.length > 0 && (
                <span className="ml-1.5 text-[14px] px-1 rounded-full align-middle"
                  style={{ background: "rgba(124,58,237,0.3)", color: "#a78bfa" }}>
                  {messages.filter(m => m.role === "assistant").length}
                </span>
              )}
            </motion.button>
          ))}
        </div>

        {/* Tab content */}
        <div className={`flex-1 overflow-hidden ${activeTab === "oracle" ? "flex flex-col" : "overflow-y-auto"}`}
          style={{ scrollbarWidth: "thin" }}>
          <div className={`px-4 md:px-6 py-5 ${activeTab === "oracle" ? "flex flex-col flex-1 min-h-0" : "max-w-4xl mx-auto"}`}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 rounded-full"
                  style={{ border: "1px solid rgba(124,58,237,0.3)", borderTopColor: "#7c3aed" }} />
              </div>
            ) : !chart ? (
              <div className="flex flex-col items-center justify-center py-20 gap-6">
                <motion.div
                  animate={{ scale: [1, 1.06, 1], opacity: [0.75, 1, 0.75] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="rounded-2xl flex items-center justify-center"
                  style={{ width: 64, height: 64, background: "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(6,182,212,0.14))", border: "1px solid rgba(124,58,237,0.35)", boxShadow: "0 0 48px rgba(124,58,237,0.18)" }}
                >
                  <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
                    <circle cx="18" cy="18" r="14" stroke="rgba(124,58,237,0.6)" strokeWidth="1"/>
                    <circle cx="18" cy="18" r="8" stroke="rgba(6,182,212,0.5)" strokeWidth="0.75"/>
                    <line x1="18" y1="4" x2="18" y2="32" stroke="rgba(124,58,237,0.35)" strokeWidth="0.75"/>
                    <line x1="4" y1="18" x2="32" y2="18" stroke="rgba(124,58,237,0.35)" strokeWidth="0.75"/>
                    <circle cx="18" cy="18" r="2.5" fill="rgba(6,182,212,0.8)"/>
                  </svg>
                </motion.div>
                <div className="text-center">
                  <p className="text-[14px] font-bold tracking-[0.2em] mb-2" style={{ color: "#334155" }}>NO CHART DATA</p>
                  <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "Space Grotesk, sans-serif", color: "#e2e8f0" }}>Cosmic instruments standing by.</h3>
                  <p className="text-[14px] max-w-xs mx-auto" style={{ color: "#475569" }}>Enter your birth data to unlock natal insights and all their cosmic layers.</p>
                </div>
                <Link href="/onboarding">
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    className="px-6 py-3 rounded-xl text-[14px] font-bold tracking-wider cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white", border: "1px solid rgba(124,58,237,0.4)" }}>
                    Begin Your Chart →
                  </motion.button>
                </Link>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === "overview" && (
                  <motion.div key="overview" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }}>
                    <OverviewTab chart={chart} onAskOracle={send} />
                  </motion.div>
                )}
                {activeTab === "planets" && (
                  <motion.div key="planets" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }}>
                    <PlanetsTab chart={chart} />
                  </motion.div>
                )}
                {activeTab === "aspects" && (
                  <motion.div key="aspects" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }}>
                    <AspectsTab chart={chart} />
                  </motion.div>
                )}
                {activeTab === "timing" && (
                  <motion.div key="timing" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }}>
                    <TimingTab chart={chart} />
                  </motion.div>
                )}
                {activeTab === "oracle" && (
                  <motion.div key="oracle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex flex-col flex-1 min-h-0">
                    <OracleTab
                      chart={chart} messages={messages} input={input} setInput={setInput}
                      streaming={streaming} streamText={streamText} send={send}
                      profileId={profileId} setMessages={setMessages}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
