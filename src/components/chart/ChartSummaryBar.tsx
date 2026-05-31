"use client";

import { motion } from "framer-motion";
import type { ChartData } from "@/lib/astrology/types";
import { SIGN_SYMBOLS, PLANET_SYMBOLS, TRADITIONAL_RULERS } from "@/lib/astrology/types";

function formatLon(lon: number) {
  const signs = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const signIdx = Math.floor(lon / 30);
  const deg = Math.floor(lon % 30);
  return `${deg}° ${signs[signIdx]}`;
}

interface ChartSummaryBarProps {
  chart: ChartData;
  profileName: string;
  onHouseSystemChange: (hs: string) => void;
  recalculating: boolean;
}

export function ChartSummaryBar({ chart, profileName, onHouseSystemChange, recalculating }: ChartSummaryBarProps) {
  const sun = chart.planets.find(p => p.name === "Sun");
  const moon = chart.planets.find(p => p.name === "Moon");
  const ascSign = chart.houses[0]?.sign;
  const chartRuler = ascSign ? TRADITIONAL_RULERS[ascSign] : null;
  const rulerPlanet = chartRuler ? chart.planets.find(p => p.name === chartRuler) : null;

  const summaryItems = [
    { label: "NATIVE", value: profileName, sub: null },
    { label: "ASCENDANT", value: ascSign ? `${SIGN_SYMBOLS[ascSign]} ${ascSign}` : "—", sub: `${formatLon(chart.ascendant)}` },
    { label: "SUN", value: sun ? `${SIGN_SYMBOLS[sun.sign]} ${sun.sign}` : "—", sub: sun ? `H${sun.house}` : null },
    { label: "MOON", value: moon ? `${SIGN_SYMBOLS[moon.sign]} ${moon.sign}` : "—", sub: moon ? `H${moon.house}` : null },
    { label: "CHART RULER", value: chartRuler ? `${PLANET_SYMBOLS[chartRuler]} ${chartRuler}` : "—", sub: rulerPlanet ? `${rulerPlanet.sign} H${rulerPlanet.house} · ${rulerPlanet.dignity}` : null },
    { label: "SECT", value: chart.sect === "day" ? "☀ Day" : "☽ Night", sub: chart.sect === "day" ? "Jupiter leads" : "Venus leads" },
    { label: "MIDHEAVEN", value: formatLon(chart.midheaven), sub: null },
    {
      label: "PROFECTION",
      value: `House ${chart.annualProfection.activatedHouse}`,
      sub: `${chart.annualProfection.activatedSign} · Age ${chart.annualProfection.age}`,
    },
  ];

  const HOUSE_SYSTEMS = [
    { value: "whole_sign", label: "Whole Sign" },
    { value: "placidus",   label: "Placidus" },
    { value: "equal",      label: "Equal" },
    { value: "porphyry",   label: "Porphyry" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-shrink-0 flex items-center justify-between px-6 py-3 gap-4 overflow-x-auto"
      style={{
        background: "rgba(2,2,18,0.8)",
        borderBottom: "1px solid rgba(99,102,241,0.12)",
        backdropFilter: "blur(20px)",
        scrollbarWidth: "none",
      }}
    >
      {/* Summary pills */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {summaryItems.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex flex-col px-3 py-1.5 rounded-xl flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              minWidth: 72,
            }}
          >
            <span className="text-[14px] font-bold tracking-widest" style={{ color: "#475569" }}>{item.label}</span>
            <span className="text-[13px] font-semibold mt-0.5" style={{ color: "#e2e8f0" }}>{item.value}</span>
            {item.sub && <span className="text-[13px] mt-0.5 capitalize" style={{ color: "#64748b" }}>{item.sub}</span>}
          </motion.div>
        ))}
      </div>

      {/* House system switcher */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {HOUSE_SYSTEMS.map(hs => (
          <motion.button
            key={hs.value}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => !recalculating && onHouseSystemChange(hs.value)}
            disabled={recalculating}
            className="px-3 py-1.5 rounded-lg text-[13px] font-bold tracking-wider cursor-pointer transition-all duration-150 disabled:opacity-50"
            style={{
              background: chart.houseSystem === hs.value ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.03)",
              border: chart.houseSystem === hs.value ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.06)",
              color: chart.houseSystem === hs.value ? "#c4b5fd" : "#64748b",
            }}
          >
            {hs.label}
          </motion.button>
        ))}
        {recalculating && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-3 h-3 rounded-full border border-t-transparent ml-2"
            style={{ borderColor: "#7c3aed" }}
          />
        )}
      </div>
    </motion.div>
  );
}
