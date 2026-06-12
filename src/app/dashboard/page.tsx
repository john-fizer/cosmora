"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { ChartData, PlanetPosition, ZodiacSign, PlanetName } from "@/lib/astrology/types";
import { PLANET_SYMBOLS, SIGN_SYMBOLS } from "@/lib/astrology/types";
import { SignGlyph, PlanetGlyph } from "@/components/ui/AstroGlyph";
import type { Ingress } from "@/lib/astrology/transits";
import { getActiveProfileId, getProfile, getCachedChart, setCachedChart } from "@/lib/storage";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { LoopingVideo } from "@/components/ui/LoopingVideo";
import { useWarpTo } from "@/components/ui/WarpTransition";
import { ScanBar } from "@/components/three/HUDPanel";
import { ChatInput } from "@/components/dashboard/ChatInput";

const SolarSystemOrrery = dynamic(
  () => import("@/components/three/SolarSystemOrrery").then(m => m.SolarSystemOrrery),
  { ssr: false }
);

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PLANET_COLORS: Partial<Record<PlanetName, string>> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#8b5cf6", NorthNode: "#64748b",
};

const ASPECT_GLYPHS: Record<string, string> = {
  conjunction: "â˜Œ", opposition: "â˜", trine: "â–³", square: "â–¡", sextile: "âš¹", quincunx: "âš»",
};

const ASPECT_COLORS: Record<string, string> = {
  conjunction: "#a855f7", opposition: "#ef4444", trine: "#22c55e",
  square: "#f59e0b", sextile: "#06b6d4", quincunx: "#64748b",
};

const SIGN_COLORS: Record<ZodiacSign, string> = {
  Aries: "#ef4444", Taurus: "#22c55e", Gemini: "#eab308", Cancer: "#38bdf8",
  Leo: "#f97316", Virgo: "#4ade80", Libra: "#facc15", Scorpio: "#dc2626",
  Sagittarius: "#f59e0b", Capricorn: "#94a3b8", Aquarius: "#06b6d4", Pisces: "#8b5cf6",
};

const ELEMENT_SIGNS: Record<"Fire" | "Earth" | "Air" | "Water", ZodiacSign[]> = {
  Fire:  ["Aries","Leo","Sagittarius"],
  Earth: ["Taurus","Virgo","Capricorn"],
  Air:   ["Gemini","Libra","Aquarius"],
  Water: ["Cancer","Scorpio","Pisces"],
};
const ELEMENT_COLORS = { Fire: "#ef4444", Earth: "#22c55e", Air: "#eab308", Water: "#38bdf8" };

// â”€â”€â”€ Moon Phase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MOON_PHASES = [
  { name: "New Moon",        emoji: "ðŸŒ‘", min: 0,   max: 1.5  },
  { name: "Waxing Crescent", emoji: "ðŸŒ’", min: 1.5, max: 24   },
  { name: "First Quarter",   emoji: "ðŸŒ“", min: 24,  max: 26   },
  { name: "Waxing Gibbous",  emoji: "ðŸŒ”", min: 26,  max: 49   },
  { name: "Full Moon",       emoji: "ðŸŒ•", min: 49,  max: 51   },
  { name: "Waning Gibbous",  emoji: "ðŸŒ–", min: 51,  max: 74   },
  { name: "Last Quarter",    emoji: "ðŸŒ—", min: 74,  max: 76   },
  { name: "Waning Crescent", emoji: "ðŸŒ˜", min: 76,  max: 98.5 },
  { name: "New Moon",        emoji: "ðŸŒ‘", min: 98.5,max: 100  },
] as const;

function getMoonPhase(date: Date) {
  const SYNODIC = 29.530588853;
  const KNOWN_NEW = 2451549.75; // Jan 6, 2000 18:14 UTC
  const jd = date.getTime() / 86400000 + 2440587.5;
  const raw = ((jd - KNOWN_NEW) % SYNODIC + SYNODIC) % SYNODIC;
  const pct = (raw / SYNODIC) * 100;
  const illumination = pct <= 50 ? pct * 2 : (100 - pct) * 2;
  const phase = MOON_PHASES.find(p => pct >= p.min && pct < p.max) ?? MOON_PHASES[4];
  const daysUntilFull = pct < 50 ? ((50 - pct) / 100) * SYNODIC : ((150 - pct) / 100) * SYNODIC;
  const daysUntilNew  = pct < 100 ? ((100 - pct) / 100) * SYNODIC : 0;
  return { pct, illumination, phase, daysUntilFull: Math.abs(daysUntilFull), daysUntilNew: Math.abs(daysUntilNew) };
}

