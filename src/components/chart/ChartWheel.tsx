"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { ChartData, PlanetName } from "@/lib/astrology/types";

// ─── Sign palette ─────────────────────────────────────────────────────────────

const SIGNS = [
  { name: "Aries",       symbol: "♈", color: "#f87171", abbr: "ARIES"       },
  { name: "Taurus",      symbol: "♉", color: "#34d399", abbr: "TAURUS"      },
  { name: "Gemini",      symbol: "♊", color: "#fbbf24", abbr: "GEMINI"      },
  { name: "Cancer",      symbol: "♋", color: "#67e8f9", abbr: "CANCER"      },
  { name: "Leo",         symbol: "♌", color: "#fb923c", abbr: "LEO"         },
  { name: "Virgo",       symbol: "♍", color: "#818cf8", abbr: "VIRGO"       },
  { name: "Libra",       symbol: "♎", color: "#f472b6", abbr: "LIBRA"       },
  { name: "Scorpio",     symbol: "♏", color: "#f87171", abbr: "SCORPIO"     },
  { name: "Sagittarius", symbol: "♐", color: "#fcd34d", abbr: "SAGITTARIUS" },
  { name: "Capricorn",   symbol: "♑", color: "#94a3b8", abbr: "CAPRICORN"   },
  { name: "Aquarius",    symbol: "♒", color: "#22d3ee", abbr: "AQUARIUS"    },
  { name: "Pisces",      symbol: "♓", color: "#c084fc", abbr: "PISCES"      },
];

const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#94a3b8", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#8b9ab4", Uranus: "#06b6d4",
  Neptune: "#3b82f6", Pluto: "#8b5cf6", NorthNode: "#64748b", Chiron: "#6366f1",
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
  NorthNode: "☊", Chiron: "⚷",
};

