"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { ChartWheel } from "@/components/chart/ChartWheel";
import { PositionsTable } from "@/components/chart/PositionsTable";
import { HousesTable } from "@/components/chart/HousesTable";
import { AspectsTable } from "@/components/chart/AspectsTable";
import { ChartSummaryBar } from "@/components/chart/ChartSummaryBar";
import { SolarSystemOrrery } from "@/components/three/SolarSystemOrrery";
import type { ChartData, PlanetName, ZodiacSign } from "@/lib/astrology/types";
import { PLANET_SYMBOLS, ZODIAC_SIGNS, SIGN_SYMBOLS, TRADITIONAL_RULERS, DOMICILE } from "@/lib/astrology/types";
import { getActiveProfileId, getProfile, getCachedChart, setCachedChart } from "@/lib/storage";
import { useWarpTo } from "@/components/ui/WarpTransition";
import { getStarConjunctions } from "@/lib/astrology/fixedStars";

type Tab = "ORRERY" | "WHEEL" | "POSITIONS" | "HOUSES" | "ASPECTS" | "GRID" | "WEB" | "LOTS" | "DISP" | "STARS" | "PATTERNS";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "ORRERY",
    label: "3D",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="10" cy="10" r="8" />
        <ellipse cx="10" cy="10" rx="8" ry="3.5" />
        <line x1="10" y1="2" x2="10" y2="18" />
      </svg>
    ),
  },
  {
    id: "WHEEL",
    label: "Wheel",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="10" cy="10" r="8" /><circle cx="10" cy="10" r="3" />
        <line x1="10" y1="2" x2="10" y2="7" /><line x1="10" y1="13" x2="10" y2="18" />
        <line x1="2" y1="10" x2="7" y2="10" /><line x1="13" y1="10" x2="18" y2="10" />
      </svg>
    ),
  },
  {
    id: "POSITIONS",
    label: "Positions",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M3 5h14M3 10h14M3 15h8" />
      </svg>
    ),
  },
  {
    id: "HOUSES",
    label: "Houses",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M3 7.5L10 3l7 4.5V17H3V7.5z" />
        <path d="M8 17v-5h4v5" />
      </svg>
    ),
  },
  {
    id: "ASPECTS",
    label: "Aspects",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="4" cy="4" r="2" /><circle cx="16" cy="4" r="2" />
        <circle cx="10" cy="16" r="2" />
        <line x1="6" y1="4" x2="14" y2="4" />
        <line x1="5" y1="6" x2="9" y2="14" />
        <line x1="15" y1="6" x2="11" y2="14" />
      </svg>
    ),
  },
  {
    id: "GRID",
    label: "Grid",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M3 3h5v5H3zM3 12h5v5H3zM12 3h5v5h-5zM12 12h5v5h-5z" />
      </svg>
    ),
  },
  {
    id: "WEB",
    label: "Web",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="10" cy="10" r="8" />
        <circle cx="10" cy="10" r="2" />
        <line x1="3" y1="5" x2="17" y2="15" />
        <line x1="3" y1="15" x2="17" y2="5" />
        <line x1="10" y1="2" x2="10" y2="18" />
      </svg>
    ),
  },
  {
    id: "LOTS",
    label: "Lots",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="10" cy="10" r="7" />
        <circle cx="10" cy="10" r="2" />
        <path d="M10 3v4M10 13v4M3 10h4M13 10h4" />
        <circle cx="10" cy="10" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "DISP",
    label: "Disp",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="10" cy="4" r="2" />
        <circle cx="4" cy="14" r="2" />
        <circle cx="16" cy="14" r="2" />
        <path d="M10 6v3M10 9l-4 3M10 9l4 3" />
      </svg>
    ),
  },
  {
    id: "STARS",
    label: "Stars",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <polygon points="10,2 12.2,7.6 18,8.2 13.8,12 15.3,18 10,14.8 4.7,18 6.2,12 2,8.2 7.8,7.6" />
      </svg>
    ),
  },
  {
    id: "PATTERNS",
    label: "Patterns",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <polygon points="10,3 17,7 17,13 10,17 3,13 3,7" />
        <circle cx="10" cy="10" r="2" />
      </svg>
    ),
  },
];

// â”€â”€â”€ Aspect Web â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ASPECT_WEB_COLORS: Record<string, string> = {
  conjunction: "#a78bfa", opposition: "#ef4444", trine: "#22c55e",
  square: "#f97316", sextile: "#06b6d4", quincunx: "#94a3b8",
};
const PLANET_WEB_COLORS: Partial<Record<PlanetName, string>> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#8b5cf6",
};

function AspectWeb({ chart }: { chart: ChartData }) {
  const [hoveredPlanet, setHoveredPlanet] = useState<PlanetName | null>(null);
  const [activeTypes, setActiveTypes] = useState(new Set(
    ["conjunction", "opposition", "trine", "square", "sextile", "quincunx"]
  ));

  const planets = chart.planets.slice(0, 10);
  const CX = 220, CY = 220, R = 160, LABEL_R = 185;
  const GLYPH_R = 200;

  // Place each planet at its ecliptic longitude on the ring
  const lonToAngle = (lon: number) => (lon / 360) * 2 * Math.PI - Math.PI / 2;

  const planetPos = planets.map(p => {
    const a = lonToAngle(p.longitude);
    return {
      planet: p,
      x: CX + R * Math.cos(a),
      y: CY + R * Math.sin(a),
      lx: CX + LABEL_R * Math.cos(a),
      ly: CY + LABEL_R * Math.sin(a),
      gx: CX + GLYPH_R * Math.cos(a),
      gy: CY + GLYPH_R * Math.sin(a),
    };
  });

  const toggleType = (t: string) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  const visibleAspects = chart.aspects.filter(a =>
    activeTypes.has(a.type) &&
    (hoveredPlanet === null || a.planet1 === hoveredPlanet || a.planet2 === hoveredPlanet)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col overflow-hidden"
    >
      {/* Controls */}
      <div className="flex-shrink-0 flex items-center gap-2 px-6 py-3 flex-wrap"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <span className="text-[13px] font-bold tracking-widest mr-2" style={{ color: "#334155" }}>SHOW</span>
        {Object.entries(ASPECT_WEB_COLORS).map(([type, color]) => (
          <motion.button
            key={type}
            whileTap={{ scale: 0.92 }}
            onClick={() => toggleType(type)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] font-bold cursor-pointer transition-all"
            style={{
              background: activeTypes.has(type) ? `${color}18` : "rgba(255,255,255,0.03)",
              border: `1px solid ${activeTypes.has(type) ? color + "40" : "rgba(255,255,255,0.06)"}`,
              color: activeTypes.has(type) ? color : "#334155",
            }}
          >
            {ASPECT_GLYPHS_GRID[type]}
            <span className="capitalize">{type.substring(0, 4)}</span>
          </motion.button>
        ))}
        {hoveredPlanet && (
          <span className="ml-auto text-[13px] font-bold" style={{ color: PLANET_WEB_COLORS[hoveredPlanet] ?? "#94a3b8" }}>
            {PLANET_SYMBOLS[hoveredPlanet]} {hoveredPlanet} aspects
          </span>
        )}
      </div>

      {/* SVG */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <svg
          width={440} height={440}
          viewBox="0 0 440 440"
          style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto" }}
        >
          <defs>
            <filter id="webGlow">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(99,102,241,0.04)" />
              <stop offset="100%" stopColor="rgba(0,0,15,0)" />
            </radialGradient>
          </defs>

          {/* Background */}
          <circle cx={CX} cy={CY} r={R + 30} fill="url(#bgGrad)" />

          {/* Zodiac ring */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth={1} />
          <circle cx={CX} cy={CY} r={R - 8} fill="none" stroke="rgba(99,102,241,0.05)" strokeWidth={0.5} />

          {/* 30Â° zodiac division ticks */}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
            const ix = CX + (R - 4) * Math.cos(a);
            const iy = CY + (R - 4) * Math.sin(a);
            const ox = CX + (R + 4) * Math.cos(a);
            const oy = CY + (R + 4) * Math.sin(a);
            return <line key={i} x1={ix} y1={iy} x2={ox} y2={oy} stroke="rgba(99,102,241,0.2)" strokeWidth={0.8} />;
          })}

          {/* Aspect lines */}
          <AnimatePresence>
            {visibleAspects.map((asp, i) => {
              const p1 = planetPos.find(p => p.planet.name === asp.planet1);
              const p2 = planetPos.find(p => p.planet.name === asp.planet2);
              if (!p1 || !p2) return null;
              const color = ASPECT_WEB_COLORS[asp.type] ?? "#64748b";
              const isHighlighted = hoveredPlanet && (asp.planet1 === hoveredPlanet || asp.planet2 === hoveredPlanet);
              return (
                <motion.line
                  key={`${asp.planet1}-${asp.type}-${asp.planet2}`}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={color}
                  strokeWidth={asp.exact ? 2 : isHighlighted ? 1.5 : 0.8}
                  strokeOpacity={hoveredPlanet ? (isHighlighted ? 0.9 : 0.08) : (asp.exact ? 0.9 : 0.5)}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.01 }}
                  filter={isHighlighted || asp.exact ? "url(#webGlow)" : undefined}
                />
              );
            })}
          </AnimatePresence>

          {/* Planet dots + glyphs */}
          {planetPos.map(({ planet, x, y, gx, gy }) => {
            const color = PLANET_WEB_COLORS[planet.name as PlanetName] ?? "#94a3b8";
            const isHov = hoveredPlanet === planet.name;
            return (
              <g key={planet.name}
                onMouseEnter={() => setHoveredPlanet(planet.name as PlanetName)}
                onMouseLeave={() => setHoveredPlanet(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Glow ring on hover */}
                {isHov && (
                  <circle cx={x} cy={y} r={12} fill={`${color}20`} stroke={color} strokeWidth={1}
                    style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
                )}
                {/* Planet dot */}
                <circle cx={x} cy={y} r={isHov ? 6 : 4}
                  fill={color}
                  style={{ filter: isHov ? `drop-shadow(0 0 8px ${color})` : undefined }}
                />
                {/* Glyph */}
                <text x={gx} y={gy} textAnchor="middle" dominantBaseline="central"
                  fontSize={isHov ? 16 : 13} fill={color}
                  style={{ userSelect: "none", filter: isHov ? `drop-shadow(0 0 6px ${color})` : undefined }}
                >
                  {PLANET_SYMBOLS[planet.name as PlanetName] ?? "Â·"}
                </text>
                {/* Retrograde marker */}
                {planet.retrograde && (
                  <text x={gx + 8} y={gy - 6} fontSize={7} fill="#f97316" textAnchor="middle">â„ž</text>
                )}
              </g>
            );
          })}

          {/* Center label */}
          <text x={CX} y={CY - 8} textAnchor="middle" fontSize={10} fill="#334155" letterSpacing={2} fontWeight="bold">
            NATAL
          </text>
          <text x={CX} y={CY + 8} textAnchor="middle" fontSize={8} fill="#1e293b" letterSpacing={1}>
            ASPECT WEB
          </text>
        </svg>
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Aspectarian Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ASPECT_GLYPHS_GRID: Record<string, string> = {
  conjunction: "â˜Œ", opposition: "â˜", trine: "â–³", square: "â–¡", sextile: "âš¹", quincunx: "âš»",
};
const ASPECT_COLORS_GRID: Record<string, string> = {
  conjunction: "#a78bfa", opposition: "#ef4444", trine: "#22c55e",
  square: "#f97316", sextile: "#06b6d4", quincunx: "#94a3b8",
};
const PLANET_COLORS_GRID: Partial<Record<PlanetName, string>> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#8b5cf6",
};