function MoonPhaseWidget() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const { pct, illumination, phase, daysUntilFull, daysUntilNew } = getMoonPhase(now);
  const isWaxing = pct < 50;

  // SVG moon: 48Ã—48, draw crescent/gibbous using overlapping circles
  const R = 20, CX = 24, CY = 24;
  // illumination 0â†’100 maps to phase shape
  // waxing: right side lit; waning: left side lit
  const lit = illumination / 100;
  // Shadow circle offset: at 0% â†’ full shadow (circle on top), at 50% â†’ edge-on, at 100% â†’ full lit
  const shadowOffsetX = isWaxing ? R * (1 - lit * 2) : R * (lit * 2 - 1);

  const nextEventDays = isWaxing ? daysUntilFull : daysUntilNew;
  const nextEventName = isWaxing ? "Full Moon" : "New Moon";

  return (
    <div className="liquid-glass-cosmos rounded-2xl p-4">
      <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#64748b" }}>MOON PHASE</p>
      <div className="flex items-center gap-3">
        {/* SVG moon glyph */}
        <svg width={48} height={48} viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
          <defs>
            <clipPath id="moonClip">
              <circle cx={CX} cy={CY} r={R} />
            </clipPath>
          </defs>
          {/* Dark base */}
          <circle cx={CX} cy={CY} r={R} fill="#0d0824" stroke="rgba(196,181,253,0.2)" strokeWidth={0.8} />
          {/* Lit portion */}
          <rect x={0} y={0} width={48} height={48} fill="rgba(196,181,253,0.85)" clipPath="url(#moonClip)" />
          {/* Shadow ellipse */}
          <ellipse
            cx={CX + shadowOffsetX} cy={CY}
            rx={R} ry={R}
            fill="#0d0824"
            clipPath="url(#moonClip)"
          />
          {/* Glow ring */}
          <circle cx={CX} cy={CY} r={R + 4} fill="none" stroke="rgba(196,181,253,0.08)" strokeWidth={4} />
        </svg>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold leading-tight" style={{ color: "#c4b5fd" }}>{phase.name}</p>
          <p className="text-[14px] mt-0.5 tabular-nums" style={{ color: "#475569" }}>
            {illumination.toFixed(0)}% illuminated Â· {isWaxing ? "Waxing" : "Waning"}
          </p>
          <div className="mt-2 flex gap-1">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${illumination}%`,
                  background: "linear-gradient(to right, rgba(196,181,253,0.4), rgba(196,181,253,0.9))",
                  boxShadow: "0 0 6px rgba(196,181,253,0.5)",
                }}
              />
            </div>
          </div>
          <p className="text-[13px] mt-1.5 tabular-nums" style={{ color: "#334155" }}>
            {nextEventName} in {nextEventDays.toFixed(1)} days
          </p>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Planetary Hour â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CHALDEAN = ["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon"] as const;
type ChaldeanPlanet = typeof CHALDEAN[number];
const CHALDEAN_COLORS: Record<ChaldeanPlanet, string> = {
  Saturn:"#94a3b8", Jupiter:"#f59e0b", Mars:"#ef4444",
  Sun:"#fbbf24", Venus:"#f472b6", Mercury:"#a78bfa", Moon:"#c4b5fd",
};
// Day of week (Sun=0..Sat=6) â†’ starting index in CHALDEAN array
const DOW_START = [3, 6, 2, 5, 1, 4, 0];

function calcSunriseSunset(lat: number, lon: number, date: Date): { rise: Date; set: Date } {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;
  const start = new Date(date.getFullYear(), 0, 0);
  const doy = Math.round((date.getTime() - start.getTime()) / 86400000);
  const decl = -23.45 * Math.cos(rad * (360 / 365) * (doy + 10));
  const cosH = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(decl * rad)) /
               (Math.cos(lat * rad) * Math.cos(decl * rad));
  const H = Math.acos(Math.max(-1, Math.min(1, cosH))) * deg / 15;
  const B = rad * (360 / 365) * (doy - 81);
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const tzOff = -date.getTimezoneOffset() / 60;
  const solarNoon = 12 - (lon - 15 * tzOff) / 15 - eot / 60;
  const toDate = (h: number) => {
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    d.setTime(d.getTime() + h * 3600000); return d;
  };
  return { rise: toDate(solarNoon - H), set: toDate(solarNoon + H) };
}

interface PlanetaryHour { planet: ChaldeanPlanet; start: Date; end: Date; isDay: boolean; }

function getPlanetaryHours(lat: number, lon: number, date: Date): PlanetaryHour[] {
  const { rise, set } = calcSunriseSunset(lat, lon, date);
  const dayMs = (set.getTime() - rise.getTime()) / 12;
  const nightMs = (86400000 - (set.getTime() - rise.getTime())) / 12;
  const startIdx = DOW_START[date.getDay()];
  const hours: PlanetaryHour[] = [];
  for (let i = 0; i < 12; i++) hours.push({
    planet: CHALDEAN[(startIdx + i) % 7],
    start: new Date(rise.getTime() + i * dayMs),
    end:   new Date(rise.getTime() + (i + 1) * dayMs),
    isDay: true,
  });
  for (let i = 0; i < 12; i++) hours.push({
    planet: CHALDEAN[(startIdx + 12 + i) % 7],
    start: new Date(set.getTime() + i * nightMs),
    end:   new Date(set.getTime() + (i + 1) * nightMs),
    isDay: false,
  });
  return hours;
}

function PlanetaryHourWidget({ lat, lon }: { lat: number; lon: number }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours = getPlanetaryHours(lat, lon, now);
  const curr = hours.find(h => now >= h.start && now < h.end);
  if (!curr) return null;

  const progress = (now.getTime() - curr.start.getTime()) / (curr.end.getTime() - curr.start.getTime());
  const remMs = curr.end.getTime() - now.getTime();
  const remMin = Math.floor(remMs / 60000);
  const remSec = Math.floor((remMs % 60000) / 1000);
  const color = CHALDEAN_COLORS[curr.planet];

  const CX = 36, CY = 36, R = 28;
  const a0 = -Math.PI / 2;
  const a1 = a0 + progress * 2 * Math.PI;
  const arcX = CX + R * Math.cos(a1);
  const arcY = CY + R * Math.sin(a1);
  const arcPath = progress > 0
    ? `M ${CX + R * Math.cos(a0)} ${CY + R * Math.sin(a0)} A ${R} ${R} 0 ${progress > 0.5 ? 1 : 0} 1 ${arcX} ${arcY}`
    : "";

  const upcoming = hours.filter(h => h.start >= curr.end).slice(0, 3);

  return (
    <div className="liquid-glass-cosmos rounded-2xl p-4">
      <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#64748b" }}>PLANETARY HOUR</p>
      <div className="flex items-center gap-3">
        <svg width={72} height={72} viewBox="0 0 72 72">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={4} />
          {arcPath && (
            <path d={arcPath} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${color}90)` }} />
          )}
          <text x={CX} y={CY - 4} textAnchor="middle" dominantBaseline="central"
            fontSize={20} fill={color}>{PLANET_SYMBOLS[curr.planet as PlanetName] ?? "âœ¦"}</text>
          <text x={CX} y={CY + 14} textAnchor="middle" fontSize={7} fill={curr.isDay ? "#f59e0b60" : "#a78bfa60"}
            letterSpacing={0.5}>{curr.isDay ? "DAY" : "NGT"}</text>
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold leading-tight" style={{ color }}>{curr.planet}</p>
          <p className="text-[13px] tabular-nums" style={{ color: "#475569" }}>
            {String(remMin).padStart(2,"0")}:{String(remSec).padStart(2,"0")} left
          </p>
          <div className="flex gap-1 mt-2">
            {upcoming.map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${CHALDEAN_COLORS[h.planet]}18` }}>
                <span className="text-[13px] leading-none" style={{ color: CHALDEAN_COLORS[h.planet] }}>
                  {PLANET_SYMBOLS[h.planet as PlanetName] ?? "?"}
                </span>
                <span className="text-[13px] tabular-nums" style={{ color: "#334155" }}>
                  {h.start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Live clock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CosmicClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-center">
      <p className="text-[13px] font-bold tracking-widest" style={{ color: "#06b6d4", fontFamily: "'Share Tech Mono', monospace" }}>
        {time.toLocaleTimeString("en-US", { hour12: true, hour: "numeric", minute: "2-digit", second: "2-digit" })}
      </p>
      <p className="text-[13px] tracking-widest" style={{ color: "#334155" }}>
        {time.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
      </p>
    </div>
  );
}

// â”€â”€â”€ Element balance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ElementBalance({ chart }: { chart: ChartData }) {
  const counts = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  chart.planets.slice(0, 10).forEach(p => {
    for (const [el, signs] of Object.entries(ELEMENT_SIGNS)) {
      if (signs.includes(p.sign)) { counts[el as keyof typeof counts]++; break; }
    }
  });
  const total = 10;
  return (
    <div className="space-y-1.5">
      {(Object.entries(counts) as [keyof typeof counts, number][]).map(([el, count]) => (
        <div key={el} className="flex items-center gap-2">
          <span className="text-[13px] font-bold w-8 flex-shrink-0" style={{ color: ELEMENT_COLORS[el] }}>{el.substring(0, 4)}</span>
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(count / total) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: ELEMENT_COLORS[el], boxShadow: `0 0 4px ${ELEMENT_COLORS[el]}` }}
            />
          </div>
          <span className="text-[13px] w-6 text-right" style={{ color: "#475569" }}>{Math.round((count / total) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

// â”€â”€â”€ Planet card popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PlanetPopup({ planet, onClose }: { planet: PlanetPosition; onClose: () => void }) {
  const color = PLANET_COLORS[planet.name] ?? "#94a3b8";
  const warpTo = useWarpTo();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      className="absolute bottom-24 left-1/2 -translate-x-1/2 w-64 rounded-2xl overflow-hidden z-30"
      style={{
        background: "rgba(4,4,28,0.96)",
        border: `1px solid ${color}40`,
        backdropFilter: "blur(28px)",
        boxShadow: `0 0 40px ${color}25`,
      }}
    >
      <ScanBar color={color} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PlanetGlyph planet={planet.name} color={color} size={22} />
            <div>
              <p className="text-[14px] font-bold" style={{ color: "#e2e8f0" }}>{planet.name}{planet.retrograde ? " â„ž" : ""}</p>
              <p className="text-[13px] tracking-widest" style={{ color: "#475569" }}>NATAL</p>
            </div>
          </div>
          <button onClick={onClose} className="text-lg leading-none cursor-pointer" style={{ color: "#475569" }}>Ã—</button>
        </div>
        <div className="space-y-1 text-[13px] mb-3">
          {[
            { label: "Position", value: <span className="flex items-center gap-1">{planet.signDegree.toFixed(1)}Â° <SignGlyph sign={planet.sign} size={13} />{planet.sign}</span> },
            { label: "House", value: `H${planet.house}` },
            { label: "Longitude", value: `${planet.longitude.toFixed(2)}Â°` },
            ...(planet.dignity && planet.dignity !== "peregrine" ? [{ label: "Dignity", value: planet.dignity }] : []),
          ].map(r => (
            <div key={r.label} className="flex justify-between">
              <span style={{ color: "#475569" }}>{r.label}</span>
              <span style={{ color }}>{r.value}</span>
            </div>
          ))}
        </div>
        <motion.button
          onClick={() => { onClose(); warpTo(`/dashboard/chart/${planet.name.toLowerCase()}`); }}
          whileHover={{ scale: 1.02, borderColor: `${color}50` }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-2 rounded-xl text-[13px] font-bold tracking-widest cursor-pointer"
          style={{ background: `${color}10`, border: `1px solid ${color}25`, color }}
        >
          FULL {planet.name.toUpperCase()} READING â†’
        </motion.button>
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Cosmic Weather Strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface TransitPill {
  transitPlanet: PlanetName;
  transitRetrograde: boolean;
  natalPlanet: PlanetName;
  natalHouse: number;
  type: string;
  orb: number;
  exact: boolean;
  applying: boolean;
  daysToExact?: number | null;
}

function CosmicWeatherStrip({ aspects }: { aspects: TransitPill[] }) {
  if (!aspects.length) return null;
  const top = aspects.slice(0, 10);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65 }}
      className="w-full max-w-xl"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: "#22c55e" }}
        />
        <span className="text-[13px] font-bold tracking-[0.2em]" style={{ color: "#334155" }}>LIVE TRANSITS</span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(34,197,94,0.15), transparent)" }} />
      </div>
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {top.map((a, i) => {
          const tColor = PLANET_COLORS[a.transitPlanet] ?? "#94a3b8";
          const nColor = PLANET_COLORS[a.natalPlanet] ?? "#94a3b8";
          const aColor = ASPECT_COLORS[a.type] ?? "#94a3b8";
          const isUrgent = a.exact || a.orb < 0.25;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.65 + i * 0.04 }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0"
              style={{
                background: isUrgent ? `${aColor}18` : "rgba(4,4,28,0.8)",
                border: `1px solid ${isUrgent ? aColor + "60" : "rgba(99,102,241,0.2)"}`,
                backdropFilter: "blur(12px)",
              }}
              whileHover={{ borderColor: aColor, scale: 1.05 }}
            >
              <span className="text-[13px] leading-none" style={{ color: tColor }}>{PLANET_SYMBOLS[a.transitPlanet]}</span>
              {a.transitRetrograde && <span className="text-[13px]" style={{ color: "#f97316" }}>â„ž</span>}
              <span className="text-[13px] font-bold mx-0.5" style={{ color: aColor }}>{ASPECT_GLYPHS[a.type]}</span>
              <span className="text-[13px] leading-none" style={{ color: nColor }}>{PLANET_SYMBOLS[a.natalPlanet]}</span>
              <span className="ml-1 text-[13px]" style={{ color: "#334155" }}>H{a.natalHouse}</span>
              {a.exact && (
                <span className="ml-0.5 text-[13px] font-bold px-1 rounded" style={{ background: "rgba(167,139,250,0.2)", color: "#a78bfa" }}>EX</span>
              )}
              {a.applying && !a.exact && (
                <span className="ml-0.5 text-[13px] font-bold" style={{ color: "#22c55e" }}>â†’</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Daily Briefing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DailyBriefing({ chart, transits, profileId }: {
  chart: ChartData;
  transits: TransitPill[];
  profileId: string;
}) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const initialized = useRef(false);
  const keyRef = useRef("");

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const today = new Date().toISOString().slice(0, 10);
    const key = `cosmora_daily_${profileId}_${today}`;
    keyRef.current = key;
    const dismissKey = `${key}_dismissed`;
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(dismissKey) === "1") { setDismissed(true); return; }
    const cached = localStorage.getItem(key);
    if (cached) { setText(cached); return; }

    const top3 = transits.slice(0, 3).map(t =>
      `${t.transitPlanet}${t.transitRetrograde ? " Rx" : ""} ${t.type} natal ${t.natalPlanet} H${t.natalHouse} (${t.orb.toFixed(1)}Â°${t.applying ? ", applying" : ", separating"})`
    ).join("; ");

    const sun = chart.planets.find(p => p.name === "Sun");
    const moon = chart.planets.find(p => p.name === "Moon");
    const prof = chart.annualProfection;

    const prompt = `You are Cosmora, an expert AI astrologer. Write a brief daily cosmic weather reading.

Today: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
Natal Sun: ${sun?.sign ?? "?"} H${sun?.house ?? "?"}
Natal Moon: ${moon?.sign ?? "?"} H${moon?.house ?? "?"}
Profection year: ${prof.lordOfYear} rules H${prof.activatedHouse} (${prof.activatedSign}) age ${prof.age}
Key transits: ${top3 || "No tight transits today"}

2â€“3 sentences. Grounded, specific, evocative. Do not start with "Today". No bullet points.`;

    setStreaming(true);
    let fullText = "";
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, profileId }),
    }).then(async (res) => {
      if (!res.ok || !res.body) { setStreaming(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const payload = part.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const d = JSON.parse(payload) as { text?: string };
            if (d.text) { fullText += d.text; setText(prev => prev + d.text); }
          } catch {}
        }
      }
      if (fullText) localStorage.setItem(keyRef.current, fullText);
      setStreaming(false);
    }).catch(() => setStreaming(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = () => {
    const today = new Date().toISOString().slice(0, 10);
    const dismissKey = `cosmora_daily_${profileId}_${today}_dismissed`;
    localStorage.setItem(dismissKey, "1");
    setDismissed(true);
  };

  if (dismissed || (!text && !streaming)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.97 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="absolute pointer-events-auto z-20"
      style={{
        top: 24, left: "50%", transform: "translateX(-50%)",
        width: "min(480px, 88vw)",
      }}
    >
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: "rgba(2,2,20,0.9)",
          border: "1px solid rgba(99,102,241,0.18)",
          backdropFilter: "blur(28px)",
          boxShadow: "0 0 60px rgba(99,102,241,0.08), 0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        {streaming && (
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.04), transparent)",
            }}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ opacity: streaming ? [1, 0.3, 1] : 1 }}
              transition={{ duration: 1.4, repeat: streaming ? Infinity : 0 }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: streaming ? "#06b6d4" : "#22c55e" }}
            />
            <span className="text-[13px] font-bold tracking-widest" style={{ color: "#475569" }}>
              DAILY COSMIC WEATHER
            </span>
            <span className="text-[13px]" style={{ color: "#1e293b" }}>
              Â· {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[13px] font-bold cursor-pointer"
            style={{ color: "#1e293b", transition: "color 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#475569"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#1e293b"; }}
          >
            âœ•
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {!text && streaming ? (
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-3 h-3 rounded-full border border-t-transparent flex-shrink-0"
                style={{ borderColor: "#7c3aed" }}
              />
              <span className="text-[13px]" style={{ color: "#334155" }}>Reading the skiesâ€¦</span>
            </div>
          ) : (
            <p className="text-[16px] leading-relaxed" style={{ color: "#94a3b8" }}>
              {text}
              {streaming && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                  className="inline-block ml-0.5 w-0.5 h-3.5 align-middle rounded-full"
                  style={{ background: "#7c3aed" }}
                />
              )}
            </p>
          )}
        </div>

        {/* Transit chips */}
        {text && transits.length > 0 && (
          <div
            className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)", scrollbarWidth: "none" }}
          >
            {transits.slice(0, 4).map((t, i) => {
              const tColor = PLANET_COLORS[t.transitPlanet] ?? "#94a3b8";
              const aColor = ASPECT_COLORS[t.type] ?? "#64748b";
              return (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="text-[13px] leading-none" style={{ color: tColor }}>{PLANET_SYMBOLS[t.transitPlanet]}</span>
                  <span className="text-[13px] font-bold" style={{ color: aColor }}>{ASPECT_GLYPHS[t.type]}</span>
                  <span className="text-[13px] leading-none" style={{ color: PLANET_COLORS[t.natalPlanet] ?? "#94a3b8" }}>{PLANET_SYMBOLS[t.natalPlanet]}</span>
                  <span className="text-[13px] font-mono ml-0.5" style={{ color: "#334155" }}>{t.orb.toFixed(1)}Â°</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Left panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function LeftPanel({ chart, onSelectPlanet }: { chart: ChartData; onSelectPlanet: (p: PlanetPosition) => void }) {
  return (
    <motion.div
      initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}
      className="flex flex-col gap-3 pointer-events-auto"
      style={{ width: 240 }}
    >
      {/* Planetary Positions */}
      <div className="liquid-glass-cosmos rounded-2xl overflow-hidden flex flex-col">
        <div className="px-4 pt-3 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[13px] font-bold tracking-widest" style={{ color: "#7c3aed" }}>PLANETARY POSITIONS</p>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 260, scrollbarWidth: "none" }}>
          {chart.planets.map((p) => {
            const color = PLANET_COLORS[p.name] ?? "#94a3b8";
            const signColor = SIGN_COLORS[p.sign];
            return (
              <motion.div
                key={p.name}
                whileHover={{ background: "rgba(255,255,255,0.04)" }}
                onClick={() => onSelectPlanet(p)}
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors"
              >
                <PlanetGlyph planet={p.name} color={color} size={14} className="w-5 flex-shrink-0" />
                <span className="text-[14px] font-medium flex-1" style={{ color: "#94a3b8" }}>
                  {p.name}{p.retrograde ? " â„ž" : ""}
                </span>
                <span className="text-[14px] font-bold flex items-center gap-1" style={{ color: signColor }}>
                  {p.signDegree.toFixed(0)}Â° <SignGlyph sign={p.sign} size={13} />
                </span>
                <span className="text-[13px] w-6 text-right" style={{ color: "#334155" }}>H{p.house}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Aspects */}
      <div className="liquid-glass-cosmos rounded-2xl overflow-hidden"
      >
        <div className="px-4 pt-3 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[13px] font-bold tracking-widest" style={{ color: "#06b6d4" }}>ASPECTS</p>
        </div>
        <div className="px-3 py-2 space-y-1">
          {chart.aspects.slice(0, 7).map((a, i) => {
            const color = ASPECT_COLORS[a.type] ?? "#94a3b8";
            return (
              <div key={i} className="flex items-center gap-1.5 text-[14px]">
                <span style={{ color: PLANET_COLORS[a.planet1] ?? "#94a3b8" }}>{PLANET_SYMBOLS[a.planet1]}</span>
                <span style={{ color }} className="font-bold">{ASPECT_GLYPHS[a.type]}</span>
                <span style={{ color: PLANET_COLORS[a.planet2] ?? "#94a3b8" }}>{PLANET_SYMBOLS[a.planet2]}</span>
                <span className="flex-1 capitalize" style={{ color: "#475569" }}>{a.type}</span>
                <span style={{ color: "#334155" }}>{a.orb.toFixed(1)}Â°</span>
                {a.exact && <span className="text-[13px]" style={{ color: "#22c55e" }}>EX</span>}
              </div>
            );
          })}
        </div>
        <div className="px-3 pb-3">
          <Link href="/dashboard/chart">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="w-full py-1.5 rounded-lg text-[13px] font-bold tracking-widest cursor-pointer"
              style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "#06b6d4" }}>
              VIEW ALL ASPECTS â†’
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Convergence Score â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const OUTER_PLANETS: PlanetName[] = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

function computeConvergence(chart: ChartData, transits: TransitPill[]): {
  score: number;
  label: string;
  color: string;
  factors: { text: string; pts: number }[];
} {
  const factors: { text: string; pts: number }[] = [];
  let score = 0;

  const lord = chart.annualProfection.lordOfYear;
  const profHouse = chart.annualProfection.activatedHouse;
  const lordPlanet = chart.planets.find(p => p.name === lord);

  // Factor 1: Lord of Year dignity
  if (lordPlanet?.dignity === "domicile") { score += 18; factors.push({ text: `${lord} in domicile`, pts: 18 }); }
  else if (lordPlanet?.dignity === "exaltation") { score += 14; factors.push({ text: `${lord} exalted`, pts: 14 }); }
  else if (lordPlanet?.dignity === "detriment" || lordPlanet?.dignity === "fall") { score -= 8; }

  // Factor 2: Outer planet transits to Lord of Year (applying, â‰¤3Â°)
  const towardLord = transits.filter(t => t.natalPlanet === lord && OUTER_PLANETS.includes(t.transitPlanet) && t.applying && t.orb <= 3);
  if (towardLord.length >= 2) { score += 32; factors.push({ text: `${towardLord.length}Ã— outer transits to ${lord}`, pts: 32 }); }
  else if (towardLord.length === 1) {
    const pts = towardLord[0].exact ? 22 : 16;
    score += pts;
    factors.push({ text: `${towardLord[0].transitPlanet}â†’${lord} (${towardLord[0].orb.toFixed(1)}Â°)`, pts });
  }

  // Factor 3: Multiple transits activating the profection house
  const inProfHouse = transits.filter(t => t.natalHouse === profHouse && t.applying && t.orb <= 5);
  if (inProfHouse.length >= 2) { score += 20; factors.push({ text: `H${profHouse} has ${inProfHouse.length} transits`, pts: 20 }); }
  else if (inProfHouse.length === 1) { score += 10; factors.push({ text: `Transit activating H${profHouse}`, pts: 10 }); }

  // Factor 4: Lord of Year itself is transiting prominently
  const lordTransiting = transits.filter(t => t.transitPlanet === lord && t.applying && t.orb <= 2 && (t.natalPlanet === "Sun" || t.natalPlanet === "Moon"));
  if (lordTransiting.length > 0) { score += 15; factors.push({ text: `${lord} activates natal luminaries`, pts: 15 }); }

  // Factor 5: Exact transits â€” any
  const exact = transits.filter(t => t.exact);
  if (exact.length > 0) { score += Math.min(exact.length * 5, 15); factors.push({ text: `${exact.length} exact transit${exact.length > 1 ? "s" : ""}`, pts: Math.min(exact.length * 5, 15) }); }

  score = Math.max(5, Math.min(100, score));
  const label = score >= 75 ? "PEAK" : score >= 50 ? "HIGH" : score >= 30 ? "ACTIVE" : "QUIET";
  const color = score >= 75 ? "#a855f7" : score >= 50 ? "#06b6d4" : score >= 30 ? "#f59e0b" : "#334155";

  return { score, label, color, factors };
}

function ConvergenceWidget({ chart, transits }: { chart: ChartData; transits: TransitPill[] }) {
  const { score, label, color, factors } = computeConvergence(chart, transits);
  const R = 36;
  const circ = 2 * Math.PI * R;
  const dash = (score / 100) * circ * 0.75; // 3/4 arc
  const gap = circ - dash;

  return (
    <Link href="/dashboard/insights">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        whileHover={{ scale: 1.01, borderColor: `${color}40` }}
        className="liquid-glass-cosmos rounded-2xl p-4 cursor-pointer"
        style={{ transition: "transform 0.2s" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-bold tracking-widest" style={{ color }}>CONVERGENCE</p>
          <span className="text-[13px] tracking-widest" style={{ color: "#1e293b" }}>TIMING ALIGNMENT</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Arc gauge */}
          <div className="flex-shrink-0 relative" style={{ width: 84, height: 84 }}>
            <svg width={84} height={84} style={{ transform: "rotate(135deg)" }} viewBox="0 0 84 84">
              {/* Track */}
              <circle
                cx={42} cy={42} r={R}
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={7}
                strokeDasharray={`${circ * 0.75} ${circ}`}
                strokeLinecap="round"
              />
              {/* Fill */}
              <motion.circle
                cx={42} cy={42} r={R}
                fill="none"
                stroke={color}
                strokeWidth={7}
                strokeDasharray={`${dash} ${gap + circ * 0.25}`}
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${circ}` }}
                animate={{ strokeDasharray: `${dash} ${gap + circ * 0.25}` }}
                transition={{ duration: 1.4, ease: "easeOut", delay: 0.6 }}
                style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.5rem", fontWeight: 700, color, lineHeight: 1, textShadow: `0 0 14px ${color}80` }}
              >
                {score}
              </motion.span>
              <span style={{ fontSize: "0.45rem", fontWeight: 700, letterSpacing: "0.12em", color }}>
                {label}
              </span>
            </div>
          </div>

          {/* Factors */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {factors.slice(0, 3).map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="flex items-center gap-1.5"
              >
                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-[13px] leading-snug" style={{ color: "#475569" }}>{f.text}</span>
                <span className="ml-auto text-[13px] font-bold flex-shrink-0" style={{ color }}>+{f.pts}</span>
              </motion.div>
            ))}
            {factors.length === 0 && (
              <span className="text-[13px]" style={{ color: "#334155" }}>No major alignments active right now.</span>
            )}
          </div>
        </div>

        <div className="mt-2.5 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <span className="text-[13px] font-bold tracking-widest" style={{ color: "#334155" }}>
            VIEW FULL ANALYSIS â†’
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

