"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { DashboardBg } from "@/components/ui/DashboardBg";
import {
  SIGN_SYMBOLS, PLANET_SYMBOLS, ZODIAC_SIGNS, TRADITIONAL_RULERS,
} from "@/lib/astrology/types";
import type { ChartData, PlanetName, ZodiacSign, Aspect } from "@/lib/astrology/types";
import {
  listProfiles, getActiveProfileId, getCachedChart,
} from "@/lib/storage";
import type { StoredProfile } from "@/lib/storage";

// ─── Synastry computation ─────────────────────────────────────────────────────

const ASPECT_ANGLES = [
  { type: "conjunction" as const, angle: 0,   orb: 8, harmony: 0.5 },
  { type: "opposition"  as const, angle: 180, orb: 8, harmony: -0.5 },
  { type: "trine"       as const, angle: 120, orb: 7, harmony: 1 },
  { type: "square"      as const, angle: 90,  orb: 7, harmony: -1 },
  { type: "sextile"     as const, angle: 60,  orb: 5, harmony: 0.8 },
  { type: "quincunx"    as const, angle: 150, orb: 3, harmony: -0.3 },
];

const PLANET_WEIGHT: Partial<Record<PlanetName, number>> = {
  Sun: 3, Moon: 3, Mercury: 1.5, Venus: 2.5, Mars: 2,
  Jupiter: 1.5, Saturn: 1.5, Uranus: 1, Neptune: 1, Pluto: 1,
};

interface SynastryAspect extends Aspect {
  personAplanet: PlanetName;
  personBplanet: PlanetName;
  harmony: number;
}

function computeSynastry(chartA: ChartData, chartB: ChartData): SynastryAspect[] {
  const aspects: SynastryAspect[] = [];
  for (const pA of chartA.planets) {
    for (const pB of chartB.planets) {
      let diff = Math.abs(pA.longitude - pB.longitude);
      if (diff > 180) diff = 360 - diff;
      for (const { type, angle, orb, harmony } of ASPECT_ANGLES) {
        const orbVal = Math.abs(diff - angle);
        if (orbVal <= orb) {
          aspects.push({
            planet1: pA.name,
            planet2: pB.name,
            personAplanet: pA.name,
            personBplanet: pB.name,
            type,
            orb: orbVal,
            exact: orbVal < 1,
            applying: pA.speed < pB.speed,
            harmony,
          });
        }
      }
    }
  }
  // Sort: lowest orb first
  return aspects.sort((a, b) => a.orb - b.orb);
}

function computeScore(aspects: SynastryAspect[]): {
  total: number;
  harmony: number;
  tension: number;
  breakdown: { category: string; score: number; label: string }[];
} {
  let rawScore = 0;
  let harmonyScore = 0;
  let tensionScore = 0;

  // Weight by planet importance and harmony
  for (const asp of aspects) {
    const wA = PLANET_WEIGHT[asp.personAplanet] ?? 1;
    const wB = PLANET_WEIGHT[asp.personBplanet] ?? 1;
    const weight = Math.sqrt(wA * wB);
    const orbFactor = 1 - asp.orb / 10;
    rawScore += asp.harmony * weight * orbFactor;
    if (asp.harmony > 0) harmonyScore += asp.harmony * weight * orbFactor;
    else tensionScore += Math.abs(asp.harmony) * weight * orbFactor;
  }

  // Normalize to 0–100
  const total = Math.round(Math.min(100, Math.max(0, 50 + rawScore * 5)));

  // Category breakdown (by planet pairs)
  const romantic = aspects.filter(a =>
    (["Venus", "Moon", "Sun"].includes(a.personAplanet) && ["Venus", "Moon", "Sun"].includes(a.personBplanet))
  );
  const intellectual = aspects.filter(a =>
    (["Mercury", "Sun", "Uranus"].includes(a.personAplanet) || ["Mercury", "Sun", "Uranus"].includes(a.personBplanet))
  );
  const growth = aspects.filter(a =>
    (["Jupiter", "Saturn"].includes(a.personAplanet) || ["Jupiter", "Saturn"].includes(a.personBplanet))
  );

  const catScore = (cats: SynastryAspect[]) => {
    let s = 0;
    for (const a of cats) {
      const orbF = 1 - a.orb / 10;
      s += a.harmony * orbF;
    }
    return Math.round(Math.min(100, Math.max(0, 50 + s * 8)));
  };

  return {
    total,
    harmony: Math.round(harmonyScore * 10),
    tension: Math.round(tensionScore * 10),
    breakdown: [
      { category: "Romance", score: catScore(romantic), label: "Love & Attraction" },
      { category: "Mind", score: catScore(intellectual), label: "Mental Connection" },
      { category: "Growth", score: catScore(growth), label: "Expansion & Stability" },
    ],
  };
}

// ─── Composite midpoints + archetype ─────────────────────────────────────────

type CompositePlanet = { name: PlanetName; longitude: number; sign: ZodiacSign; signDegree: number; house: number };

function getLonToHouse(lon: number, houses: ChartData["houses"]): number {
  for (let i = 0; i < houses.length; i++) {
    const curr = houses[i].longitude;
    const next = houses[(i + 1) % 12].longitude;
    if (curr <= next) { if (lon >= curr && lon < next) return i + 1; }
    else { if (lon >= curr || lon < next) return i + 1; }
  }
  return 1;
}

