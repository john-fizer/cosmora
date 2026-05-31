"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const ZODIAC_SIGNS = [
  { name: "Aries", symbol: "♈", color: "#ef4444" },
  { name: "Taurus", symbol: "♉", color: "#22c55e" },
  { name: "Gemini", symbol: "♊", color: "#eab308" },
  { name: "Cancer", symbol: "♋", color: "#a855f7" },
  { name: "Leo", symbol: "♌", color: "#f97316" },
  { name: "Virgo", symbol: "♍", color: "#6366f1" },
  { name: "Libra", symbol: "♎", color: "#ec4899" },
  { name: "Scorpio", symbol: "♏", color: "#dc2626" },
  { name: "Sagittarius", symbol: "♐", color: "#f59e0b" },
  { name: "Capricorn", symbol: "♑", color: "#64748b" },
  { name: "Aquarius", symbol: "♒", color: "#06b6d4" },
  { name: "Pisces", symbol: "♓", color: "#8b5cf6" },
];

const PLANETS = [
  { name: "Sun", symbol: "☉", angle: 135, r: 155, color: "#fbbf24" },
  { name: "Moon", symbol: "☽", angle: 200, r: 140, color: "#94a3b8" },
  { name: "Mercury", symbol: "☿", angle: 118, r: 165, color: "#a78bfa" },
  { name: "Venus", symbol: "♀", angle: 160, r: 150, color: "#f472b6" },
  { name: "Mars", symbol: "♂", angle: 78, r: 158, color: "#ef4444" },
  { name: "Jupiter", symbol: "♃", angle: 22, r: 145, color: "#f59e0b" },
  { name: "Saturn", symbol: "♄", angle: 250, r: 160, color: "#94a3b8" },
  { name: "Uranus", symbol: "♅", angle: 310, r: 152, color: "#06b6d4" },
  { name: "Neptune", symbol: "♆", angle: 340, r: 148, color: "#3b82f6" },
  { name: "Pluto", symbol: "♇", angle: 290, r: 162, color: "#8b5cf6" },
];

