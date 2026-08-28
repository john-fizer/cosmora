"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import type { ChartData, ZodiacSign } from "@/lib/astrology/types";
import { SIGN_SYMBOLS, PLANET_SYMBOLS, TRADITIONAL_RULERS } from "@/lib/astrology/types";
import { SignGlyph, PlanetGlyph } from "@/components/ui/AstroGlyph";

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
  const [hsMenuOpen, setHsMenuOpen] = useState(false);
  const [hsMenuRect, setHsMenuRect] = useState<{ left: number; right: number; top: number } | null>(null);
  const hsBtnRef = useRef<HTMLButtonElement>(null);
  const sun = chart.planets.find(p => p.name === "Sun");
  const moon = chart.planets.find(p => p.name === "Moon");
  const ascSign = chart.houses[0]?.sign;
  const chartRuler = ascSign ? TRADITIONAL_RULERS[ascSign] : null;
  const rulerPlanet = chartRuler ? chart.planets.find(p => p.name === chartRuler) : null;

  const summaryItems: { label: string; value: React.ReactNode; sub: string | null }[] = [
    { label: "NATIVE", value: profileName, sub: null },
    {
      label: "ASCENDANT",
      value: ascSign ? <span className="flex items-center gap-1"><SignGlyph sign={ascSign} size={13} />{ascSign}</span> : "—",
      sub: `${formatLon(chart.ascendant)}`,
    },
    {
      label: "SUN",
      value: sun ? <span className="flex items-center gap-1"><SignGlyph sign={sun.sign} size={13} />{sun.sign}</span> : "—",
      sub: sun ? `H${sun.house}` : null,
    },
    {
      label: "MOON",
      value: moon ? <span className="flex items-center gap-1"><SignGlyph sign={moon.sign} size={13} />{moon.sign}</span> : "—",
      sub: moon ? `H${moon.house}` : null,
    },
    {
      label: "CHART RULER",
      value: chartRuler ? <span className="flex items-center gap-1"><PlanetGlyph planet={chartRuler} size={13} />{chartRuler}</span> : "—",
      sub: rulerPlanet ? `${rulerPlanet.sign} H${rulerPlanet.house} · ${rulerPlanet.dignity}` : null,
    },
    {
      label: "SECT",
      value: chart.sect === "day" ? "☀ Day" : "☽ Night",
      sub: chart.sect === "day" ? "Jupiter leads" : "Venus leads",
    },
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
      className="flex-shrink-0 flex items-center px-6 py-3 gap-2 w-full min-w-0"
      style={{
        background: "rgba(2,2,18,0.8)",
        borderBottom: "1px solid rgba(123,111,212,0.12)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Summary pills — the only thing that scrolls now. The house system
          switcher used to live at the end of this same scrollable row,
          which meant it was invisible unless you happened to swipe all
          the way past 8 stat pills with no hint it was there. It's a
          dropdown outside the scroll area now, always visible. */}
      <div
        className="flex items-center gap-3 overflow-x-auto flex-1 min-w-0"
        style={{
          scrollbarWidth: "none",
          maskImage: "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
        }}
      >
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

      {/* House system dropdown */}
      <div className="relative flex-shrink-0">
        <button
          ref={hsBtnRef}
          onClick={() => {
            if (!recalculating) {
              if (!hsMenuOpen && hsBtnRef.current) {
                const r = hsBtnRef.current.getBoundingClientRect();
                setHsMenuRect({ left: r.left, right: r.right, top: r.bottom });
              }
              setHsMenuOpen(v => !v);
            }
          }}
          disabled={recalculating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold tracking-wider cursor-pointer transition-all duration-150 disabled:opacity-50"
          style={{
            background: "rgba(123,111,212,0.12)",
            border: "1px solid rgba(123,111,212,0.3)",
            color: "#BFB6E8",
          }}
        >
          {recalculating ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-3 h-3 rounded-full border border-t-transparent"
              style={{ borderColor: "#7B6FD4" }}
            />
          ) : (
            HOUSE_SYSTEMS.find(hs => hs.value === chart.houseSystem)?.label ?? "House System"
          )}
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3"
            style={{ transform: hsMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
            <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Portaled to document.body — same WebGL-canvas stacking quirk
            as the chart page's view picker: the 3D tab's canvas composites
            above normal DOM content regardless of z-index, so the menu is
            rendered completely outside the page's DOM tree instead. */}
        {hsMenuOpen && hsMenuRect && typeof document !== "undefined" && createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setHsMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="fixed flex flex-col gap-1 p-1.5 rounded-xl"
              style={{
                right: window.innerWidth - hsMenuRect.right, top: hsMenuRect.top + 6,
                zIndex: 9999,
                background: "rgba(10,10,26,0.98)", border: "1px solid rgba(123,111,212,0.3)",
                backdropFilter: "blur(20px)", boxShadow: "0 12px 32px rgba(0,0,0,0.5)", minWidth: 140,
              }}
            >
              {HOUSE_SYSTEMS.map(hs => (
                <button
                  key={hs.value}
                  onClick={() => { onHouseSystemChange(hs.value); setHsMenuOpen(false); }}
                  className="px-3 py-2 rounded-lg text-[13px] font-bold tracking-wider text-left cursor-pointer transition-all duration-150"
                  style={{
                    background: chart.houseSystem === hs.value ? "rgba(123,111,212,0.25)" : "transparent",
                    color: chart.houseSystem === hs.value ? "#BFB6E8" : "#94a3b8",
                  }}
                >
                  {hs.label}
                </button>
              ))}
            </motion.div>
          </>,
          document.body
        )}
      </div>
    </motion.div>
  );
}