const ASPECT_CFG: Record<string, { color: string; dash: string; opacity: number }> = {
  conjunction: { color: "#a855f7", dash: "none", opacity: 0.55 },
  opposition:  { color: "#ef4444", dash: "4 3",  opacity: 0.50 },
  trine:       { color: "#22c55e", dash: "none", opacity: 0.45 },
  square:      { color: "#f59e0b", dash: "3 2",  opacity: 0.45 },
  sextile:     { color: "#06b6d4", dash: "none", opacity: 0.40 },
  quincunx:    { color: "#ec4899", dash: "6 2",  opacity: 0.35 },
};

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function polarToXY(angleDeg: number, r: number, cx: number, cy: number) {
  const rad = toRad(angleDeg - 90);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Ecliptic longitude → SVG angle with ASC at 9 o'clock (270°)
function lonToAngle(lon: number, ascLon: number): number {
  return ((270 - (lon - ascLon)) % 360 + 360) % 360;
}

// Arc path (counter-clockwise in SVG = clockwise for viewer in a natal chart)
function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const s = polarToXY(startAngle, r, cx, cy);
  const e = polarToXY(endAngle, r, cx, cy);
  // For zodiac signs (30°), large-arc-flag = 0
  const largeArc = ((endAngle - startAngle + 360) % 360) > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChartWheelProps {
  size?: number;
  interactive?: boolean;
  chart?: ChartData;
  onPlanetClick?: (name: PlanetName) => void;
  showDecans?: boolean;
  derivedOffset?: number; // 0 = natal, 1–11 = house N+1 as derived ASC
  onHouseClick?: (houseIndex: number) => void;
}

// ─── Holographic ambient orb ─────────────────────────────────────────────────

function HoloOrb({ x, y, scale = 1, hue = 250, delay = 0 }: {
  x: number; y: number; scale?: number; hue?: number; delay?: number;
}) {
  const w = 120 * scale, h = 72 * scale;
  return (
    <motion.div
      style={{ position: "absolute", left: x, top: y, width: w, height: h, pointerEvents: "none" }}
      animate={{ y: [0, -10, 0], rotate: [0, 3, 0] }}
      transition={{ duration: 7 + delay * 2, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id={`holoGrad${hue}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`hsl(${hue},90%,70%)`} stopOpacity="0.7" />
            <stop offset="40%" stopColor={`hsl(${hue + 30},80%,50%)`} stopOpacity="0.4" />
            <stop offset="100%" stopColor={`hsl(${hue},60%,30%)`} stopOpacity="0" />
          </radialGradient>
          <filter id={`holoBlur${hue}`}>
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        {/* Spinning elliptical rings */}
        {[0, 40, 80].map((rot, i) => (
          <motion.ellipse
            key={i}
            cx={w / 2} cy={h / 2} rx={w * 0.45} ry={h * 0.22}
            fill="none"
            stroke={`hsl(${hue + i * 20}, 85%, 65%)`}
            strokeWidth={0.8 - i * 0.2}
            strokeOpacity={0.55 - i * 0.1}
            transform={`rotate(${rot}, ${w / 2}, ${h / 2})`}
            animate={{ rotate: [rot, rot + 360] }}
            transition={{ duration: 14 + i * 4, repeat: Infinity, ease: "linear" }}
            style={{ originX: `${w / 2}px`, originY: `${h / 2}px` }}
          />
        ))}
        {/* Core fill */}
        <motion.ellipse
          cx={w / 2} cy={h / 2} rx={w * 0.28} ry={h * 0.14}
          fill={`url(#holoGrad${hue})`}
          filter={`url(#holoBlur${hue})`}
          animate={{ opacity: [0.6, 1, 0.6], scaleX: [1, 1.08, 1], scaleY: [1, 1.12, 1] }}
          transition={{ duration: 3 + delay, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: `${w / 2}px`, originY: `${h / 2}px` }}
        />
        {/* Particle dots */}
        {[0, 1, 2, 3, 4].map(j => {
          const angle = (j / 5) * 360;
          const px = w / 2 + Math.cos(toRad(angle)) * w * 0.38;
          const py = h / 2 + Math.sin(toRad(angle)) * h * 0.18;
          return (
            <motion.circle
              key={j} cx={px} cy={py} r={1.2}
              fill={`hsl(${hue + j * 15}, 90%, 80%)`}
              animate={{ opacity: [0, 1, 0], r: [0.8, 1.8, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, delay: j * 0.4, ease: "easeInOut" }}
            />
          );
        })}
      </svg>
    </motion.div>
  );
}

// ─── Main wheel ───────────────────────────────────────────────────────────────

export function ChartWheel({ size = 480, interactive = true, chart, onPlanetClick, showDecans: initShowDecans = false, derivedOffset = 0, onHouseClick }: ChartWheelProps) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const [showDecans, setShowDecans] = useState(initShowDecans);

  const cx = size / 2;
  const cy = size / 2;

  // Radii as fraction of cx
  const outerR    = cx * 0.945;  // outer decorative tick ring
  const zodOuter  = cx * 0.875;  // outer edge of zodiac band
  const zodInner  = cx * 0.700;  // inner edge of zodiac band
  const houseR    = cx * 0.695;  // house cusp ring (same as zodInner)
  const planetR   = cx * 0.580;  // planet placement ring
  const aspectR   = cx * 0.440;  // inner boundary for aspect lines
  const coreR     = cx * 0.115;  // core orb

  // ASC longitude — rotate wheel so ASC is at 9 o'clock
  const ascLon = chart?.ascendant ?? 0;

  // Build planet data from real chart or demo fallback
  const planets = chart?.planets.map(p => ({
    name: p.name,
    symbol: PLANET_SYMBOLS[p.name] ?? "·",
    angle: lonToAngle(p.longitude, ascLon),
    lon: p.longitude,
    color: PLANET_COLORS[p.name] ?? "#94a3b8",
    retrograde: p.retrograde,
    sign: p.sign,
    house: p.house,
    signDeg: p.signDegree,
  })) ?? [];

  // Use real aspects or skip
  const aspects = (chart as ChartData & { aspects?: { planet1: string; planet2: string; type: string; orb: number }[] })?.aspects ?? [];

  // ASC/DSC/MC/IC positions
  const cardinals = [
    { label: "ASC", lon: ascLon,         color: "#c4b5fd" },
    { label: "DC",  lon: ascLon + 180,   color: "#c4b5fd" },
    { label: "MC",  lon: chart?.midheaven ?? (ascLon + 270), color: "#fbbf24" },
    { label: "IC",  lon: (chart?.midheaven ?? (ascLon + 270)) + 180, color: "#fbbf24" },
  ];

  return (
    <div className="relative" style={{ width: size, height: size }}>

      {/* ── Holographic ambient orbs ── */}
      <HoloOrb x={-88} y={size * 0.12} scale={1.0} hue={250} delay={0} />
      <HoloOrb x={-72} y={size * 0.60} scale={0.78} hue={200} delay={1.2} />
      <HoloOrb x={size - 48} y={size * 0.08} scale={0.90} hue={280} delay={0.6} />
      <HoloOrb x={size - 36} y={size * 0.62} scale={0.82} hue={220} delay={1.8} />

      {/* ── Outer ambient glow ── */}
      <div className="absolute inset-0 rounded-full pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, rgba(124,58,237,0.18) 0%, rgba(6,182,212,0.08) 45%, transparent 72%)",
        filter: "blur(4px)",
      }} />

      {/* ── Decan toggle ── */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setShowDecans(v => !v)}
        className="absolute z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer"
        style={{
          top: 8, right: 8,
          background: showDecans ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${showDecans ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.1)"}`,
          color: showDecans ? "#c4b5fd" : "#475569",
          fontSize: 11,
          letterSpacing: "0.08em",
          fontFamily: "'Fragment Mono', monospace",
        }}
      >
        <span style={{ fontSize: 9 }}>✦</span>
        DECANS
      </motion.button>

      {/* ── Main SVG ── */}
      <svg
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative z-10 chart-wheel-export"
        style={{ filter: "drop-shadow(0 0 28px rgba(124,58,237,0.45)) drop-shadow(0 0 60px rgba(6,182,212,0.15))" }}
      >
        <defs>
          {/* Core gradient */}
          <radialGradient id="cwCoreGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="20%" stopColor="#a78bfa" stopOpacity="0.8" />
            <stop offset="55%" stopColor="#4f46e5" stopOpacity="0.5" />
            <stop offset="85%" stopColor="#06b6d4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00000f" stopOpacity="0" />
          </radialGradient>
          {/* Zodiac band fill gradient */}
          <radialGradient id="cwZodBand" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#080820" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#080820" stopOpacity="0.55" />
          </radialGradient>
          {/* Glow filter for aspect lines */}
          <filter id="cwGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Planet glow */}
          <filter id="cwPlanetGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Sign glow */}
          <filter id="cwSignGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Star field pattern */}
          <pattern id="cwStars" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            {[...Array(8)].map((_, i) => (
              <circle key={i} cx={Math.sin(i * 137.5) * 18 + 20} cy={Math.cos(i * 137.5) * 18 + 20}
                r={Math.random() < 0.5 ? 0.4 : 0.7} fill="white" opacity={0.15 + (i % 3) * 0.1} />
            ))}
          </pattern>
        </defs>

        {/* ── Background ── */}
        <circle cx={cx} cy={cy} r={zodOuter} fill="rgba(4,4,18,0.92)" />
        <circle cx={cx} cy={cy} r={zodOuter} fill="url(#cwStars)" />

        {/* ── Outer decorative tick ring (slow clockwise) ── */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
          style={{ originX: `${cx}px`, originY: `${cy}px` }}
        >
          <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(124,58,237,0.2)" strokeWidth="0.8" />
          {Array.from({ length: 72 }).map((_, i) => {
            const isMaj = i % 6 === 0; const isMed = i % 3 === 0;
            const a = i * 5 - 90;
            const p1 = polarToXY(a, outerR, cx, cy);
            const p2 = polarToXY(a, outerR - (isMaj ? 12 : isMed ? 7 : 4), cx, cy);
            return (
              <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={isMaj ? "rgba(124,58,237,0.7)" : "rgba(124,58,237,0.22)"}
                strokeWidth={isMaj ? "1.2" : "0.6"} />
            );
          })}
        </motion.g>

        {/* ── Zodiac band ── */}
        {SIGNS.map((sign, i) => {
          // Place signs based on ASC: sign i starts at longitude i*30
          const signStart = lonToAngle(i * 30, ascLon);
          const signEnd   = lonToAngle(i * 30 + 30, ascLon);
          // Mid-angle for glyph placement (going in the negative direction)
          const midAngle  = lonToAngle(i * 30 + 15, ascLon);
          const glyphPt   = polarToXY(midAngle, (zodOuter + zodInner) / 2, cx, cy);
          const namePt    = polarToXY(midAngle, zodInner + (zodOuter - zodInner) * 0.22, cx, cy);

          // Segment boundary
          const boundPt1 = polarToXY(signStart, zodOuter, cx, cy);
          const boundPt2 = polarToXY(signStart, zodInner, cx, cy);

          // Decan marks
          const decan1Angle = lonToAngle(i * 30 + 10, ascLon);
          const decan2Angle = lonToAngle(i * 30 + 20, ascLon);
          const d1a = polarToXY(decan1Angle, zodOuter, cx, cy);
          const d1b = polarToXY(decan1Angle, zodOuter - (zodOuter - zodInner) * 0.35, cx, cy);
          const d2a = polarToXY(decan2Angle, zodOuter, cx, cy);
          const d2b = polarToXY(decan2Angle, zodOuter - (zodOuter - zodInner) * 0.35, cx, cy);

          return (
            <g key={sign.name}>
              {/* Sign sector subtle fill */}
              <path
                d={`${arcPath(cx, cy, zodOuter, signStart, signEnd)} L ${polarToXY(signEnd, zodInner, cx, cy).x} ${polarToXY(signEnd, zodInner, cx, cy).y} ${arcPath(cx, cy, zodInner, signEnd, signStart)} Z`}
                fill={`${sign.color}08`}
                stroke="none"
              />
              {/* Outer arc accent */}
              <path d={arcPath(cx, cy, zodOuter - 1, signStart, signEnd)}
                fill="none" stroke={`${sign.color}35`} strokeWidth="1.5" />
              {/* Inner arc accent */}
              <path d={arcPath(cx, cy, zodInner + 1, signStart, signEnd)}
                fill="none" stroke={`${sign.color}20`} strokeWidth="0.8" />

              {/* Sign boundary line */}
              <line x1={boundPt1.x} y1={boundPt1.y} x2={boundPt2.x} y2={boundPt2.y}
                stroke={`${sign.color}50`} strokeWidth="0.8" />

              {/* Decan marks (toggle) */}
              {showDecans && (
                <>
                  <line x1={d1a.x} y1={d1a.y} x2={d1b.x} y2={d1b.y}
                    stroke={`${sign.color}60`} strokeWidth="0.7" strokeDasharray="2 2" />
                  <line x1={d2a.x} y1={d2a.y} x2={d2b.x} y2={d2b.y}
                    stroke={`${sign.color}60`} strokeWidth="0.7" strokeDasharray="2 2" />
                </>
              )}

              {/* Sign glyph */}
              <text
                x={glyphPt.x} y={glyphPt.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize="17"
                fill={sign.color}
                filter="url(#cwSignGlow)"
                style={{ userSelect: "none", fontFamily: "'Noto Sans Symbols 2', serif" }}
              >
                {sign.symbol}
              </text>

              {/* Sign name label */}
              <text
                x={namePt.x} y={namePt.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize="5.5"
                fill={sign.color}
                opacity="0.55"
                letterSpacing="0.5"
                style={{ userSelect: "none", fontFamily: "'Fragment Mono', monospace" }}
              >
                {sign.abbr.length > 6 ? sign.abbr.slice(0, 6) : sign.abbr}
              </text>
            </g>
          );
        })}

        {/* ── House ring ── */}
        <circle cx={cx} cy={cy} r={zodInner} fill="rgba(4,4,20,0.6)"
          stroke="rgba(99,102,241,0.25)" strokeWidth="0.8" />
        <circle cx={cx} cy={cy} r={zodInner * 0.80} fill="none"
          stroke="rgba(99,102,241,0.12)" strokeWidth="0.5" />

        {/* House cusp lines + numbers */}
        {(chart?.houses ?? Array.from({ length: 12 }, (_, i) => ({ longitude: i * 30 + ascLon }))).map((house, i) => {
          const hAngle = lonToAngle(house.longitude, ascLon);
          const p1 = polarToXY(hAngle, zodInner, cx, cy);
          const p2 = polarToXY(hAngle, coreR * 1.5, cx, cy);
          const midLon = house.longitude + 15;
          const textPt = polarToXY(
            lonToAngle(midLon, ascLon),
            (zodInner * 0.88 + zodInner * 0.62) / 2,
            cx, cy
          );
          const isAngular = [0, 3, 6, 9].includes(i);
          const isDerivedAsc = derivedOffset > 0 && i === derivedOffset;
          return (
            <g key={i} style={onHouseClick ? { cursor: "pointer" } : {}}
              onClick={() => onHouseClick?.(i)}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={isDerivedAsc ? "#e879f9" : isAngular ? "rgba(168,85,247,0.5)" : "rgba(99,102,241,0.2)"}
                strokeWidth={isDerivedAsc ? "2" : isAngular ? "1.2" : "0.6"} />
              <text
                x={textPt.x} y={textPt.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize={isAngular ? "8.5" : "7.5"}
                fill={isDerivedAsc ? "#e879f9" : isAngular ? "rgba(196,181,253,0.8)" : "rgba(148,163,184,0.5)"}
                fontWeight={isDerivedAsc || isAngular ? "700" : "400"}
                style={{ userSelect: "none", fontFamily: "'Fragment Mono', monospace" }}
              >
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* ── Derived house overlay (PRISM mode) ── */}
        {derivedOffset > 0 && (() => {
          const houseLons = chart?.houses?.map(h => h.longitude)
            ?? Array.from({ length: 12 }, (_, i) => i * 30 + ascLon);
          const derivedAscLon = houseLons[derivedOffset];
          const nextLon       = houseLons[(derivedOffset + 1) % 12];
          const derivedAscAngle = lonToAngle(derivedAscLon, ascLon);
          const nextAngle       = lonToAngle(nextLon, ascLon);
          // Sector fill for derived ASC house
          const s1 = polarToXY(derivedAscAngle, zodInner * 0.62, cx, cy);
          const s2 = polarToXY(nextAngle,       zodInner * 0.62, cx, cy);
          const e1 = polarToXY(derivedAscAngle, zodInner * 0.90, cx, cy);
          const e2 = polarToXY(nextAngle,       zodInner * 0.90, cx, cy);
          const spanAngle = ((nextAngle - derivedAscAngle) + 360) % 360;
          const la = spanAngle > 180 ? 1 : 0;
          const sectorPath = `M ${s1.x} ${s1.y} L ${e1.x} ${e1.y} A ${zodInner * 0.90} ${zodInner * 0.90} 0 ${la} 1 ${e2.x} ${e2.y} L ${s2.x} ${s2.y} A ${zodInner * 0.62} ${zodInner * 0.62} 0 ${la} 0 ${s1.x} ${s1.y} Z`;

          // Derived ASC badge
          const badgePt = polarToXY(derivedAscAngle, zodOuter + 20, cx, cy);

          return (
            <g>
              {/* Glowing sector */}
              <motion.path
                d={sectorPath}
                fill="rgba(232,121,249,0.09)"
                stroke="rgba(232,121,249,0.35)"
                strokeWidth="0.8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                style={{ filter: "drop-shadow(0 0 6px rgba(232,121,249,0.5))" }}
              />
              {/* Derived house numbers in middle ring */}
              {houseLons.map((lon, i) => {
                const derivedNum = ((i - derivedOffset + 12) % 12) + 1;
                const midLon = lon + ((houseLons[(i + 1) % 12] - lon + 360) % 360) / 2;
                const pt = polarToXY(lonToAngle(midLon, ascLon), zodInner * 0.75, cx, cy);
                return (
                  <motion.text
                    key={i}
                    x={pt.x} y={pt.y}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize="6"
                    fill={derivedNum === 1 ? "#e879f9" : "rgba(232,121,249,0.45)"}
                    fontWeight={derivedNum === 1 ? "700" : "400"}
                    style={{ userSelect: "none", fontFamily: "'Fragment Mono', monospace" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                  >
                    {derivedNum}
                  </motion.text>
                );
              })}
              {/* PRISM ASC badge */}
              <motion.g initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                <circle cx={badgePt.x} cy={badgePt.y} r="14"
                  fill="rgba(4,4,20,0.9)" stroke="#e879f9" strokeWidth="1.2"
                  style={{ filter: "drop-shadow(0 0 8px rgba(232,121,249,0.7))" }} />
                <text x={badgePt.x} y={badgePt.y}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize="5.5" fill="#e879f9" fontWeight="700" letterSpacing="0.3"
                  style={{ userSelect: "none", fontFamily: "'Fragment Mono', monospace" }}
                >
                  PRISM
                </text>
              </motion.g>
            </g>
          );
        })()}

        {/* ── ASC/DC/MC/IC badge circles ── */}
        {cardinals.map(({ label, lon, color }) => {
          const angle = lonToAngle(lon, ascLon);
          const pt = polarToXY(angle, zodOuter + 20, cx, cy);
          return (
            <g key={label}>
              <circle cx={pt.x} cy={pt.y} r="13"
                fill="rgba(4,4,20,0.9)" stroke={color} strokeWidth="1.2"
                style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} />
              <text x={pt.x} y={pt.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize="6.5" fill={color} fontWeight="700" letterSpacing="0.5"
                style={{ userSelect: "none", fontFamily: "'Fragment Mono', monospace" }}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* ── Inner field ── */}
        <circle cx={cx} cy={cy} r={zodInner * 0.62}
          fill="rgba(3,3,15,0.92)" stroke="rgba(124,58,237,0.2)" strokeWidth="0.8" />

        {/* ── Aspect lines ── */}
        {aspects.length > 0
          ? aspects.map((asp, i) => {
              const p1 = planets.find(p => p.name === asp.planet1);
              const p2 = planets.find(p => p.name === asp.planet2);
              if (!p1 || !p2) return null;
              const cfg = ASPECT_CFG[asp.type] ?? ASPECT_CFG.conjunction;
              const pt1 = polarToXY(p1.angle, aspectR, cx, cy);
              const pt2 = polarToXY(p2.angle, aspectR, cx, cy);
              return (
                <motion.line key={i}
                  x1={pt1.x} y1={pt1.y} x2={pt2.x} y2={pt2.y}
                  stroke={cfg.color} strokeWidth="0.85"
                  opacity={cfg.opacity}
                  strokeDasharray={cfg.dash === "none" ? undefined : cfg.dash}
                  filter="url(#cwGlow)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: cfg.opacity }}
                  transition={{ delay: i * 0.06 + 0.6, duration: 0.8 }}
                />
              );
            })
          : /* demo aspects when no chart */
            [
              { a1: 45,  a2: 165, type: "trine"  },
              { a1: 45,  a2: 225, type: "opposition" },
              { a1: 120, a2: 240, type: "sextile" },
              { a1: 200, a2: 290, type: "square"  },
            ].map((asp, i) => {
              const cfg = ASPECT_CFG[asp.type];
              const pt1 = polarToXY(asp.a1, aspectR, cx, cy);
              const pt2 = polarToXY(asp.a2, aspectR, cx, cy);
              return (
                <motion.line key={i}
                  x1={pt1.x} y1={pt1.y} x2={pt2.x} y2={pt2.y}
                  stroke={cfg.color} strokeWidth="0.85" opacity={cfg.opacity}
                  filter="url(#cwGlow)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: cfg.opacity }}
                  transition={{ delay: i * 0.1 + 0.5, duration: 0.9 }}
                />
              );
            })
        }

        {/* ── Core nebula orb ── */}
        {/* Outer glow halo */}
        <motion.circle cx={cx} cy={cy} r={coreR * 3.2}
          fill="url(#cwCoreGrad)"
          animate={{ scale: [1, 1.10, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: `${cx}px`, originY: `${cy}px` }}
        />
        {/* Energy ring 1 */}
        <motion.circle cx={cx} cy={cy} r={coreR * 2.0} fill="none"
          stroke="rgba(124,58,237,0.4)" strokeWidth="0.8"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          style={{ originX: `${cx}px`, originY: `${cy}px` }}
        />
        {/* Energy ring 2 */}
        <motion.circle cx={cx} cy={cy} r={coreR * 1.5} fill="none"
          stroke="rgba(6,182,212,0.5)" strokeWidth="0.6"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          style={{ originX: `${cx}px`, originY: `${cy}px` }}
        />
        {/* Core */}
        <circle cx={cx} cy={cy} r={coreR} fill="rgba(124,58,237,0.7)"
          style={{ filter: "drop-shadow(0 0 8px rgba(124,58,237,0.9))" }} />
        <motion.circle cx={cx} cy={cy} r={coreR * 0.55}
          fill="rgba(255,255,255,0.9)"
          animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: `${cx}px`, originY: `${cy}px`,
            filter: "drop-shadow(0 0 4px rgba(255,255,255,0.95))" }}
        />
        {/* Radiating spokes */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = i * 30;
          const p1 = polarToXY(a, coreR * 1.05, cx, cy);
          const p2 = polarToXY(a, coreR * 1.85, cx, cy);
          return (
            <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="rgba(124,58,237,0.25)" strokeWidth="0.5" />
          );
        })}

        {/* ── Planet tick marks ── */}
        {planets.map(planet => {
          const p1 = polarToXY(planet.angle, zodInner - 2, cx, cy);
          const p2 = polarToXY(planet.angle, zodInner - 12, cx, cy);
          return (
            <line key={`tick-${planet.name}`}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={planet.color} strokeWidth="0.8" opacity="0.6" />
          );
        })}

        {/* ── Planet markers ── */}
        {planets.map((planet, i) => {
          const pt = polarToXY(planet.angle, planetR, cx, cy);
          const isHovered = hoveredPlanet === planet.name;
          const degPt = polarToXY(planet.angle, zodInner - 20, cx, cy);

          return (
            <motion.g
              key={planet.name}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 + 0.35, type: "spring", stiffness: 220, damping: 18 }}
              style={{ cursor: (interactive || onPlanetClick) ? "pointer" : "default" }}
              onMouseEnter={() => (interactive || onPlanetClick) && setHoveredPlanet(planet.name)}
              onMouseLeave={() => setHoveredPlanet(null)}
              onClick={() => onPlanetClick?.(planet.name as PlanetName)}
            >
              {/* Pulsing halo */}
              <motion.circle cx={pt.x} cy={pt.y} r={isHovered ? 16 : 11}
                fill={`${planet.color}22`}
                stroke={`${planet.color}60`} strokeWidth="0.8"
                filter="url(#cwPlanetGlow)"
                animate={{ r: isHovered ? 16 : [11, 12.5, 11] }}
                transition={{ duration: 2.5 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Planet dot */}
              <circle cx={pt.x} cy={pt.y} r="2.8" fill={planet.color}
                style={{ filter: `drop-shadow(0 0 4px ${planet.color})` }} />
              {/* Planet symbol */}
              <text x={pt.x} y={pt.y - 14}
                textAnchor="middle" dominantBaseline="central"
                fontSize="11.5" fill={planet.color}
                opacity={isHovered ? 1 : 0.9}
                fontWeight="500"
                style={{ userSelect: "none", fontFamily: "'Noto Sans Symbols 2', serif",
                  filter: isHovered ? `drop-shadow(0 0 6px ${planet.color})` : undefined }}
              >
                {planet.symbol}
              </text>
              {/* Retrograde marker */}
              {planet.retrograde && (
                <text x={pt.x + 8} y={pt.y - 10}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize="7" fill="#f97316" fontWeight="700"
                  style={{ userSelect: "none" }}
                >℞</text>
              )}
              {/* Degree near zodiac ring */}
              {isHovered && (
                <motion.text x={degPt.x} y={degPt.y}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize="6.5" fill={planet.color} fontWeight="600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ userSelect: "none", fontFamily: "'Fragment Mono', monospace" }}
                >
                  {planet.signDeg?.toFixed(1)}°
                </motion.text>
              )}
            </motion.g>
          );
        })}
      </svg>

      {/* ── Hover tooltip ── */}
      <AnimatePresence>
        {hoveredPlanet && (() => {
          const p = planets.find(pl => pl.name === hoveredPlanet);
          if (!p) return null;
          return (
            <motion.div
              key="tooltip"
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl z-30"
              style={{
                background: "rgba(4,4,24,0.96)",
                border: `1px solid ${p.color}50`,
                backdropFilter: "blur(12px)",
                boxShadow: `0 0 20px ${p.color}22`,
                pointerEvents: "none",
              }}
            >
              <div className="flex items-center gap-2.5">
                <span style={{ fontSize: 16, color: p.color, fontFamily: "'Noto Sans Symbols 2', serif",
                  filter: `drop-shadow(0 0 6px ${p.color})` }}>{p.symbol}</span>
                <div>
                  <p style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 700, letterSpacing: "0.05em" }}>
                    {p.name}{p.retrograde ? " ℞" : ""}
                  </p>
                  {p.sign && (
                    <p style={{ fontSize: 12, color: p.color, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.08em" }}>
                      {p.signDeg?.toFixed(1)}° {p.sign} · H{p.house}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
