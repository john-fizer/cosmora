"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { PLANET_SYMBOLS, SIGN_SYMBOLS } from "@/lib/astrology/types";
import type { PlanetName, ZodiacSign, ChartData } from "@/lib/astrology/types";
import type { TransitsData, TransitAspect, Ingress } from "@/lib/astrology/transits";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import { useWarpTo } from "@/components/ui/WarpTransition";

// ─── Constants ───────────────────────────────────────────────────────────────

const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#94a3b8", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#6b7280", Uranus: "#06b6d4",
  Neptune: "#3b82f6", Pluto: "#8b5cf6", NorthNode: "#64748b", Chiron: "#6366f1",
};

const ASPECT_CONFIG: Record<string, { symbol: string; color: string; label: string }> = {
  conjunction: { symbol: "☌", color: "#a855f7", label: "Conjunction" },
  opposition:  { symbol: "☍", color: "#ef4444", label: "Opposition" },
  trine:       { symbol: "△", color: "#22c55e", label: "Trine" },
  square:      { symbol: "□", color: "#f59e0b", label: "Square" },
  sextile:     { symbol: "⚹", color: "#06b6d4", label: "Sextile" },
  quincunx:    { symbol: "⚻", color: "#94a3b8", label: "Quincunx" },
};

const SIGN_COLORS: Record<ZodiacSign, string> = {
  Aries:"#ef4444", Taurus:"#22c55e", Gemini:"#eab308", Cancer:"#a855f7",
  Leo:"#f97316", Virgo:"#6366f1", Libra:"#ec4899", Scorpio:"#dc2626",
  Sagittarius:"#f59e0b", Capricorn:"#64748b", Aquarius:"#06b6d4", Pisces:"#8b5cf6",
};