function computeComposite(chartA: ChartData, chartB: ChartData): CompositePlanet[] {
  return chartA.planets.reduce<CompositePlanet[]>((acc, pA) => {
    const pB = chartB.planets.find(p => p.name === pA.name);
    if (!pB) return acc;
    let mid = (pA.longitude + pB.longitude) / 2;
    if (Math.abs(pA.longitude - pB.longitude) > 180) mid = (mid + 180) % 360;
    mid = ((mid % 360) + 360) % 360;
    const sign = ZODIAC_SIGNS[Math.floor(mid / 30)] as ZodiacSign;
    acc.push({ name: pA.name, longitude: mid, sign, signDegree: mid % 30, house: getLonToHouse(mid, chartA.houses) });
    return acc;
  }, []);
}

function getRelationshipArchetype(aspects: SynastryAspect[]): { name: string; description: string; color: string } {
  const scores = { soulBond: 0, romanticFire: 0, karmic: 0, mental: 0, growth: 0 };
  const luminaries = new Set(["Sun", "Moon"]);
  for (const asp of aspects) {
    const pA = asp.personAplanet, pB = asp.personBplanet;
    const w = (1 - asp.orb / 10) * (asp.harmony > 0 ? 1 : 0.5);
    if (luminaries.has(pA) && luminaries.has(pB)) scores.soulBond += w * 2;
    if ((pA === "Venus" && pB === "Mars") || (pA === "Mars" && pB === "Venus")) scores.romanticFire += w * 2;
    if (pA === "Venus" || pB === "Venus") scores.romanticFire += w * 0.5;
    if (pA === "Saturn" || pB === "Saturn") scores.karmic += w;
    if (pA === "Mercury" || pB === "Mercury") scores.mental += w;
    if (pA === "Jupiter" || pB === "Jupiter") scores.growth += w;
  }
  const [top] = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const archMap: Record<string, { name: string; description: string; color: string }> = {
    soulBond:     { name: "Soul Bond",         description: "Deep recognition and emotional attunement — you feel like you've known each other before.", color: "#a855f7" },
    romanticFire: { name: "Magnetic Union",     description: "Intense attraction and creative chemistry — a passionate, activating connection.",            color: "#f472b6" },
    karmic:       { name: "Karmic Contract",    description: "This relationship brings lessons, structure, and long-term commitment themes.",              color: "#94a3b8" },
    mental:       { name: "Meeting of Minds",   description: "Intellectual synergy and mutual fascination — you think alike and stimulate each other.",    color: "#06b6d4" },
    growth:       { name: "Growth Partnership", description: "This connection expands your worldview, beliefs, and sense of possibility.",                 color: "#f59e0b" },
  };
  return archMap[top?.[0]] ?? archMap.soulBond;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANET_COLORS: Partial<Record<PlanetName, string>> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#8b5cf6",
  NorthNode: "#64748b",
};

const ASPECT_COLORS: Record<string, string> = {
  conjunction: "#a855f7", opposition: "#ef4444", trine: "#22c55e",
  square: "#f59e0b", sextile: "#06b6d4", quincunx: "#64748b",
};

const ASPECT_GLYPHS: Record<string, string> = {
  conjunction: "☌", opposition: "☍", trine: "△", square: "□", sextile: "⚹", quincunx: "⚻",
};

const SIGN_COLORS: Record<ZodiacSign, string> = {
  Aries: "#ef4444", Taurus: "#22c55e", Gemini: "#eab308", Cancer: "#38bdf8",
  Leo: "#f97316", Virgo: "#4ade80", Libra: "#facc15", Scorpio: "#dc2626",
  Sagittarius: "#f59e0b", Capricorn: "#94a3b8", Aquarius: "#06b6d4", Pisces: "#8b5cf6",
};

// ─── Compatibility Oracle ────────────────────────────────────────────────────

