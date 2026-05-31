"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { ChartData } from "@/lib/astrology/types";
import { SIGN_SYMBOLS, PLANET_SYMBOLS } from "@/lib/astrology/types";

interface InsightPanelProps {
  chart?: ChartData | null;
  profileName?: string;
}

export function InsightPanel({ chart, profileName }: InsightPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const prof = chart?.annualProfection;
  const sun = chart?.planets.find(p => p.name === "Sun");
  const moon = chart?.planets.find(p => p.name === "Moon");
  const ascSign = chart?.houses[0]?.sign;

  const insightText = chart
    ? `${chart.sect === "night" ? "Night" : "Day"} chart with ${sun?.sign} Sun and ${moon?.sign} Moon rising in ${ascSign}. Age ${prof?.age} activates House ${prof?.activatedHouse} — ${prof?.activatedSign} — with ${prof?.lordOfYear} as Lord of Year. Watch ${prof?.lordOfYear}'s natal condition and transits for this year's themes.`
    : "Enter your birth data to receive a personalized cosmic reading. Cosmora will analyze your natal chart, current timing, and annual profection to illuminate where you are in your life's unfolding.";

  return (
    <div className="flex flex-col gap-3">
      {/* Profile chip */}
      <motion.div
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-3 flex items-center gap-3"
        style={{ border: "1px solid rgba(99,102,241,0.15)" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background:"linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow:"0 0 15px rgba(124,58,237,0.5)" }}
        >
          <span className="text-sm font-bold text-white">
            {profileName ? profileName[0].toUpperCase() : "?"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold tracking-wider truncate" style={{ color: "#e2e8f0" }}>
            {profileName || "NO PROFILE"}
          </p>
          <p className="text-[13px] tracking-widest" style={{ color: "#64748b" }}>
            {sun ? `${sun.sign} Sun · ${moon?.sign} Moon` : "BIRTH DATA REQUIRED"}
          </p>
        </div>
      </motion.div>

      {/* AI Insight */}
      <motion.div
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl p-4"
        style={{ border: "1px solid rgba(99,102,241,0.15)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-bold tracking-widest" style={{ color: "#94a3b8" }}>AI COSMIC INSIGHT</span>
          <span className="text-[13px] px-2 py-0.5 rounded-full" style={{
            background:"rgba(124,58,237,0.2)", color:"#a78bfa", border:"1px solid rgba(124,58,237,0.3)"
          }}>BETA</span>
        </div>
        {prof && (
          <h4 className="text-sm font-bold mb-2 tracking-wide" style={{ color: "#c4b5fd" }}>
            AGE {prof.age} · HOUSE {prof.activatedHouse} · {prof.activatedSign.toUpperCase()}
          </h4>
        )}
        <motion.p
          className="text-xs leading-relaxed mb-3"
          style={{ color: "#94a3b8" }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          {expanded ? insightText : `${insightText.slice(0, 180)}${insightText.length > 180 ? "..." : ""}`}
        </motion.p>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02, boxShadow:"0 0 20px rgba(124,58,237,0.4)" }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-2 rounded-xl text-xs font-semibold tracking-wider cursor-pointer"
            style={{
              background:"linear-gradient(135deg, rgba(124,58,237,0.4), rgba(99,102,241,0.3))",
              border:"1px solid rgba(124,58,237,0.4)", color:"#c4b5fd"
            }}
          >
            ASK COSMORA
          </motion.button>
          {insightText.length > 180 && (
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setExpanded(!expanded)}
              className="px-3 py-2 rounded-xl text-xs cursor-pointer"
              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#64748b" }}
            >
              {expanded ? "−" : "+"}
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Annual Profection */}
      {prof && (
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
          className="glass-card rounded-2xl p-4"
          style={{ border: "1px solid rgba(245,158,11,0.15)" }}
        >
          <h3 className="text-xs font-bold tracking-widest mb-3" style={{ color: "#94a3b8" }}>ANNUAL PROFECTION</h3>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.3)" }}
            >
              {SIGN_SYMBOLS[prof.activatedSign]}
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: "#fbbf24" }}>HOUSE {prof.activatedHouse} · {prof.activatedSign.toUpperCase()}</p>
              <p className="text-[13px]" style={{ color:"#64748b" }}>Lord of Year: {PLANET_SYMBOLS[prof.lordOfYear]} {prof.lordOfYear}</p>
            </div>
          </div>
          <div className="h-1 rounded-full" style={{ background:"rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full"
              style={{ background:"linear-gradient(90deg, #f59e0b, #fbbf24)", width:`${((prof.age % 12) / 12) * 100}%` }}
            />
          </div>
          <p className="text-[13px] mt-1" style={{ color:"#475569" }}>Age {prof.age} of 12-year cycle</p>
        </motion.div>
      )}

      {/* Chart aspects quick view */}
      {chart && chart.aspects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-4"
          style={{ border: "1px solid rgba(99,102,241,0.15)" }}
        >
          <h3 className="text-xs font-bold tracking-widest mb-3" style={{ color: "#94a3b8" }}>KEY ASPECTS</h3>
          <div className="space-y-2">
            {chart.aspects.slice(0, 5).map((a, i) => {
              const typeColors: Record<string, string> = {
                conjunction: "#a855f7", trine: "#22c55e", sextile: "#06b6d4",
                square: "#f59e0b", opposition: "#ef4444", quincunx: "#94a3b8",
              };
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-[14px] font-medium" style={{ color: "#c4b5fd" }}>
                    {PLANET_SYMBOLS[a.planet1]} {a.planet1}
                  </span>
                  <span className="text-[13px] px-1.5 py-0.5 rounded font-bold tracking-wider"
                    style={{ background:`${typeColors[a.type]}20`, color: typeColors[a.type], border:`1px solid ${typeColors[a.type]}30` }}>
                    {a.type.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="text-[14px] font-medium" style={{ color: "#c4b5fd" }}>
                    {PLANET_SYMBOLS[a.planet2]} {a.planet2}
                  </span>
                  <span className="text-[13px] ml-auto" style={{ color:"#475569" }}>{a.orb.toFixed(1)}°</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Lots */}
      {chart && (
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
          className="glass-card rounded-2xl p-4"
          style={{ border: "1px solid rgba(99,102,241,0.15)" }}
        >
          <h3 className="text-xs font-bold tracking-widest mb-3" style={{ color: "#94a3b8" }}>ARABIC LOTS</h3>
          {[
            { label: "Lot of Fortune", lon: chart.lotOfFortune },
            { label: "Lot of Spirit", lon: chart.lotOfSpirit },
          ].map(l => {
            const signIdx = Math.floor(l.lon / 30);
            const sign = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"][signIdx];
            const deg = (l.lon % 30).toFixed(0);
            return (
              <div key={l.label} className="flex items-center justify-between py-1">
                <span className="text-[14px]" style={{ color: "#94a3b8" }}>{l.label}</span>
                <span className="text-[14px] font-bold" style={{ color: "#c4b5fd" }}>{deg}° {sign}</span>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
