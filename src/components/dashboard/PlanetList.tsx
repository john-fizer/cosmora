"use client";

import { motion } from "framer-motion";
import type { ChartData, PlanetName } from "@/lib/astrology/types";
import { PLANET_SYMBOLS, SIGN_SYMBOLS } from "@/lib/astrology/types";

const PLANET_COLORS: Record<PlanetName, string> = {
  Sun: "#fbbf24", Moon: "#94a3b8", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8", Uranus: "#06b6d4",
  Neptune: "#3b82f6", Pluto: "#8b5cf6", NorthNode: "#64748b", Chiron: "#6366f1",
};

const DIGNITY_COLORS: Record<string, string> = {
  domicile: "#22c55e", exaltation: "#86efac",
  detriment: "#f97316", fall: "#ef4444", peregrine: "#475569",
};

interface PlanetListProps {
  chart?: ChartData | null;
  loading?: boolean;
}

export function PlanetList({ chart, loading }: PlanetListProps) {
  const planets = chart?.planets ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl p-4"
      style={{ border: "1px solid rgba(99,102,241,0.15)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold tracking-widest" style={{ color: "#94a3b8" }}>CURRENT ENERGIES</h3>
        {chart && (
          <span className="text-[13px] tracking-widest capitalize" style={{ color: "#475569" }}>
            {chart.sect} chart
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-7 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      ) : planets.length === 0 ? (
        <p className="text-[13px] text-center py-4" style={{ color: "#475569" }}>
          No chart data. Create a birth profile to see your planets.
        </p>
      ) : (
        <div className="space-y-0.5">
          {planets.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.04 }}
              whileHover={{ x: 3, backgroundColor: "rgba(124,58,237,0.08)" }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors duration-150"
            >
              <span className="text-[14px] w-5 text-center" style={{ color: PLANET_COLORS[p.name] }}>
                {PLANET_SYMBOLS[p.name]}
              </span>
              <span className="text-[14px] font-semibold tracking-wider flex-1" style={{ color: "#cbd5e1" }}>
                {p.name.toUpperCase()}{p.retrograde ? " ℞" : ""}
              </span>
              <span className="text-[14px]" style={{ color: "#94a3b8" }}>
                {p.signDegree.toFixed(0)}°
              </span>
              <span className="text-[13px]" style={{ color: PLANET_COLORS[p.name] }}>
                {SIGN_SYMBOLS[p.sign]}
              </span>
              <span className="text-[13px] px-1.5 py-0.5 rounded-full" style={{ background:"rgba(99,102,241,0.15)", color:"#818cf8" }}>
                H{p.house}
              </span>
              {p.dignity && p.dignity !== "peregrine" && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: DIGNITY_COLORS[p.dignity] }} title={p.dignity} />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