function CompatibilityOracle({ profileA, profileB, score, aspects }: {
  profileA: StoredProfile; profileB: StoredProfile;
  score: { total: number; breakdown: { category: string; score: number; label: string }[] };
  aspects: SynastryAspect[];
}) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const hasFired = useRef(false);
  const pairKey = `${profileA.id}-${profileB.id}`;

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    const top5 = aspects.slice(0, 5).map(a =>
      `${a.personAplanet} ${a.type} ${a.personBplanet} (orb ${a.orb.toFixed(1)}°, ${a.harmony > 0 ? "harmonious" : "challenging"})`
    ).join("; ");

    const romantic = score.breakdown.find(b => b.category === "Romance")?.score ?? 50;
    const mind = score.breakdown.find(b => b.category === "Mind")?.score ?? 50;
    const growth = score.breakdown.find(b => b.category === "Growth")?.score ?? 50;

    const prompt = `You are an expert traditional astrologer specializing in synastry and relationship analysis.

Interpret the compatibility between ${profileA.name} and ${profileB.name}.
Overall compatibility score: ${score.total}/100
Romance compatibility: ${romantic}/100
Mental connection: ${mind}/100
Growth & stability: ${growth}/100
Top aspects: ${top5}

Write 3 paragraphs: (1) the overall nature and dynamic of this relationship based on the score and strongest aspects; (2) where they naturally support and complement each other; (3) the tension points and how they can be navigated constructively. Be specific to the aspects listed. No bullet points.`;

    setStreaming(true);
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, profileId: null }),
    }).then(async (res) => {
      if (!res.ok || !res.body) { setStreaming(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try { const d = JSON.parse(line.slice(6)); if (d.text) setText(prev => prev + d.text); } catch {}
        }
      }
      setStreaming(false);
    }).catch(() => setStreaming(false));
  }, [pairKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(244,114,182,0.2)", background: "rgba(244,114,182,0.04)" }}
    >
      <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(244,114,182,0.1)" }}>
        <p className="text-[13px] font-bold tracking-widest" style={{ color: "#f472b6" }}>
          ✦ ORACLE — {profileA.name} & {profileB.name}
        </p>
      </div>
      <div className="p-5">
        {streaming && !text && (
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 rounded-full border border-t-transparent flex-shrink-0"
              style={{ borderColor: "#f472b6" }}
            />
            <span className="text-[13px]" style={{ color: "#475569" }}>Oracle is reading your connection…</span>
          </div>
        )}
        {text && (
          <div className="text-[16px] leading-relaxed space-y-3" style={{ color: "#94a3b8" }}>
            {text.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            {streaming && (
              <span
                className="inline-block w-1 h-4 ml-0.5 rounded-sm"
                style={{ background: "#f472b6", animation: "pulse 1s infinite" }}
              />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProfileSelector({
  label, profiles, selectedId, onSelect, accentColor,
}: {
  label: string;
  profiles: StoredProfile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  accentColor: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-bold tracking-widest mb-2" style={{ color: accentColor }}>
        {label}
      </p>
      <div className="flex flex-col gap-1.5">
        {profiles.map(p => (
          <motion.button
            key={p.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(p.id)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-left transition-all duration-200"
            style={{
              background: selectedId === p.id ? `${accentColor}15` : "rgba(255,255,255,0.03)",
              border: selectedId === p.id ? `1px solid ${accentColor}35` : "1px solid rgba(255,255,255,0.05)",
              boxShadow: selectedId === p.id ? `0 0 16px ${accentColor}15` : "none",
            }}
          >
            <div
              className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[13px] font-bold"
              style={{
                background: selectedId === p.id ? `${accentColor}25` : "rgba(255,255,255,0.06)",
                color: selectedId === p.id ? accentColor : "#475569",
              }}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: selectedId === p.id ? "#e2e8f0" : "#94a3b8" }}>
                {p.name}
              </p>
              <p className="text-[13px] truncate" style={{ color: "#334155" }}>
                {p.birthDate} · {p.birthPlace}
              </p>
            </div>
            {selectedId === p.id && (
              <div className="ml-auto flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function ScoreArc({ score, color }: { score: number; color: string }) {
  const r = 46;
  const circumference = Math.PI * r;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <svg width={120} height={70} viewBox="0 0 120 70" className="overflow-visible">
      <defs>
        <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      {/* Background arc */}
      <path
        d={`M 14 60 A ${r} ${r} 0 0 1 106 60`}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Score arc */}
      <path
        d={`M 14 60 A ${r} ${r} 0 0 1 106 60`}
        fill="none"
        stroke="url(#scoreGrad)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
      {/* Score text */}
      <text x="60" y="52" textAnchor="middle" fill="#e2e8f0" fontSize="22" fontWeight="bold" fontFamily="sans-serif">
        {score}
      </text>
      <text x="60" y="66" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="sans-serif">
        COMPATIBILITY
      </text>
    </svg>
  );
}

function AspectRow({ aspect, nameA, nameB }: {
  aspect: SynastryAspect;
  nameA: string;
  nameB: string;
}) {
  const colorA = PLANET_COLORS[aspect.personAplanet] ?? "#94a3b8";
  const colorB = PLANET_COLORS[aspect.personBplanet] ?? "#94a3b8";
  const aspectColor = ASPECT_COLORS[aspect.type];
  const isHarmonious = aspect.harmony > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{
        background: isHarmonious ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)",
        border: `1px solid ${isHarmonious ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)"}`,
      }}
    >
      {/* Person A planet */}
      <div className="flex items-center gap-1 min-w-[64px]">
        <span className="text-[14px]" style={{ color: colorA }}>{PLANET_SYMBOLS[aspect.personAplanet]}</span>
        <span className="text-[13px] font-medium" style={{ color: colorA }}>
          {aspect.personAplanet.substring(0, 3)}
        </span>
      </div>

      {/* Aspect glyph */}
      <div className="flex flex-col items-center gap-0.5 w-8 flex-shrink-0">
        <span className="text-base leading-none" style={{ color: aspectColor }}>
          {ASPECT_GLYPHS[aspect.type]}
        </span>
        <span className="text-[14px] tracking-wider" style={{ color: "#334155" }}>
          {aspect.orb.toFixed(1)}°
        </span>
      </div>

      {/* Person B planet */}
      <div className="flex items-center gap-1 min-w-[64px]">
        <span className="text-[14px]" style={{ color: colorB }}>{PLANET_SYMBOLS[aspect.personBplanet]}</span>
        <span className="text-[13px] font-medium" style={{ color: colorB }}>
          {aspect.personBplanet.substring(0, 3)}
        </span>
      </div>

      {/* Type */}
      <span className="flex-1 text-[13px] font-bold tracking-wider capitalize" style={{ color: aspectColor }}>
        {aspect.type}
      </span>

      {/* Harmony indicator */}
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: isHarmonious ? "#22c55e" : "#ef4444",
          boxShadow: `0 0 5px ${isHarmonious ? "#22c55e" : "#ef4444"}60`,
        }}
      />
    </motion.div>
  );
}

function SynastryBiWheel({ chartA, chartB, nameA, nameB, aspects }: {
  chartA: ChartData;
  chartB: ChartData;
  nameA: string;
  nameB: string;
  aspects: SynastryAspect[];
}) {
  const SIZE = 320, CX = 160, CY = 160;
  const R_INNER_CORE = 28;
  const R_HOUSE_IN = 40;
  const R_HOUSE_OUT = 95;
  const R_ZODIAC_IN = 95;
  const R_ZODIAC_OUT = 116;
  const R_PLANETS_A = 80; // A's planets inside zodiac ring
  const R_PLANETS_B = 128; // B's planets outside zodiac ring

  const ZODIAC = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
  const ZODIAC_COLORS = ["#ef4444","#22c55e","#eab308","#a855f7","#f97316","#6366f1","#ec4899","#dc2626","#f59e0b","#64748b","#06b6d4","#8b5cf6"];

  // Convert ecliptic longitude to SVG angle (0° Aries at top, clockwise)
  function lonToAngle(lon: number): number {
    return (lon / 360) * 2 * Math.PI - Math.PI / 2;
  }
  function polarXY(angle: number, r: number): [number, number] {
    return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
  }

  // Aspect lines — only the top 6 by tightness (lowest orb)
  const topAspects = aspects.slice(0, 6);
  const ASPECT_COLORS_LOCAL: Record<string, string> = {
    conjunction: "#a855f7", opposition: "#ef4444", trine: "#22c55e",
    square: "#f97316", sextile: "#06b6d4", quincunx: "#94a3b8",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex justify-center"
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ maxWidth: "100%", height: "auto" }}>
        <defs>
          <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(244,114,182,0.25)" />
            <stop offset="100%" stopColor="rgba(244,114,182,0)" />
          </radialGradient>
          <filter id="bwGlow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Core */}
        <circle cx={CX} cy={CY} r={R_INNER_CORE + 8} fill="url(#coreGrad)" />
        <circle cx={CX} cy={CY} r={R_INNER_CORE} fill="rgba(4,4,28,0.95)" stroke="rgba(244,114,182,0.2)" strokeWidth={1} />

        {/* Person A label */}
        <text x={CX} y={CY - 6} textAnchor="middle" fontSize={6} fill="#f9a8d4" fontWeight="bold" letterSpacing={0.5}>
          {nameA.substring(0, 6).toUpperCase()}
        </text>
        <text x={CX} y={CY + 6} textAnchor="middle" fontSize={5} fill="#334155" letterSpacing={0.5}>
          INNER
        </text>

        {/* House lines (from inner to zodiac ring) */}
        {chartA.houses.map((house, i) => {
          const a = lonToAngle(house.longitude);
          const [x1, y1] = polarXY(a, R_HOUSE_IN);
          const [x2, y2] = polarXY(a, R_ZODIAC_IN);
          const isAngular = [0, 3, 6, 9].includes(i);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={isAngular ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.06)"}
              strokeWidth={isAngular ? 1.5 : 0.5}
            />
          );
        })}

        {/* Zodiac segments */}
        {Array.from({ length: 12 }, (_, i) => {
          const startA = lonToAngle(i * 30);
          const endA = lonToAngle((i + 1) * 30);
          const [ox, oy] = polarXY(startA, R_ZODIAC_OUT);
          const [ix, iy] = polarXY(startA, R_ZODIAC_IN);
          const [ox2, oy2] = polarXY(endA, R_ZODIAC_OUT);
          const [ix2, iy2] = polarXY(endA, R_ZODIAC_IN);
          const d = `M${ix},${iy} L${ox},${oy} A${R_ZODIAC_OUT},${R_ZODIAC_OUT} 0 0,1 ${ox2},${oy2} L${ix2},${iy2} A${R_ZODIAC_IN},${R_ZODIAC_IN} 0 0,0 ${ix},${iy}`;
          const labelA = lonToAngle(i * 30 + 15);
          const [lx, ly] = polarXY(labelA, (R_ZODIAC_IN + R_ZODIAC_OUT) / 2);
          return (
            <g key={i}>
              <path d={d} fill={`${ZODIAC_COLORS[i]}10`} stroke={`${ZODIAC_COLORS[i]}20`} strokeWidth={0.5} />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
                fontSize={9} fill={ZODIAC_COLORS[i]} opacity={0.7}>
                {ZODIAC[i]}
              </text>
            </g>
          );
        })}

        {/* Ring outlines */}
        <circle cx={CX} cy={CY} r={R_HOUSE_IN} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
        <circle cx={CX} cy={CY} r={R_ZODIAC_IN} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
        <circle cx={CX} cy={CY} r={R_ZODIAC_OUT} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
        <circle cx={CX} cy={CY} r={R_PLANETS_B + 18} fill="none" stroke="rgba(244,114,182,0.08)" strokeWidth={0.5} strokeDasharray="2 4" />

        {/* Synastry aspect lines (A planet → B planet through center area) */}
        {topAspects.map((asp, i) => {
          const pA = chartA.planets.find(p => p.name === asp.personAplanet);
          const pB = chartB.planets.find(p => p.name === asp.personBplanet);
          if (!pA || !pB) return null;
          const [x1, y1] = polarXY(lonToAngle(pA.longitude), R_PLANETS_A);
          const [x2, y2] = polarXY(lonToAngle(pB.longitude), R_PLANETS_B);
          const color = ASPECT_COLORS_LOCAL[asp.type] ?? "#94a3b8";
          return (
            <motion.line key={`${asp.personAplanet}-${asp.personBplanet}-${i}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color} strokeWidth={0.8} strokeOpacity={0.35}
              strokeDasharray={asp.harmony > 0 ? "none" : "3 2"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08 }}
            />
          );
        })}

        {/* Person A planets (inner) */}
        {chartA.planets.slice(0, 10).map((p) => {
          const a = lonToAngle(p.longitude);
          const [x, y] = polarXY(a, R_PLANETS_A);
          const color = PLANET_COLORS[p.name] ?? "#94a3b8";
          return (
            <motion.g key={`a-${p.name}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <circle cx={x} cy={y} r={9} fill="rgba(4,4,28,0.9)" stroke={`${color}60`} strokeWidth={0.8} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={8} fill={color}>
                {PLANET_SYMBOLS[p.name]}
              </text>
            </motion.g>
          );
        })}

        {/* Person B planets (outer) */}
        {chartB.planets.slice(0, 10).map((p) => {
          const a = lonToAngle(p.longitude);
          const [x, y] = polarXY(a, R_PLANETS_B);
          const color = PLANET_COLORS[p.name] ?? "#94a3b8";
          return (
            <motion.g key={`b-${p.name}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <circle cx={x} cy={y} r={9} fill="rgba(244,114,182,0.1)" stroke={`${color}80`} strokeWidth={1} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={8} fill={color}>
                {PLANET_SYMBOLS[p.name]}
              </text>
            </motion.g>
          );
        })}

        {/* B outer label */}
        <text x={CX} y={CY - R_PLANETS_B - 20} textAnchor="middle" fontSize={6}
          fill="rgba(244,114,182,0.5)" fontWeight="bold" letterSpacing={0.5}>
          {nameB.substring(0, 6).toUpperCase()}
        </text>
      </svg>
    </motion.div>
  );
}

function PlanetOverlay({ chartA, chartB, nameA, nameB }: {
  chartA: ChartData; chartB: ChartData; nameA: string; nameB: string;
}) {
  // Show where B's key planets fall in A's houses (and vice versa)
  const overlays = [
    { planet: "Sun", person: nameB, chart: chartB, targetChart: chartA, targetName: nameA },
    { planet: "Moon", person: nameB, chart: chartB, targetChart: chartA, targetName: nameA },
    { planet: "Venus", person: nameB, chart: chartB, targetChart: chartA, targetName: nameA },
    { planet: "Mars", person: nameB, chart: chartB, targetChart: chartA, targetName: nameA },
  ];

  return (
    <div className="space-y-2">
      {overlays.map(({ planet, person, chart, targetChart, targetName }) => {
        const pl = chart.planets.find(p => p.name === planet);
        if (!pl) return null;
        const houseInTarget = targetChart.houses.findIndex((h, i) => {
          const next = targetChart.houses[(i + 1) % 12];
          const lon = pl.longitude;
          const start = h.longitude;
          const end = next.longitude;
          if (start <= end) return lon >= start && lon < end;
          return lon >= start || lon < end;
        }) + 1;
        const color = PLANET_COLORS[planet as PlanetName] ?? "#94a3b8";

        return (
          <div
            key={`${person}-${planet}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
          >
            <span className="text-base" style={{ color }}>{PLANET_SYMBOLS[planet as PlanetName]}</span>
            <div className="flex-1">
              <span className="text-[13px] font-medium" style={{ color }}>
                {person}&apos;s {planet}
              </span>
              <span className="text-[13px] mx-1" style={{ color: "#334155" }}>→</span>
              <span className="text-[13px]" style={{ color: "#475569" }}>
                falls in {targetName}&apos;s H{houseInTarget > 0 ? houseInTarget : "?"} ({pl.sign})
              </span>
            </div>
            <span
              className="text-[14px] px-1.5 py-0.5 rounded"
              style={{
                background: `${SIGN_COLORS[pl.sign]}15`,
                color: SIGN_COLORS[pl.sign],
              }}
            >
              {SIGN_SYMBOLS[pl.sign]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CompatibilityPage() {
  const [allProfiles, setAllProfiles] = useState<StoredProfile[]>([]);
  const [chartMap, setChartMap] = useState<Record<string, ChartData | null>>({});
  const [personAId, setPersonAId] = useState<string | null>(null);
  const [personBId, setPersonBId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"score" | "aspects" | "overlay" | "composite" | "oracle">("score");

  useEffect(() => {
    const profiles = listProfiles();
    const activeId = getActiveProfileId();
    setAllProfiles(profiles);

    const charts: Record<string, ChartData | null> = {};
    profiles.forEach(p => { charts[p.id] = getCachedChart(p.id); });
    setChartMap(charts);

    if (profiles.length >= 1) setPersonAId(activeId ?? profiles[0]?.id ?? null);
    if (profiles.length >= 2) {
      const otherProfile = profiles.find(p => p.id !== (activeId ?? profiles[0]?.id));
      setPersonBId(otherProfile?.id ?? null);
    }
    setLoading(false);
  }, []);

  const chartA = personAId ? (chartMap[personAId] ?? null) : null;
  const chartB = personBId ? (chartMap[personBId] ?? null) : null;
  const profileA = allProfiles.find(p => p.id === personAId) ?? null;
  const profileB = allProfiles.find(p => p.id === personBId) ?? null;

  const synastry = useMemo(() =>
    chartA && chartB ? computeSynastry(chartA, chartB) : [],
    [chartA, chartB]
  );

  const score = useMemo(() =>
    synastry.length > 0 ? computeScore(synastry) : null,
    [synastry]
  );

  const harmoniousAspects = useMemo(() => synastry.filter(a => a.harmony > 0), [synastry]);
  const challengingAspects = useMemo(() => synastry.filter(a => a.harmony < 0), [synastry]);
  const topAspects = useMemo(() => synastry.slice(0, 20), [synastry]);
  const composite = useMemo(() => chartA && chartB ? computeComposite(chartA, chartB) : [], [chartA, chartB]);
  const archetype = useMemo(() => synastry.length > 0 ? getRelationshipArchetype(synastry) : null, [synastry]);

  // Score color
  const scoreColor = score
    ? score.total >= 70 ? "#22c55e" : score.total >= 50 ? "#f59e0b" : "#ef4444"
    : "#94a3b8";

  // ─── Empty / single profile ─────────────────────────────────────────────────

  if (!loading && allProfiles.length < 2) {
    return (
      <div className="h-screen flex overflow-hidden">
        <DashboardBg />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 md:ml-[68px] mb-[60px] md:mb-0 px-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(244,114,182,0.2), rgba(124,58,237,0.2))",
              border: "1px solid rgba(244,114,182,0.3)",
              boxShadow: "0 0 40px rgba(244,114,182,0.15)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="1.5" className="w-8 h-8">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-base font-bold font-title mb-2" style={{ color: "#e2e8f0" }}>
              Add a second profile to compare
            </h2>
            <p className="text-[14px] max-w-xs mx-auto" style={{ color: "#475569" }}>
              Synastry requires two birth charts. Create a second profile for the person you&apos;d like to compare with.
            </p>
          </div>
          <Link href="/onboarding">
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="px-6 py-3 rounded-xl text-[14px] font-bold tracking-wider cursor-pointer"
              style={{ background: "linear-gradient(135deg, #f472b6, #7c3aed)", color: "white" }}
            >
              + Add Profile
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <DashboardBg />
      <div className="nebula-orb" style={{ width: 500, height: 500, left: "20%", top: "-20%", background: "rgba(244,114,182,0.05)", filter: "blur(100px)" }} />
      <div className="nebula-orb" style={{ width: 400, height: 400, right: "10%", bottom: "0%", background: "rgba(124,58,237,0.05)", filter: "blur(80px)" }} />


      <div className="flex-1 flex flex-col min-h-0 min-w-0 md:ml-[68px] mb-[60px] md:mb-0 relative z-10 overflow-x-hidden">

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
            <span className="text-[13px] font-bold tracking-widest" style={{ background: "linear-gradient(135deg, #f472b6, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              SYNASTRY
            </span>
          </div>

          {/* Tab switcher */}
          {score && (
            <div
              className="flex items-center gap-1 p-1 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {(["score", "aspects", "overlay", "composite", "oracle"] as const).map(tab => {
                const label: Record<typeof tab, string> = { score: "OVERVIEW", aspects: "ASPECTS", overlay: "OVERLAY", composite: "COMPOSITE", oracle: "ORACLE" };
                return (
                  <motion.button
                    key={tab}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab(tab)}
                    className="px-2.5 py-1 rounded-lg text-[13px] font-bold tracking-widest cursor-pointer transition-all duration-200"
                    style={{
                      background: activeTab === tab ? "rgba(244,114,182,0.2)" : "transparent",
                      color: activeTab === tab ? "#f9a8d4" : "#334155",
                      border: activeTab === tab ? "1px solid rgba(244,114,182,0.3)" : "1px solid transparent",
                    }}
                  >
                    {label[tab]}
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          <div className="px-4 md:px-6 py-5 max-w-4xl mx-auto">

            {/* Profile selectors */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-4 mb-6"
            >
              <ProfileSelector
                label="PERSON A"
                profiles={allProfiles}
                selectedId={personAId}
                onSelect={id => { if (id !== personBId) setPersonAId(id); }}
                accentColor="#a855f7"
              />

              {/* VS divider */}
              <div className="flex flex-col items-center gap-1 pt-6 flex-shrink-0">
                <div className="w-px h-8" style={{ background: "linear-gradient(to bottom, transparent, rgba(244,114,182,0.4), transparent)" }} />
                <motion.div
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-[13px] font-bold tracking-widest"
                  style={{
                    background: "rgba(244,114,182,0.1)",
                    border: "1px solid rgba(244,114,182,0.25)",
                    color: "#f472b6",
                  }}
                >
                  VS
                </motion.div>
                <div className="w-px h-8" style={{ background: "linear-gradient(to bottom, rgba(244,114,182,0.4), transparent)" }} />
              </div>

              <ProfileSelector
                label="PERSON B"
                profiles={allProfiles}
                selectedId={personBId}
                onSelect={id => { if (id !== personAId) setPersonBId(id); }}
                accentColor="#06b6d4"
              />
            </motion.div>

            {/* Results */}
            <AnimatePresence mode="wait">

              {/* No charts yet */}
              {(!chartA || !chartB) && personAId && personBId && (
                <motion.div
                  key="no-charts"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-10"
                >
                  <p className="text-[14px]" style={{ color: "#475569" }}>
                    Missing chart data for one or more profiles.
                    <br />
                    <span className="text-[13px]">Charts are generated during onboarding. Try re-entering that profile.</span>
                  </p>
                </motion.div>
              )}

              {/* Need to select person B */}
              {!personBId && (
                <motion.div
                  key="select-b"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-10"
                >
                  <p className="text-[14px]" style={{ color: "#475569" }}>Select Person B above to begin</p>
                </motion.div>
              )}

              {/* Results */}
              {score && chartA && chartB && profileA && profileB && (

                <>
                  {/* ─── OVERVIEW TAB ─────────────────────────────────────────── */}
                  {activeTab === "score" && (
                    <motion.div
                      key="score"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Main score card */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl p-6 mb-5 flex flex-col md:flex-row items-center gap-6"
                        style={{
                          background: `linear-gradient(135deg, rgba(244,114,182,0.06), rgba(124,58,237,0.06))`,
                          border: "1px solid rgba(244,114,182,0.2)",
                          boxShadow: "0 0 40px rgba(244,114,182,0.08)",
                        }}
                      >
                        <ScoreArc score={score.total} color={scoreColor} />
                        <div className="flex-1">
                          <h3 className="text-lg font-bold font-title mb-1" style={{ color: "#e2e8f0" }}>
                            {profileA.name} & {profileB.name}
                          </h3>
                          <p className="text-[13px] mb-3" style={{ color: "#475569" }}>
                            {score.total >= 75
                              ? "Strong cosmic resonance — multiple harmonious connections"
                              : score.total >= 55
                              ? "Good compatibility with areas of growth and tension"
                              : "Dynamic chart — significant tension drives transformation"}
                          </p>
                          <div className="flex gap-4">
                            <div>
                              <p className="text-[14px] tracking-widest mb-0.5" style={{ color: "#334155" }}>HARMONIOUS</p>
                              <p className="text-[14px] font-bold" style={{ color: "#22c55e" }}>{harmoniousAspects.length} aspects</p>
                            </div>
                            <div>
                              <p className="text-[14px] tracking-widest mb-0.5" style={{ color: "#334155" }}>CHALLENGING</p>
                              <p className="text-[14px] font-bold" style={{ color: "#f59e0b" }}>{challengingAspects.length} aspects</p>
                            </div>
                            <div>
                              <p className="text-[14px] tracking-widest mb-0.5" style={{ color: "#334155" }}>TOTAL</p>
                              <p className="text-[14px] font-bold" style={{ color: "#94a3b8" }}>{synastry.length} aspects</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Relationship archetype */}
                      {archetype && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="rounded-2xl p-4 mb-5 flex items-center gap-4"
                          style={{ background: `${archetype.color}08`, border: `1px solid ${archetype.color}25` }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg"
                            style={{ background: `${archetype.color}15`, color: archetype.color }}
                          >✦</div>
                          <div>
                            <p className="text-[14px] font-bold tracking-widest mb-0.5" style={{ color: archetype.color }}>RELATIONSHIP ARCHETYPE</p>
                            <p className="text-[14px] font-bold" style={{ color: "#e2e8f0" }}>{archetype.name}</p>
                            <p className="text-[14px] mt-0.5 leading-relaxed" style={{ color: "#64748b" }}>{archetype.description}</p>
                          </div>
                        </motion.div>
                      )}

                      {/* Category breakdown */}
                      <div className="grid md:grid-cols-3 gap-3 mb-5">
                        {score.breakdown.map((cat, i) => (
                          <motion.div
                            key={cat.category}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="rounded-xl p-4"
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <p className="text-[14px] font-bold tracking-widest mb-1" style={{ color: "#334155" }}>
                              {cat.label.toUpperCase()}
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl font-bold" style={{
                                color: cat.score >= 70 ? "#22c55e" : cat.score >= 50 ? "#f59e0b" : "#ef4444"
                              }}>
                                {cat.score}
                              </span>
                              <span className="text-[13px]" style={{ color: "#475569" }}>/ 100</span>
                            </div>
                            <div
                              className="h-1 rounded-full overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.06)" }}
                            >
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${cat.score}%` }}
                                transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{
                                  background: cat.score >= 70 ? "#22c55e" : cat.score >= 50 ? "#f59e0b" : "#ef4444",
                                }}
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Top aspects */}
                      <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#475569" }}>
                        STRONGEST CONNECTIONS
                      </p>
                      <div className="space-y-1.5">
                        {synastry.slice(0, 6).map((asp, i) => (
                          <AspectRow key={i} aspect={asp} nameA={profileA.name} nameB={profileB.name} />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* ─── ASPECTS TAB ───────────────────────────────────────────── */}
                  {activeTab === "aspects" && (
                    <motion.div
                      key="aspects"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Aspect filter pills */}
                      <div className="flex gap-2 mb-4 flex-wrap">
                        {Object.entries(ASPECT_COLORS).map(([type, color]) => {
                          const count = synastry.filter(a => a.type === type).length;
                          if (!count) return null;
                          return (
                            <div
                              key={type}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                              style={{
                                background: `${color}12`,
                                border: `1px solid ${color}25`,
                              }}
                            >
                              <span style={{ color }}>{ASPECT_GLYPHS[type]}</span>
                              <span className="text-[13px] font-bold capitalize" style={{ color }}>{type}</span>
                              <span
                                className="text-[14px] px-1 py-0.5 rounded"
                                style={{ background: `${color}20`, color }}
                              >{count}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Harmonious */}
                      {harmoniousAspects.length > 0 && (
                        <div className="mb-5">
                          <p className="text-[13px] font-bold tracking-widest mb-2" style={{ color: "#22c55e" }}>
                            HARMONIOUS · {harmoniousAspects.length}
                          </p>
                          <div className="space-y-1.5">
                            {harmoniousAspects.map((asp, i) => (
                              <AspectRow key={i} aspect={asp} nameA={profileA.name} nameB={profileB.name} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Challenging */}
                      {challengingAspects.length > 0 && (
                        <div>
                          <p className="text-[13px] font-bold tracking-widest mb-2" style={{ color: "#f59e0b" }}>
                            CHALLENGING · {challengingAspects.length}
                          </p>
                          <div className="space-y-1.5">
                            {challengingAspects.map((asp, i) => (
                              <AspectRow key={i} aspect={asp} nameA={profileA.name} nameB={profileB.name} />
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ─── OVERLAY TAB ───────────────────────────────────────────── */}
                  {activeTab === "overlay" && (
                    <motion.div
                      key="overlay"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Bi-wheel */}
                      <div className="mb-6 rounded-2xl p-4" style={{ background: "rgba(4,4,28,0.6)", border: "1px solid rgba(244,114,182,0.12)" }}>
                        <p className="text-[13px] font-bold tracking-widest mb-1" style={{ color: "#f472b6" }}>
                          SYNASTRY BI-WHEEL
                        </p>
                        <p className="text-[13px] mb-4" style={{ color: "#334155" }}>
                          {profileA.name} inner · {profileB.name} outer
                        </p>
                        <SynastryBiWheel
                          chartA={chartA} chartB={chartB}
                          nameA={profileA.name} nameB={profileB.name}
                          aspects={synastry}
                        />
                      </div>

                      <div className="mb-4">
                        <p className="text-[13px] font-bold tracking-widest mb-1" style={{ color: "#06b6d4" }}>
                          PLANET HOUSE OVERLAYS
                        </p>
                        <p className="text-[13px]" style={{ color: "#334155" }}>
                          Where each person&apos;s planets activate the other&apos;s houses
                        </p>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#a855f7" }}>
                            {profileB.name}&apos;s planets in {profileA.name}&apos;s chart
                          </p>
                          <PlanetOverlay chartA={chartA} chartB={chartB} nameA={profileA.name} nameB={profileB.name} />
                        </div>

                        <div>
                          <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#06b6d4" }}>
                            {profileA.name}&apos;s planets in {profileB.name}&apos;s chart
                          </p>
                          <PlanetOverlay chartA={chartB} chartB={chartA} nameA={profileB.name} nameB={profileA.name} />
                        </div>
                      </div>

                      {/* Element comparison */}
                      <div className="mt-6 rounded-xl p-4" style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}>
                        <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#475569" }}>
                          ELEMENT COMPARISON
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          {[profileA, profileB].map((prof, pi) => {
                            const chart = pi === 0 ? chartA : chartB;
                            const elements = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
                            const elColors = { Fire: "#ef4444", Earth: "#22c55e", Air: "#eab308", Water: "#38bdf8" };
                            const signEl: Record<ZodiacSign, keyof typeof elements> = {
                              Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
                              Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
                              Gemini: "Air", Libra: "Air", Aquarius: "Air",
                              Cancer: "Water", Scorpio: "Water", Pisces: "Water",
                            };
                            chart.planets.slice(0, 10).forEach(p => { elements[signEl[p.sign]]++; });
                            return (
                              <div key={prof.id}>
                                <p className="text-[13px] font-bold mb-2" style={{ color: "#475569" }}>{prof.name}</p>
                                {Object.entries(elements).map(([el, count]) => (
                                  <div key={el} className="flex items-center gap-2 mb-1">
                                    <span className="text-[13px] w-10" style={{ color: elColors[el as keyof typeof elColors] }}>{el}</span>
                                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                                      <div
                                        className="h-full rounded-full"
                                        style={{
                                          width: `${(count / 10) * 100}%`,
                                          background: elColors[el as keyof typeof elColors],
                                        }}
                                      />
                                    </div>
                                    <span className="text-[13px] w-3" style={{ color: "#334155" }}>{count}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ─── COMPOSITE TAB ─────────────────────────────────────────── */}
                  {activeTab === "composite" && (
                    <motion.div
                      key="composite"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="mb-4">
                        <p className="text-[13px] font-bold tracking-widest mb-1" style={{ color: "#f472b6" }}>COMPOSITE MIDPOINT CHART</p>
                        <p className="text-[13px]" style={{ color: "#334155" }}>
                          The relationship&apos;s own planetary identity — midpoints between {profileA.name} & {profileB.name}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {composite.map((cp, i) => {
                          const color = PLANET_COLORS[cp.name] ?? "#94a3b8";
                          const signColor = SIGN_COLORS[cp.sign];
                          return (
                            <motion.div
                              key={cp.name}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="grid grid-cols-4 gap-2 items-center px-3 py-2.5 rounded-xl"
                              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-[14px]" style={{ color }}>{PLANET_SYMBOLS[cp.name]}</span>
                                <span className="text-[13px] font-medium" style={{ color }}>{cp.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[14px]" style={{ color: signColor }}>{SIGN_SYMBOLS[cp.sign]}</span>
                                <span className="text-[13px]" style={{ color: signColor }}>{cp.sign.substring(0, 3)}</span>
                              </div>
                              <p className="text-[13px]" style={{ color: "#475569" }}>{cp.signDegree.toFixed(1)}°</p>
                              <p className="text-[13px]" style={{ color: "#334155" }}>H{cp.house}</p>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Composite Sun + Moon highlight */}
                      {(() => {
                        const compSun  = composite.find(p => p.name === "Sun");
                        const compMoon = composite.find(p => p.name === "Moon");
                        if (!compSun || !compMoon) return null;
                        return (
                          <div className="mt-5 rounded-2xl p-4 grid grid-cols-2 gap-4"
                            style={{ background: "rgba(244,114,182,0.05)", border: "1px solid rgba(244,114,182,0.15)" }}>
                            <div>
                              <p className="text-[14px] tracking-widest font-bold mb-1" style={{ color: "#334155" }}>COMPOSITE SUN</p>
                              <p className="text-[14px] font-bold" style={{ color: "#fbbf24" }}>
                                {SIGN_SYMBOLS[compSun.sign]} {compSun.sign}
                              </p>
                              <p className="text-[13px] mt-0.5" style={{ color: "#475569" }}>
                                House {compSun.house} · {compSun.signDegree.toFixed(1)}°
                              </p>
                              <p className="text-[13px] mt-1" style={{ color: "#334155" }}>The relationship&apos;s core purpose</p>
                            </div>
                            <div>
                              <p className="text-[14px] tracking-widest font-bold mb-1" style={{ color: "#334155" }}>COMPOSITE MOON</p>
                              <p className="text-[14px] font-bold" style={{ color: "#c4b5fd" }}>
                                {SIGN_SYMBOLS[compMoon.sign]} {compMoon.sign}
                              </p>
                              <p className="text-[13px] mt-0.5" style={{ color: "#475569" }}>
                                House {compMoon.house} · {compMoon.signDegree.toFixed(1)}°
                              </p>
                              <p className="text-[13px] mt-1" style={{ color: "#334155" }}>The emotional tone of the bond</p>
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}

                  {/* ─── ORACLE TAB ───────────────────────────────────────────── */}
                  {activeTab === "oracle" && (
                    <motion.div
                      key="oracle"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <CompatibilityOracle
                        profileA={profileA}
                        profileB={profileB}
                        score={score}
                        aspects={synastry}
                      />
                    </motion.div>
                  )}

                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

