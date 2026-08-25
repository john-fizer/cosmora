"use client";

import { motion } from "framer-motion";
import type { ChartData, PlanetName } from "@/lib/astrology/types";
import { PLANET_SYMBOLS } from "@/lib/astrology/types";

const ASPECT_CONFIG = {
  conjunction: { symbol: "☌", color: "#9C8AC4", label: "Conjunction", meaning: "Merger of energies — intense, unified" },
  opposition:  { symbol: "☍", color: "#ef4444", label: "Opposition",  meaning: "Tension across the axis — awareness through conflict" },
  trine:       { symbol: "△", color: "#22c55e", label: "Trine",       meaning: "Flowing harmony — natural talent and ease" },
  square:      { symbol: "□", color: "#f59e0b", label: "Square",      meaning: "Dynamic tension — growth through friction" },
  sextile:     { symbol: "⚹", color: "#06b6d4", label: "Sextile",     meaning: "Opportunity — requires effort to activate" },
  quincunx:    { symbol: "⚻", color: "#94a3b8", label: "Quincunx",    meaning: "Adjustment — incongruent energies requiring integration" },
};

const PLANET_COLORS: Record<PlanetName, string> = {
  Sun:"#fbbf24", Moon:"#94a3b8", Mercury:"#a78bfa", Venus:"#f472b6",
  Mars:"#ef4444", Jupiter:"#f59e0b", Saturn:"#6b7280", Uranus:"#06b6d4",
  Neptune:"#3b82f6", Pluto:"#7B6FD4", NorthNode:"#64748b", Chiron:"#7B6FD4",
};

type AspectType = keyof typeof ASPECT_CONFIG;

interface AspectsTableProps {
  chart: ChartData;
  selectedPlanet?: PlanetName | null;
}

export function AspectsTable({ chart, selectedPlanet }: AspectsTableProps) {
  const sorted = [...chart.aspects].sort((a, b) => a.orb - b.orb);
  const filtered = selectedPlanet
    ? sorted.filter(a => a.planet1 === selectedPlanet || a.planet2 === selectedPlanet)
    : sorted;

  const grouped = Object.keys(ASPECT_CONFIG).reduce<Record<string, typeof sorted>>((acc, type) => {
    acc[type] = filtered.filter(a => a.type === type);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col">
      {/* Legend */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {Object.entries(ASPECT_CONFIG).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="text-base font-bold" style={{ color: cfg.color }}>{cfg.symbol}</span>
            <span className="text-[13px] font-medium" style={{ color: "#64748b" }}>{cfg.label}</span>
          </div>
        ))}
        {selectedPlanet && (
          <span className="ml-auto text-[13px] px-2 py-1 rounded-lg"
            style={{ background: "rgba(123,111,212,0.15)", color: "#a78bfa", border: "1px solid rgba(123,111,212,0.3)" }}>
            Filtering: {selectedPlanet}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-[14px]" style={{ color: "#334155" }}>No aspects found</p>
          </div>
        ) : (
          Object.entries(grouped).map(([type, aspects]) => {
            if (aspects.length === 0) return null;
            const cfg = ASPECT_CONFIG[type as AspectType];
            return (
              <div key={type}>
                {/* Group header */}
                <div className="px-4 py-2 flex items-center gap-2"
                  style={{ background: `${cfg.color}08`, borderBottom: `1px solid ${cfg.color}15` }}>
                  <span className="text-base" style={{ color: cfg.color }}>{cfg.symbol}</span>
                  <span className="text-[13px] font-bold tracking-widest" style={{ color: cfg.color }}>
                    {cfg.label.toUpperCase()} ({aspects.length})
                  </span>
                  <span className="text-[13px] ml-1" style={{ color: "#475569" }}>{cfg.meaning}</span>
                </div>

                {aspects.map((asp, i) => {
                  const p1color = PLANET_COLORS[asp.planet1];
                  const p2color = PLANET_COLORS[asp.planet2];
                  const isHighlighted = selectedPlanet &&
                    (asp.planet1 === selectedPlanet || asp.planet2 === selectedPlanet);

                  return (
                    <motion.div
                      key={`${asp.planet1}-${asp.type}-${asp.planet2}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-center gap-2 flex-wrap px-4 py-2.5 transition-all duration-150"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                        background: isHighlighted ? `${cfg.color}08` : "transparent",
                        borderLeft: asp.exact ? `2px solid ${cfg.color}60` : "2px solid transparent",
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[14px]" style={{ color: p1color }}>{PLANET_SYMBOLS[asp.planet1]}</span>
                        <span className="text-[13px] font-medium" style={{ color: "#cbd5e1" }}>{asp.planet1}</span>
                      </span>

                      <span className="text-base font-bold" style={{ color: cfg.color }}>{cfg.symbol}</span>

                      <span className="flex items-center gap-2">
                        <span className="text-[14px]" style={{ color: p2color }}>{PLANET_SYMBOLS[asp.planet2]}</span>
                        <span className="text-[13px] font-medium" style={{ color: "#cbd5e1" }}>{asp.planet2}</span>
                      </span>

                      <span className="text-[13px] font-mono" style={{ color: asp.orb < 1 ? cfg.color : "#64748b" }}>
                        {asp.orb.toFixed(1)}°
                      </span>

                      {asp.exact && (
                        <span className="text-[13px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: `${cfg.color}20`, color: cfg.color }}>EXACT</span>
                      )}

                      <span className="text-[13px]" style={{ color: asp.applying ? "#22c55e" : "#64748b" }}>
                        {asp.applying ? "▲ Appl." : "▼ Sep."}
                      </span>

                      <span className="text-[13px] leading-tight ml-auto" style={{ color: "#475569" }}>
                        {asp.planet1} + {asp.planet2} themes
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