const OUTER_PLANETS = new Set<string>(["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]);

const PLANET_ORDER: PlanetName[] = [
  "Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto","NorthNode",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}

function formatDeg(lon: number): string {
  const deg = Math.floor(lon % 30);
  const min = Math.floor(((lon % 30) - deg) * 60);
  return `${deg}°${String(min).padStart(2,"0")}′`;
}

function isToday(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkyStrip({ planets }: { planets: TransitsData["transitPlanets"] }) {
  const ordered = PLANET_ORDER
    .map(name => planets.find(p => p.name === name))
    .filter(Boolean) as TransitsData["transitPlanets"];

  return (
    <div
      className="flex-shrink-0 flex items-center gap-2 px-6 py-3 overflow-x-auto"
      style={{
        background: "rgba(2,2,18,0.6)",
        borderBottom: "1px solid rgba(99,102,241,0.1)",
        scrollbarWidth: "none",
      }}
    >
      <span className="text-[8px] font-bold tracking-widest flex-shrink-0 mr-1" style={{ color: "#334155" }}>
        SKY NOW
      </span>
      {ordered.map((p, i) => {
        const color = PLANET_COLORS[p.name] ?? "#64748b";
        return (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-shrink-0"
            style={{
              background: `${color}10`,
              border: `1px solid ${color}25`,
            }}
          >
            <span className="text-sm leading-none" style={{ color }}>{PLANET_SYMBOLS[p.name as PlanetName]}</span>
            <div>
              <span className="text-[9px] font-bold" style={{ color }}>{p.name}</span>
              {p.retrograde && <span className="text-[8px] ml-0.5" style={{ color: "#f97316" }}>℞</span>}
              <p className="text-[8px]" style={{ color: "#64748b" }}>
                {formatDeg(p.longitude)} {SIGN_SYMBOLS[p.sign as ZodiacSign]} · H{p.house}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function TransitRow({ aspect, index, onNatalClick, onOracleClick }: { aspect: TransitAspect; index: number; onNatalClick?: () => void; onOracleClick?: () => void }) {
  const cfg = ASPECT_CONFIG[aspect.type];
  const tColor = PLANET_COLORS[aspect.transitPlanet] ?? "#64748b";
  const nColor = PLANET_COLORS[aspect.natalPlanet] ?? "#64748b";
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.015 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
    >
      {/* Oracle hover button */}
      {onOracleClick && hovered && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={e => { e.stopPropagation(); onOracleClick(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[8px] font-bold tracking-wider px-2 py-1 rounded-lg z-10 cursor-pointer"
          style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}
        >
          ✦ Ask
        </motion.button>
      )}
      <div
        onClick={onNatalClick}
        className="grid items-center gap-3 px-4 py-2.5 transition-all duration-150"
        style={{
          gridTemplateColumns: "1.8fr 0.5fr 1.8fr 0.7fr 0.7fr 0.6fr",
          borderLeft: aspect.exact
            ? `2px solid ${cfg?.color ?? "#64748b"}`
            : aspect.applying
            ? "2px solid rgba(34,197,94,0.4)"
            : "2px solid transparent",
          cursor: onNatalClick ? "pointer" : "default",
          background: aspect.exact
            ? `${cfg?.color ?? "#64748b"}08`
            : hovered ? "rgba(255,255,255,0.01)" : "transparent",
        }}
      >
      {/* Transit planet */}
      <div className="flex items-center gap-2">
        <span className="text-base leading-none" style={{ color: tColor }}>
          {PLANET_SYMBOLS[aspect.transitPlanet]}
        </span>
        <div>
          <span className="text-xs font-semibold" style={{ color: tColor }}>
            {aspect.transitPlanet}
            {aspect.transitRetrograde && <span className="ml-1 text-[9px]" style={{ color: "#f97316" }}>℞</span>}
          </span>
          <p className="text-[8px]" style={{ color: "#475569" }}>
            {SIGN_SYMBOLS[aspect.transitSign]} {formatDeg(aspect.transitLon)}
          </p>
        </div>
      </div>

      {/* Aspect symbol */}
      <div className="flex items-center justify-center">
        <span className="text-lg font-bold" style={{ color: cfg?.color ?? "#64748b" }}>
          {cfg?.symbol}
        </span>
      </div>

      {/* Natal planet */}
      <div className="flex items-center gap-2">
        <span className="text-base leading-none" style={{ color: nColor }}>
          {PLANET_SYMBOLS[aspect.natalPlanet]}
        </span>
        <div>
          <span className="text-xs font-semibold" style={{ color: nColor }}>
            {aspect.natalPlanet}
          </span>
          <p className="text-[8px]" style={{ color: "#475569" }}>
            {SIGN_SYMBOLS[aspect.natalSign]} · H{aspect.natalHouse}
          </p>
        </div>
      </div>

      {/* Orb */}
      <div className="flex items-center">
        <span
          className="text-xs font-mono"
          style={{ color: aspect.orb < 0.5 ? cfg?.color : "#64748b" }}
        >
          {aspect.orb.toFixed(1)}°
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center gap-1">
        {aspect.exact ? (
          <span
            className="text-[8px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${cfg?.color}20`, color: cfg?.color }}
          >
            EXACT
          </span>
        ) : (
          <span
            className="text-[9px] font-medium"
            style={{ color: aspect.applying ? "#22c55e" : "#475569" }}
          >
            {aspect.applying ? "▲ Appl." : "▼ Sep."}
          </span>
        )}
      </div>

      {/* Days to exact */}
      <div className="flex items-center">
        {aspect.daysToExact !== null && (
          <span className="text-[9px]" style={{ color: "#22c55e" }}>
            {aspect.daysToExact === 0 ? "today" : `${aspect.daysToExact}d`}
          </span>
        )}
      </div>
      </div>
    </motion.div>
  );
}

function IngressCard({ ingress, index }: { ingress: Ingress; index: number }) {
  const color = PLANET_COLORS[ingress.planet] ?? "#64748b";
  const toColor = SIGN_COLORS[ingress.toSign] ?? "#64748b";

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}
      >
        <span className="text-sm" style={{ color }}>{PLANET_SYMBOLS[ingress.planet as PlanetName]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold" style={{ color }}>
            {ingress.planet}
            {ingress.retrograde && <span className="ml-1 text-[9px]" style={{ color: "#f97316" }}>℞</span>}
          </span>
          <span className="text-[9px]" style={{ color: "#334155" }}>→</span>
          <span className="text-xs font-semibold" style={{ color: toColor }}>
            {SIGN_SYMBOLS[ingress.toSign]} {ingress.toSign}
          </span>
        </div>
        <p className="text-[9px] mt-0.5" style={{ color: "#475569" }}>
          {ingress.date} · in {ingress.daysUntil} day{ingress.daysUntil === 1 ? "" : "s"}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Transit Heatmap ─────────────────────────────────────────────────────────

const TRANSIT_WINDOW: Record<string, number> = {
  Moon: 1, Sun: 5, Mercury: 7, Venus: 10, Mars: 14,
  Jupiter: 60, Saturn: 90, Uranus: 120, Neptune: 150, Pluto: 180,
};

const ASPECT_WEIGHT: Record<string, number> = {
  conjunction: 3, opposition: 2, square: 2, trine: 1, sextile: 1, quincunx: 0.5,
};

function TransitHeatmap({ data, baseDate }: { data: TransitsData; baseDate: Date }) {
  const DAYS = 90;
  const today = new Date(baseDate);
  today.setHours(0, 0, 0, 0);

  // Build day-buckets: for each transit, spread its orb window across the 90-day span
  type DayBucket = { score: number; aspects: TransitAspect[] };
  const buckets: DayBucket[] = Array.from({ length: DAYS }, () => ({ score: 0, aspects: [] }));

  data.aspects.forEach(asp => {
    if (asp.daysToExact === null || asp.daysToExact > DAYS + 15) return;
    const window = TRANSIT_WINDOW[asp.transitPlanet] ?? 10;
    const halfWin = window / 2;
    const weight = ASPECT_WEIGHT[asp.type] ?? 1;
    const exactDay = asp.applying ? asp.daysToExact : -(asp.orb / 0.5); // approximate past peak

    for (let d = 0; d < DAYS; d++) {
      const dist = Math.abs(d - exactDay);
      if (dist <= halfWin) {
        const intensity = 1 - dist / halfWin;
        buckets[d].score += weight * intensity;
        if (!buckets[d].aspects.find(a => a.transitPlanet === asp.transitPlanet && a.type === asp.type)) {
          buckets[d].aspects.push(asp);
        }
      }
    }
  });

  const maxScore = Math.max(...buckets.map(b => b.score), 1);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Determine a representative color for each day (dominant aspect type)
  function dayColor(bucket: DayBucket): string {
    if (bucket.score === 0) return "rgba(255,255,255,0.04)";
    const dominantAsp = bucket.aspects.reduce((best, a) =>
      (ASPECT_WEIGHT[a.type] ?? 0) > (ASPECT_WEIGHT[best?.type ?? ""] ?? 0) ? a : best,
      bucket.aspects[0]
    );
    return ASPECT_CONFIG[dominantAsp?.type ?? ""]?.color ?? "#7c3aed";
  }

  const hov = hoveredDay !== null ? buckets[hoveredDay] : null;

  return (
    <div className="flex flex-col h-full px-4 py-4 gap-4 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
      <div>
        <p className="text-[8px] font-bold tracking-widest mb-1" style={{ color: "#475569" }}>
          90-DAY TRANSIT INTENSITY
        </p>
        <p className="text-[8px]" style={{ color: "#334155" }}>
          Bar height = cumulative transit pressure · hover for details
        </p>
      </div>

      {/* Heatmap bars */}
      <div className="relative">
        <div className="flex items-end gap-px" style={{ height: 96 }}>
          {buckets.map((b, i) => {
            const h = b.score > 0 ? Math.max(4, (b.score / maxScore) * 88) : 2;
            const color = dayColor(b);
            const isHovered = hoveredDay === i;
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            const isToday = i === 0;
            return (
              <motion.div
                key={i}
                onHoverStart={() => setHoveredDay(i)}
                onHoverEnd={() => setHoveredDay(null)}
                className="flex-1 rounded-t-sm cursor-default relative"
                animate={{ height: h, opacity: isHovered ? 1 : 0.8 }}
                transition={{ duration: 0.2 }}
                style={{
                  background: b.score > 0 ? color : "rgba(255,255,255,0.04)",
                  boxShadow: isHovered ? `0 0 8px ${color}80` : "none",
                  minWidth: 2,
                  alignSelf: "flex-end",
                }}
              >
                {isToday && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0.5 h-2"
                    style={{ background: "#a78bfa" }} />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* X-axis labels: every 15 days */}
        <div className="flex justify-between mt-1 px-px">
          {[0, 15, 30, 45, 60, 75, 89].map(d => {
            const date = new Date(today);
            date.setDate(date.getDate() + d);
            return (
              <span key={d} className="text-[7px]" style={{ color: "#1e293b" }}>
                {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            );
          })}
        </div>
      </div>

      {/* Hover tooltip */}
      <div style={{ minHeight: 90 }}>
        {hov && hoveredDay !== null ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(99,102,241,0.15)" }}
          >
            {(() => {
              const d = new Date(today);
              d.setDate(d.getDate() + hoveredDay);
              return (
                <p className="text-[8px] font-bold tracking-widest mb-2" style={{ color: "#7c3aed" }}>
                  {d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  {hoveredDay === 0 && " · TODAY"}
                </p>
              );
            })()}
            {hov.score === 0 ? (
              <p className="text-[10px]" style={{ color: "#334155" }}>No significant transits</p>
            ) : (
              <div className="space-y-1">
                {hov.aspects.slice(0, 5).map((a, i) => {
                  const cfg = ASPECT_CONFIG[a.type];
                  return (
                    <div key={i} className="flex items-center gap-2 text-[9px]">
                      <span style={{ color: PLANET_COLORS[a.transitPlanet] ?? "#94a3b8" }}>
                        {PLANET_SYMBOLS[a.transitPlanet as PlanetName]}
                      </span>
                      <span style={{ color: cfg?.color ?? "#64748b" }}>{cfg?.symbol}</span>
                      <span style={{ color: PLANET_COLORS[a.natalPlanet] ?? "#94a3b8" }}>
                        {PLANET_SYMBOLS[a.natalPlanet as PlanetName]}
                      </span>
                      <span className="capitalize" style={{ color: "#64748b" }}>
                        {a.transitPlanet} {a.type} {a.natalPlanet}
                      </span>
                    </div>
                  );
                })}
                {hov.aspects.length > 5 && (
                  <p className="text-[8px]" style={{ color: "#334155" }}>+{hov.aspects.length - 5} more</p>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex items-center justify-center h-16">
            <p className="text-[8px]" style={{ color: "#1e293b" }}>Hover a day to inspect</p>
          </div>
        )}
      </div>

      {/* Peak days list */}
      <div>
        <p className="text-[8px] font-bold tracking-widest mb-2" style={{ color: "#475569" }}>PEAK TRANSIT DAYS</p>
        <div className="space-y-1.5">
          {buckets
            .map((b, i) => ({ ...b, day: i }))
            .filter(b => b.score > maxScore * 0.6)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(({ score, aspects, day }) => {
              const d = new Date(today);
              d.setDate(d.getDate() + day);
              const color = dayColor({ score, aspects });
              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{
                    background: `${color}10`,
                    border: `1px solid ${color}20`,
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
                  <span className="text-[9px] font-medium" style={{ color: "#94a3b8" }}>
                    {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {day === 0 && " · Today"}
                  </span>
                  <span className="ml-auto text-[8px]" style={{ color }}>
                    {aspects.length} transit{aspects.length !== 1 ? "s" : ""}
                  </span>
                </motion.div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

// ─── Transit bi-wheel ────────────────────────────────────────────────────────

function TransitBiWheel({ natal, data }: { natal: ChartData; data: TransitsData }) {
  const SIZE = 360, CX = 180, CY = 180;
  const R_INNER   = 25;
  const R_NATAL   = 95;  // natal planets
  const R_ZOD_IN  = 105;
  const R_ZOD_OUT = 125;
  const R_TRANSIT = 145; // transit planets

  const ZODIAC_SYMBOLS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
  const ZODIAC_COLORS_ZW = ["#ef4444","#22c55e","#eab308","#a855f7","#f97316","#6366f1","#ec4899","#dc2626","#f59e0b","#64748b","#06b6d4","#8b5cf6"];

  function lonToAngle(lon: number): number {
    return (lon / 360) * 2 * Math.PI - Math.PI / 2;
  }
  function polar(angle: number, r: number): [number, number] {
    return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
  }

  // Top active aspects for lines
  const topAspects = data.aspects.slice(0, 8);

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ maxWidth: "100%", height: "auto" }}>
        <defs>
          <radialGradient id="twCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(99,102,241,0.2)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0)" />
          </radialGradient>
          <filter id="twGlow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Core glow */}
        <circle cx={CX} cy={CY} r={R_INNER + 10} fill="url(#twCore)" />
        <circle cx={CX} cy={CY} r={R_INNER} fill="rgba(4,4,28,0.95)" stroke="rgba(99,102,241,0.2)" strokeWidth={1} />
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize={7} fill="#475569" fontWeight="bold" letterSpacing={0.5}>NATAL</text>
        <text x={CX} y={CY + 6} textAnchor="middle" fontSize={5} fill="#334155" letterSpacing={0.5}>INNER</text>

        {/* House cusp lines */}
        {natal.houses.map((h, i) => {
          const a = lonToAngle(h.longitude);
          const [x1, y1] = polar(a, 30);
          const [x2, y2] = polar(a, R_ZOD_IN);
          const isAngular = [0, 3, 6, 9].includes(i);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={isAngular ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}
              strokeWidth={isAngular ? 1.5 : 0.5} />
          );
        })}

        {/* Zodiac ring */}
        {Array.from({ length: 12 }, (_, i) => {
          const a0 = lonToAngle(i * 30), a1 = lonToAngle((i + 1) * 30);
          const [ox, oy] = polar(a0, R_ZOD_OUT);
          const [ix, iy] = polar(a0, R_ZOD_IN);
          const [ox2, oy2] = polar(a1, R_ZOD_OUT);
          const [ix2, iy2] = polar(a1, R_ZOD_IN);
          const d = `M${ix},${iy} L${ox},${oy} A${R_ZOD_OUT},${R_ZOD_OUT} 0 0,1 ${ox2},${oy2} L${ix2},${iy2} A${R_ZOD_IN},${R_ZOD_IN} 0 0,0 ${ix},${iy}`;
          const [lx, ly] = polar(lonToAngle(i * 30 + 15), (R_ZOD_IN + R_ZOD_OUT) / 2);
          return (
            <g key={i}>
              <path d={d} fill={`${ZODIAC_COLORS_ZW[i]}10`} stroke={`${ZODIAC_COLORS_ZW[i]}20`} strokeWidth={0.5} />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={8} fill={ZODIAC_COLORS_ZW[i]} opacity={0.7}>
                {ZODIAC_SYMBOLS[i]}
              </text>
            </g>
          );
        })}

        {/* Ring outlines */}
        <circle cx={CX} cy={CY} r={30} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
        <circle cx={CX} cy={CY} r={R_ZOD_IN} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={0.5} />
        <circle cx={CX} cy={CY} r={R_ZOD_OUT} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={0.5} />
        <circle cx={CX} cy={CY} r={R_TRANSIT + 16} fill="none" stroke="rgba(245,158,11,0.1)" strokeWidth={0.5} strokeDasharray="2 4" />

        {/* Aspect lines (transit → natal) */}
        {topAspects.map((asp, i) => {
          const natP = natal.planets.find(p => p.name === asp.natalPlanet);
          const trP  = data.transitPlanets.find(p => p.name === asp.transitPlanet);
          if (!natP || !trP) return null;
          const [x1, y1] = polar(lonToAngle(natP.longitude), R_NATAL);
          const [x2, y2] = polar(lonToAngle(trP.longitude), R_TRANSIT);
          const color = ASPECT_CONFIG[asp.type]?.color ?? "#64748b";
          return (
            <motion.line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color} strokeWidth={0.8} strokeOpacity={0.3}
              strokeDasharray={["trine","sextile"].includes(asp.type) ? "none" : "3 2"}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.06 }} />
          );
        })}

        {/* Natal planets (inner) */}
        {natal.planets.slice(0, 10).map(p => {
          const a = lonToAngle(p.longitude);
          const [x, y] = polar(a, R_NATAL);
          const color = PLANET_COLORS[p.name] ?? "#94a3b8";
          return (
            <motion.g key={`n-${p.name}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <circle cx={x} cy={y} r={9} fill="rgba(4,4,28,0.9)" stroke={`${color}60`} strokeWidth={0.8} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={8} fill={color}>
                {PLANET_SYMBOLS[p.name]}
              </text>
            </motion.g>
          );
        })}

        {/* Transit planets (outer) */}
        {data.transitPlanets.slice(0, 10).map(p => {
          const a = lonToAngle(p.longitude);
          const [x, y] = polar(a, R_TRANSIT);
          const color = PLANET_COLORS[p.name] ?? "#94a3b8";
          return (
            <motion.g key={`t-${p.name}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <circle cx={x} cy={y} r={9} fill="rgba(245,158,11,0.1)" stroke={`${color}80`} strokeWidth={1} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={8} fill={color}>
                {PLANET_SYMBOLS[p.name]}
              </text>
            </motion.g>
          );
        })}

        {/* Labels */}
        <text x={CX} y={CY - R_NATAL - 14} textAnchor="middle" fontSize={6} fill="rgba(99,102,241,0.5)" fontWeight="bold" letterSpacing={0.5}>NATAL</text>
        <text x={CX} y={CY - R_TRANSIT - 18} textAnchor="middle" fontSize={6} fill="rgba(245,158,11,0.5)" fontWeight="bold" letterSpacing={0.5}>TRANSITS</text>
      </svg>

      {/* Legend */}
      <div className="flex gap-4 text-[8px]">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center border" style={{ background: "rgba(4,4,28,0.9)", borderColor: "rgba(99,102,241,0.4)" }}>
            <span style={{ color: "#a78bfa", fontSize: 9 }}>☉</span>
          </div>
          <span style={{ color: "#475569" }}>Natal (inner)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center border" style={{ background: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.5)" }}>
            <span style={{ color: "#fbbf24", fontSize: 9 }}>☉</span>
          </div>
          <span style={{ color: "#475569" }}>Transit (outer)</span>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar view ───────────────────────────────────────────────────────────

function CalendarView({ data, baseDate }: { data: TransitsData; baseDate: Date }) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const today = new Date();
  const year  = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const eventsByDay = useMemo(() => {
    const map = new Map<number, { aspects: TransitAspect[]; ingresses: Ingress[] }>();
    data.aspects.forEach(asp => {
      if (!asp.applying || asp.daysToExact === null || asp.daysToExact > 45) return;
      const d = new Date(baseDate);
      d.setDate(d.getDate() + asp.daysToExact);
      if (d.getMonth() !== month || d.getFullYear() !== year) return;
      const day = d.getDate();
      const entry = map.get(day) ?? { aspects: [], ingresses: [] };
      entry.aspects.push(asp);
      map.set(day, entry);
    });
    data.ingresses.forEach(ing => {
      if (ing.daysUntil > 45) return;
      const d = new Date(baseDate);
      d.setDate(d.getDate() + ing.daysUntil);
      if (d.getMonth() !== month || d.getFullYear() !== year) return;
      const day = d.getDate();
      const entry = map.get(day) ?? { aspects: [], ingresses: [] };
      entry.ingresses.push(ing);
      map.set(day, entry);
    });
    return map;
  }, [data, baseDate, month, year]);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEvents = selectedDay ? eventsByDay.get(selectedDay) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 p-4">
        <p className="text-[8px] font-bold tracking-widest mb-3 text-center" style={{ color: "#475569" }}>
          {baseDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
        </p>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {["SUN","MON","TUE","WED","THU","FRI","SAT"].map(d => (
            <div key={d} className="text-center text-[7px] font-bold tracking-widest py-1" style={{ color: "#334155" }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="min-h-[44px]" />;
            const events = eventsByDay.get(day);
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const isSelected = selectedDay === day;
            const isPast = new Date(year, month, day) < today && !isToday;

            return (
              <motion.button
                key={day}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                className="flex flex-col items-center py-1.5 px-1 rounded-lg cursor-pointer transition-all min-h-[44px]"
                style={{
                  background: isSelected ? "rgba(124,58,237,0.22)" : isToday ? "rgba(99,102,241,0.12)" : events ? "rgba(255,255,255,0.03)" : "transparent",
                  border: isSelected ? "1px solid rgba(124,58,237,0.5)" : isToday ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                  opacity: isPast ? 0.45 : 1,
                }}
              >
                <span className="text-[10px] font-bold leading-tight" style={{
                  color: isToday ? "#c4b5fd" : isSelected ? "#e2e8f0" : "#64748b",
                }}>{day}</span>

                {events && (
                  <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                    {events.aspects.slice(0, 4).map((asp, j) => (
                      <div key={j} className="w-1.5 h-1.5 rounded-full" style={{ background: ASPECT_CONFIG[asp.type]?.color ?? "#64748b" }} />
                    ))}
                    {events.ingresses.slice(0, 2).map((ing, j) => (
                      <div key={`i${j}`} className="w-1.5 h-1.5 rounded-full" style={{ background: PLANET_COLORS[ing.planet] ?? "#64748b", outline: "1px solid rgba(0,0,0,0.4)" }} />
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {Object.entries(ASPECT_CONFIG).map(([type, cfg]) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
              <span className="text-[7px]" style={{ color: "#334155" }}>{cfg.symbol} {type.substring(0,3)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: "thin" }}>
        {selectedDay ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(99,102,241,0.12)" }}
          >
            <p className="text-[9px] font-bold tracking-widest mb-3" style={{ color: "#7c3aed" }}>
              {new Date(year, month, selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
            </p>

            {!selectedEvents && (
              <p className="text-[11px]" style={{ color: "#334155" }}>No projected exact transits.</p>
            )}

            {selectedEvents?.aspects.map((asp, i) => {
              const cfg = ASPECT_CONFIG[asp.type];
              const tColor = PLANET_COLORS[asp.transitPlanet] ?? "#64748b";
              const nColor = PLANET_COLORS[asp.natalPlanet] ?? "#64748b";
              return (
                <div key={i} className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="text-sm" style={{ color: tColor }}>{PLANET_SYMBOLS[asp.transitPlanet]}</span>
                  <span className="text-base font-bold" style={{ color: cfg?.color }}>{cfg?.symbol}</span>
                  <span className="text-sm" style={{ color: nColor }}>{PLANET_SYMBOLS[asp.natalPlanet]}</span>
                  <span className="text-[9px] capitalize flex-1" style={{ color: "#94a3b8" }}>
                    {asp.transitPlanet} {asp.type} natal {asp.natalPlanet}
                  </span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: `${cfg?.color}20`, color: cfg?.color }}>EXACT</span>
                </div>
              );
            })}

            {selectedEvents?.ingresses.map((ing, i) => {
              const pColor = PLANET_COLORS[ing.planet] ?? "#64748b";
              const sColor = SIGN_COLORS[ing.toSign as ZodiacSign] ?? "#64748b";
              return (
                <div key={`ing-${i}`} className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="text-sm" style={{ color: pColor }}>{PLANET_SYMBOLS[ing.planet as PlanetName]}</span>
                  <span className="text-[9px] font-semibold" style={{ color: pColor }}>{ing.planet}</span>
                  <span className="text-[9px]" style={{ color: "#334155" }}>enters</span>
                  <span className="text-[9px] font-bold flex-1" style={{ color: sColor }}>{SIGN_SYMBOLS[ing.toSign as ZodiacSign]} {ing.toSign}</span>
                  {ing.retrograde && <span className="text-[8px]" style={{ color: "#f97316" }}>℞</span>}
                  <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: `${pColor}15`, color: pColor }}>INGRESS</span>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <div className="flex items-center justify-center h-16">
            <p className="text-[9px]" style={{ color: "#334155" }}>Select a day to see projected exact transits</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function TransitsPage() {
  const warpTo = useWarpTo();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [natal, setNatal] = useState<ChartData | null>(null);
  const [data, setData] = useState<TransitsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date>(new Date());
  const [filterOuter, setFilterOuter] = useState(false);
  const [filterApplying, setFilterApplying] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "heat" | "wheel">("list");
  const [activeAspectTypes, setActiveAspectTypes] = useState<Set<string>>(
    new Set(["conjunction","opposition","trine","square","sextile","quincunx"])
  );

  const fetchTransits = useCallback(async (chart: ChartData, d: Date) => {
    setLoading(true);
    try {
      const res = await fetch("/api/transits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ natal: chart, date: d.toISOString() }),
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setLoading(false); return; }
    const profile = getProfile(id);
    if (!profile) { setLoading(false); return; }

    setProfileId(id);
    setProfileName(profile.name);

    const chart = getCachedChart(id);
    if (chart) {
      setNatal(chart);
      fetchTransits(chart, new Date());
    } else {
      setLoading(false);
    }
  }, [fetchTransits]);

  const changeDate = (delta: number) => {
    if (!natal) return;
    const d = new Date(date.getTime() + delta * 86400000);
    setDate(d);
    fetchTransits(natal, d);
  };

  const goToToday = () => {
    if (!natal) return;
    const d = new Date();
    setDate(d);
    fetchTransits(natal, d);
  };

  const toggleAspectType = (type: string) => {
    setActiveAspectTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) { next.delete(type); } else { next.add(type); }
      return next;
    });
  };

  const aspects = (data?.aspects ?? []).filter(a => {
    if (filterOuter && !OUTER_PLANETS.has(a.transitPlanet)) return false;
    if (filterApplying && !a.applying) return false;
    if (!activeAspectTypes.has(a.type)) return false;
    return true;
  });

  const applyingCount = aspects.filter(a => a.applying).length;
  const exactCount = aspects.filter(a => a.exact).length;

  if (!loading && (!profileId || !natal)) {
    return (
      <div className="h-screen flex overflow-hidden" style={{ background: "#00000f" }}>
        <DashboardBg />
        <div className="nebula-orb" style={{ width: 500, height: 500, left: "20%", top: "10%", background: "rgba(6,182,212,0.05)", filter: "blur(120px)" }} />
        <div className="nebula-orb" style={{ width: 400, height: 400, right: "10%", bottom: "5%", background: "rgba(124,58,237,0.06)", filter: "blur(80px)" }} />
        <Sidebar />
        <div className="flex-1 flex items-center justify-center md:ml-[68px] relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-6 text-center px-8"
          >
            <motion.div
              animate={{ boxShadow: ["0 0 30px rgba(6,182,212,0.3)", "0 0 60px rgba(6,182,212,0.6)", "0 0 30px rgba(6,182,212,0.3)"] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0891b2, #06b6d4)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-10 h-10">
                <path d="M12 2L12 6M12 18L12 22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </motion.div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] mb-2" style={{ color: "#06b6d4" }}>NO CHART DATA</p>
              <h2 className="text-3xl font-bold mb-3 font-title" style={{ color: "#f0f4ff" }}>Transit Radar Offline</h2>
              <p className="text-sm max-w-sm leading-relaxed" style={{ color: "#64748b" }}>
                Enter your birth data to activate planetary transit tracking and real-time cosmic alerts.
              </p>
            </div>
            <Link href="/onboarding">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="px-8 py-3 rounded-2xl text-sm font-bold tracking-wider cursor-pointer"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white", boxShadow: "0 0 30px rgba(124,58,237,0.4)" }}
              >
                Begin Setup →
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#00000f" }}>
      <DashboardBg />
      <div className="nebula-orb" style={{ width:500, height:500, left:"20%", top:"10%", background:"rgba(6,182,212,0.05)", filter:"blur(120px)" }} />
      <div className="nebula-orb" style={{ width:400, height:400, right:"10%", bottom:"5%", background:"rgba(124,58,237,0.06)", filter:"blur(80px)" }} />

      <Sidebar />

      <div className="flex-1 flex flex-col min-h-0 min-w-0 md:ml-[68px] mb-[60px] md:mb-0 relative z-10 overflow-x-hidden">

        {/* Top nav */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 flex items-center justify-between px-6 py-3 gap-4"
          style={{
            borderBottom: "1px solid rgba(99,102,241,0.1)",
            background: "rgba(2,2,18,0.7)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <motion.button
                whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                style={{ color: "#64748b" }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
                Dashboard
              </motion.button>
            </Link>
            <span style={{ color: "#1e293b" }}>/</span>
            <span className="text-xs font-bold tracking-widest gradient-text">TRANSITS</span>
            {profileName && (
              <>
                <span style={{ color: "#1e293b" }}>/</span>
                <span className="text-xs font-medium" style={{ color: "#64748b" }}>{profileName}</span>
              </>
            )}
          </div>

          {/* Date navigator */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}
              onClick={() => changeDate(-1)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={goToToday}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              style={{
                background: isToday(date) ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
                border: isToday(date) ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.08)",
                color: isToday(date) ? "#c4b5fd" : "#94a3b8",
              }}
            >
              {isToday(date) ? "Today" : formatDate(date)}
            </motion.button>

            {!isToday(date) && (
              <span className="text-[9px]" style={{ color: "#475569" }}>{formatDate(date)}</span>
            )}

            <motion.button
              whileHover={{ x: 2 }} whileTap={{ scale: 0.95 }}
              onClick={() => changeDate(1)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </motion.button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            {/* Outer planets toggle */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setFilterOuter(v => !v)}
              className="px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-wide cursor-pointer transition-all"
              style={{
                background: filterOuter ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.03)",
                border: filterOuter ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(255,255,255,0.06)",
                color: filterOuter ? "#a78bfa" : "#64748b",
              }}
            >
              ♃ OUTER
            </motion.button>

            {/* Applying toggle */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setFilterApplying(v => !v)}
              className="px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-wide cursor-pointer transition-all"
              style={{
                background: filterApplying ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.03)",
                border: filterApplying ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.06)",
                color: filterApplying ? "#4ade80" : "#64748b",
              }}
            >
              ▲ APPLYING
            </motion.button>

            {/* Aspect type pills */}
            <div className="flex items-center gap-1">
              {Object.entries(ASPECT_CONFIG).map(([type, cfg]) => (
                <motion.button
                  key={type}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleAspectType(type)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-sm cursor-pointer transition-all"
                  style={{
                    background: activeAspectTypes.has(type) ? `${cfg.color}20` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${activeAspectTypes.has(type) ? cfg.color + "40" : "rgba(255,255,255,0.06)"}`,
                    color: activeAspectTypes.has(type) ? cfg.color : "#334155",
                  }}
                  title={cfg.label}
                >
                  {cfg.symbol}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Sky strip */}
        {data && <SkyStrip planets={data.transitPlanets} />}

        {/* Main content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full border-2 border-t-transparent"
              style={{ borderColor: "#7c3aed" }}
            />
            <p className="text-xs tracking-widest" style={{ color: "#475569" }}>CALCULATING TRANSITS</p>
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: "#64748b" }}>No chart found.</p>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0 overflow-hidden">

            {/* Left: transit aspects */}
            <div className="flex-1 flex flex-col min-h-0">

              {/* Aspects header */}
              <div
                className="flex-shrink-0 flex items-center gap-3 px-4 py-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span className="text-[9px] font-bold tracking-widest" style={{ color: "#475569" }}>
                  {viewMode === "list" ? "TRANSIT ASPECTS" : viewMode === "calendar" ? "TRANSIT CALENDAR" : viewMode === "heat" ? "90-DAY INTENSITY" : "TRANSIT BI-WHEEL"}
                </span>
                {viewMode === "list" && (
                  <>
                    <span className="text-[9px] px-2 py-0.5 rounded-md" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>
                      {aspects.length} active
                    </span>
                    {applyingCount > 0 && (
                      <span className="text-[9px] px-2 py-0.5 rounded-md" style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80" }}>
                        {applyingCount} applying
                      </span>
                    )}
                    {exactCount > 0 && (
                      <span className="text-[9px] px-2 py-0.5 rounded-md" style={{ background: "rgba(168,85,247,0.15)", color: "#c4b5fd" }}>
                        {exactCount} exact
                      </span>
                    )}
                  </>
                )}
                {/* View toggle */}
                <div className="ml-auto flex items-center gap-1 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {(["list", "calendar", "heat", "wheel"] as const).map(mode => (
                    <motion.button
                      key={mode}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setViewMode(mode)}
                      className="px-2.5 py-1 rounded-md text-[8px] font-bold tracking-widest cursor-pointer transition-all"
                      style={{
                        background: viewMode === mode ? "rgba(124,58,237,0.25)" : "transparent",
                        color: viewMode === mode ? "#c4b5fd" : "#334155",
                        border: viewMode === mode ? "1px solid rgba(124,58,237,0.4)" : "1px solid transparent",
                      }}
                    >
                      {mode === "list" ? "≡ LIST" : mode === "calendar" ? "⊞ CAL" : mode === "heat" ? "▬ HEAT" : "⊙ WHEEL"}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* List view: column headers + rows */}
              {viewMode === "list" && (
                <>
                  <div
                    className="flex-shrink-0 grid gap-3 px-4 py-2 text-[9px] font-bold tracking-widest"
                    style={{
                      color: "#334155",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      gridTemplateColumns: "1.8fr 0.5fr 1.8fr 0.7fr 0.7fr 0.6fr",
                    }}
                  >
                    <span>TRANSIT PLANET</span>
                    <span></span>
                    <span>NATAL PLANET</span>
                    <span>ORB</span>
                    <span>STATUS</span>
                    <span>EXACT IN</span>
                  </div>

                  <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                    {aspects.length === 0 ? (
                      <div className="flex items-center justify-center h-32">
                        <p className="text-sm" style={{ color: "#334155" }}>No transits match current filters</p>
                      </div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {aspects.map((a, i) => (
                          <TransitRow
                            key={`${a.transitPlanet}-${a.type}-${a.natalPlanet}`}
                            aspect={a}
                            index={i}
                            onNatalClick={() => warpTo(`/dashboard/chart/${a.natalPlanet.toLowerCase()}`)}
                            onOracleClick={() => {
                              const q = encodeURIComponent(`Explain ${a.transitPlanet} ${a.type} natal ${a.natalPlanet} — ${a.applying ? "applying" : "separating"}, ${a.orb.toFixed(1)}° orb${a.daysToExact !== null && a.daysToExact > 0 ? `, exact in ${a.daysToExact} days` : ""}. What does this transit mean for me right now?`);
                              warpTo(`/dashboard/oracle?q=${q}`);
                            }}
                          />
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </>
              )}

              {/* Calendar view */}
              {viewMode === "calendar" && (
                <div className="flex-1 overflow-hidden">
                  <CalendarView data={data} baseDate={date} />
                </div>
              )}

              {/* Heat view */}
              {viewMode === "heat" && (
                <div className="flex-1 overflow-hidden">
                  <TransitHeatmap data={data} baseDate={date} />
                </div>
              )}

              {/* Wheel view */}
              {viewMode === "wheel" && natal && (
                <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
                  <TransitBiWheel natal={natal} data={data} />
                </div>
              )}
            </div>

            {/* Right panel: ingresses + stats */}
            <div
              className="w-72 flex-shrink-0 flex flex-col overflow-hidden"
              style={{ borderLeft: "1px solid rgba(99,102,241,0.1)" }}
            >

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-shrink-0 grid grid-cols-3 gap-2 p-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                {[
                  { label: "ACTIVE", value: aspects.length, color: "#6366f1" },
                  { label: "APPLYING", value: applyingCount, color: "#22c55e" },
                  { label: "EXACT", value: exactCount, color: "#a855f7" },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="flex flex-col items-center py-2 rounded-xl"
                    style={{ background: `${stat.color}0d`, border: `1px solid ${stat.color}20` }}
                  >
                    <span className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</span>
                    <span className="text-[7px] font-bold tracking-widest" style={{ color: "#475569" }}>{stat.label}</span>
                  </div>
                ))}
              </motion.div>

              {/* Aspect type breakdown */}
              <div className="flex-shrink-0 p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-[8px] font-bold tracking-widest mb-2" style={{ color: "#334155" }}>
                  BY ASPECT TYPE
                </p>
                <div className="space-y-1.5">
                  {Object.entries(ASPECT_CONFIG).map(([type, cfg]) => {
                    const count = (data.aspects ?? []).filter(a =>
                      a.type === type &&
                      (!filterOuter || OUTER_PLANETS.has(a.transitPlanet)) &&
                      activeAspectTypes.has(type)
                    ).length;
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <span className="text-sm w-5 text-center" style={{ color: cfg.color }}>{cfg.symbol}</span>
                        <span className="text-[9px] flex-1" style={{ color: "#475569" }}>{cfg.label}</span>
                        <span className="text-[9px] font-bold" style={{ color: count > 0 ? cfg.color : "#334155" }}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lunar Phase */}
              {(() => {
                const moon = data.transitPlanets.find(p => p.name === "Moon");
                const sun  = data.transitPlanets.find(p => p.name === "Sun");
                if (!moon || !sun) return null;
                let angle = ((moon.longitude - sun.longitude) + 360) % 360;
                const phaseIdx = Math.floor(angle / 45);
                const phaseNames = ["New Moon","Waxing Crescent","First Quarter","Waxing Gibbous","Full Moon","Waning Gibbous","Last Quarter","Waning Crescent"];
                const phaseName = phaseNames[phaseIdx];
                const illumination = ((1 - Math.cos(angle * Math.PI / 180)) / 2 * 100).toFixed(0);
                // SVG moon face: dark half / light half based on angle
                const isWaxing = angle < 180;
                const arcR = 18;
                // Terminator x-offset: cos of angle for full phase
                const termX = Math.cos(angle * Math.PI / 180) * arcR;
                const moonColor = "#c4b5fd";
                return (
                  <div className="flex-shrink-0 p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[8px] font-bold tracking-widest mb-3" style={{ color: "#334155" }}>LUNAR PHASE</p>
                    <div className="flex items-center gap-3">
                      <svg width={44} height={44} viewBox="0 0 44 44">
                        <circle cx={22} cy={22} r={arcR} fill="rgba(196,181,253,0.08)" stroke="rgba(196,181,253,0.2)" strokeWidth={1} />
                        {/* Illuminated part */}
                        <clipPath id="moonClip">
                          <circle cx={22} cy={22} r={arcR} />
                        </clipPath>
                        <g clipPath="url(#moonClip)">
                          {/* Dark half */}
                          <rect x={22} y={4} width={arcR} height={arcR * 2} fill={isWaxing ? "rgba(196,181,253,0.08)" : moonColor} opacity={isWaxing ? 1 : 0.85} />
                          <rect x={4} y={4} width={arcR} height={arcR * 2} fill={isWaxing ? moonColor : "rgba(196,181,253,0.08)"} opacity={isWaxing ? 0.85 : 1} />
                          {/* Terminator ellipse */}
                          <ellipse cx={22} cy={22} rx={Math.abs(termX)} ry={arcR}
                            fill={angle < 90 || angle > 270
                              ? "rgba(196,181,253,0.08)"
                              : moonColor}
                            opacity={0.85}
                          />
                        </g>
                        <circle cx={22} cy={22} r={arcR} fill="none" stroke="rgba(196,181,253,0.25)" strokeWidth={1} />
                      </svg>
                      <div>
                        <p className="text-[10px] font-bold" style={{ color: moonColor }}>{phaseName}</p>
                        <p className="text-[8px]" style={{ color: "#475569" }}>
                          {illumination}% illuminated
                        </p>
                        <p className="text-[8px]" style={{ color: "#334155" }}>
                          ☽ {SIGN_SYMBOLS[moon.sign as import("@/lib/astrology/types").ZodiacSign]} {moon.sign} · H{moon.house}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Void of Course Moon */}
              {(() => {
                const moon = data.transitPlanets.find(p => p.name === "Moon");
                if (!moon) return null;
                // Degrees until moon leaves its current sign
                const degInSign = moon.longitude % 30;
                const degRemaining = 30 - degInSign;
                const moonSpeed = Math.abs(moon.speed) > 0.1 ? Math.abs(moon.speed) : 13.2;
                const hoursToNextSign = (degRemaining / moonSpeed) * 24;

                // Check if any Moon transit aspect is applying within the degrees remaining
                const moonAspects = (data.aspects ?? []).filter(a =>
                  a.transitPlanet === "Moon" && a.applying && a.daysToExact !== null
                );
                const nextSignDate = new Date(Date.now() + hoursToNextSign * 3600000);
                const nextSignIdx = (Math.floor(moon.longitude / 30) + 1) % 12;
                const nextSignName = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"][nextSignIdx];

                const isVoid = moonAspects.length === 0;

                const fmtHours = (h: number) => {
                  if (h < 1) return `${Math.round(h * 60)}m`;
                  if (h < 24) return `${h.toFixed(1)}h`;
                  const d = Math.floor(h / 24); const rem = h % 24;
                  return `${d}d ${rem.toFixed(0)}h`;
                };

                return (
                  <div className="flex-shrink-0 p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0`}
                        style={{ background: isVoid ? "#f97316" : "#22c55e", boxShadow: `0 0 4px ${isVoid ? "#f97316" : "#22c55e"}` }} />
                      <p className="text-[8px] font-bold tracking-widest" style={{ color: "#334155" }}>VOID OF COURSE MOON</p>
                    </div>
                    <div className="rounded-xl px-3 py-2"
                      style={{ background: isVoid ? "rgba(249,115,22,0.08)" : "rgba(34,197,94,0.06)", border: `1px solid ${isVoid ? "rgba(249,115,22,0.2)" : "rgba(34,197,94,0.15)"}` }}>
                      <p className="text-[10px] font-bold mb-0.5" style={{ color: isVoid ? "#f97316" : "#22c55e" }}>
                        {isVoid ? "VOID OF COURSE" : "Moon is Active"}
                      </p>
                      <p className="text-[8px]" style={{ color: "#475569" }}>
                        {isVoid
                          ? `No applying aspects · Avoid major decisions`
                          : `${moonAspects.length} applying aspect${moonAspects.length > 1 ? "s" : ""} remaining`}
                      </p>
                      <p className="text-[8px] mt-1" style={{ color: "#334155" }}>
                        Enters {nextSignName} in {fmtHours(hoursToNextSign)} · {nextSignDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Next Exact countdown */}
              {(() => {
                const upcoming = (data.aspects ?? [])
                  .filter(a => a.daysToExact !== null && a.daysToExact >= 0 && a.daysToExact <= 30)
                  .sort((a, b) => (a.daysToExact ?? 999) - (b.daysToExact ?? 999))
                  .slice(0, 5);
                if (!upcoming.length) return null;
                return (
                  <div className="flex-shrink-0 p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[8px] font-bold tracking-widest mb-2" style={{ color: "#334155" }}>NEXT EXACT</p>
                    <div className="space-y-1.5">
                      {upcoming.map((asp) => {
                        const tColor = PLANET_COLORS[asp.transitPlanet] ?? "#64748b";
                        const cfg = ASPECT_CONFIG[asp.type];
                        const days = asp.daysToExact ?? 0;
                        return (
                          <div key={`${asp.transitPlanet}-${asp.type}-${asp.natalPlanet}`}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}
                          >
                            <span className="text-sm" style={{ color: tColor }}>{PLANET_SYMBOLS[asp.transitPlanet]}</span>
                            <span className="text-sm" style={{ color: cfg?.color ?? "#64748b" }}>{cfg?.symbol}</span>
                            <span className="text-sm" style={{ color: PLANET_COLORS[asp.natalPlanet] ?? "#64748b" }}>{PLANET_SYMBOLS[asp.natalPlanet]}</span>
                            <div className="flex-1 flex items-center justify-end gap-1">
                              {days === 0 ? (
                                <span className="text-[8px] font-black" style={{ color: "#a855f7" }}>TODAY</span>
                              ) : (
                                <>
                                  <span className="text-[9px] font-bold" style={{ color: "#22c55e" }}>{days}d</span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Ingresses */}
              <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: "thin" }}>
                <p className="text-[8px] font-bold tracking-widest mb-3" style={{ color: "#334155" }}>
                  UPCOMING INGRESSES
                </p>
                {data.ingresses.length === 0 ? (
                  <p className="text-xs" style={{ color: "#334155" }}>None found in range</p>
                ) : (
                  <div className="space-y-2">
                    {data.ingresses.map((ing, i) => (
                      <IngressCard key={`${ing.planet}-${ing.date}`} ingress={ing} index={i} />
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
