"use client";

import { motion } from "framer-motion";
import type { ChartData, PlanetName } from "@/lib/astrology/types";
import { PLANET_SYMBOLS, SIGN_SYMBOLS, TRADITIONAL_RULERS } from "@/lib/astrology/types";
import { SignGlyph, PlanetGlyph } from "@/components/ui/AstroGlyph";

const PLANET_COLORS: Record<PlanetName, string> = {
  Sun: "#fbbf24", Moon: "#94a3b8", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#6b7280", Uranus: "#06b6d4",
  Neptune: "#3b82f6", Pluto: "#7B6FD4", NorthNode: "#64748b", Chiron: "#7B6FD4",
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
      {/* Rows — stacked two-line cards instead of a 7-column grid. The grid
          version had DIGNITY/ANGULARITY/SPEED getting squeezed past the
          visible edge on mobile with no way to reach them (fr columns
          always sum to the container width, but badge/text content inside
          each column doesn't shrink to match, so it overflows unclipped
          until it hits the row's own right edge). */}
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
              className="px-4 py-3 cursor-pointer transition-all duration-150"
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: isSelected ? `${color}10` : "transparent",
                borderLeft: isSelected ? `2px solid ${color}` : "2px solid transparent",
              }}
              whileHover={{ background: `${color}08` }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <PlanetGlyph planet={p.name} color={color} size={18} />
                <span className="text-[13px] font-semibold" style={{ color: "#e2e8f0" }}>{p.name}</span>
                {p.retrograde && (
                  <span className="text-[13px] font-bold" style={{ color: "#f97316" }}>℞</span>
                )}
                {mutualReceptions.has(p.name) && (
                  <span className="text-[13px] font-bold px-1 py-0.5 rounded" title="Mutual Reception"
                    style={{ background: "rgba(123,111,212,0.15)", color: "#818cf8" }}>⇄</span>
                )}
                <span className="text-[13px] font-mono font-medium" style={{ color: "#94a3b8" }}>
                  {formatDegree(p.longitude)}
                </span>
                <span className="flex items-center gap-1.5">
                  <SignGlyph sign={p.sign} size={16} />
                  <span className="text-[13px]" style={{ color }}>{p.sign}</span>
                </span>
                <span
                  className="text-[13px] font-bold px-2 py-0.5 rounded-lg ml-auto"
                  style={{
                    background: "rgba(123,111,212,0.15)",
                    color: "#818cf8",
                    border: "1px solid rgba(123,111,212,0.2)",
                  }}
                >
                  H{p.house}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                {p.dignity && (
                  <span
                    className="text-[13px] font-bold px-2 py-0.5 rounded-lg tracking-wide"
                    style={{
                      background: dignityConf.bg,
                      color: dignityConf.color,
                      border: `1px solid ${dignityConf.color}30`,
                    }}
                  >
                    {dignityConf.label.toUpperCase()}
                  </span>
                )}
                <span className="text-[13px]" style={{ color: "#475569" }}>
                  {ANGULARITY[p.house]}
                </span>
                <span
                  className="text-[13px] font-mono"
                  style={{ color: p.retrograde ? "#f97316" : "#64748b" }}
                >
                  {p.speed > 0 ? "+" : ""}{p.speed.toFixed(2)}°/day
                </span>
              </div>
            </motion.div>
          );
        })}

        {/* Lots */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[13px] font-bold tracking-widest mb-2" style={{ color: "#475569" }}>ARABIC LOTS</p>
        </div>
        {[
          { label: "Lot of Fortune", lon: chart.lotOfFortune, color: "#f59e0b", symbol: "⊕" },
          { label: "Lot of Spirit",  lon: chart.lotOfSpirit,  color: "#9C8AC4", symbol: "⊗" },
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
              className="flex items-center gap-2 flex-wrap px-4 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <span className="text-base" style={{ color: lot.color }}>{lot.symbol}</span>
              <span className="text-[13px] font-semibold" style={{ color: "#94a3b8" }}>{lot.label}</span>
              <span className="text-[13px] font-mono" style={{ color: "#94a3b8" }}>{formatDegree(lot.lon)}</span>
              <span className="flex items-center gap-1.5">
                <SignGlyph sign={sign as import("@/lib/astrology/types").ZodiacSign} size={14} />
                <span className="text-[13px]" style={{ color: "#cbd5e1" }}>{sign}</span>
              </span>
              <span className="text-[13px] font-bold px-2 py-0.5 rounded-lg ml-auto"
                style={{ background:"rgba(123,111,212,0.15)", color:"#818cf8" }}>
                H{houseIdx + 1}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
