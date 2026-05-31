"use client";

import { motion } from "framer-motion";
import type { ChartData, ZodiacSign } from "@/lib/astrology/types";

const ELEMENT_SIGNS: Record<string, ZodiacSign[]> = {
  Fire: ["Aries", "Leo", "Sagittarius"],
  Earth: ["Taurus", "Virgo", "Capricorn"],
  Air: ["Gemini", "Libra", "Aquarius"],
  Water: ["Cancer", "Scorpio", "Pisces"],
};

const ELEMENT_COLORS: Record<string, string> = {
  Fire: "#ef4444", Earth: "#22c55e", Air: "#06b6d4", Water: "#8b5cf6",
};

function computeElements(chart: ChartData | null | undefined) {
  const counts: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  if (!chart) return counts;
  for (const planet of chart.planets) {
    for (const [el, signs] of Object.entries(ELEMENT_SIGNS)) {
      if (signs.includes(planet.sign)) counts[el]++;
    }
  }
  return counts;
}

interface ElementsBalanceProps {
  chart?: ChartData | null;
}

export function ElementsBalance({ chart }: ElementsBalanceProps) {
  const counts = computeElements(chart);
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const elements = Object.entries(ELEMENT_COLORS).map(([name, color]) => ({
    name, color, count: counts[name], pct: Math.round((counts[name] / total) * 100),
  }));

  const cx = 60, cy = 60, r = 40;
  const v = [
    { x: cx, y: cy - r },
    { x: cx + r * Math.cos(Math.PI / 6), y: cy + r * Math.sin(Math.PI / 6) },
    { x: cx - r * Math.cos(Math.PI / 6), y: cy + r * Math.sin(Math.PI / 6) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
      className="glass-card rounded-2xl p-4"
      style={{ border: "1px solid rgba(99,102,241,0.15)" }}
    >
      <h3 className="text-xs font-bold tracking-widest mb-3" style={{ color: "#94a3b8" }}>ELEMENTS BALANCE</h3>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="triGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <polygon points={v.map(p => `${p.x},${p.y}`).join(" ")} fill="url(#triGrad)" opacity="0.15" />
            <polygon points={v.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="rgba(124,58,237,0.4)" strokeWidth="1" />
            <polygon
              points={`${cx},${cy + r * 0.6} ${cx - r * 0.52},${cy - r * 0.3} ${cx + r * 0.52},${cy - r * 0.3}`}
              fill="none" stroke="rgba(6,182,212,0.4)" strokeWidth="1"
            />
            <motion.circle cx={cx} cy={cy} r="4" fill="#7c3aed"
              animate={{ scale:[1,1.3,1] }} transition={{ duration:2, repeat:Infinity }}
              style={{ originX:`${cx}px`, originY:`${cy}px` }}
            />
            {v.map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r="3" fill={ELEMENT_COLORS[Object.keys(ELEMENT_COLORS)[i]]} opacity="0.8" />
            ))}
          </svg>
        </div>
        <div className="flex-1 space-y-2">
          {elements.map((el, i) => (
            <div key={el.name}>
              <div className="flex justify-between">
                <span className="text-[13px] font-bold tracking-wider" style={{ color: el.color }}>{el.name.toUpperCase()}</span>
                <span className="text-[13px]" style={{ color: "#94a3b8" }}>{el.pct}%</span>
              </div>
              <div className="h-1 rounded-full" style={{ background:"rgba(255,255,255,0.06)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: el.color, opacity: 0.7 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${el.pct}%` }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
          <p className="text-[13px] text-center tracking-widest mt-2" style={{ color: "#64748b" }}>
            {Object.entries(counts).reduce((a, [k, v]) => v > a[1] ? [k, v] : a, ["", 0])[0].toUpperCase()} DOMINANT
          </p>
        </div>
      </div>
    </motion.div>
  );
}