function AspectarianGrid({ chart }: { chart: ChartData }) {
  const [hovered, setHovered] = useState<{ r: number; c: number } | null>(null);
  const planets = chart.planets.slice(0, 10);

  // Build lookup map: "planet1:planet2" â†’ aspect
  const aspectMap = new Map<string, typeof chart.aspects[number]>();
  for (const asp of chart.aspects) {
    aspectMap.set(`${asp.planet1}:${asp.planet2}`, asp);
    aspectMap.set(`${asp.planet2}:${asp.planet1}`, asp);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-auto p-6"
    >
      <div className="mb-4">
        <p className="text-[13px] font-bold tracking-widest" style={{ color: "#64748b" }}>ASPECTARIAN â€” NATAL ASPECT MATRIX</p>
        <p className="text-[14px] mt-1" style={{ color: "#334155" }}>Upper triangle Â· Hover for orb detail</p>
      </div>

      <div className="overflow-auto">
        <table style={{ borderCollapse: "collapse", minWidth: "max-content" }}>
          <thead>
            <tr>
              {/* empty corner */}
              <th style={{ width: 36, height: 36 }} />
              {planets.map((p) => (
                <th key={p.name} style={{ width: 48, height: 36, textAlign: "center", paddingBottom: 6 }}>
                  <div className="flex flex-col items-center gap-0.5">
                    <span style={{ fontSize: 16, color: PLANET_COLORS_GRID[p.name] ?? "#94a3b8", lineHeight: 1 }}>
                      {PLANET_SYMBOLS[p.name]}
                    </span>
                    <span style={{ fontSize: 6, color: "#334155", letterSpacing: 1, fontWeight: "bold" }}>
                      {p.name.substring(0, 3).toUpperCase()}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {planets.map((rowPlanet, ri) => (
              <tr key={rowPlanet.name}>
                {/* Row header */}
                <td style={{ paddingRight: 8, textAlign: "right" }}>
                  <div className="flex flex-col items-end gap-0.5">
                    <span style={{ fontSize: 16, color: PLANET_COLORS_GRID[rowPlanet.name] ?? "#94a3b8", lineHeight: 1 }}>
                      {PLANET_SYMBOLS[rowPlanet.name]}
                    </span>
                    <span style={{ fontSize: 6, color: "#334155", letterSpacing: 1, fontWeight: "bold" }}>
                      {rowPlanet.name.substring(0, 3).toUpperCase()}
                    </span>
                  </div>
                </td>

                {planets.map((colPlanet, ci) => {
                  const isUpperTriangle = ci > ri;
                  const isDiagonal = ci === ri;
                  const isHov = hovered?.r === ri && hovered?.c === ci;

                  if (isDiagonal) {
                    // Diagonal: show sign + degree
                    return (
                      <td key={colPlanet.name} style={{ width: 48, height: 44, textAlign: "center", padding: 2 }}>
                        <div
                          className="rounded-lg flex flex-col items-center justify-center"
                          style={{
                            width: 44, height: 40, margin: "auto",
                            background: `${PLANET_COLORS_GRID[rowPlanet.name] ?? "#94a3b8"}12`,
                            border: `1px solid ${PLANET_COLORS_GRID[rowPlanet.name] ?? "#94a3b8"}25`,
                          }}
                        >
                          <span style={{ fontSize: 9, color: PLANET_COLORS_GRID[rowPlanet.name] ?? "#94a3b8", fontWeight: "bold" }}>
                            {rowPlanet.signDegree.toFixed(0)}Â°
                          </span>
                          <span style={{ fontSize: 8, color: "#334155" }}>
                            H{rowPlanet.house}
                          </span>
                        </div>
                      </td>
                    );
                  }

                  if (!isUpperTriangle) {
                    // Lower triangle: empty / mirror
                    return (
                      <td key={colPlanet.name} style={{ width: 48, height: 44, textAlign: "center", padding: 2 }}>
                        <div style={{ width: 44, height: 40, margin: "auto", opacity: 0.15 }}>
                          {/* Mirror the aspect from upper triangle */}
                          {(() => {
                            const asp = aspectMap.get(`${rowPlanet.name}:${colPlanet.name}`);
                            if (!asp) return null;
                            const color = ASPECT_COLORS_GRID[asp.type] ?? "#94a3b8";
                            return (
                              <div className="flex items-center justify-center h-full">
                                <span style={{ fontSize: 14, color }}>{ASPECT_GLYPHS_GRID[asp.type] ?? "Â·"}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                    );
                  }

                  // Upper triangle: show aspect
                  const asp = aspectMap.get(`${rowPlanet.name}:${colPlanet.name}`);
                  if (!asp) {
                    return (
                      <td key={colPlanet.name} style={{ width: 48, height: 44, textAlign: "center", padding: 2 }}>
                        <div
                          className="rounded-lg flex items-center justify-center"
                          style={{ width: 44, height: 40, margin: "auto", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)" }}
                        >
                          <span style={{ fontSize: 9, color: "#1e293b" }}>â€“</span>
                        </div>
                      </td>
                    );
                  }

                  const color = ASPECT_COLORS_GRID[asp.type] ?? "#94a3b8";

                  return (
                    <td key={colPlanet.name} style={{ width: 48, height: 44, textAlign: "center", padding: 2 }}>
                      <motion.div
                        onMouseEnter={() => setHovered({ r: ri, c: ci })}
                        onMouseLeave={() => setHovered(null)}
                        className="rounded-lg flex flex-col items-center justify-center cursor-default"
                        style={{
                          width: 44, height: 40, margin: "auto",
                          background: isHov ? `${color}20` : `${color}09`,
                          border: `1px solid ${color}${isHov ? "50" : "20"}`,
                          boxShadow: isHov ? `0 0 12px ${color}30` : "none",
                          transition: "all 0.15s",
                        }}
                      >
                        <span style={{ fontSize: 14, lineHeight: 1, color }}>{ASPECT_GLYPHS_GRID[asp.type] ?? "?"}</span>
                        <span style={{ fontSize: 7, color: isHov ? color : "#334155", fontWeight: "bold", marginTop: 1 }}>
                          {asp.orb.toFixed(1)}Â°
                          {asp.exact && " âœ“"}
                        </span>
                        {isHov && (
                          <motion.span
                            initial={{ opacity: 0, y: -2 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ fontSize: 6, color: "#475569", letterSpacing: 0.5, fontWeight: "bold" }}
                          >
                            {asp.applying ? "APPL" : "SEP"}
                          </motion.span>
                        )}
                      </motion.div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4">
        {Object.entries(ASPECT_GLYPHS_GRID).map(([type, glyph]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span style={{ fontSize: 14, color: ASPECT_COLORS_GRID[type] }}>{glyph}</span>
            <span style={{ fontSize: 9, color: "#334155", textTransform: "capitalize" }}>{type}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 9, color: "#22c55e", fontWeight: "bold" }}>âœ“</span>
          <span style={{ fontSize: 9, color: "#334155" }}>exact (&lt;1Â°)</span>
        </div>
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Dispositor Tree â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DISP_PLANET_COLORS: Partial<Record<PlanetName, string>> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#8b5cf6",
};

function buildDispositorTree(chart: ChartData) {
  const planets = chart.planets.slice(0, 10);
  const planetsByName = new Map<PlanetName, typeof planets[number]>();
  planets.forEach(p => planetsByName.set(p.name, p));

  const dispositorOf = (p: typeof planets[number]): PlanetName => {
    return TRADITIONAL_RULERS[p.sign];
  };

  // Build chains
  const chains = new Map<PlanetName, PlanetName>();
  planets.forEach(p => { chains.set(p.name, dispositorOf(p)); });

  // Find mutual receptions: A disposits B AND B disposits A
  const mutualReceptions: [PlanetName, PlanetName][] = [];
  const seen = new Set<string>();
  planets.forEach(a => {
    const bName = chains.get(a.name);
    if (!bName) return;
    const bRules = chains.get(bName);
    if (bRules === a.name && bName !== a.name) {
      const key = [a.name, bName].sort().join(":");
      if (!seen.has(key)) { seen.add(key); mutualReceptions.push([a.name, bName]); }
    }
  });

  // Self-dispositing planets (in own sign)
  const selfDispositors = planets.filter(p => {
    const domiciles = DOMICILE[p.name] ?? [];
    return domiciles.includes(p.sign as ZodiacSign);
  });

  // Find final dispositor(s): planets that are self-dispositing
  const selfNames = new Set(selfDispositors.map(p => p.name));

  // Trace each planet's chain to end
  const getChain = (start: PlanetName, depth = 0): PlanetName[] => {
    if (depth > 12) return [start];
    const next = chains.get(start);
    if (!next || next === start || selfNames.has(start)) return [start];
    if (selfNames.has(next)) return [start, next];
    return [start, ...getChain(next, depth + 1)];
  };

  return { chains, mutualReceptions, selfDispositors, selfNames, getChain, planets, planetsByName };
}

function DispositorTree({ chart }: { chart: ChartData }) {
  const [hovered, setHovered] = useState<PlanetName | null>(null);
  const { chains, mutualReceptions, selfDispositors, selfNames, getChain, planets } = buildDispositorTree(chart);

  // Layout: arrange planets in 2 rows of 5, compute SVG coords
  const W = 560, H = 340;
  const cols = 5;
  const rowGap = 140;
  const colGap = W / (cols + 1);

  const planetCoords = new Map<PlanetName, { x: number; y: number }>();
  planets.forEach((p, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    planetCoords.set(p.name, {
      x: colGap * (col + 1),
      y: 70 + row * rowGap,
    });
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col min-h-0 overflow-auto p-6"
    >
      <div className="mb-5">
        <p className="text-[13px] font-bold tracking-widest mb-1" style={{ color: "#475569" }}>
          DISPOSITOR TREE â€” TRADITIONAL RULERSHIP CHAINS
        </p>
        <p className="text-[14px] leading-relaxed" style={{ color: "#334155" }}>
          Each planet is ruled by the lord of its sign, forming chains that lead to self-dispositing planets (shown in gold). Mutual receptions are highlighted.
        </p>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {selfDispositors.map(p => {
          const color = DISP_PLANET_COLORS[p.name] ?? "#94a3b8";
          return (
            <div key={p.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[14px] font-bold"
              style={{ background: `${color}18`, border: `1px solid ${color}35`, color }}>
              <span style={{ fontSize: 14 }}>{PLANET_SYMBOLS[p.name]}</span>
              {p.name} â€” self-dispositing in {p.sign}
            </div>
          );
        })}
        {mutualReceptions.map(([a, b]) => {
          const ac = DISP_PLANET_COLORS[a] ?? "#94a3b8";
          const bc = DISP_PLANET_COLORS[b] ?? "#94a3b8";
          return (
            <div key={`${a}${b}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[14px] font-bold"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8" }}>
              <span style={{ color: ac }}>{PLANET_SYMBOLS[a]}</span>
              â‡„
              <span style={{ color: bc }}>{PLANET_SYMBOLS[b]}</span>
              mutual reception
            </div>
          );
        })}
      </div>

      {/* SVG tree */}
      <div className="flex items-start justify-center">
        <svg
          width={W} height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ maxWidth: "100%", overflow: "visible" }}
        >
          {/* Dispositor arrows */}
          {planets.map(p => {
            const from = planetCoords.get(p.name);
            const toName = chains.get(p.name);
            if (!from || !toName || toName === p.name) return null;
            const to = planetCoords.get(toName);
            if (!to) return null;

            const isMutual = mutualReceptions.some(([a, b]) => (a === p.name && b === toName) || (b === p.name && a === toName));
            const isHovPath = hovered === p.name || hovered === toName;
            const color = isMutual ? "#818cf8" : DISP_PLANET_COLORS[p.name] ?? "#475569";

            // Curved path
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2 - 20;
            const d = `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;

            return (
              <g key={`${p.name}-arrow`}>
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHovPath ? 1.8 : 1}
                  strokeOpacity={isHovPath ? 0.9 : isMutual ? 0.6 : 0.3}
                  strokeDasharray={isMutual ? "none" : undefined}
                  markerEnd={`url(#arr-${p.name})`}
                  style={{ transition: "all 0.15s" }}
                />
                <defs>
                  <marker id={`arr-${p.name}`} markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill={color} fillOpacity={isHovPath ? 0.9 : 0.4} />
                  </marker>
                </defs>
              </g>
            );
          })}

          {/* Planet nodes */}
          {planets.map(p => {
            const pos = planetCoords.get(p.name);
            if (!pos) return null;
            const color = DISP_PLANET_COLORS[p.name] ?? "#94a3b8";
            const isSelf = selfNames.has(p.name);
            const isHov = hovered === p.name;
            const signColor = color;

            return (
              <g key={p.name}
                onMouseEnter={() => setHovered(p.name)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "default" }}
              >
                {/* Outer ring for self-dispositing */}
                {isSelf && (
                  <circle cx={pos.x} cy={pos.y} r={30}
                    fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.5}
                    strokeDasharray="3 2"
                    style={{ filter: `drop-shadow(0 0 8px ${color})` }}
                  />
                )}
                {/* Hover halo */}
                {isHov && <circle cx={pos.x} cy={pos.y} r={26} fill={`${color}14`} />}
                {/* Background circle */}
                <circle cx={pos.x} cy={pos.y} r={22}
                  fill={isHov ? `${color}22` : `${color}10`}
                  stroke={color}
                  strokeWidth={isHov ? 1.5 : isSelf ? 1 : 0.6}
                  strokeOpacity={isHov ? 1 : isSelf ? 0.9 : 0.4}
                  style={{ transition: "all 0.15s" }}
                />
                {/* Planet glyph */}
                <text x={pos.x} y={pos.y - 2} textAnchor="middle" dominantBaseline="central"
                  fontSize={20} fill={color}
                  style={{ filter: isSelf ? `drop-shadow(0 0 6px ${color})` : undefined, userSelect: "none" }}
                >
                  {PLANET_SYMBOLS[p.name] ?? "Â·"}
                </text>
                {/* Planet name */}
                <text x={pos.x} y={pos.y + 14} textAnchor="middle" fontSize={7}
                  fill={isHov ? color : "#475569"} letterSpacing={0.5} fontWeight="bold"
                  style={{ userSelect: "none", transition: "fill 0.15s" }}
                >
                  {p.name.substring(0, 3).toUpperCase()}
                </text>
                {/* Sign under name */}
                <text x={pos.x} y={pos.y + 23} textAnchor="middle" fontSize={8}
                  fill={isHov ? signColor : "#334155"}
                  style={{ userSelect: "none", transition: "fill 0.15s" }}
                >
                  {SIGN_SYMBOLS[p.sign]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover detail */}
      <AnimatePresence>
        {hovered && (() => {
          const p = planets.find(pl => pl.name === hovered);
          if (!p) return null;
          const disp = chains.get(hovered);
          const chain = getChain(hovered);
          const color = DISP_PLANET_COLORS[hovered] ?? "#94a3b8";
          return (
            <motion.div
              key={hovered}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="mt-4 rounded-2xl px-5 py-4"
              style={{ background: `${color}0d`, border: `1px solid ${color}25` }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span style={{ fontSize: 22, color }}>{PLANET_SYMBOLS[hovered]}</span>
                <p className="text-[14px] font-bold" style={{ color }}>{hovered} in {p.sign}</p>
                {selfNames.has(hovered) && (
                  <span className="text-[13px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${color}20`, color }}>SELF-DISPOSITING âœ¦</span>
                )}
              </div>
              <p className="text-[14px]" style={{ color: "#64748b" }}>
                Chain: {chain.map(n => {
                  const pc = DISP_PLANET_COLORS[n] ?? "#94a3b8";
                  return `${PLANET_SYMBOLS[n]} ${n}`;
                }).join(" â†’ ")}
                {selfNames.has(chain[chain.length - 1]) ? " (final dispositor)" : ""}
              </p>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap gap-4 text-[13px]" style={{ color: "#334155" }}>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-px" style={{ background: "#fbbf24", opacity: 0.6 }} />
          Arrow = "ruled by" direction
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full border border-dashed" style={{ borderColor: "#fbbf24" }} />
          Dashed ring = self-dispositing
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-px" style={{ background: "#818cf8" }} />
          Purple = mutual reception
        </div>
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Fixed Stars Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MAGNITUDE_COLORS = [
  { max: 0,   color: "#fbbf24", label: "1st mag" },
  { max: 1.5, color: "#f59e0b", label: "2nd mag" },
  { max: 2.5, color: "#94a3b8", label: "3rd mag" },
  { max: 10,  color: "#475569", label: "4th mag" },
];

function magColor(mag: number): string {
  return MAGNITUDE_COLORS.find(m => mag <= m.max)?.color ?? "#475569";
}

const FS_PLANET_COLORS: Partial<Record<PlanetName, string>> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#8b5cf6",
  NorthNode: "#64748b", Chiron: "#6366f1",
};

function FixedStarsPanel({ chart }: { chart: ChartData }) {
  const [hoveredStar, setHoveredStar] = useState<string | null>(null);

  // Collect all conjunctions: planet â†’ stars
  const conjunctions = chart.planets.map(p => ({
    planet: p,
    stars: getStarConjunctions(p.longitude, 1.5),
  })).filter(r => r.stars.length > 0);

  // Also check ASC and MC
  const angles = [
    { label: "ASC", lon: chart.houses[0]?.longitude },
    { label: "MC",  lon: chart.houses[9]?.longitude },
  ].filter(a => a.lon !== undefined).map(a => ({
    label: a.label,
    lon: a.lon!,
    stars: getStarConjunctions(a.lon!, 1.5),
  })).filter(r => r.stars.length > 0);

  const totalConjunctions = conjunctions.reduce((s, r) => s + r.stars.length, 0) +
    angles.reduce((s, a) => s + a.stars.length, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full overflow-y-auto px-6 py-5"
      style={{ scrollbarWidth: "thin" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[13px] font-bold tracking-widest" style={{ color: "#fbbf24" }}>
            FIXED STARS â€” NATAL CONJUNCTIONS
          </p>
          <p className="text-[13px] mt-0.5" style={{ color: "#334155" }}>
            Stars within 1Â°30â€² of natal planets and angles Â· Traditional Hellenistic interpretation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: totalConjunctions > 0 ? "#fbbf24" : "#334155" }}>
            {totalConjunctions}
          </span>
          <span className="text-[13px] font-bold tracking-widest" style={{ color: "#475569" }}>
            CONJUNCTIONS
          </span>
        </div>
      </div>

      {totalConjunctions === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-3xl" style={{ color: "#1e293b" }}>âœ¦</span>
          <p className="text-[14px]" style={{ color: "#334155" }}>No fixed star conjunctions within 1Â°30â€²</p>
          <p className="text-[13px]" style={{ color: "#1e293b" }}>Your chart has rare planetary freedom from stellar influence</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Planet conjunctions */}
          {conjunctions.map(({ planet, stars }) => {
            const pColor = FS_PLANET_COLORS[planet.name] ?? "#94a3b8";
            return (
              <motion.div
                key={planet.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${pColor}20`, background: `${pColor}06` }}
              >
                {/* Planet header */}
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${pColor}12` }}>
                  <span className="text-xl" style={{ color: pColor }}>{PLANET_SYMBOLS[planet.name]}</span>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold" style={{ color: pColor }}>
                      {planet.name} Â· {planet.signDegree.toFixed(1)}Â° {planet.sign}
                      {planet.retrograde ? " â„ž" : ""}
                    </p>
                    <p className="text-[13px]" style={{ color: "#475569" }}>
                      House {planet.house} Â· {planet.dignity && planet.dignity !== "peregrine" ? planet.dignity : "peregrine"}
                    </p>
                  </div>
                  <span className="text-[13px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${pColor}15`, color: pColor }}>
                    {stars.length} star{stars.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Stars */}
                <div className="divide-y" style={{ borderColor: `${pColor}08` }}>
                  {stars.map(star => {
                    const orb = (() => {
                      const n = ((planet.longitude % 360) + 360) % 360;
                      const d = Math.abs(n - star.longitude);
                      return Math.min(d, 360 - d);
                    })();
                    const sColor = magColor(star.magnitude);
                    const isHov = hoveredStar === `${planet.name}:${star.name}`;

                    return (
                      <motion.div
                        key={star.name}
                        onMouseEnter={() => setHoveredStar(`${planet.name}:${star.name}`)}
                        onMouseLeave={() => setHoveredStar(null)}
                        className="px-4 py-3 cursor-default"
                        style={{ background: isHov ? `${sColor}0a` : "transparent", transition: "background 0.15s" }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Star glyph */}
                          <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-10 pt-0.5">
                            <span style={{ color: sColor, fontSize: 16 }}>âœ¦</span>
                            <span className="text-[14px] font-mono" style={{ color: "#334155" }}>
                              {orb.toFixed(1)}Â°
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="text-[13px] font-bold" style={{ color: sColor }}>{star.name}</span>
                              <span className="text-[13px] font-medium px-1.5 py-0.5 rounded"
                                style={{ background: "rgba(255,255,255,0.04)", color: "#475569" }}>
                                {star.nature}
                              </span>
                              <span className="text-[14px] tracking-widest font-bold" style={{ color: "#334155" }}>
                                {star.magnitude < 0 ? "" : star.magnitude < 1.5 ? "1st mag" : star.magnitude < 2.5 ? "2nd mag" : "3rd mag"}
                              </span>
                            </div>
                            <p className="text-[13px] font-medium mb-1" style={{ color: "#64748b" }}>
                              {star.keywords}
                            </p>
                            <p className="text-[13px] leading-relaxed" style={{ color: "#475569" }}>
                              {star.interpretation}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}

          {/* Angle conjunctions */}
          {angles.map(({ label, lon, stars }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(6,182,212,0.2)", background: "rgba(6,182,212,0.04)" }}
            >
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(6,182,212,0.1)" }}>
                <span className="text-[14px] font-bold" style={{ color: "#06b6d4" }}>{label}</span>
                <p className="text-[13px] flex-1" style={{ color: "#475569" }}>
                  {(lon % 30).toFixed(1)}Â° {ZODIAC_SIGNS[Math.floor(((lon % 360) + 360) % 360 / 30)]}
                </p>
                <span className="text-[13px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(6,182,212,0.12)", color: "#06b6d4" }}>
                  {stars.length} star{stars.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(6,182,212,0.06)" }}>
                {stars.map(star => {
                  const diff = Math.abs(((lon % 360) + 360) % 360 - star.longitude);
                  const orb = Math.min(diff, 360 - diff);
                  const sColor = magColor(star.magnitude);
                  return (
                    <div key={star.name} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-10 pt-0.5">
                          <span style={{ color: sColor, fontSize: 16 }}>âœ¦</span>
                          <span className="text-[14px] font-mono" style={{ color: "#334155" }}>{orb.toFixed(1)}Â°</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-[13px] font-bold" style={{ color: sColor }}>{star.name}</span>
                            <span className="text-[13px] px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(255,255,255,0.04)", color: "#475569" }}>
                              {star.nature}
                            </span>
                          </div>
                          <p className="text-[13px] font-medium mb-1" style={{ color: "#64748b" }}>{star.keywords}</p>
                          <p className="text-[13px] leading-relaxed" style={{ color: "#475569" }}>{star.interpretation}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {/* Magnitude legend */}
          <div className="flex items-center gap-4 pt-2 pb-4">
            <span className="text-[14px] tracking-widest font-bold" style={{ color: "#1e293b" }}>MAGNITUDE</span>
            {MAGNITUDE_COLORS.slice(0, 3).map(m => (
              <div key={m.label} className="flex items-center gap-1.5">
                <span style={{ color: m.color, fontSize: 13 }}>âœ¦</span>
                <span className="text-[14px]" style={{ color: "#334155" }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// â”€â”€â”€ Arabic Lots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const LOT_META = [
  { key: "fortune",   name: "Fortune",    symbol: "âŠ•", color: "#fbbf24", description: "Material life, body, wealth & luck. The Moon's lot â€” shows where material blessings flow." },
  { key: "spirit",    name: "Spirit",     symbol: "âŠ—", color: "#a78bfa", description: "Soul, mind & agency. The Sun's lot â€” shows where you exert will and achieve through action." },
  { key: "eros",      name: "Eros",       symbol: "â™¡", color: "#f472b6", description: "Desire & longing. What the heart pursues â€” the objects of deep attraction." },
  { key: "necessity", name: "Necessity",  symbol: "âŠ˜", color: "#94a3b8", description: "Compulsion & constraint. Where unavoidable obligations and fated bonds arise." },
  { key: "courage",   name: "Courage",    symbol: "âš”", color: "#ef4444", description: "Boldness & enterprise. Where you can overcome fear and achieve through action." },
  { key: "victory",   name: "Victory",    symbol: "âœ¦", color: "#f59e0b", description: "Honor & achievement. Where fortunate outcomes and recognition are most accessible." },
  { key: "nemesis",   name: "Nemesis",    symbol: "âš–", color: "#64748b", description: "Debt & retribution. What cannot be escaped â€” fate's balancing force in your life." },
] as const;

function lonToLotSign(lon: number): { sign: string; sigSym: string; signDeg: number } {
  const idx = Math.floor(((lon % 360) + 360) % 360 / 30);
  const sign = ZODIAC_SIGNS[idx];
  return { sign, sigSym: SIGN_SYMBOLS[sign] ?? "", signDeg: ((lon % 360) + 360) % 360 % 30 };
}

function lonToHouse(lon: number, houses: { longitude: number }[]): number {
  const norm = ((lon % 360) + 360) % 360;
  for (let i = 0; i < houses.length; i++) {
    const cA = houses[i].longitude;
    const cB = houses[(i + 1) % 12].longitude;
    if (cA <= cB) {
      if (norm >= cA && norm < cB) return i + 1;
    } else {
      if (norm >= cA || norm < cB) return i + 1;
    }
  }
  return 1;
}

function calcLot(asc: number, a: number, b: number): number {
  return ((asc + a - b) % 360 + 360) % 360;
}

// â”€â”€â”€ Chart Patterns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PAT_PLANET_COLORS: Partial<Record<PlanetName, string>> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#8b5cf6", NorthNode: "#64748b",
};
const PAT_ASPECT_COLORS: Record<string, string> = {
  conjunction: "#a78bfa", opposition: "#ef4444", trine: "#22c55e",
  square: "#f97316", sextile: "#06b6d4", quincunx: "#94a3b8",
};

interface ChartShape {
  name: string;
  glyph: string;
  color: string;
  desc: string;
  keyword: string;
}

function detectChartShape(chart: ChartData): ChartShape {
  const lons = chart.planets
    .filter(p => ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"].includes(p.name))
    .map(p => p.longitude)
    .sort((a, b) => a - b);

  if (lons.length < 7) return { name: "Unknown", glyph: "â—Œ", color: "#334155", desc: "", keyword: "" };

  // Find the largest gap between adjacent planets (including wrap-around)
  let maxGap = 0;
  let maxGapStart = lons[lons.length - 1];
  for (let i = 0; i < lons.length; i++) {
    const next = lons[(i + 1) % lons.length];
    const gap = ((next - lons[i] + 360) % 360);
    if (gap > maxGap) { maxGap = gap; maxGapStart = lons[i]; }
  }

  // Second largest gap
  const gaps = lons.map((lon, i) => ((lons[(i + 1) % lons.length] - lon + 360) % 360)).sort((a, b) => b - a);

  // Occupied arc = 360 - maxGap
  const occupiedArc = 360 - maxGap;

  // Bundle: all within 120Â°
  if (occupiedArc <= 120) {
    return { name: "Bundle", glyph: "â—‰", color: "#a78bfa", keyword: "Concentrated",
      desc: "All planets occupy a narrow 120Â° arc, creating an intensely focused personality with exceptional depth in specific areas â€” and potential blind spots elsewhere." };
  }

  // Bowl: all within 180Â° (one full empty hemisphere)
  if (occupiedArc <= 180) {
    // Bucket: one planet on the opposite side (handle)
    const handle = chart.planets.find(p => {
      const lon = p.longitude;
      // Check if this planet is separated from the main group by > 60Â° on each side
      const distFromGroup = Math.min(((lon - maxGapStart + 360) % 360), ((maxGapStart - lon + 360) % 360));
      return distFromGroup > 60;
    });
    if (!handle) {
      return { name: "Bowl", glyph: "âŒ£", color: "#06b6d4", keyword: "Purposeful",
        desc: "All planets occupy one hemisphere, giving a clear sense of direction and self-containment. The native is oriented toward a specific half of life's experience." };
    }
  }

  // Check for Bucket explicitly (handle planet across from a bowl)
  // Locomotive: all within 240Â°
  if (occupiedArc <= 240) {
    return { name: "Locomotive", glyph: "âŸ¶", color: "#f59e0b", keyword: "Driven",
      desc: "Planets span 240Â° with a 120Â° empty trine. The empty house area represents the locomotive's direction of travel â€” where the native drives their energy." };
  }

  // Seesaw: two opposing clusters with two gaps of roughly 60Â°+
  if (gaps[1] >= 60) {
    return { name: "Seesaw", glyph: "â‡Œ", color: "#f472b6", keyword: "Polarized",
      desc: "Two distinct planetary clusters in opposition create constant balancing of competing life demands, perspectives, and roles. Great skill in navigating duality." };
  }

  // Splay: three or more distinct clusters (3 gaps of 40Â°+)
  if (gaps[2] >= 40) {
    return { name: "Splay", glyph: "âœ³", color: "#22c55e", keyword: "Independent",
      desc: "Three or more planetary clusters form a splay, reflecting a strongly individualistic, non-conformist nature that resists systematic categorization." };
  }

  // Splash: planets spread widely around the wheel
  return { name: "Splash", glyph: "âœ¦", color: "#94a3b8", keyword: "Universal",
    desc: "Planets are distributed relatively evenly across the chart. The native has broad interests, many life areas of equal importance, and a universal, adaptable nature." };
}

interface ChartPattern {
  name: string;
  glyph: string;
  color: string;
  rarity: "Common" | "Uncommon" | "Rare" | "Very Rare";
  planets: PlanetName[];
  desc: string;
}

function detectPatterns(chart: ChartData): ChartPattern[] {
  const patterns: ChartPattern[] = [];
  const planets = chart.planets.filter(p =>
    ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"].includes(p.name)
  );
  const asp = chart.aspects;

  const hasAsp = (a: PlanetName, b: PlanetName, type: string, maxOrb = 8) =>
    asp.some(x =>
      ((x.planet1 === a && x.planet2 === b) || (x.planet1 === b && x.planet2 === a)) &&
      x.type === type && x.orb <= maxOrb
    );

  // â”€â”€ Stellium: 3+ planets in same sign
  const bySign: Partial<Record<ZodiacSign, PlanetName[]>> = {};
  for (const p of planets) {
    bySign[p.sign] = [...(bySign[p.sign] ?? []), p.name as PlanetName];
  }
  for (const [sign, ps] of Object.entries(bySign)) {
    if (ps && ps.length >= 3) {
      patterns.push({
        name: `Stellium in ${sign}`,
        glyph: "âœ¦",
        color: "#a78bfa",
        rarity: ps.length >= 4 ? "Very Rare" : "Uncommon",
        planets: ps,
        desc: `${ps.length} planets in ${sign} create a concentrated, intense focus on the themes of that sign and house. This is one of the most powerful chart signatures.`,
      });
    }
  }

  // â”€â”€ Grand Trine: three planets all trine each other
  const ps = planets.map(p => p.name as PlanetName);
  for (let i = 0; i < ps.length - 2; i++) {
    for (let j = i + 1; j < ps.length - 1; j++) {
      for (let k = j + 1; k < ps.length; k++) {
        if (hasAsp(ps[i], ps[j], "trine", 7) && hasAsp(ps[j], ps[k], "trine", 7) && hasAsp(ps[i], ps[k], "trine", 7)) {
          const trioSigns = [planets.find(p => p.name === ps[i])?.sign, planets.find(p => p.name === ps[j])?.sign, planets.find(p => p.name === ps[k])?.sign];
          const element = trioSigns.every(s => s && ["Aries","Leo","Sagittarius"].includes(s)) ? "Fire"
            : trioSigns.every(s => s && ["Taurus","Virgo","Capricorn"].includes(s)) ? "Earth"
            : trioSigns.every(s => s && ["Gemini","Libra","Aquarius"].includes(s)) ? "Air"
            : trioSigns.every(s => s && ["Cancer","Scorpio","Pisces"].includes(s)) ? "Water" : "Mixed";
          patterns.push({
            name: `Grand ${element} Trine`,
            glyph: "â–³",
            color: "#22c55e",
            rarity: "Rare",
            planets: [ps[i], ps[j], ps[k]],
            desc: `Three planets in harmonious trine form a self-contained circuit of ease and talent. The ${element} element themes flow naturally, but can need a challenge to activate fully.`,
          });
        }
      }
    }
  }

  // â”€â”€ T-Square: two planets in opposition, both square a third
  for (let i = 0; i < ps.length - 2; i++) {
    for (let j = i + 1; j < ps.length - 1; j++) {
      if (!hasAsp(ps[i], ps[j], "opposition", 8)) continue;
      for (let k = 0; k < ps.length; k++) {
        if (k === i || k === j) continue;
        if (hasAsp(ps[i], ps[k], "square", 7) && hasAsp(ps[j], ps[k], "square", 7)) {
          patterns.push({
            name: "T-Square",
            glyph: "â–¡",
            color: "#f97316",
            rarity: "Uncommon",
            planets: [ps[i], ps[j], ps[k]],
            desc: `Intense pressure funnels through ${ps[k]}, the focal planet. This pattern drives achievement through repeated friction â€” the apex planet ${ps[k]} must be actively developed.`,
          });
          break;
        }
      }
    }
  }

  // â”€â”€ Grand Cross: two pairs of opposing planets, all square each other
  for (let a = 0; a < ps.length - 3; a++) {
    for (let b = a + 1; b < ps.length - 2; b++) {
      if (!hasAsp(ps[a], ps[b], "opposition", 8)) continue;
      for (let c = b + 1; c < ps.length - 1; c++) {
        for (let d = c + 1; d < ps.length; d++) {
          if (!hasAsp(ps[c], ps[d], "opposition", 8)) continue;
          if (hasAsp(ps[a], ps[c], "square", 7) && hasAsp(ps[a], ps[d], "square", 7) &&
              hasAsp(ps[b], ps[c], "square", 7) && hasAsp(ps[b], ps[d], "square", 7)) {
            patterns.push({
              name: "Grand Cross",
              glyph: "âœ›",
              color: "#ef4444",
              rarity: "Very Rare",
              planets: [ps[a], ps[b], ps[c], ps[d]],
              desc: "Four planets form a cross of tension and drive. Natives with grand crosses possess enormous stamina and capability â€” they are built for major challenges.",
            });
          }
        }
      }
    }
  }

  // â”€â”€ Yod (Finger of God): two sextile planets both quincunx a third
  for (let i = 0; i < ps.length - 2; i++) {
    for (let j = i + 1; j < ps.length - 1; j++) {
      if (!hasAsp(ps[i], ps[j], "sextile", 5)) continue;
      for (let k = 0; k < ps.length; k++) {
        if (k === i || k === j) continue;
        if (hasAsp(ps[i], ps[k], "quincunx", 3) && hasAsp(ps[j], ps[k], "quincunx", 3)) {
          patterns.push({
            name: "Yod â€” Finger of God",
            glyph: "â–½",
            color: "#8b5cf6",
            rarity: "Rare",
            planets: [ps[i], ps[j], ps[k]],
            desc: `${ps[k]} is the apex of a fated configuration. Yods indicate a persistent calling that resists ordinary solution â€” ${ps[k]}'s themes recur until consciously integrated.`,
          });
          break;
        }
      }
    }
  }

  // â”€â”€ Mystic Rectangle: two oppositions connected by trines and sextiles
  for (let a = 0; a < ps.length - 3; a++) {
    for (let b = a + 1; b < ps.length - 2; b++) {
      if (!hasAsp(ps[a], ps[b], "opposition", 7)) continue;
      for (let c = b + 1; c < ps.length - 1; c++) {
        for (let d = c + 1; d < ps.length; d++) {
          if (!hasAsp(ps[c], ps[d], "opposition", 7)) continue;
          const sides = [
            hasAsp(ps[a], ps[c], "trine", 6) && hasAsp(ps[b], ps[d], "trine", 6) && hasAsp(ps[a], ps[d], "sextile", 5) && hasAsp(ps[b], ps[c], "sextile", 5),
            hasAsp(ps[a], ps[d], "trine", 6) && hasAsp(ps[b], ps[c], "trine", 6) && hasAsp(ps[a], ps[c], "sextile", 5) && hasAsp(ps[b], ps[d], "sextile", 5),
          ];
          if (sides[0] || sides[1]) {
            patterns.push({
              name: "Mystic Rectangle",
              glyph: "â¬¡",
              color: "#06b6d4",
              rarity: "Very Rare",
              planets: [ps[a], ps[b], ps[c], ps[d]],
              desc: "A rare and powerful configuration combining harmonious and dynamic tension. The native has exceptional ability to synthesize opposing forces into creative output.",
            });
          }
        }
      }
    }
  }

  // Deduplicate by name (keep first occurrence)
  const seen = new Set<string>();
  return patterns.filter(p => {
    const key = p.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const RARITY_COLORS: Record<string, string> = {
  "Common": "#475569",
  "Uncommon": "#06b6d4",
  "Rare": "#a78bfa",
  "Very Rare": "#f59e0b",
};

function ChartPatterns({ chart }: { chart: ChartData }) {
  const patterns = detectPatterns(chart);
  const shape = detectChartShape(chart);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full overflow-y-auto px-6 py-5"
      style={{ scrollbarWidth: "thin" }}
    >
      {/* Chart Shape */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 mb-5"
        style={{ background: `${shape.color}0a`, border: `1px solid ${shape.color}22` }}
      >
        <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#334155" }}>
          CHART SHAPE â€” JONES PATTERN
        </p>
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${shape.color}14`, border: `1px solid ${shape.color}30`, fontSize: "1.6rem", color: shape.color, filter: `drop-shadow(0 0 8px ${shape.color}50)` }}
          >
            {shape.glyph}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-base font-bold" style={{ color: "#e2e8f0", fontFamily: "'Space Grotesk', sans-serif" }}>{shape.name}</p>
              <span className="text-[14px] font-bold tracking-widest px-1.5 py-0.5 rounded" style={{ background: `${shape.color}15`, color: shape.color }}>{shape.keyword}</span>
            </div>
            <p className="text-[14px] leading-relaxed" style={{ color: "#64748b" }}>{shape.desc}</p>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[13px] font-bold tracking-widest" style={{ color: "#a78bfa" }}>
            ASPECT CONFIGURATIONS
          </p>
          <p className="text-[13px] mt-0.5" style={{ color: "#334155" }}>
            Stelliums, Grand Trines, T-Squares, Yods, Grand Crosses, Mystic Rectangles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: patterns.length > 0 ? "#a78bfa" : "#334155" }}>
            {patterns.length}
          </span>
          <span className="text-[13px] font-bold tracking-widest" style={{ color: "#475569" }}>
            PATTERNS
          </span>
        </div>
      </div>

      {patterns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="text-4xl" style={{ color: "#1e293b" }}>â—‹</div>
          <p className="text-[14px]" style={{ color: "#334155" }}>No major chart patterns detected.</p>
          <p className="text-[13px] text-center" style={{ color: "#1e293b", maxWidth: "28ch" }}>
            This is common. A chart without major configurations can still be deeply complex through sign, house, and dignity placement.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {patterns.map((pattern, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl p-5"
              style={{
                background: `${pattern.color}08`,
                border: `1px solid ${pattern.color}20`,
              }}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: "1.6rem", color: pattern.color, filter: `drop-shadow(0 0 8px ${pattern.color}80)` }}>
                    {pattern.glyph}
                  </span>
                  <div>
                    <p className="text-[14px] font-bold" style={{ color: "#e2e8f0", fontFamily: "'Space Grotesk', sans-serif" }}>
                      {pattern.name}
                    </p>
                    <span
                      className="text-[14px] font-bold tracking-widest px-1.5 py-0.5 rounded"
                      style={{ background: `${RARITY_COLORS[pattern.rarity]}15`, color: RARITY_COLORS[pattern.rarity] }}
                    >
                      {pattern.rarity.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Planets involved */}
              <div className="flex flex-wrap gap-2 mb-3">
                {pattern.planets.map((pName, pi) => (
                  <span
                    key={pi}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] font-semibold"
                    style={{
                      background: `${PAT_PLANET_COLORS[pName] ?? "#94a3b8"}12`,
                      border: `1px solid ${PAT_PLANET_COLORS[pName] ?? "#94a3b8"}28`,
                      color: PAT_PLANET_COLORS[pName] ?? "#94a3b8",
                    }}
                  >
                    {PLANET_SYMBOLS[pName]} {pName}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p className="text-[14px] leading-relaxed" style={{ color: "#64748b" }}>{pattern.desc}</p>
            </motion.div>
          ))}

          {/* Pattern glossary */}
          <div className="rounded-xl p-4 mt-2" style={{ background: "rgba(4,4,28,0.5)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <p className="text-[14px] font-bold tracking-widest mb-3" style={{ color: "#334155" }}>PATTERN GUIDE</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {[
                { glyph: "âœ¦", name: "Stellium", rarity: "Uncommon" },
                { glyph: "â–³", name: "Grand Trine", rarity: "Rare" },
                { glyph: "â–¡", name: "T-Square", rarity: "Uncommon" },
                { glyph: "âœ›", name: "Grand Cross", rarity: "Very Rare" },
                { glyph: "â–½", name: "Yod", rarity: "Rare" },
                { glyph: "â¬¡", name: "Mystic Rectangle", rarity: "Very Rare" },
              ].map(g => (
                <div key={g.name} className="flex items-center gap-2">
                  <span style={{ fontSize: 11, color: "#334155" }}>{g.glyph}</span>
                  <span style={{ fontSize: 9, color: "#475569" }}>{g.name}</span>
                  <span className="ml-auto text-[14px]" style={{ color: RARITY_COLORS[g.rarity] }}>{g.rarity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ArabicLots({ chart }: { chart: ChartData }) {
  const asc     = chart.houses[0].longitude;
  const venus   = chart.planets.find(p => p.name === "Venus")?.longitude ?? 0;
  const mercury = chart.planets.find(p => p.name === "Mercury")?.longitude ?? 0;
  const mars    = chart.planets.find(p => p.name === "Mars")?.longitude ?? 0;
  const jupiter = chart.planets.find(p => p.name === "Jupiter")?.longitude ?? 0;
  const saturn  = chart.planets.find(p => p.name === "Saturn")?.longitude ?? 0;
  const fortune = chart.lotOfFortune;
  const spirit  = chart.lotOfSpirit;
  const isDay   = chart.sect === "day";

  const lots = [
    { ...LOT_META[0], lon: fortune },
    { ...LOT_META[1], lon: spirit },
    { ...LOT_META[2], lon: isDay ? calcLot(asc, venus, spirit) : calcLot(asc, spirit, venus) },
    { ...LOT_META[3], lon: calcLot(asc, mercury, fortune) },
    { ...LOT_META[4], lon: calcLot(asc, mars, fortune) },
    { ...LOT_META[5], lon: calcLot(asc, jupiter, spirit) },
    { ...LOT_META[6], lon: calcLot(asc, fortune, saturn) },
  ].map(l => ({
    ...l,
    ...lonToLotSign(l.lon),
    house: lonToHouse(l.lon, chart.houses),
  }));

  const [selected, setSelected] = useState<string | null>(null);
  const selectedLot = lots.find(l => l.key === selected);

  // Mini zodiac ring: 260Ã—260, R=100
  const CX = 130, CY = 130, R = 90, LABEL_R = 115;
  const lonToAngle = (lon: number) => (((lon % 360) + 360) % 360 / 360) * 2 * Math.PI - Math.PI / 2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex min-h-0 overflow-hidden"
    >
      {/* Left: Lots table */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-6 py-5">
        <div className="mb-5">
          <p className="text-[13px] font-bold tracking-widest mb-1" style={{ color: "#475569" }}>ARABIC LOTS Â· HERMETIC LOTS</p>
          <p className="text-[14px] leading-relaxed" style={{ color: "#334155" }}>
            Sensitive points derived from three chart factors â€” each amplifies a specific life domain.
            Sect determines Fortune/Spirit orientation: {isDay ? "Day chart â€” Fortune leads." : "Night chart â€” Fortune and Spirit swap."}
          </p>
        </div>

        <div className="space-y-1.5">
          {lots.map((lot, i) => (
            <motion.div
              key={lot.key}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setSelected(lot.key === selected ? null : lot.key)}
              className="rounded-xl cursor-pointer transition-all duration-150"
              style={{
                padding: "10px 14px",
                background: selected === lot.key ? `${lot.color}12` : "rgba(255,255,255,0.025)",
                border: `1px solid ${selected === lot.key ? lot.color + "35" : "rgba(255,255,255,0.05)"}`,
              }}
            >
              <div className="flex items-center gap-3">
                {/* Symbol */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base font-bold"
                  style={{ background: `${lot.color}15`, color: lot.color, border: `1px solid ${lot.color}30` }}
                >
                  {lot.symbol}
                </div>

                {/* Name + position */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-bold" style={{ color: "#e2e8f0" }}>Lot of {lot.name}</span>
                    <span className="text-[14px] font-mono" style={{ color: "#475569" }}>{lot.signDeg.toFixed(1)}Â°</span>
                    <span className="text-[13px]" style={{ color: lot.color }}>{lot.sigSym}</span>
                    <span className="text-[14px]" style={{ color: "#64748b" }}>{lot.sign}</span>
                    <span className="text-[13px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>H{lot.house}</span>
                  </div>
                  <AnimatePresence>
                    {selected === lot.key && (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="text-[14px] leading-relaxed overflow-hidden"
                        style={{ color: "#64748b" }}
                      >
                        {lot.description}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Longitude */}
                <span className="text-[13px] font-mono flex-shrink-0" style={{ color: "#334155" }}>
                  {lot.lon.toFixed(2)}Â°
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Formula reference */}
        <div className="mt-6 rounded-xl p-4" style={{ background: "rgba(4,4,28,0.5)", border: "1px solid rgba(99,102,241,0.1)" }}>
          <p className="text-[13px] font-bold tracking-widest mb-2" style={{ color: "#334155" }}>FORMULAE ({isDay ? "DAY SECT" : "NIGHT SECT"})</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {[
              ["Fortune", isDay ? "ASC + â˜½ âˆ’ â˜‰" : "ASC + â˜‰ âˆ’ â˜½"],
              ["Spirit",  isDay ? "ASC + â˜‰ âˆ’ â˜½" : "ASC + â˜½ âˆ’ â˜‰"],
              ["Eros",    isDay ? "ASC + â™€ âˆ’ Spirit" : "ASC + Spirit âˆ’ â™€"],
              ["Necessity","ASC + â˜¿ âˆ’ Fortune"],
              ["Courage", "ASC + â™‚ âˆ’ Fortune"],
              ["Victory", "ASC + â™ƒ âˆ’ Spirit"],
              ["Nemesis", "ASC + Fortune âˆ’ â™„"],
            ].map(([name, formula]) => (
              <div key={name} className="flex items-center gap-1">
                <span className="text-[13px] font-bold w-20" style={{ color: "#475569" }}>{name}</span>
                <span className="text-[13px] font-mono" style={{ color: "#334155" }}>{formula}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Zodiac ring mini-map */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center w-72 border-l" style={{ borderColor: "rgba(99,102,241,0.1)" }}>
        <p className="text-[13px] font-bold tracking-widest mb-4" style={{ color: "#334155" }}>LOT POSITIONS</p>
        <svg width={260} height={260} viewBox="0 0 260 260">
          {/* Zodiac ring */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(99,102,241,0.12)" strokeWidth={1} />
          {/* 30Â° division ticks */}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
            return (
              <g key={i}>
                <line
                  x1={CX + (R - 5) * Math.cos(a)} y1={CY + (R - 5) * Math.sin(a)}
                  x2={CX + (R + 5) * Math.cos(a)} y2={CY + (R + 5) * Math.sin(a)}
                  stroke="rgba(99,102,241,0.2)" strokeWidth={0.8}
                />
                <text
                  x={CX + (R + 16) * Math.cos(a)} y={CY + (R + 16) * Math.sin(a)}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={7} fill="rgba(99,102,241,0.4)"
                >
                  {SIGN_SYMBOLS[ZODIAC_SIGNS[i]] ?? ""}
                </text>
              </g>
            );
          })}
          {/* Ascendant marker */}
          {(() => {
            const a = lonToAngle(asc);
            return (
              <line
                x1={CX + (R - 12) * Math.cos(a)} y1={CY + (R - 12) * Math.sin(a)}
                x2={CX + (R + 8) * Math.cos(a)} y2={CY + (R + 8) * Math.sin(a)}
                stroke="rgba(6,182,212,0.5)" strokeWidth={2} strokeLinecap="round"
              />
            );
          })()}
          <text x={CX + (R + 26) * Math.cos(lonToAngle(asc))} y={CY + (R + 26) * Math.sin(lonToAngle(asc))}
            textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="rgba(6,182,212,0.6)">ASC</text>
          {/* Lot points */}
          {lots.map(lot => {
            const a = lonToAngle(lot.lon);
            const x = CX + R * Math.cos(a);
            const y = CY + R * Math.sin(a);
            const lx = CX + LABEL_R * Math.cos(a);
            const ly = CY + LABEL_R * Math.sin(a);
            const isActive = selected === lot.key || selected === null;
            return (
              <g key={lot.key} style={{ cursor: "pointer" }}
                onClick={() => setSelected(lot.key === selected ? null : lot.key)}>
                <circle cx={x} cy={y} r={selected === lot.key ? 7 : 5}
                  fill={lot.color} fillOpacity={isActive ? (selected === lot.key ? 1 : 0.7) : 0.2}
                  style={{ filter: selected === lot.key ? `drop-shadow(0 0 6px ${lot.color})` : "none" }}
                />
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                  fontSize={selected === lot.key ? 8 : 7}
                  fill={isActive ? lot.color : "rgba(255,255,255,0.15)"} fontWeight="bold">
                  {lot.symbol}
                </text>
              </g>
            );
          })}
          {/* Center label */}
          {selectedLot ? (
            <>
              <text x={CX} y={CY - 8} textAnchor="middle" fontSize={18} fill={selectedLot.color}>{selectedLot.symbol}</text>
              <text x={CX} y={CY + 10} textAnchor="middle" fontSize={8} fill={selectedLot.color}>{selectedLot.name}</text>
              <text x={CX} y={CY + 22} textAnchor="middle" fontSize={7} fill="#475569">{selectedLot.sign} H{selectedLot.house}</text>
            </>
          ) : (
            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="rgba(99,102,241,0.2)">CLICK TO EXPLORE</text>
          )}
        </svg>
      </div>
    </motion.div>
  );
}

export default function ChartPage() {
  const warpTo = useWarpTo();
  const [chart, setChart] = useState<ChartData | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("ORRERY");
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetName | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [splitView, setSplitView] = useState(false);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setLoading(false); return; }
    const profile = getProfile(id);
    if (!profile) { setLoading(false); return; }

    setProfileId(id);
    setProfileName(profile.name);

    const cached = getCachedChart(id);
    if (cached) {
      setChart(cached);
      setLoading(false);
    } else {
      fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
          latitude: profile.latitude,
          longitude: profile.longitude,
          timezone: profile.timezone,
          houseSystem: profile.houseSystem,
        }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) { setCachedChart(id, data); setChart(data); } })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  const handleHouseSystemChange = async (hs: string) => {
    if (!profileId || !chart || chart.houseSystem === hs) return;
    const profile = getProfile(profileId);
    if (!profile) return;
    setRecalculating(true);
    try {
      const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
          latitude: profile.latitude,
          longitude: profile.longitude,
          timezone: profile.timezone,
          houseSystem: hs,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCachedChart(profileId, data);
        setChart(data);
      }
    } finally {
      setRecalculating(false);
    }
  };

  // Sync planet selection to Aspects tab if switching
  const handleSelectPlanet = (name: PlanetName | null) => {
    setSelectedPlanet(name);
    if (name && activeTab === "HOUSES") setActiveTab("POSITIONS");
  };

  const handleSelectHouse = (h: number | null) => {
    setSelectedHouse(h);
    if (h && activeTab === "POSITIONS") setActiveTab("HOUSES");
  };

  if (!loading && !profileId) {
    return (
      <div className="h-screen flex overflow-hidden">
        <DashboardBg />
        <div className="nebula-orb" style={{ width: 500, height: 500, left: "20%", top: "5%", background: "rgba(124,58,237,0.07)", filter: "blur(100px)" }} />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 md:ml-[68px] mb-[60px] md:mb-0 px-6">
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-18 h-18 rounded-2xl flex items-center justify-center"
            style={{
              width: 72, height: 72,
              background: "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(6,182,212,0.14))",
              border: "1px solid rgba(124,58,237,0.35)",
              boxShadow: "0 0 48px rgba(124,58,237,0.18)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.4" style={{ width: 36, height: 36 }}>
              <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
              <line x1="12" y1="3" x2="12" y2="9" /><line x1="12" y1="15" x2="12" y2="21" />
              <line x1="3" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="21" y2="12" />
            </svg>
          </motion.div>
          <div className="text-center">
            <p className="text-[14px] font-bold tracking-[0.2em] mb-2" style={{ color: "#334155" }}>NO CHART DATA</p>
            <h2 className="text-base font-bold mb-2" style={{ color: "#e2e8f0", fontFamily: "'Space Grotesk', sans-serif" }}>
              Cosmic instruments standing by.
            </h2>
            <p className="text-[14px] max-w-xs mx-auto" style={{ color: "#475569" }}>
              Enter your birth data to unlock your natal chart and all its layers.
            </p>
          </div>
          <Link href="/onboarding">
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: "0 0 32px rgba(124,58,237,0.45)" }}
              whileTap={{ scale: 0.96 }}
              className="px-7 py-3 rounded-xl text-[14px] font-bold tracking-wider cursor-pointer"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white", border: "1px solid rgba(124,58,237,0.4)" }}
            >
              Begin Your Chart â†’
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <DashboardBg />

      {/* Ambient orbs */}
      <div className="nebula-orb" style={{ width:500, height:500, left:"25%", top:"5%", background:"rgba(124,58,237,0.07)", filter:"blur(100px)" }} />
      <div className="nebula-orb" style={{ width:400, height:400, right:"5%", bottom:"10%", background:"rgba(6,182,212,0.05)", filter:"blur(80px)" }} />


      <div className="flex-1 flex flex-col min-h-0 min-w-0 md:ml-[68px] mb-[60px] md:mb-0 relative z-10 overflow-x-hidden">

        {/* Top nav bar */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 flex items-center justify-between px-6 py-3"
          style={{ borderBottom: "1px solid rgba(99,102,241,0.1)", background: "rgba(2,2,18,0.7)", backdropFilter: "blur(20px)" }}
        >
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <motion.button
                whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer transition-colors duration-200"
                style={{ color: "#64748b" }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
                Dashboard
              </motion.button>
            </Link>
            <span style={{ color: "#1e293b" }}>/</span>
            <span className="text-[13px] font-bold tracking-widest gradient-text">NATAL CHART</span>
            {profileName && (
              <>
                <span style={{ color: "#1e293b" }}>/</span>
                <span className="text-[13px] font-medium" style={{ color: "#64748b" }}>{profileName}</span>
              </>
            )}
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1">
            {TABS.map(tab => (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-bold tracking-wide cursor-pointer transition-all duration-200"
                style={{
                  background: activeTab === tab.id ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.03)",
                  border: activeTab === tab.id ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.06)",
                  color: activeTab === tab.id ? "#c4b5fd" : "#64748b",
                }}
              >
                {tab.icon}
                {tab.label}
              </motion.button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Export chart SVG */}
            {chart && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const svg = document.querySelector(".chart-wheel-export");
                  if (!svg) {
                    setActiveTab("WHEEL");
                    setTimeout(() => {
                      const s = document.querySelector(".chart-wheel-export");
                      if (!s) return;
                      const blob = new Blob([s.outerHTML], { type: "image/svg+xml" });
                      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                      a.download = "cosmora-natal-chart.svg"; a.click();
                    }, 400);
                    return;
                  }
                  const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                  a.download = "cosmora-natal-chart.svg"; a.click();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium cursor-pointer transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#64748b" }}
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                  <path d="M10 3v10M6 9l4 4 4-4" />
                  <path d="M4 15h12" />
                </svg>
                Export
              </motion.button>
            )}

            {/* Split view toggle (wheel + table) */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSplitView(s => !s)}
              disabled={activeTab === "WHEEL" || activeTab === "ORRERY"}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13px] font-medium cursor-pointer transition-all duration-200 disabled:opacity-30"
              style={{
                background: splitView ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.03)",
                border: splitView ? "1px solid rgba(6,182,212,0.3)" : "1px solid rgba(255,255,255,0.06)",
                color: splitView ? "#06b6d4" : "#64748b",
              }}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <rect x="2" y="2" width="7" height="16" rx="1" /><rect x="11" y="2" width="7" height="16" rx="1" />
              </svg>
              Split
            </motion.button>
          </div>
        </motion.div>

        {/* Summary bar */}
        {chart && (
          <ChartSummaryBar
            chart={chart}
            profileName={profileName}
            onHouseSystemChange={handleHouseSystemChange}
            recalculating={recalculating}
          />
        )}

        {/* Main content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 rounded-full border-2 border-t-transparent"
              style={{ borderColor: "#7c3aed" }}
            />
            <p className="text-[13px] tracking-widest" style={{ color: "#475569" }}>LOADING CHART DATA</p>
          </div>
        ) : !chart ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-[14px]" style={{ color: "#64748b" }}>Chart not found.</p>
              <Link href="/onboarding">
                <button className="px-4 py-2 rounded-xl text-[13px] font-bold cursor-pointer"
                  style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}>
                  Create Profile
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0 overflow-hidden">

            {/* 3D ORRERY panel */}
            <AnimatePresence>
              {activeTab === "ORRERY" && (
                <motion.div
                  key="orrery-panel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex-1 relative"
                >
                  <SolarSystemOrrery
                    chart={chart}
                    onPlanetNavigate={(name) => warpTo("/dashboard/chart/" + name.toLowerCase())}
                    style={{ height: "100%" }}
                  />
                  {/* Hint */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 }}
                    className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-[14px] font-bold tracking-widest"
                    style={{ background: "rgba(4,4,28,0.75)", border: "1px solid rgba(99,102,241,0.2)", color: "#475569", backdropFilter: "blur(12px)", pointerEvents: "none", whiteSpace: "nowrap" }}
                  >
                    DRAG TO ORBIT Â· SCROLL TO ZOOM Â· CLICK PLANET TO EXPLORE
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SPLIT: Wheel panel */}
            <AnimatePresence>
              {(activeTab === "WHEEL" || splitView) && (
                <motion.div
                  key="wheel-panel"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: activeTab === "WHEEL" ? "100%" : "45%" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-center overflow-visible relative"
                  style={{
                    borderRight: splitView && activeTab !== "WHEEL" ? "1px solid rgba(99,102,241,0.15)" : "none",
                  }}
                >
                  {recalculating ? (
                    <div className="flex flex-col items-center gap-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 rounded-full border-2 border-t-transparent"
                        style={{ borderColor: "#7c3aed" }}
                      />
                      <p className="text-[13px] tracking-widest" style={{ color: "#475569" }}>RECALCULATING</p>
                    </div>
                  ) : (
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <ChartWheel
                        size={splitView ? 380 : 500}
                        interactive
                        chart={chart}
                        onPlanetClick={(name) => warpTo("/dashboard/chart/" + name.toLowerCase())}
                      />
                    </motion.div>
                  )}

                  {/* Planet detail card on select */}
                  <AnimatePresence>
                    {selectedPlanet && activeTab === "WHEEL" && (() => {
                      const p = chart.planets.find(pl => pl.name === selectedPlanet);
                      if (!p) return null;
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl"
                          style={{
                            background: "rgba(4,4,32,0.95)",
                            border: "1px solid rgba(124,58,237,0.3)",
                            backdropFilter: "blur(20px)",
                            minWidth: 260,
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[14px] font-bold" style={{ color: "#e2e8f0" }}>
                              {p.name} {p.retrograde ? "â„ž" : ""}
                            </span>
                            <button onClick={() => setSelectedPlanet(null)}
                              className="text-[13px] cursor-pointer" style={{ color: "#475569" }}>Ã—</button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: "SIGN", value: `${p.signDegree.toFixed(0)}Â° ${p.sign}` },
                              { label: "HOUSE", value: `House ${p.house}` },
                              { label: "DIGNITY", value: p.dignity ?? "â€”" },
                            ].map(item => (
                              <div key={item.label}>
                                <p className="text-[13px] tracking-widest" style={{ color: "#475569" }}>{item.label}</p>
                                <p className="text-[13px] font-semibold capitalize" style={{ color: "#c4b5fd" }}>{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Table panel */}
            <AnimatePresence>
              {activeTab !== "WHEEL" && activeTab !== "ORRERY" && (
                <motion.div
                  key="table-panel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col min-h-0 overflow-hidden"
                >
                  {activeTab === "POSITIONS" && (
                    <PositionsTable
                      chart={chart}
                      selectedPlanet={selectedPlanet}
                      onSelectPlanet={handleSelectPlanet}
                      onPlanetNavigate={(name) => warpTo("/dashboard/chart/" + name.toLowerCase())}
                    />
                  )}
                  {activeTab === "HOUSES" && (
                    <HousesTable
                      chart={chart}
                      selectedHouse={selectedHouse}
                      onSelectHouse={handleSelectHouse}
                      onHouseNavigate={(n) => warpTo(`/dashboard/chart/house/${n}`)}
                    />
                  )}
                  {activeTab === "ASPECTS" && (
                    <AspectsTable
                      chart={chart}
                      selectedPlanet={selectedPlanet}
                    />
                  )}
                  {activeTab === "GRID" && (
                    <AspectarianGrid chart={chart} />
                  )}
                  {activeTab === "WEB" && (
                    <AspectWeb chart={chart} />
                  )}
                  {activeTab === "LOTS" && (
                    <ArabicLots chart={chart} />
                  )}
                  {activeTab === "DISP" && (
                    <DispositorTree chart={chart} />
                  )}
                  {activeTab === "STARS" && (
                    <FixedStarsPanel chart={chart} />
                  )}
                  {activeTab === "PATTERNS" && (
                    <ChartPatterns chart={chart} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}
      </div>
    </div>
  );
}

