"use client";

import { motion } from "framer-motion";
import type { ChartData, PlanetName } from "@/lib/astrology/types";
import { PLANET_SYMBOLS, SIGN_SYMBOLS, TRADITIONAL_RULERS } from "@/lib/astrology/types";

const PLANET_COLORS: Record<PlanetName, string> = {
  Sun: "#fbbf24", Moon: "#94a3b8", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#6b7280", Uranus: "#06b6d4",
  Neptune: "#3b82f6", Pluto: "#8b5cf6", NorthNode: "#64748b", Chiron: "#6366f1",
};

const DIGNITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  domicile:   { label: "Domicile",   color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  exaltation: { label: "Exaltation", color: "#86efac", bg: "rgba(134,239,172,0.1)" },
  detriment:  { label: "Detriment",  color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  fall:       { label: "Fall",       color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
  peregrine:  { label: "Peregrine",  color: "#475569", bg: "rgba(71,85,105,0.1)"   },
};

const ANGULARITY: Record<number, string> = {
  1: "Angular", 4: "Angular", 7: "Angular", 10: "Angular",
  2: "Succedent", 5: "Succedent", 8: "Succedent", 11: "Succedent",
  3: "Cadent", 6: "Cadent", 9: "Cadent", 12: "Cadent",
};

function formatDegree(lon: number): string {
  const deg = Math.floor(lon % 30);
  const min = Math.floor(((lon % 30) - deg) * 60);
  return `${deg}°${String(min).padStart(2, "0")}′`;
}

interface PositionsTableProps {
  chart: ChartData;
  onSelectPlanet?: (name: PlanetName | null) => void;
  selectedPlanet?: PlanetName | null;
  onPlanetNavigate?: (name: PlanetName) => void;
}

function findMutualReceptions(chart: ChartData): Set<PlanetName> {
  const set = new Set<PlanetName>();
  const planets = chart.planets.slice(0, 10);
  for (const a of planets) {
    const aRuler = TRADITIONAL_RULERS[a.sign];
    const b = planets.find(p => p.name === aRuler);
    if (!b) continue;
    const bRuler = TRADITIONAL_RULERS[b.sign];
    if (bRuler === a.name && a.name !== b.name) {
      set.add(a.name);
      set.add(b.name);
    }
  }
  return set;
}

export function PositionsTable({ chart, onSelectPlanet, selectedPlanet, onPlanetNavigate }: PositionsTableProps) {
  const mutualReceptions = findMutualReceptions(chart);
  return (
    <div className="h-full flex flex-col">
      {/* Column headers */}
      <div
        className="grid gap-2 px-4 py-2 text-[9px] font-bold tracking-widest flex-shrink-0"
        style={{
          color: "#475569",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          gridTemplateColumns: "1.2fr 1fr 1.1fr 0.7fr 1fr 0.9fr 0.7fr",
        }}
      >
        <span>PLANET</span>
        <span>POSITION</span>
        <span>SIGN</span>
        <span>HOUSE</span>
        <span>DIGNITY</span>
        <span>ANGULARITY</span>
        <span>SPEED</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        {chart.planets.map((p, i) => {
          const isSelected = selectedPlanet === p.name;
          const dignityConf = DIGNITY_CONFIG[p.dignity ?? "peregrine"];
          const color = PLANET_COLORS[p.name];

          return (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => {
                onSelectPlanet?.(isSelected ? null : p.name);
                onPlanetNavigate?.(p.name);
              }}
              className="grid gap-2 px-4 py-3 cursor-pointer transition-all duration-150"
              style={{
                gridTemplateColumns: "1.2fr 1fr 1.1fr 0.7fr 1fr 0.9fr 0.7fr",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: isSelected
                  ? `${color}10`
                  : "transparent",
                borderLeft: isSelected ? `2px solid ${color}` : "2px solid transparent",
              }}
              whileHover={{ background: `${color}08` }}
            >
              {/* Planet */}
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none" style={{ color }}>{PLANET_SYMBOLS[p.name]}</span>
                <div>
                  <span className="text-xs font-semibold" style={{ color: "#e2e8f0" }}>{p.name}</span>
                  {p.retrograde && (
                    <span className="ml-1 text-[9px] font-bold" style={{ color: "#f97316" }}>℞</span>
                  )}
                  {mutualReceptions.has(p.name) && (
                    <span className="ml-1 text-[8px] font-bold px-1 py-0.5 rounded" title="Mutual Reception"
                      style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>⇄</span>
                  )}
                </div>
              </div>

              {/* Position */}
              <div className="flex items-center">
                <span className="text-xs font-mono font-medium" style={{ color: "#94a3b8" }}>
                  {formatDegree(p.longitude)}
                </span>
              </div>

              {/* Sign */}
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none" style={{ color }}>{SIGN_SYMBOLS[p.sign]}</span>
                <span className="text-xs" style={{ color: "#cbd5e1" }}>{p.sign}</span>
              </div>

              {/* House */}
              <div className="flex items-center">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-lg"
                  style={{
                    background: "rgba(99,102,241,0.15)",
                    color: "#818cf8",
                    border: "1px solid rgba(99,102,241,0.2)",
                  }}
                >
                  {p.house}
                </span>
              </div>

              {/* Dignity */}
              <div className="flex items-center">
                {p.dignity && (
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-lg tracking-wide"
                    style={{
                      background: dignityConf.bg,
                      color: dignityConf.color,
                      border: `1px solid ${dignityConf.color}30`,
                    }}
                  >
                    {dignityConf.label.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Angularity */}
              <div className="flex items-center">
                <span className="text-[9px]" style={{ color: "#475569" }}>
                  {ANGULARITY[p.house]}
                </span>
              </div>

              {/* Speed */}
              <div className="flex items-center">
                <span
                  className="text-[10px] font-mono"
                  style={{ color: p.retrograde ? "#f97316" : "#64748b" }}
                >
                  {p.speed > 0 ? "+" : ""}{p.speed.toFixed(2)}°
                </span>
              </div>
            </motion.div>
          );
        })}

        {/* Lots */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[9px] font-bold tracking-widest mb-2" style={{ color: "#475569" }}>ARABIC LOTS</p>
        </div>
        {[
          { label: "Lot of Fortune", lon: chart.lotOfFortune, color: "#f59e0b", symbol: "⊕" },
          { label: "Lot of Spirit",  lon: chart.lotOfSpirit,  color: "#a855f7", symbol: "⊗" },
        ].map((lot, i) => {
          const signIdx = Math.floor(lot.lon / 30);
          const signs = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
          const sign = signs[signIdx];
          const houseIdx = chart.houses.findIndex(h => {
            const next = chart.houses[(chart.houses.indexOf(h) + 1) % 12];
            const nLon = next.longitude;
            const cLon = h.longitude;
            if (nLon > cLon) return lot.lon >= cLon && lot.lon < nLon;
            return lot.lon >= cLon || lot.lon < nLon;
          });

          return (
            <motion.div
              key={lot.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="grid gap-2 px-4 py-3"
              style={{
                gridTemplateColumns: "1.2fr 1fr 1.1fr 0.7fr 1fr 0.9fr 0.7fr",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base" style={{ color: lot.color }}>{lot.symbol}</span>
                <span className="text-xs font-semibold" style={{ color: "#94a3b8" }}>{lot.label}</span>
              </div>
              <div className="flex items-center">
                <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>{formatDegree(lot.lon)}</span>
              </div>
              <div className="flex items-center">
                <span className="text-xs" style={{ color: "#cbd5e1" }}>{sign}</span>
              </div>
              <div className="flex items-center">
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                  style={{ background:"rgba(99,102,241,0.15)", color:"#818cf8" }}>
                  {houseIdx + 1}
                </span>
              </div>
              <div /><div /><div />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