// â”€â”€â”€ Sky Status widget â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SkyStatusWidget({ retrogrades, ingresses }: { retrogrades: PlanetName[]; ingresses: Ingress[] }) {
  if (retrogrades.length === 0 && ingresses.length === 0) return null;
  return (
    <div className="liquid-glass-cosmos rounded-2xl p-4">
      <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#475569" }}>SKY STATUS</p>

      {retrogrades.length > 0 && (
        <div className="mb-3">
          <p className="text-[13px] tracking-widest mb-1.5" style={{ color: "#1e293b" }}>RETROGRADE</p>
          <div className="flex flex-wrap gap-1.5">
            {retrogrades.map(name => {
              const color = PLANET_COLORS[name] ?? "#94a3b8";
              return (
                <div
                  key={name}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ background: `${color}10`, border: `1px solid ${color}25` }}
                >
                  <span style={{ fontSize: "0.75rem", color }}>{PLANET_SYMBOLS[name] ?? "â—‹"}</span>
                  <span className="text-[13px] font-bold" style={{ color }}>{name.slice(0, 3)}</span>
                  <span className="text-[13px] font-bold" style={{ color: "#f97316" }}>â„ž</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ingresses.length > 0 && (
        <div>
          <p className="text-[13px] tracking-widest mb-1.5" style={{ color: "#1e293b" }}>NEXT INGRESS</p>
          <div className="space-y-1.5">
            {ingresses.slice(0, 3).map((ing, i) => {
              const color = PLANET_COLORS[ing.planet as PlanetName] ?? "#94a3b8";
              return (
                <div key={i} className="flex items-center gap-2">
                  <PlanetGlyph planet={ing.planet as PlanetName} color={color} size={13} />
                  <span className="text-[13px]" style={{ color: "#64748b" }}>â†’</span>
                  <span className="text-[13px] font-medium flex items-center gap-1" style={{ color: "#94a3b8" }}><SignGlyph sign={ing.toSign} size={13} />{ing.toSign}</span>
                  <span className="text-[13px] font-mono ml-auto" style={{ color: "#334155" }}>
                    {ing.daysUntil === 0 ? "today" : `${ing.daysUntil}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Next Exact Transit widget â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ASPECT_GLYPHS_NE: Record<string, string> = {
  conjunction: "â˜Œ", opposition: "â˜", trine: "â–³",
  square: "â–¡", sextile: "âš¹", quincunx: "âš»",
};

function NextExactWidget({ transits }: { transits: TransitPill[] }) {
  const applying = transits
    .filter(t => t.applying && !t.exact && t.daysToExact != null && t.daysToExact > 0)
    .sort((a, b) => (a.daysToExact ?? 999) - (b.daysToExact ?? 999));

  const exact = transits.filter(t => t.exact);

  if (exact.length === 0 && applying.length === 0) return null;

  const topExact = exact[0];
  const next = applying[0];

  const fmtDays = (d: number) => {
    if (d < 1 / 24) return "< 1h";
    if (d < 1) return `${Math.round(d * 24)}h`;
    return `${d.toFixed(1)}d`;
  };

  const tColor = (name: PlanetName) => PLANET_COLORS[name] ?? "#94a3b8";

  return (
    <div className="liquid-glass-cosmos rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-bold tracking-widest" style={{ color: "#06b6d4" }}>NEXT EXACT</p>
        {exact.length > 0 && (
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="flex items-center gap-1"
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
            <span className="text-[13px] font-bold tracking-widest" style={{ color: "#22c55e" }}>EXACT NOW</span>
          </motion.div>
        )}
      </div>

      {topExact && (
        <div className="flex items-center gap-2 mb-2 p-2 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <span style={{ fontSize: "1rem", color: tColor(topExact.transitPlanet) }}>
            {PLANET_SYMBOLS[topExact.transitPlanet] ?? "â—‹"}
          </span>
          <span className="text-[14px] font-bold" style={{ color: ASPECT_COLORS[topExact.type] ?? "#94a3b8" }}>
            {ASPECT_GLYPHS_NE[topExact.type] ?? "~"}
          </span>
          <span style={{ fontSize: "1rem", color: tColor(topExact.natalPlanet) }}>
            {PLANET_SYMBOLS[topExact.natalPlanet] ?? "â—‹"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: "#94a3b8" }}>
              {topExact.transitPlanet} {topExact.type} {topExact.natalPlanet}
            </p>
          </div>
          <span className="text-[13px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>EXACT</span>
        </div>
      )}

      {next && (
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "1rem", color: tColor(next.transitPlanet) }}>
            {PLANET_SYMBOLS[next.transitPlanet] ?? "â—‹"}
          </span>
          <span className="text-[14px] font-bold" style={{ color: ASPECT_COLORS[next.type] ?? "#94a3b8" }}>
            {ASPECT_GLYPHS_NE[next.type] ?? "~"}
          </span>
          <span style={{ fontSize: "1rem", color: tColor(next.natalPlanet) }}>
            {PLANET_SYMBOLS[next.natalPlanet] ?? "â—‹"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: "#94a3b8" }}>
              {next.transitPlanet} {next.type} {next.natalPlanet}
            </p>
          </div>
          {next.daysToExact != null && (
            <span className="text-[13px] font-bold font-mono flex-shrink-0" style={{ color: "#06b6d4" }}>
              {fmtDays(next.daysToExact)}
            </span>
          )}
        </div>
      )}

      {applying.length > 1 && (
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-[13px] tracking-widest mb-1.5" style={{ color: "#1e293b" }}>APPROACHING</p>
          <div className="flex flex-wrap gap-1">
            {applying.slice(1, 4).map((t, i) => (
              <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.1)" }}>
                <span style={{ fontSize: "0.7rem", color: tColor(t.transitPlanet) }}>{PLANET_SYMBOLS[t.transitPlanet] ?? "â—‹"}</span>
                <span style={{ fontSize: "0.65rem", color: ASPECT_COLORS[t.type] ?? "#64748b" }}>{ASPECT_GLYPHS_NE[t.type] ?? "~"}</span>
                <span style={{ fontSize: "0.7rem", color: tColor(t.natalPlanet) }}>{PLANET_SYMBOLS[t.natalPlanet] ?? "â—‹"}</span>
                {t.daysToExact != null && (
                  <span className="text-[13px] font-mono" style={{ color: "#334155" }}>{fmtDays(t.daysToExact)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Right panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RightPanel({ chart, profileId, lat, lon, transits, retrogrades, ingresses }: { chart: ChartData; profileId: string | null; lat: number; lon: number; transits: TransitPill[]; retrogrades: PlanetName[]; ingresses: Ingress[] }) {
  const sun   = chart.planets.find(p => p.name === "Sun");
  const moon  = chart.planets.find(p => p.name === "Moon");
  const venus = chart.planets.find(p => p.name === "Venus");
  const asc   = chart.houses[0];
  const prof  = chart.annualProfection;
  const lordColor = PLANET_COLORS[prof.lordOfYear] ?? "#f59e0b";

  // Elemental dominant
  const elements = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  chart.planets.slice(0, 10).forEach(p => {
    for (const [el, signs] of Object.entries(ELEMENT_SIGNS)) {
      if (signs.includes(p.sign)) { elements[el as keyof typeof elements]++; break; }
    }
  });
  const dominant = (Object.entries(elements) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0];

  return (
    <motion.div
      initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}
      className="flex flex-col gap-3 pointer-events-auto"
      style={{ width: 240 }}
    >
      {/* Cosmic Insight */}
      <div
        className="liquid-glass-cosmos rounded-2xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-bold tracking-widest" style={{ color: "#7c3aed" }}>COSMIC INSIGHT</p>
          <span className="text-[13px] tracking-widest" style={{ color: "#334155" }}>AI ANALYSIS</span>
        </div>
        <div className="flex items-start gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 12px rgba(124,58,237,0.4)" }}>
            <span className="text-[13px] text-white font-bold">âœ¦</span>
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-wider mb-1" style={{ color: "#a78bfa" }}>
              {prof.lordOfYear.toUpperCase()} YEAR Â· H{prof.activatedHouse}
            </p>
            <p className="text-[14px] leading-relaxed" style={{ color: "#475569" }}>
              Age {prof.age} profection activates your {prof.activatedSign} house. {prof.lordOfYear} rules your {prof.activatedHouse === 1 ? "identity" : prof.activatedHouse === 7 ? "partnerships" : prof.activatedHouse === 10 ? "career" : "life theme"} this year.
            </p>
          </div>
        </div>
        <Link href="/dashboard/insights">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="w-full py-2 rounded-xl text-[13px] font-bold tracking-widest cursor-pointer"
            style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
            EXPLORE INSIGHT â†’
          </motion.button>
        </Link>
      </div>

      {/* Convergence Score */}
      <ConvergenceWidget chart={chart} transits={transits} />

      {/* Sky Status */}
      <SkyStatusWidget retrogrades={retrogrades} ingresses={ingresses} />

      {/* Next Exact Transit */}
      <NextExactWidget transits={transits} />

      {/* Daily Briefing CTA */}
      <Link href="/dashboard/briefing">
        <motion.div
          whileHover={{ scale: 1.02, boxShadow: "0 0 28px rgba(245,158,11,0.18)" }}
          whileTap={{ scale: 0.97 }}
          className="rounded-2xl p-4 cursor-pointer"
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.2)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base leading-none" style={{ color: "#f59e0b" }}>âœ¦</span>
            <p className="text-[13px] font-bold tracking-widest" style={{ color: "#f59e0b" }}>TODAY'S BRIEFING</p>
          </div>
          <p className="text-[14px] leading-relaxed mb-3" style={{ color: "#64748b" }}>
            Morning cosmic weather, planetary hours &amp; AI-narrated sky report.
          </p>
          <div className="text-[13px] font-bold tracking-widest" style={{ color: "#f59e0b" }}>
            OPEN BRIEFING â†’
          </div>
        </motion.div>
      </Link>

      {/* Natal Report CTA */}
      <Link href="/dashboard/report">
        <motion.div
          whileHover={{ scale: 1.02, boxShadow: "0 0 28px rgba(196,181,253,0.14)" }}
          className="rounded-2xl p-4 cursor-pointer"
          style={{
            background: "rgba(168,85,247,0.06)",
            border: "1px solid rgba(168,85,247,0.18)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base leading-none" style={{ color: "#c4b5fd" }}>âœ¦</span>
            <p className="text-[13px] font-bold tracking-widest" style={{ color: "#c4b5fd" }}>NATAL REPORT</p>
          </div>
          <p className="text-[14px] leading-relaxed mb-3" style={{ color: "#64748b" }}>
            8-chapter AI interpretation of your birth chart â€” streamed live.
          </p>
          <div className="text-[13px] font-bold tracking-widest" style={{ color: "#c4b5fd" }}>
            GENERATE REPORT â†’
          </div>
        </motion.div>
      </Link>

      {/* Key Placements */}
      <div className="liquid-glass-cosmos rounded-2xl p-4">
        <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#64748b" }}>KEY PLACEMENTS</p>
        <div className="space-y-2">
          {[
            { label: "SUN",    planet: sun,  color: "#fbbf24" },
            { label: "MOON",   planet: moon, color: "#c4b5fd" },
            { label: "VENUS",  planet: venus, color: "#f472b6" },
            { label: "ASC",    sign: asc?.sign, color: "#06b6d4" },
          ].map(({ label, planet, sign, color }) => {
            const displaySign = planet?.sign ?? sign;
            if (!displaySign) return null;
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[13px] font-bold tracking-widest w-10 flex-shrink-0" style={{ color: "#334155" }}>{label}</span>
                <span className="text-base leading-none" style={{ color: SIGN_COLORS[displaySign] }}>{SIGN_SYMBOLS[displaySign]}</span>
                <span className="text-[14px] font-medium" style={{ color }}>{displaySign}</span>
                {planet && <span className="text-[13px] ml-auto" style={{ color: "#334155" }}>H{planet.house}</span>}
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <span className="text-[13px] font-bold tracking-widest" style={{ color: "#334155" }}>SECT</span>
          <span className="text-[14px] font-bold" style={{ color: chart.sect === "day" ? "#fbbf24" : "#c4b5fd" }}>
            {chart.sect === "day" ? "â˜€ DAY" : "â˜½ NIGHT"}
          </span>
          <span className="ml-auto text-[13px] font-bold tracking-widest" style={{ color: "#334155" }}>DOMINANT</span>
          <span className="text-[14px] font-bold" style={{ color: ELEMENT_COLORS[dominant as keyof typeof ELEMENT_COLORS] }}>{dominant}</span>
        </div>
      </div>

      {/* Energy Balance */}
      <div className="liquid-glass-cosmos rounded-2xl p-4">
        <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#64748b" }}>ENERGY BALANCE</p>
        <ElementBalance chart={chart} />
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <Link href="/dashboard/timeline">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="w-full py-1.5 rounded-lg text-[13px] font-bold tracking-widest cursor-pointer"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>
              VIEW TIMELINE â†’
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Moon Phase */}
      <MoonPhaseWidget />

      {/* Planetary Hour */}
      {lat !== 0 && lon !== 0 && <PlanetaryHourWidget lat={lat} lon={lon} />}
    </motion.div>
  );
}

// â”€â”€â”€ Main dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€â”€ Natal Signature Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SignatureCard({ chart, name }: { chart: ChartData; name: string }) {
  const sun   = chart.planets.find(p => p.name === "Sun");
  const moon  = chart.planets.find(p => p.name === "Moon");
  const asc   = chart.houses[0];
  const prof  = chart.annualProfection;
  const sunColor  = "#fbbf24";
  const moonColor = "#c4b5fd";
  const ascColor  = "#06b6d4";
  const lordColor = PLANET_COLORS[prof.lordOfYear] ?? "#f59e0b";

  const elements = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  chart.planets.slice(0, 10).forEach(p => {
    for (const [el, signs] of Object.entries(ELEMENT_SIGNS)) {
      if (signs.includes(p.sign)) { elements[el as keyof typeof elements]++; break; }
    }
  });
  const dominant = (Object.entries(elements) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0];
  const domColor = ELEMENT_COLORS[dominant as keyof typeof ELEMENT_COLORS];

  const handleDownload = () => {
    const svg = document.getElementById("cosmora-sig-card");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/\s+/g, "-").toLowerCase()}-cosmora-chart.svg`;
    a.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        id="cosmora-sig-card"
        width={440}
        height={240}
        viewBox="0 0 440 240"
        xmlns="http://www.w3.org/2000/svg"
        style={{ borderRadius: 20, display: "block" }}
      >
        <defs>
          <linearGradient id="sigBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020214" />
            <stop offset="50%" stopColor="#060630" />
            <stop offset="100%" stopColor="#020214" />
          </linearGradient>
          <radialGradient id="sigOrb1" cx="15%" cy="20%" r="40%">
            <stop offset="0%" stopColor="rgba(124,58,237,0.25)" />
            <stop offset="100%" stopColor="rgba(124,58,237,0)" />
          </radialGradient>
          <radialGradient id="sigOrb2" cx="85%" cy="80%" r="35%">
            <stop offset="0%" stopColor="rgba(6,182,212,0.18)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0)" />
          </radialGradient>
          <filter id="sigGlow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={440} height={240} rx={20} fill="url(#sigBg)" />
        <rect width={440} height={240} rx={20} fill="url(#sigOrb1)" />
        <rect width={440} height={240} rx={20} fill="url(#sigOrb2)" />

        {/* Border */}
        <rect width={440} height={240} rx={20} fill="none" stroke="rgba(124,58,237,0.3)" strokeWidth={1} />

        {/* Star field */}
        {[20,80,200,300,380,40,150,350,420,60,260,340].map((x, i) => (
          <circle key={i} cx={x} cy={[30,18,12,45,22,60,8,55,35,75,20,65][i]}
            r={[0.8,1.2,0.6,1,0.9,0.7,1.1,0.8,0.5,1,0.7,0.9][i]}
            fill="white" opacity={[0.4,0.6,0.3,0.5,0.4,0.3,0.7,0.4,0.5,0.3,0.6,0.4][i]} />
        ))}

        {/* Branding */}
        <text x={22} y={26} fontSize={9} fill="rgba(124,58,237,0.7)" fontWeight="700" letterSpacing={3}>COSMORA</text>
        <text x={22} y={38} fontSize={7} fill="rgba(99,102,241,0.4)" letterSpacing={2}>NATAL SIGNATURE</text>

        {/* Name */}
        <text x={220} y={70} textAnchor="middle" fontSize={22} fill="white" fontWeight="800" letterSpacing={1}
          style={{ fontFamily: "serif" }}>
          {name}
        </text>

        {/* Sun glyph + label */}
        <text x={70} y={120} textAnchor="middle" fontSize={36} fill={sunColor} filter="url(#sigGlow)">
          {PLANET_SYMBOLS.Sun}
        </text>
        <text x={70} y={140} textAnchor="middle" fontSize={8} fill={sunColor} fontWeight="700" letterSpacing={1}>SUN</text>
        <text x={70} y={154} textAnchor="middle" fontSize={11} fill={sunColor}>{sun?.sign ?? "â€”"}</text>
        <text x={70} y={168} textAnchor="middle" fontSize={8} fill="rgba(251,191,36,0.5)">{sun ? `${sun.signDegree.toFixed(0)}Â° H${sun.house}` : ""}</text>

        {/* Moon glyph + label */}
        <text x={180} y={120} textAnchor="middle" fontSize={32} fill={moonColor} filter="url(#sigGlow)">
          {PLANET_SYMBOLS.Moon}
        </text>
        <text x={180} y={140} textAnchor="middle" fontSize={8} fill={moonColor} fontWeight="700" letterSpacing={1}>MOON</text>
        <text x={180} y={154} textAnchor="middle" fontSize={11} fill={moonColor}>{moon?.sign ?? "â€”"}</text>
        <text x={180} y={168} textAnchor="middle" fontSize={8} fill="rgba(196,181,253,0.5)">{moon ? `${moon.signDegree.toFixed(0)}Â° H${moon.house}` : ""}</text>

        {/* Rising */}
        <text x={290} y={118} textAnchor="middle" fontSize={26} fill={ascColor}>â†‘</text>
        <text x={290} y={140} textAnchor="middle" fontSize={8} fill={ascColor} fontWeight="700" letterSpacing={1}>RISING</text>
        <text x={290} y={154} textAnchor="middle" fontSize={11} fill={ascColor}>{asc?.sign ?? "â€”"}</text>
        <text x={290} y={168} textAnchor="middle" fontSize={8} fill="rgba(6,182,212,0.5)">{asc ? `${asc.signDegree.toFixed(0)}Â°` : ""}</text>

        {/* Lord of Year */}
        <text x={390} y={108} textAnchor="middle" fontSize={26} fill={lordColor} filter="url(#sigGlow)">
          {PLANET_SYMBOLS[prof.lordOfYear] ?? "âœ¦"}
        </text>
        <text x={390} y={126} textAnchor="middle" fontSize={7} fill={lordColor} fontWeight="700" letterSpacing={1}>LORD</text>
        <text x={390} y={138} textAnchor="middle" fontSize={7} fill={lordColor} letterSpacing={1}>OF YEAR</text>
        <text x={390} y={152} textAnchor="middle" fontSize={10} fill={lordColor}>{prof.lordOfYear}</text>
        <text x={390} y={168} textAnchor="middle" fontSize={7} fill="rgba(245,158,11,0.5)">Age {prof.age}</text>

        {/* Divider */}
        <line x1={22} y1={185} x2={418} y2={185} stroke="rgba(99,102,241,0.15)" strokeWidth={0.5} />

        {/* Bottom row: sect + element + aspect count */}
        <text x={22} y={206} fontSize={8} fill="rgba(99,102,241,0.5)" letterSpacing={1}>
          {chart.sect === "day" ? "â˜€ DAY SECT" : "â˜½ NIGHT SECT"}
        </text>
        <circle cx={220} cy={202} r={3} fill={domColor} />
        <text x={232} y={206} textAnchor="start" fontSize={8} fill={domColor} fontWeight="700">{dominant} dominant</text>
        <text x={418} y={206} textAnchor="end" fontSize={7} fill="rgba(99,102,241,0.3)" letterSpacing={1}>cosmora.app</text>

        {/* Bottom glow line */}
        <line x1={22} y1={225} x2={418} y2={225} stroke="rgba(124,58,237,0.1)" strokeWidth={0.5} />
        <text x={220} y={235} textAnchor="middle" fontSize={7} fill="rgba(99,102,241,0.2)" letterSpacing={3}>
          {chart.birthDatetime ? new Date(chart.birthDatetime).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : ""}
        </text>
      </svg>

      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleDownload}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold tracking-widest cursor-pointer"
          style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", color: "#a78bfa" }}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path d="M10 3v10M6 9l4 4 4-4" /><path d="M4 15h12" />
          </svg>
          DOWNLOAD SVG
        </motion.button>
        <p className="text-[14px]" style={{ color: "#334155" }}>Screenshot works too</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [chart, setChart] = useState<ChartData | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileCoords, setProfileCoords] = useState<{ lat: number; lon: number }>({ lat: 0, lon: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetPosition | null>(null);
  const [showSignatureCard, setShowSignatureCard] = useState(false);
  const [transitAspects, setTransitAspects] = useState<TransitPill[]>([]);
  const [retrogradePlanets, setRetrogradePlanets] = useState<PlanetName[]>([]);
  const [upcomingIngresses, setUpcomingIngresses] = useState<Ingress[]>([]);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setLoading(false); return; }
    const profile = getProfile(id);
    if (!profile) { setLoading(false); return; }
    setProfileId(id);
    setProfileName(profile.name);
    setProfileCoords({ lat: profile.latitude ?? 0, lon: profile.longitude ?? 0 });
    const cached = getCachedChart(id);
    if (cached) {
      setChart(cached);
      setLoading(false);
    } else {
      fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate: profile.birthDate, birthTime: profile.birthTime,
          latitude: profile.latitude, longitude: profile.longitude,
          timezone: profile.timezone, houseSystem: profile.houseSystem,
        }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) { setCachedChart(id, data); setChart(data); } })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    if (!chart) return;
    fetch("/api/transits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ natal: chart }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.aspects) {
          const sorted = [...(data.aspects as TransitPill[])].sort((a, b) => a.orb - b.orb);
          setTransitAspects(sorted);
        }
        if (data?.transitPlanets) {
          const rx = (data.transitPlanets as PlanetPosition[])
            .filter(p => p.retrograde)
            .map(p => p.name as PlanetName);
          setRetrogradePlanets(rx);
        }
        if (data?.ingresses) {
          setUpcomingIngresses((data.ingresses as Ingress[]).slice(0, 4));
        }
      })
      .catch(() => {});
  }, [chart]);

  if (!loading && !profileId) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 relative">
        <DashboardBg />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center liquid-glass-cosmos">
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(168,130,255,0.85)" strokeWidth="1.2" className="w-9 h-9">
              <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-medium" style={{ color: "var(--text-1)" }}>No chart found</h2>
            <p className="text-[14px]" style={{ color: "var(--text-2)" }}>Enter your birth data to begin.</p>
          </div>
          <Link href="/onboarding">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
              className="px-8 py-3 rounded-xl text-[14px] font-medium tracking-wide cursor-pointer cosmic-btn-primary">
              Begin â†’
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  const VOID_PLANET = "https://d8j0ntlcm91z4.cloudfront.net/user_3EJVjiEA4WaVDp4iCvA6Qzd9BpD/hf_20260603_160849_b4723a21-2d1d-4d62-99f5-756068f42d94.mp4";

  return (
    <div className="relative">
      {/* Chapter 0 — Home Base */}
      <div className="relative h-screen overflow-hidden">

      {/* Looping video background */}
      <LoopingVideo src={VOID_PLANET} opacity={0.55} />
      <div className="fixed inset-0" style={{ zIndex: 3, background: "rgba(2,2,18,0.35)" }} />

      {/* â”€â”€ Full-screen 3D canvas â”€â”€ */}
      <div className="absolute inset-0" style={{ zIndex: 4 }}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-24 h-24 rounded-full"
              style={{ border: "1px solid rgba(124,58,237,0.3)", borderTopColor: "#7c3aed", boxShadow: "0 0 40px rgba(124,58,237,0.3)" }} />
          </div>
        ) : (
          <SolarSystemOrrery
            chart={chart ?? undefined}
            autoRotate
            onPlanetNavigate={(name) => {
              const planet = chart?.planets.find(p => p.name === name);
              if (planet) setSelectedPlanet(planet);
            }}
          />
        )}
      </div>

      {/* â”€â”€ HUD overlay â”€â”€ */}
      <div className="relative z-10 h-full flex flex-col pointer-events-none">

        {/* Top bar */}
        <motion.div
          initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex-shrink-0 flex items-center px-4 md:px-6 py-3 gap-4 pointer-events-auto"
          style={{ background: "linear-gradient(180deg, rgba(0,0,15,0.92) 0%, transparent 100%)" }}
        >
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-5 h-5">
                  <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="hidden md:block">
                <p className="text-[14px] font-bold tracking-[0.2em]" style={{ color: "#7c3aed" }}>COSMORA</p>
                <p className="text-[13px] tracking-widest" style={{ color: "#334155" }}>2070</p>
              </div>
            </div>
          </Link>

          {/* Center: profile + clock */}
          <div className="flex-1 flex items-center justify-center gap-6">
            {profileName && (
              <span className="text-[14px] font-bold tracking-widest" style={{ color: "#475569" }}>
                {profileName.toUpperCase()}
              </span>
            )}
            <CosmicClock />
            {chart && (
              <span className="text-[14px] tracking-widest hidden md:block" style={{ color: "#334155" }}>
                BIRTH CHART
              </span>
            )}
          </div>

          {/* Right: links */}
          <div className="flex items-center gap-2">
            <Link href="/dashboard/chart">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] font-bold tracking-widest cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                FULL CHART
              </motion.button>
            </Link>
            {chart && (
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowSignatureCard(true)}
                className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-lg text-[14px] font-bold tracking-widest cursor-pointer"
                style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)", color: "#06b6d4" }}
              >
                âœ¦ SHARE
              </motion.button>
            )}
            <Link href="/onboarding">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[14px] font-bold tracking-widest cursor-pointer"
                style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
                + CHART
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Main 3-column area */}
        <div className="flex-1 flex items-center px-4 md:px-6 gap-4 overflow-hidden min-h-0">

          {/* Left panel â€” desktop only */}
          <div className="hidden md:block flex-shrink-0 self-center">
            {!loading && chart && <LeftPanel chart={chart} onSelectPlanet={setSelectedPlanet} />}
          </div>

          {/* Center â€” chart + planet popup + daily briefing */}
          <div className="flex-1 relative h-full pointer-events-none">
            <AnimatePresence>
              {selectedPlanet && (
                <div className="pointer-events-auto">
                  <PlanetPopup planet={selectedPlanet} onClose={() => setSelectedPlanet(null)} />
                </div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {!selectedPlanet && chart && profileId && transitAspects.length > 0 && (
                <DailyBriefing
                  chart={chart}
                  transits={transitAspects}
                  profileId={profileId}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Right panel â€” desktop only */}
          <div className="hidden md:block flex-shrink-0 self-center">
            {!loading && chart && <RightPanel chart={chart} profileId={profileId} lat={profileCoords.lat} lon={profileCoords.lon} transits={transitAspects} retrogrades={retrogradePlanets} ingresses={upcomingIngresses} />}
          </div>
        </div>

        {/* Bottom â€” view switcher + chat */}
        <motion.div
          initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex-shrink-0 flex flex-col items-center gap-3 px-4 md:px-6 pb-4 md:pb-5 pointer-events-auto"
          style={{ background: "linear-gradient(0deg, rgba(0,0,15,0.92) 0%, transparent 100%)" }}
        >
          {/* Cosmic Weather Strip */}
          {chart && transitAspects.length > 0 && (
            <Link href="/dashboard/transits" className="w-full max-w-xl pointer-events-auto">
              <CosmicWeatherStrip aspects={transitAspects} />
            </Link>
          )}

          {/* Chat */}
          <div className="w-full max-w-xl">
            <ChatInput profileId={profileId} chart={chart} />
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          animate={{ y: [0, 6, 0], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none"
          style={{ zIndex: 12 }}
        >
          <span style={{ fontFamily: "'Fragment Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)" }}>SCROLL</span>
          <svg viewBox="0 0 16 10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" className="w-4 h-2.5">
            <path d="M1 1l7 7 7-7" />
          </svg>
        </motion.div>

      </div>

      {/* Signature Card Modal */}
      <AnimatePresence>
        {showSignatureCard && chart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,10,0.88)", backdropFilter: "blur(20px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowSignatureCard(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative"
            >
              <button
                onClick={() => setShowSignatureCard(false)}
                className="absolute -top-10 right-0 text-[14px] cursor-pointer font-bold tracking-widest"
                style={{ color: "#475569" }}
              >
                âœ• CLOSE
              </button>
              <SignatureCard chart={chart} name={profileName} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>{/* end chapter 0 */}

      {/* Chapter 1 — Chart */}
      <div className="relative min-h-screen flex items-center justify-center" style={{ zIndex: 4, overflow: "hidden" }}>
        <LoopingVideo src="https://d8j0ntlcm91z4.cloudfront.net/user_3EJVjiEA4WaVDp4iCvA6Qzd9BpD/hf_20260603_160202_ae2861ec-6ea8-4772-81ff-0036e51bfdca.mp4" opacity={0.6} />
        <div className="fixed inset-0" style={{ zIndex: 3, background: "rgba(2,2,18,0.5)" }} />
        <div className="relative flex flex-col items-center justify-center gap-8 px-6 text-center" style={{ zIndex: 5 }}>
          <p className="text-[11px] font-bold tracking-[0.22em]" style={{ color: "#06b6d4", opacity: 0.7 }}>CHAPTER II</p>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 600, color: "rgba(255,255,255,0.92)", letterSpacing: "0.04em", lineHeight: 1.15 }}>The Natal Wheel</h2>
          <p className="text-base leading-relaxed" style={{ maxWidth: 480, color: "rgba(200,190,178,0.55)" }}>Your birth chart as an 8K precision map — houses, aspects, dignities, and the planetary architecture of your soul.</p>
          <Link href="/dashboard/chart">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="px-8 py-3 rounded-xl cursor-pointer text-[13px] font-bold tracking-[0.16em]" style={{ border: "1px solid rgba(6,182,212,0.25)", background: "rgba(6,182,212,0.08)", color: "#06b6d4" }}>OPEN CHART →</motion.div>
          </Link>
        </div>
      </div>

      {/* Chapter 2 — Oracle */}
      <div className="relative min-h-screen flex items-center justify-center" style={{ zIndex: 4, overflow: "hidden" }}>
        <LoopingVideo src="https://d8j0ntlcm91z4.cloudfront.net/user_3EJVjiEA4WaVDp4iCvA6Qzd9BpD/hf_20260603_160206_2beaac9d-c6a7-4aa8-9578-91aa79e900a3.mp4" opacity={0.65} />
        <div className="fixed inset-0" style={{ zIndex: 3, background: "rgba(2,2,18,0.45)" }} />
        <div className="relative flex flex-col items-center justify-center gap-8 px-6 text-center" style={{ zIndex: 5 }}>
          <p className="text-[11px] font-bold tracking-[0.22em]" style={{ color: "#a78bfa", opacity: 0.7 }}>CHAPTER III</p>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 600, color: "rgba(255,255,255,0.92)", letterSpacing: "0.04em", lineHeight: 1.15 }}>The Oracle</h2>
          <p className="text-base leading-relaxed" style={{ maxWidth: 480, color: "rgba(200,190,178,0.55)" }}>An AI astrologer that knows your chart deeply — ask anything, receive channeled delineations from the cosmos.</p>
          <Link href="/dashboard/oracle">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="px-8 py-3 rounded-xl cursor-pointer text-[13px] font-bold tracking-[0.16em]" style={{ border: "1px solid rgba(167,139,250,0.25)", background: "rgba(167,139,250,0.08)", color: "#a78bfa" }}>CONSULT ORACLE →</motion.div>
          </Link>
        </div>
      </div>

      {/* Chapter 3 — Transits */}
      <div className="relative min-h-screen flex items-center justify-center" style={{ zIndex: 4, overflow: "hidden" }}>
        <LoopingVideo src="https://d8j0ntlcm91z4.cloudfront.net/user_3EJVjiEA4WaVDp4iCvA6Qzd9BpD/hf_20260603_160850_ad65ee26-b1be-4f76-a825-d045f9c89936.mp4" opacity={0.6} />
        <div className="fixed inset-0" style={{ zIndex: 3, background: "rgba(2,2,18,0.5)" }} />
        <div className="relative flex flex-col items-center justify-center gap-8 px-6 text-center" style={{ zIndex: 5 }}>
          <p className="text-[11px] font-bold tracking-[0.22em]" style={{ color: "#f59e0b", opacity: 0.7 }}>CHAPTER IV</p>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 600, color: "rgba(255,255,255,0.92)", letterSpacing: "0.04em", lineHeight: 1.15 }}>Live Transit Forecast</h2>
          <p className="text-base leading-relaxed" style={{ maxWidth: 480, color: "rgba(200,190,178,0.55)" }}>The sky in motion against your natal positions — 3-month, 6-month, and 1-year forecasts with AI delineation.</p>
          <Link href="/dashboard/transits">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="px-8 py-3 rounded-xl cursor-pointer text-[13px] font-bold tracking-[0.16em]" style={{ border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.08)", color: "#f59e0b" }}>VIEW FORECAST →</motion.div>
          </Link>
        </div>
      </div>

      {/* Chapter 4 — Map */}
      <div className="relative min-h-screen flex items-center justify-center" style={{ zIndex: 4, overflow: "hidden" }}>
        <LoopingVideo src="https://d8j0ntlcm91z4.cloudfront.net/user_3EJVjiEA4WaVDp4iCvA6Qzd9BpD/hf_20260603_160202_ae2861ec-6ea8-4772-81ff-0036e51bfdca.mp4" opacity={0.5} />
        <div className="fixed inset-0" style={{ zIndex: 3, background: "rgba(2,2,18,0.55)" }} />
        <div className="relative flex flex-col items-center justify-center gap-8 px-6 text-center" style={{ zIndex: 5 }}>
          <p className="text-[11px] font-bold tracking-[0.22em]" style={{ color: "#22c55e", opacity: 0.7 }}>CHAPTER V</p>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 600, color: "rgba(255,255,255,0.92)", letterSpacing: "0.04em", lineHeight: 1.15 }}>Astrocartography</h2>
          <p className="text-base leading-relaxed" style={{ maxWidth: 480, color: "rgba(200,190,178,0.55)" }}>Find your power locations on Earth — planetary lines, energy scoring, and AI readings for any city on the globe.</p>
          <Link href="/dashboard/map">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="px-8 py-3 rounded-xl cursor-pointer text-[13px] font-bold tracking-[0.16em]" style={{ border: "1px solid rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.08)", color: "#22c55e" }}>EXPLORE MAP →</motion.div>
          </Link>
        </div>
      </div>

    </div>
  );
}