const ASPECTS = [
  { p1: 0, p2: 4, type: "trine", color: "#22c55e", opacity: 0.4 },
  { p1: 0, p2: 6, type: "opposition", color: "#ef4444", opacity: 0.35 },
  { p1: 1, p2: 5, type: "trine", color: "#22c55e", opacity: 0.35 },
  { p1: 2, p2: 7, type: "sextile", color: "#06b6d4", opacity: 0.35 },
  { p1: 3, p2: 8, type: "square", color: "#f59e0b", opacity: 0.3 },
  { p1: 4, p2: 9, type: "conjunction", color: "#a855f7", opacity: 0.4 },
  { p1: 0, p2: 3, type: "square", color: "#f59e0b", opacity: 0.3 },
  { p1: 1, p2: 8, type: "sextile", color: "#06b6d4", opacity: 0.3 },
];

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function polarToXY(angleDeg: number, r: number, cx = 220, cy = 220) {
  const rad = toRad(angleDeg - 90);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

import type { ChartData, PlanetName } from "@/lib/astrology/types";

interface ChartWheelProps {
  size?: number;
  interactive?: boolean;
  chart?: ChartData;
  onPlanetClick?: (name: PlanetName) => void;
}

export function ChartWheel({ size = 440, interactive = true, chart, onPlanetClick }: ChartWheelProps) {
  // Use real planet positions if available, otherwise fall back to demo positions
  const livePlanets = chart?.planets.map(p => ({
    name: p.name,
    symbol: ({ Sun:"☉", Moon:"☽", Mercury:"☿", Venus:"♀", Mars:"♂", Jupiter:"♃", Saturn:"♄", Uranus:"♅", Neptune:"♆", Pluto:"♇", NorthNode:"☊", Chiron:"⚷" })[p.name] ?? "·",
    angle: p.longitude,
    r: 140 + (Math.abs(p.house - 6) * 2),
    color: ({ Sun:"#fbbf24", Moon:"#94a3b8", Mercury:"#a78bfa", Venus:"#f472b6", Mars:"#ef4444", Jupiter:"#f59e0b", Saturn:"#94a3b8", Uranus:"#06b6d4", Neptune:"#3b82f6", Pluto:"#8b5cf6", NorthNode:"#64748b", Chiron:"#6366f1" })[p.name] ?? "#94a3b8",
  }));
  const displayPlanets = livePlanets ?? PLANETS;
  const cx = size / 2;
  const cy = size / 2;
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let raf: number;
    let start: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      setRotation(((ts - start) / 120000) * 360);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  const outerR = cx * 0.92;
  const zodiacR = cx * 0.82;
  const houseR = cx * 0.68;
  const innerR = cx * 0.28;
  const coreR = cx * 0.12;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer glow rings */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, rgba(6,182,212,0.08) 40%, transparent 70%)",
          filter: "blur(2px)",
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative z-10 chart-wheel-export"
        style={{ filter: "drop-shadow(0 0 30px rgba(124,58,237,0.5)) drop-shadow(0 0 60px rgba(6,182,212,0.2))" }}
      >
        <defs>
          {/* Radial gradient for the core */}
          <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#4f46e5" stopOpacity="0.6" />
            <stop offset="80%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00000f" stopOpacity="0" />
          </radialGradient>
          {/* Ring gradient */}
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
          </linearGradient>
          {/* Aspect glow */}
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Planet glow */}
          <filter id="planetGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer decorative ring (slow rotate) */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
          style={{ originX: `${cx}px`, originY: `${cy}px` }}
        >
          <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(124,58,237,0.25)" strokeWidth="1" />
          {Array.from({ length: 72 }).map((_, i) => {
            const a = (i * 5) - 90;
            const p1 = polarToXY(a, outerR - 3, cx, cy);
            const p2 = polarToXY(a, outerR - (i % 5 === 0 ? 10 : 5), cx, cy);
            return (
              <line
                key={i}
                x1={p1.x} y1={p1.y}
                x2={p2.x} y2={p2.y}
                stroke={i % 5 === 0 ? "rgba(124,58,237,0.6)" : "rgba(124,58,237,0.2)"}
                strokeWidth={i % 5 === 0 ? "1.5" : "0.8"}
              />
            );
          })}
        </motion.g>

        {/* Zodiac ring (counter-rotate) */}
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
          style={{ originX: `${cx}px`, originY: `${cy}px` }}
        >
          <circle cx={cx} cy={cy} r={zodiacR} fill="none" stroke="rgba(99,102,241,0.3)" strokeWidth="1" />
          <circle cx={cx} cy={cy} r={zodiacR - 28} fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="0.5" />
          {ZODIAC_SIGNS.map((sign, i) => {
            const angle = i * 30;
            const sepPt1 = polarToXY(angle, zodiacR, cx, cy);
            const sepPt2 = polarToXY(angle, zodiacR - 28, cx, cy);
            const textPt = polarToXY(angle + 15, zodiacR - 14, cx, cy);
            return (
              <g key={sign.name}>
                <line
                  x1={sepPt1.x} y1={sepPt1.y}
                  x2={sepPt2.x} y2={sepPt2.y}
                  stroke={`${sign.color}60`}
                  strokeWidth="0.8"
                />
                <text
                  x={textPt.x} y={textPt.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="13"
                  fill={sign.color}
                  opacity="0.9"
                  style={{ userSelect: "none" }}
                >
                  {sign.symbol}
                </text>
              </g>
            );
          })}
        </motion.g>

        {/* House ring */}
        <circle cx={cx} cy={cy} r={houseR} fill="rgba(4,4,32,0.4)" stroke="rgba(99,102,241,0.2)" strokeWidth="0.8" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * 30 - 90;
          const p1 = polarToXY(angle + 90, houseR, cx, cy);
          const p2 = polarToXY(angle + 90, innerR, cx, cy);
          const textPt = polarToXY(angle + 90 + 15, (houseR + innerR) / 2, cx, cy);
          return (
            <g key={i}>
              <line
                x1={p1.x} y1={p1.y}
                x2={p2.x} y2={p2.y}
                stroke="rgba(99,102,241,0.25)"
                strokeWidth="0.8"
              />
              <text
                x={textPt.x} y={textPt.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9"
                fill="rgba(148,163,184,0.6)"
                style={{ userSelect: "none" }}
              >
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* Inner circle */}
        <circle cx={cx} cy={cy} r={innerR} fill="rgba(2,2,18,0.8)" stroke="rgba(124,58,237,0.3)" strokeWidth="1" />

        {/* Aspect lines */}
        {ASPECTS.map((asp, i) => {
          const p1 = polarToXY(PLANETS[asp.p1].angle, innerR * 0.85, cx, cy);
          const p2 = polarToXY(PLANETS[asp.p2].angle, innerR * 0.85, cx, cy);
          return (
            <motion.line
              key={i}
              x1={p1.x} y1={p1.y}
              x2={p2.x} y2={p2.y}
              stroke={asp.color}
              strokeWidth="0.8"
              opacity={asp.opacity}
              filter="url(#glowFilter)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: asp.opacity }}
              transition={{ delay: i * 0.1 + 0.5, duration: 1 }}
            />
          );
        })}

        {/* Core nebula glow */}
        <motion.circle
          cx={cx} cy={cy} r={coreR * 2.5}
          fill="url(#coreGrad)"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: `${cx}px`, originY: `${cy}px` }}
        />
        <circle cx={cx} cy={cy} r={coreR} fill="rgba(124,58,237,0.6)" />
        <motion.circle
          cx={cx} cy={cy} r={coreR * 0.6}
          fill="rgba(6,182,212,0.8)"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: `${cx}px`, originY: `${cy}px` }}
        />

        {/* Axis labels */}
        {[
          { label: "ASC", angle: 180, r: houseR + 14 },
          { label: "DSC", angle: 0, r: houseR + 14 },
          { label: "MC", angle: 270, r: houseR + 14 },
          { label: "IC", angle: 90, r: houseR + 14 },
        ].map(({ label, angle, r }) => {
          const pt = polarToXY(angle, r, cx, cy);
          return (
            <text
              key={label}
              x={pt.x} y={pt.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="8"
              fontWeight="600"
              fill="rgba(168,85,247,0.9)"
              letterSpacing="1"
              style={{ userSelect: "none" }}
            >
              {label}
            </text>
          );
        })}

        {/* Planets */}
        {displayPlanets.map((planet, i) => {
          const pt = polarToXY(planet.angle, planet.r, cx, cy);
          const isHovered = hoveredPlanet === planet.name;
          return (
            <motion.g
              key={planet.name}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 + 0.3, type: "spring", stiffness: 200 }}
              style={{ cursor: (interactive || onPlanetClick) ? "pointer" : "default" }}
              onMouseEnter={() => (interactive || onPlanetClick) && setHoveredPlanet(planet.name)}
              onMouseLeave={() => setHoveredPlanet(null)}
              onClick={() => onPlanetClick?.(planet.name as PlanetName)}
            >
              {/* Planet halo */}
              <motion.circle
                cx={pt.x} cy={pt.y}
                r={isHovered ? 14 : 10}
                fill={`${planet.color}20`}
                stroke={`${planet.color}50`}
                strokeWidth="0.8"
                filter="url(#planetGlow)"
                animate={{ r: isHovered ? 14 : [10, 11, 10] }}
                transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Planet core dot */}
              <circle cx={pt.x} cy={pt.y} r="3" fill={planet.color} />
              {/* Planet symbol */}
              <text
                x={pt.x} y={pt.y - 13}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                fill={planet.color}
                opacity={isHovered ? 1 : 0.85}
                fontWeight="500"
                style={{ userSelect: "none" }}
              >
                {planet.symbol}
              </text>
            </motion.g>
          );
        })}
      </svg>

      {/* Hovered planet tooltip */}
      {hoveredPlanet && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[13px] font-medium"
          style={{
            background: "rgba(124,58,237,0.3)",
            border: "1px solid rgba(124,58,237,0.5)",
            backdropFilter: "blur(10px)",
            color: "#c4b5fd",
          }}
        >
          {hoveredPlanet}
        </motion.div>
      )}
    </div>
  );
}
