"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardBg } from "@/components/ui/DashboardBg";
import {
  SIGN_SYMBOLS, PLANET_SYMBOLS, ZODIAC_SIGNS, TRADITIONAL_RULERS,
} from "@/lib/astrology/types";
import type { ChartData, ZodiacSign, PlanetName } from "@/lib/astrology/types";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import type { StoredProfile } from "@/lib/storage";
import { calculateProgressions, calculateFirdaria } from "@/lib/astrology/calculator";
import type { ProgressedPlanet, FirdarPeriod } from "@/lib/astrology/calculator";

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Hellenistic zodiacal releasing period lengths (years per sign)
const ZR_YEARS: Record<ZodiacSign, number> = {
  Aries: 15, Taurus: 8, Gemini: 20, Cancer: 25,
  Leo: 19, Virgo: 20, Libra: 8, Scorpio: 15,
  Sagittarius: 12, Capricorn: 27, Aquarius: 30, Pisces: 12,
};

const PLANET_COLORS: Partial<Record<PlanetName, string>> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#8b5cf6",
};

const SIGN_COLORS: Record<ZodiacSign, string> = {
  Aries: "#ef4444", Taurus: "#22c55e", Gemini: "#eab308", Cancer: "#38bdf8",
  Leo: "#f97316", Virgo: "#4ade80", Libra: "#facc15", Scorpio: "#dc2626",
  Sagittarius: "#f59e0b", Capricorn: "#94a3b8", Aquarius: "#06b6d4", Pisces: "#8b5cf6",
};

const ELEMENT_LABEL: Record<ZodiacSign, "Fire" | "Earth" | "Air" | "Water"> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};

const HOUSE_THEMES: Record<number, string> = {
  1: "Identity", 2: "Resources", 3: "Mind", 4: "Roots",
  5: "Creativity", 6: "Health", 7: "Relationships", 8: "Transformation",
  9: "Wisdom", 10: "Career", 11: "Community", 12: "Shadow",
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function signIndex(sign: ZodiacSign): number {
  return ZODIAC_SIGNS.indexOf(sign);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function addYearsToDate(d: Date, years: number): Date {
  const result = new Date(d);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

// â”€â”€â”€ Data builders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ProfectionYear {
  age: number;
  activatedHouse: number;
  activatedSign: ZodiacSign;
  lordOfYear: PlanetName;
  yearStart: Date;
  yearEnd: Date;
  isCurrent: boolean;
  isPast: boolean;
}

function buildProfectionTimeline(birthDatetime: string, ascLon: number): ProfectionYear[] {
  const birth = new Date(birthDatetime);
  const today = new Date();
  const ascSignIdx = Math.floor(ascLon / 30);

  return Array.from({ length: 84 }, (_, age) => {
    const activatedSignIdx = (ascSignIdx + age) % 12;
    const activatedSign = ZODIAC_SIGNS[activatedSignIdx];
    const lordOfYear = TRADITIONAL_RULERS[activatedSign];
    const activatedHouse = (age % 12) + 1;

    const yearStart = new Date(birth);
    yearStart.setUTCFullYear(birth.getUTCFullYear() + age);
    const yearEnd = new Date(birth);
    yearEnd.setUTCFullYear(birth.getUTCFullYear() + age + 1);

    return {
      age,
      activatedHouse,
      activatedSign,
      lordOfYear,
      yearStart,
      yearEnd,
      isCurrent: today >= yearStart && today < yearEnd,
      isPast: today >= yearEnd,
    };
  });
}

interface ZRPeriod {
  sign: ZodiacSign;
  start: Date;
  end: Date;
  years: number;
  isCurrent: boolean;
  isPast: boolean;
}

function buildZRPeriods(lotLon: number, birthDatetime: string, numPeriods = 24): {
  l1: ZRPeriod[];
  l2: ZRPeriod[];
  currentL1: ZRPeriod | undefined;
} {
  const birth = new Date(birthDatetime);
  const today = new Date();
  const startIdx = Math.floor(lotLon / 30);

  // Level 1 periods
  const l1: ZRPeriod[] = [];
  let cursor = new Date(birth);
  let idx = startIdx;
  for (let i = 0; i < numPeriods; i++) {
    const sign = ZODIAC_SIGNS[idx % 12];
    const years = ZR_YEARS[sign];
    const end = new Date(cursor.getTime() + years * 365.25 * 86400000);
    l1.push({
      sign, years, start: new Date(cursor), end,
      isCurrent: today >= cursor && today < end,
      isPast: today >= end,
    });
    cursor = end;
    idx++;
  }

  const currentL1 = l1.find(p => p.isCurrent);

  // Level 2 sub-periods within the current L1 period
  const l2: ZRPeriod[] = [];
  if (currentL1) {
    const l1TotalMs = currentL1.end.getTime() - currentL1.start.getTime();
    const l1Years = ZR_YEARS[currentL1.sign];
    let l2Cursor = new Date(currentL1.start);
    let l2Idx = signIndex(currentL1.sign);
    let guard = 0;

    while (l2Cursor < currentL1.end && guard < 40) {
      guard++;
      const sign = ZODIAC_SIGNS[l2Idx % 12];
      const l2Years = ZR_YEARS[sign];
      const l2Ms = (l2Years / l1Years) * l1TotalMs;
      const rawEnd = new Date(l2Cursor.getTime() + l2Ms);
      const end = rawEnd < currentL1.end ? rawEnd : new Date(currentL1.end);
      l2.push({
        sign, years: l2Years, start: new Date(l2Cursor), end,
        isCurrent: today >= l2Cursor && today < end,
        isPast: today >= end,
      });
      l2Cursor = end;
      l2Idx++;
    }
  }

  return { l1, l2, currentL1 };
}

// â”€â”€â”€ Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-bold tracking-[0.2em] uppercase" style={{ color: "#06b6d4" }}>
          {label}
        </span>
        {sub && <span className="text-[13px]" style={{ color: "#334155" }}>{sub}</span>}
      </div>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(6,182,212,0.2), transparent)" }} />
    </div>
  );
}

function CurrentTimingCard({ profection, chart }: { profection: ProfectionYear; chart: ChartData }) {
  const lordPlanet = chart.planets.find(p => p.name === profection.lordOfYear);
  const lordColor = PLANET_COLORS[profection.lordOfYear] ?? "#94a3b8";
  const signColor = SIGN_COLORS[profection.activatedSign];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl p-5 mb-6"
      style={{
        background: "rgba(124,58,237,0.08)",
        border: "1px solid rgba(124,58,237,0.25)",
        boxShadow: "0 0 40px rgba(124,58,237,0.1), inset 0 0 40px rgba(124,58,237,0.03)",
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[13px] font-bold tracking-widest mb-1" style={{ color: "#7c3aed" }}>
            CURRENT PROFECTION YEAR
          </p>
          <h2 className="text-2xl font-bold font-title" style={{ color: "#e2e8f0" }}>
            Age {profection.age}
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className="text-[13px] font-semibold px-2 py-0.5 rounded-lg"
              style={{ background: `${signColor}18`, color: signColor, border: `1px solid ${signColor}30` }}
            >
              {SIGN_SYMBOLS[profection.activatedSign]} {profection.activatedSign}
            </span>
            <span className="text-[13px]" style={{ color: "#475569" }}>
              House {profection.activatedHouse} Â· {HOUSE_THEMES[profection.activatedHouse]}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <p className="text-[13px] tracking-widest font-bold" style={{ color: "#475569" }}>LORD OF THE YEAR</p>
          <div className="flex items-center gap-1.5">
            <span className="text-xl" style={{ color: lordColor }}>
              {PLANET_SYMBOLS[profection.lordOfYear]}
            </span>
            <span className="text-[14px] font-bold" style={{ color: lordColor }}>
              {profection.lordOfYear}
            </span>
          </div>
          {lordPlanet && (
            <span className="text-[13px]" style={{ color: "#475569" }}>
              {SIGN_SYMBOLS[lordPlanet.sign]} {lordPlanet.sign} Â· H{lordPlanet.house}
              {lordPlanet.dignity === "domicile" && " Â· Domicile"}
              {lordPlanet.dignity === "exaltation" && " Â· Exalted"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 grid grid-cols-2 md:grid-cols-4 gap-3" style={{ borderTop: "1px solid rgba(124,58,237,0.1)" }}>
        <div>
          <p className="text-[14px] tracking-widest mb-1" style={{ color: "#334155" }}>STARTED</p>
          <p className="text-[13px] font-medium" style={{ color: "#94a3b8" }}>{formatDate(profection.yearStart)}</p>
        </div>
        <div>
          <p className="text-[14px] tracking-widest mb-1" style={{ color: "#334155" }}>ENDS</p>
          <p className="text-[13px] font-medium" style={{ color: "#94a3b8" }}>{formatDate(profection.yearEnd)}</p>
        </div>
        <div>
          <p className="text-[14px] tracking-widest mb-1" style={{ color: "#334155" }}>ELEMENT</p>
          <p className="text-[13px] font-medium" style={{ color: signColor }}>{ELEMENT_LABEL[profection.activatedSign]}</p>
        </div>
        <div>
          <p className="text-[14px] tracking-widest mb-1" style={{ color: "#334155" }}>SECT</p>
          <p className="text-[13px] font-medium" style={{ color: chart.sect === "day" ? "#fbbf24" : "#c4b5fd" }}>
            {chart.sect === "day" ? "Day" : "Night"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ProfectionCard({ year, onClick, isSelected }: {
  year: ProfectionYear;
  onClick: () => void;
  isSelected: boolean;
}) {
  const lordColor = PLANET_COLORS[year.lordOfYear] ?? "#94a3b8";
  const signColor = SIGN_COLORS[year.activatedSign];
  const isActive = year.isCurrent || isSelected;

  return (
    <motion.button
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="flex-shrink-0 flex flex-col items-center gap-1.5 p-2.5 rounded-xl cursor-pointer transition-all duration-200 text-center"
      style={{
        width: 72,
        background: year.isCurrent
          ? "rgba(124,58,237,0.18)"
          : isSelected
          ? "rgba(255,255,255,0.06)"
          : year.isPast
          ? "rgba(255,255,255,0.015)"
          : "rgba(255,255,255,0.03)",
        border: year.isCurrent
          ? "1px solid rgba(124,58,237,0.45)"
          : isSelected
          ? "1px solid rgba(99,102,241,0.3)"
          : "1px solid rgba(255,255,255,0.05)",
        opacity: year.isPast && !year.isCurrent && !isSelected ? 0.5 : 1,
        boxShadow: year.isCurrent ? "0 0 20px rgba(124,58,237,0.2)" : "none",
      }}
    >
      <span
        className="text-[14px] font-bold tracking-widest"
        style={{ color: year.isCurrent ? "#a78bfa" : "#334155" }}
      >
        AGE {year.age}
      </span>
      <span className="text-base leading-none" style={{ color: signColor }}>
        {SIGN_SYMBOLS[year.activatedSign]}
      </span>
      <span className="text-[13px] font-medium" style={{ color: lordColor }}>
        {year.lordOfYear.substring(0, 3).toUpperCase()}
      </span>
      <span
        className="text-[14px] tracking-wider font-bold"
        style={{ color: year.isCurrent ? "#7c3aed" : "#1e293b" }}
      >
        H{year.activatedHouse}
      </span>
    </motion.button>
  );
}

function ProfectionDetail({ year, chart }: { year: ProfectionYear; chart: ChartData }) {
  const lordPlanet = chart.planets.find(p => p.name === year.lordOfYear);
  const lordColor = PLANET_COLORS[year.lordOfYear] ?? "#94a3b8";
  const signColor = SIGN_COLORS[year.activatedSign];

  return (
    <motion.div
      key={year.age}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 mt-3"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(99,102,241,0.15)",
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[13px] tracking-widest font-bold mb-1" style={{ color: "#334155" }}>
            AGE {year.age} Â· {formatDate(year.yearStart)} â€“ {formatDate(year.yearEnd)}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold" style={{ color: signColor }}>
              {SIGN_SYMBOLS[year.activatedSign]} {year.activatedSign}
            </span>
            <span className="text-[13px]" style={{ color: "#475569" }}>
              House {year.activatedHouse} Â· {HOUSE_THEMES[year.activatedHouse]}
            </span>
            <span className="text-[13px] px-1.5 py-0.5 rounded" style={{
              background: `${signColor}15`, color: signColor,
            }}>
              {ELEMENT_LABEL[year.activatedSign]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] tracking-widest" style={{ color: "#334155" }}>LORD</span>
          <span className="text-lg" style={{ color: lordColor }}>{PLANET_SYMBOLS[year.lordOfYear]}</span>
          <div>
            <p className="text-[13px] font-bold" style={{ color: lordColor }}>{year.lordOfYear}</p>
            {lordPlanet && (
              <p className="text-[13px]" style={{ color: "#475569" }}>
                {SIGN_SYMBOLS[lordPlanet.sign]} {lordPlanet.sign} H{lordPlanet.house}
                {lordPlanet.dignity && ` Â· ${lordPlanet.dignity}`}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ZRBar({ periods, level, title }: {
  periods: ZRPeriod[];
  level: 1 | 2;
  title: string;
}) {
  const total = periods.reduce((s, p) => s + p.years, 0);
  const today = new Date();

  return (
    <div className="mb-5">
      <p className="text-[13px] font-bold tracking-widest mb-2" style={{ color: level === 1 ? "#06b6d4" : "#a855f7" }}>
        {title}
      </p>
      <div className="rounded-xl overflow-hidden flex" style={{ height: level === 1 ? 36 : 24, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        {periods.map((p, i) => {
          const widthPct = (p.years / total) * 100;
          const color = SIGN_COLORS[p.sign];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="relative flex items-center justify-center overflow-hidden transition-all duration-200 group cursor-default"
              style={{
                width: `${widthPct}%`,
                background: p.isCurrent
                  ? `${color}30`
                  : p.isPast
                  ? `${color}08`
                  : `${color}10`,
                borderRight: i < periods.length - 1 ? "1px solid rgba(0,0,0,0.3)" : "none",
                boxShadow: p.isCurrent ? `inset 0 0 12px ${color}20` : "none",
              }}
              title={`${p.sign} (${p.years}y) Â· ${formatDate(p.start)} â€“ ${formatDate(p.end)}`}
            >
              {p.isCurrent && (
                <motion.div
                  className="absolute inset-0"
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ background: `${color}15` }}
                />
              )}
              {widthPct > 6 && (
                <span
                  className="relative z-10 text-[14px] font-bold pointer-events-none select-none"
                  style={{ color: p.isCurrent ? color : `${color}60` }}
                >
                  {SIGN_SYMBOLS[p.sign]}
                </span>
              )}
              {p.isCurrent && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Current period detail */}
      {periods.filter(p => p.isCurrent).map((p, i) => (
        <div key={i} className="mt-2 flex items-center gap-2 flex-wrap">
          <span
            className="text-[13px] font-bold px-2 py-0.5 rounded"
            style={{
              background: `${SIGN_COLORS[p.sign]}18`,
              color: SIGN_COLORS[p.sign],
              border: `1px solid ${SIGN_COLORS[p.sign]}25`,
            }}
          >
            {SIGN_SYMBOLS[p.sign]} {p.sign}
          </span>
          <span className="text-[13px]" style={{ color: "#475569" }}>
            {p.years}yr period Â· {formatDate(p.start)} â†’ {formatDate(p.end)}
          </span>
          <span className="text-[13px]" style={{ color: "#334155" }}>
            Lord: <span style={{ color: PLANET_COLORS[TRADITIONAL_RULERS[p.sign]] ?? "#94a3b8" }}>
              {TRADITIONAL_RULERS[p.sign]}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// â”€â”€â”€ Profection cycle grid (12-year wheel overview) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ProfectionWheel({ chart }: { chart: ChartData }) {
  const ascSignIdx = Math.floor(chart.ascendant / 30);
  const currentHouse = chart.annualProfection.activatedHouse;
  const currentAge = chart.annualProfection.age;

  const CX = 150, CY = 150, OUTER = 130, INNER = 68, LABEL_R = 145;

  function angleFor(house: number, offset = 0): number {
    // House 1 at top (-90Â°), clockwise
    return ((house - 1) / 12) * 2 * Math.PI - Math.PI / 2 + offset;
  }
  function arc(house: number): string {
    const startA = angleFor(house);
    const endA = angleFor(house + 1);
    const gap = 0.03; // gap between segments
    const sa = startA + gap;
    const ea = endA - gap;
    const ox1 = CX + OUTER * Math.cos(sa);
    const oy1 = CY + OUTER * Math.sin(sa);
    const ox2 = CX + OUTER * Math.cos(ea);
    const oy2 = CY + OUTER * Math.sin(ea);
    const ix1 = CX + INNER * Math.cos(ea);
    const iy1 = CY + INNER * Math.sin(ea);
    const ix2 = CX + INNER * Math.cos(sa);
    const iy2 = CY + INNER * Math.sin(sa);
    return `M${ox1},${oy1} A${OUTER},${OUTER} 0 0,1 ${ox2},${oy2} L${ix1},${iy1} A${INNER},${INNER} 0 0,0 ${ix2},${iy2} Z`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex justify-center mb-6"
    >
      <svg width={300} height={300} viewBox="0 0 300 300" style={{ maxWidth: "100%", height: "auto" }}>
        <defs>
          <filter id="pwGlow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle cx={CX} cy={CY} r={OUTER + 4} fill="rgba(4,4,20,0.6)" stroke="rgba(99,102,241,0.08)" strokeWidth={1} />

        {Array.from({ length: 12 }, (_, i) => {
          const house = i + 1;
          const signIdx = (ascSignIdx + i) % 12;
          const sign = ZODIAC_SIGNS[signIdx];
          const lord = TRADITIONAL_RULERS[sign];
          const isActive = currentHouse === house;
          const isPast = (currentAge % 12) + 1 > house || (currentAge % 12) + 1 === 1 && house > 1;
          const signColor = SIGN_COLORS[sign];
          const lordColor = PLANET_COLORS[lord] ?? "#94a3b8";

          // Mid-angle for placing labels
          const midA = angleFor(house) + (Math.PI / 12);
          const labelRMid = (OUTER + INNER) / 2;
          const lx = CX + labelRMid * Math.cos(midA);
          const ly = CY + labelRMid * Math.sin(midA);

          // Outer label (house number)
          const outerLabelR = OUTER + 16;
          const oux = CX + outerLabelR * Math.cos(midA);
          const ouy = CY + outerLabelR * Math.sin(midA);

          return (
            <g key={house}>
              {/* Active glow */}
              {isActive && (
                <path d={arc(house)}
                  fill={`${signColor}25`}
                  stroke={signColor}
                  strokeWidth={0}
                  filter="url(#pwGlow)"
                />
              )}

              {/* Segment */}
              <motion.path
                d={arc(house)}
                fill={isActive ? `${signColor}22` : `${signColor}08`}
                stroke={isActive ? signColor : `${signColor}30`}
                strokeWidth={isActive ? 1.5 : 0.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
              />

              {/* Sign glyph (center of segment) */}
              <text x={lx} y={ly - 5} textAnchor="middle" dominantBaseline="central"
                fontSize={isActive ? 15 : 12}
                fill={isActive ? signColor : `${signColor}80`}
                opacity={isActive ? 1 : 0.6}
              >
                {SIGN_SYMBOLS[sign]}
              </text>

              {/* Lord symbol */}
              <text x={lx} y={ly + 9} textAnchor="middle" dominantBaseline="central"
                fontSize={9}
                fill={isActive ? lordColor : `${lordColor}70`}
                fontWeight={isActive ? "bold" : "normal"}
              >
                {PLANET_SYMBOLS[lord]}
              </text>

              {/* House number on outer edge */}
              <text x={oux} y={ouy} textAnchor="middle" dominantBaseline="central"
                fontSize={isActive ? 9 : 7}
                fill={isActive ? "#a78bfa" : "#1e293b"}
                fontWeight={isActive ? "bold" : "normal"}
                letterSpacing={0.5}
              >
                {house}
              </text>
            </g>
          );
        })}

        {/* Center content */}
        <circle cx={CX} cy={CY} r={INNER - 2} fill="rgba(4,4,28,0.95)" stroke="rgba(124,58,237,0.15)" strokeWidth={1} />
        <text x={CX} y={CY - 14} textAnchor="middle" fontSize={9} fill="#475569" letterSpacing={1} fontWeight="bold">
          AGE
        </text>
        <text x={CX} y={CY + 2} textAnchor="middle" fontSize={22} fill="#e2e8f0" fontWeight="bold">
          {currentAge}
        </text>
        <text x={CX} y={CY + 18} textAnchor="middle" fontSize={8} fill="#7c3aed" letterSpacing={1} fontWeight="bold">
          H{currentHouse}
        </text>
        <text x={CX} y={CY + 30} textAnchor="middle" fontSize={7} fill="#334155" letterSpacing={0.5}>
          {chart.annualProfection.lordOfYear}
        </text>

        {/* "NOW" pointer */}
        {(() => {
          const a = angleFor(currentHouse) + Math.PI / 12;
          const x = CX + (INNER - 10) * Math.cos(a);
          const y = CY + (INNER - 10) * Math.sin(a);
          return null; // decorative element omitted for simplicity
        })()}
      </svg>
    </motion.div>
  );
}

function TwelveYearCycle({ chart }: { chart: ChartData }) {
  const ascSignIdx = Math.floor(chart.ascendant / 30);
  const currentAge = chart.annualProfection.age;
  const currentHouse = chart.annualProfection.activatedHouse;

  return (
    <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
      {Array.from({ length: 12 }, (_, i) => {
        const house = i + 1;
        const signIdx = (ascSignIdx + i) % 12;
        const sign = ZODIAC_SIGNS[signIdx];
        const lord = TRADITIONAL_RULERS[sign];
        const isActive = currentHouse === house;
        const signColor = SIGN_COLORS[sign];
        const lordColor = PLANET_COLORS[lord] ?? "#94a3b8";

        return (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05 }}
            className="flex flex-col items-center gap-1 p-2 rounded-xl cursor-default"
            style={{
              background: isActive ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.02)",
              border: isActive ? "1px solid rgba(124,58,237,0.35)" : "1px solid rgba(255,255,255,0.04)",
              boxShadow: isActive ? "0 0 16px rgba(124,58,237,0.15)" : "none",
            }}
          >
            <span className="text-[14px] font-bold tracking-wider" style={{ color: isActive ? "#a78bfa" : "#334155" }}>
              H{house}
            </span>
            <span className="text-base" style={{ color: signColor }}>{SIGN_SYMBOLS[sign]}</span>
            <span className="text-[14px] font-bold" style={{ color: lordColor }}>
              {PLANET_SYMBOLS[lord]}
            </span>
            <span className="text-[14px] tracking-wide" style={{ color: "#334155" }}>
              {HOUSE_THEMES[house].substring(0, 4).toUpperCase()}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

// â”€â”€â”€ Year Ahead Oracle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function YearAheadOracle({ chart, profection, zrL1, zrL2 }: {
  chart: ChartData;
  profection: ProfectionYear;
  zrL1?: ZRPeriod;
  zrL2?: ZRPeriod;
}) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [started, setStarted] = useState(false);

  const generate = () => {
    if (streaming || text) return;
    setStarted(true);
    setStreaming(true);

    const lord = chart.planets.find(p => p.name === profection.lordOfYear);
    const sun = chart.planets.find(p => p.name === "Sun");
    const moon = chart.planets.find(p => p.name === "Moon");

    const zrLines = [
      zrL1 ? `Zodiacal Releasing L1: ${zrL1.sign} period (${zrL1.years}yr span, ${zrL1.isCurrent ? "current" : "upcoming"})` : "",
      zrL2 ? `Zodiacal Releasing L2 sub-period: ${zrL2.sign}` : "",
    ].filter(Boolean).join("\n");

    const prompt = `You are Cosmora, a traditional astrologer. Write a Year Ahead reading for this person.

CURRENT PROFECTION YEAR:
- Age ${profection.age}, H${profection.activatedHouse} (${profection.activatedSign}) activated
- Lord of Year: ${profection.lordOfYear} â€” natal placement: ${lord?.sign ?? "?"} H${lord?.house ?? "?"}${lord?.retrograde ? " Rx" : ""}, dignity: ${lord?.dignity ?? "peregrine"}
${zrLines ? `\nTIMING TECHNIQUES:\n${zrLines}` : ""}

NATAL CONTEXT:
- Sun: ${sun?.sign ?? "?"} H${sun?.house ?? "?"}
- Moon: ${moon?.sign ?? "?"} H${moon?.house ?? "?"}
- Sect: ${chart.sect}

Write 3 focused paragraphs: (1) The overarching theme this profection year brings and what life domain comes forward through H${profection.activatedHouse}; (2) How the Lord of Year â€” ${profection.lordOfYear} in its natal sign â€” will express itself and where to direct energy; (3) Specific opportunities and friction points to navigate, and what this timing means for growth. Be specific, grounded, and avoid generic statements.`;

    let fullText = "";
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt }),
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
      setStreaming(false);
    }).catch(() => setStreaming(false));
  };

  if (!started) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 rounded-2xl p-5"
        style={{ border: "1px solid rgba(245,158,11,0.15)", background: "rgba(245,158,11,0.04)" }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold tracking-widest mb-1" style={{ color: "#f59e0b" }}>
              âœ¦ YEAR AHEAD ORACLE
            </p>
            <p className="text-[14px]" style={{ color: "#475569" }}>
              AI interpretation of your H{profection.activatedHouse} profection year, the role of {profection.lordOfYear} as Lord of Year
              {zrL1 ? `, and your current ${zrL1.sign} releasing period` : ""}.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 0 30px rgba(245,158,11,0.25)" }}
            whileTap={{ scale: 0.97 }}
            onClick={generate}
            className="flex-shrink-0 px-5 py-2.5 rounded-xl text-[14px] font-bold tracking-widest cursor-pointer"
            style={{
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.35)",
              color: "#fbbf24",
            }}
          >
            GENERATE READING â†’
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)" }}
    >
      {streaming && (
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", height: "100%", width: "40%",
            background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.04), transparent)",
            pointerEvents: "none",
          }}
        />
      )}
      <div className="px-5 pt-4 pb-2" style={{ borderBottom: "1px solid rgba(245,158,11,0.1)" }}>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: streaming ? [1, 0.3, 1] : 1 }}
            transition={{ duration: 1.4, repeat: streaming ? Infinity : 0 }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: streaming ? "#f59e0b" : "#22c55e" }}
          />
          <p className="text-[13px] font-bold tracking-widest" style={{ color: "#f59e0b" }}>
            YEAR AHEAD ORACLE Â· Age {profection.age} Â· H{profection.activatedHouse}
          </p>
        </div>
      </div>
      <div className="px-5 py-5">
        {!text && streaming ? (
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-3 h-3 rounded-full border border-t-transparent flex-shrink-0"
              style={{ borderColor: "#f59e0b" }}
            />
            <span className="text-[14px]" style={{ color: "#475569" }}>Calculating year aheadâ€¦</span>
          </div>
        ) : (
          <div className="space-y-4">
            {text.split("\n\n").filter(Boolean).map((para, i) => (
              <p key={i} className="text-[16px] leading-relaxed" style={{ color: "#94a3b8" }}>
                {para}
                {streaming && i === text.split("\n\n").filter(Boolean).length - 1 && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                    className="inline-block ml-0.5 w-0.5 h-3.5 align-middle rounded-full"
                    style={{ background: "#f59e0b" }}
                  />
                )}
              </p>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function TimelinePage() {
  const [chart, setChart] = useState<ChartData | null>(null);
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"profections" | "releasing" | "progressions" | "firdaria" | "solar-arc" | "life-map">("profections");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setLoading(false); return; }
    const prof = getProfile(id);
    const cached = getCachedChart(id);
    setProfile(prof);
    setChart(cached);
    setLoading(false);
  }, []);

  const profections = useMemo(() =>
    chart ? buildProfectionTimeline(chart.birthDatetime, chart.ascendant) : [],
    [chart]
  );

  const currentProfection = useMemo(() =>
    profections.find(p => p.isCurrent),
    [profections]
  );

  const zr = useMemo(() =>
    chart ? buildZRPeriods(chart.lotOfFortune, chart.birthDatetime, 24) : null,
    [chart]
  );

  const selectedProfection = useMemo(() =>
    selectedYear !== null ? profections.find(p => p.age === selectedYear) : null,
    [selectedYear, profections]
  );

  const progressions = useMemo(() => {
    if (!profile) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return calculateProgressions(profile as any, new Date());
  }, [profile]);

  const firdaria = useMemo(() => {
    if (!chart) return [];
    return calculateFirdaria(chart.birthDatetime, chart.sect === "day");
  }, [chart]);

  // Scroll timeline to current year on mount
  useEffect(() => {
    if (!scrollRef.current || !currentProfection) return;
    const currentEl = scrollRef.current.querySelector("[data-current='true']") as HTMLElement | null;
    if (currentEl) {
      const containerWidth = scrollRef.current.offsetWidth;
      const offset = currentEl.offsetLeft - containerWidth / 2 + currentEl.offsetWidth / 2;
      scrollRef.current.scrollLeft = offset;
    }
  }, [profections, currentProfection]);

  // â”€â”€â”€ Empty state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (!loading && !chart) {
    return (
      <div className="h-screen flex overflow-hidden">
        <DashboardBg />
        <div className="nebula-orb" style={{ width: 500, height: 500, left: "20%", top: "5%", background: "rgba(124,58,237,0.07)", filter: "blur(100px)" }} />
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 md:ml-[68px] mb-[60px] md:mb-0 px-6">
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-2xl flex items-center justify-center"
            style={{ width: 72, height: 72, background: "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(6,182,212,0.14))", border: "1px solid rgba(124,58,237,0.35)", boxShadow: "0 0 48px rgba(124,58,237,0.18)" }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="14" stroke="rgba(124,58,237,0.6)" strokeWidth="1"/>
              <circle cx="18" cy="18" r="8" stroke="rgba(6,182,212,0.5)" strokeWidth="0.75"/>
              <line x1="18" y1="4" x2="18" y2="32" stroke="rgba(124,58,237,0.35)" strokeWidth="0.75"/>
              <line x1="4" y1="18" x2="32" y2="18" stroke="rgba(124,58,237,0.35)" strokeWidth="0.75"/>
              <circle cx="18" cy="18" r="2.5" fill="rgba(6,182,212,0.8)"/>
            </svg>
          </motion.div>
          <div className="text-center">
            <p className="text-[14px] font-bold tracking-[0.2em] mb-2" style={{ color: "#334155" }}>NO CHART DATA</p>
            <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "Space Grotesk, sans-serif", color: "#e2e8f0" }}>Cosmic instruments standing by.</h2>
            <p className="text-[14px] max-w-xs mx-auto" style={{ color: "#475569" }}>Enter your birth data to unlock your life timeline and all its cosmic layers.</p>
          </div>
          <Link href="/onboarding">
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="px-6 py-3 rounded-xl text-[14px] font-bold tracking-wider cursor-pointer"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white", border: "1px solid rgba(124,58,237,0.4)" }}
            >
              Begin Your Chart â†’
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <DashboardBg />
      <div className="nebula-orb" style={{ width: 600, height: 600, left: "-10%", top: "-10%", background: "rgba(124,58,237,0.05)", filter: "blur(120px)" }} />
      <div className="nebula-orb" style={{ width: 400, height: 400, right: "0%", bottom: "0%", background: "rgba(6,182,212,0.04)", filter: "blur(80px)" }} />

      <Sidebar />

      <div className="flex-1 flex flex-col min-h-0 min-w-0 md:ml-[68px] mb-[60px] md:mb-0 relative z-10 overflow-x-hidden">

        {/* Top bar */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-3"
          style={{
            borderBottom: "1px solid rgba(6,182,212,0.1)",
            background: "rgba(1,1,14,0.85)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <motion.button
                whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer"
                style={{ color: "#64748b" }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
                Dashboard
              </motion.button>
            </Link>
            <span style={{ color: "#1e293b" }}>/</span>
            <span className="text-[13px] font-bold tracking-widest gradient-text">TIMELINE</span>
            {profile && (
              <>
                <span style={{ color: "#1e293b" }}>/</span>
                <span className="text-[13px] font-medium hidden md:inline" style={{ color: "#64748b" }}>{profile.name}</span>
              </>
            )}
          </div>

          {/* compact breadcrumb right */}
          {profile && (
            <span className="text-[13px] hidden md:block" style={{ color: "#334155" }}>{profile.name}</span>
          )}
        </motion.div>

        {/* Tab switcher row */}
        <div
          className="flex-shrink-0 flex items-center gap-1 px-4 md:px-6 py-2 overflow-x-auto"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", scrollbarWidth: "none" }}
        >
          {([
            { id: "profections",  label: "PROFECTIONS" },
            { id: "releasing",    label: "ZOD. RELEASING" },
            { id: "progressions", label: "PROGRESSIONS" },
            { id: "firdaria",     label: "FIRDARIA" },
            { id: "solar-arc",    label: "SOLAR ARC" },
            { id: "life-map",     label: "LIFE MAP" },
          ] as const).map(({ id, label }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-bold tracking-widest cursor-pointer transition-all duration-200"
              style={{
                background: activeTab === id ? "rgba(124,58,237,0.25)" : "transparent",
                color: activeTab === id ? "#a78bfa" : "#334155",
                border: activeTab === id ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {label}
            </motion.button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          <div className="px-4 md:px-6 py-5 max-w-4xl mx-auto">

            <AnimatePresence mode="wait">

              {/* â”€â”€â”€ PROFECTIONS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {activeTab === "profections" && (
                <motion.div
                  key="profections"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Current year card */}
                  {currentProfection && chart && (
                    <CurrentTimingCard profection={currentProfection} chart={chart} />
                  )}

                  {/* Profection Wheel */}
                  {chart && <ProfectionWheel chart={chart} />}

                  {/* Year Ahead Oracle */}
                  {chart && currentProfection && (
                    <YearAheadOracle
                      chart={chart}
                      profection={currentProfection}
                      zrL1={zr?.currentL1}
                      zrL2={zr?.l2.find(p => p.isCurrent)}
                    />
                  )}

                  {/* 12-year cycle grid */}
                  <SectionHeader
                    label="12-Year Cycle"
                    sub="Houses activated each recurring year in your profection cycle"
                  />
                  {chart && <TwelveYearCycle chart={chart} />}

                  {/* Horizontal scrollable timeline */}
                  <div className="mt-6">
                    <SectionHeader
                      label="Life Timeline Â· Ages 0â€“83"
                      sub="Each card is one year Â· Click any year for details"
                    />
                    <div
                      ref={scrollRef}
                      className="flex gap-2 overflow-x-auto pb-3"
                      style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(124,58,237,0.3) transparent" }}
                    >
                      {profections.map(year => (
                        <div key={year.age} data-current={year.isCurrent ? "true" : "false"}>
                          <ProfectionCard
                            year={year}
                            onClick={() => setSelectedYear(year.age === selectedYear ? null : year.age)}
                            isSelected={selectedYear === year.age}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Selected year detail */}
                    <AnimatePresence>
                      {selectedProfection && chart && (
                        <ProfectionDetail year={selectedProfection} chart={chart} />
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Legend */}
                  <div className="mt-6 flex flex-wrap gap-4">
                    <SectionHeader label="House Themes" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                      {Object.entries(HOUSE_THEMES).map(([h, theme]) => (
                        <div
                          key={h}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                        >
                          <span className="text-[13px] font-bold tracking-wider" style={{ color: "#334155" }}>H{h}</span>
                          <span className="text-[13px]" style={{ color: "#475569" }}>{theme}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* â”€â”€â”€ ZODIACAL RELEASING TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {activeTab === "releasing" && zr && chart && (
                <motion.div
                  key="releasing"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Intro card */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4 mb-6"
                    style={{
                      background: "rgba(6,182,212,0.06)",
                      border: "1px solid rgba(6,182,212,0.18)",
                    }}
                  >
                    <p className="text-[13px] font-bold tracking-widest mb-1" style={{ color: "#06b6d4" }}>
                      ZODIACAL RELEASING Â· FROM LOT OF FORTUNE
                    </p>
                    <p className="text-[13px] leading-relaxed" style={{ color: "#64748b" }}>
                      A Hellenistic timing technique that divides life into sequential sign-periods.
                      Each sign rules for a fixed number of years (its minor years), producing nested L1 â†’ L2 periods.
                      The current periods reveal the dominant life theme and sub-theme.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[13px] font-bold tracking-widest" style={{ color: "#475569" }}>
                        FORTUNE LOT
                      </span>
                      <span
                        className="text-[13px] font-semibold px-2 py-0.5 rounded"
                        style={{
                          background: `${SIGN_COLORS[ZODIAC_SIGNS[Math.floor(chart.lotOfFortune / 30)] as ZodiacSign]}15`,
                          color: SIGN_COLORS[ZODIAC_SIGNS[Math.floor(chart.lotOfFortune / 30)] as ZodiacSign],
                        }}
                      >
                        {SIGN_SYMBOLS[ZODIAC_SIGNS[Math.floor(chart.lotOfFortune / 30)] as ZodiacSign]}{" "}
                        {ZODIAC_SIGNS[Math.floor(chart.lotOfFortune / 30)]}{" "}
                        {(chart.lotOfFortune % 30).toFixed(1)}Â°
                      </span>
                    </div>
                  </motion.div>

                  {/* Current periods highlight */}
                  {zr.currentL1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="grid md:grid-cols-2 gap-3 mb-6"
                    >
                      <div
                        className="rounded-2xl p-4"
                        style={{
                          background: `${SIGN_COLORS[zr.currentL1.sign]}10`,
                          border: `1px solid ${SIGN_COLORS[zr.currentL1.sign]}25`,
                        }}
                      >
                        <p className="text-[14px] font-bold tracking-widest mb-2" style={{ color: "#06b6d4" }}>
                          L1 Â· MAJOR PERIOD
                        </p>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-2xl" style={{ color: SIGN_COLORS[zr.currentL1.sign] }}>
                              {SIGN_SYMBOLS[zr.currentL1.sign]}
                            </span>
                            <p className="text-[14px] font-bold mt-0.5" style={{ color: SIGN_COLORS[zr.currentL1.sign] }}>
                              {zr.currentL1.sign}
                            </p>
                            <p className="text-[13px] mt-0.5" style={{ color: "#475569" }}>
                              {ELEMENT_LABEL[zr.currentL1.sign]} Â· {zr.currentL1.years}yr period
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[14px] tracking-widest" style={{ color: "#334155" }}>LORD</p>
                            <p className="text-base" style={{ color: PLANET_COLORS[TRADITIONAL_RULERS[zr.currentL1.sign]] ?? "#94a3b8" }}>
                              {PLANET_SYMBOLS[TRADITIONAL_RULERS[zr.currentL1.sign]]}
                            </p>
                            <p className="text-[13px] font-bold" style={{ color: PLANET_COLORS[TRADITIONAL_RULERS[zr.currentL1.sign]] ?? "#94a3b8" }}>
                              {TRADITIONAL_RULERS[zr.currentL1.sign]}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${SIGN_COLORS[zr.currentL1.sign]}15` }}>
                          <p className="text-[13px]" style={{ color: "#475569" }}>
                            {formatDate(zr.currentL1.start)} â†’ {formatDate(zr.currentL1.end)}
                          </p>
                        </div>
                      </div>

                      {zr.l2.find(p => p.isCurrent) && (() => {
                        const l2curr = zr.l2.find(p => p.isCurrent)!;
                        return (
                          <div
                            className="rounded-2xl p-4"
                            style={{
                              background: `${SIGN_COLORS[l2curr.sign]}08`,
                              border: `1px solid ${SIGN_COLORS[l2curr.sign]}20`,
                            }}
                          >
                            <p className="text-[14px] font-bold tracking-widest mb-2" style={{ color: "#a855f7" }}>
                              L2 Â· MINOR PERIOD
                            </p>
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="text-2xl" style={{ color: SIGN_COLORS[l2curr.sign] }}>
                                  {SIGN_SYMBOLS[l2curr.sign]}
                                </span>
                                <p className="text-[14px] font-bold mt-0.5" style={{ color: SIGN_COLORS[l2curr.sign] }}>
                                  {l2curr.sign}
                                </p>
                                <p className="text-[13px] mt-0.5" style={{ color: "#475569" }}>
                                  {ELEMENT_LABEL[l2curr.sign]} Â· sub-period
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[14px] tracking-widest" style={{ color: "#334155" }}>LORD</p>
                                <p className="text-base" style={{ color: PLANET_COLORS[TRADITIONAL_RULERS[l2curr.sign]] ?? "#94a3b8" }}>
                                  {PLANET_SYMBOLS[TRADITIONAL_RULERS[l2curr.sign]]}
                                </p>
                                <p className="text-[13px] font-bold" style={{ color: PLANET_COLORS[TRADITIONAL_RULERS[l2curr.sign]] ?? "#94a3b8" }}>
                                  {TRADITIONAL_RULERS[l2curr.sign]}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${SIGN_COLORS[l2curr.sign]}15` }}>
                              <p className="text-[13px]" style={{ color: "#475569" }}>
                                {formatDate(l2curr.start)} â†’ {formatDate(l2curr.end)}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}

                  {/* L1 timeline bar */}
                  <SectionHeader label="Level 1 Â· Major Periods" sub="Complete life sequence from Lot of Fortune" />
                  <ZRBar periods={zr.l1} level={1} title="L1 MAJOR PERIODS Â· FULL SEQUENCE" />

                  {/* L2 timeline bar */}
                  {zr.l2.length > 0 && (
                    <>
                      <SectionHeader label="Level 2 Â· Minor Periods" sub={`Sub-divisions within the current ${zr.currentL1?.sign ?? ""} major period`} />
                      <ZRBar periods={zr.l2} level={2} title="L2 MINOR PERIODS Â· WITHIN CURRENT MAJOR PERIOD" />
                    </>
                  )}

                  {/* Period table */}
                  <div className="mt-6">
                    <SectionHeader label="Upcoming L1 Periods" />
                    <div className="space-y-1.5">
                      {zr.l1.filter(p => !p.isPast).slice(0, 8).map((p, i) => {
                        const color = SIGN_COLORS[p.sign];
                        const lord = TRADITIONAL_RULERS[p.sign];
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                            style={{
                              background: p.isCurrent ? `${color}10` : "rgba(255,255,255,0.02)",
                              border: p.isCurrent ? `1px solid ${color}25` : "1px solid rgba(255,255,255,0.04)",
                            }}
                          >
                            {p.isCurrent && (
                              <motion.div
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                              />
                            )}
                            {!p.isCurrent && (
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />
                            )}
                            <span className="text-base" style={{ color }}>{SIGN_SYMBOLS[p.sign]}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold" style={{ color: p.isCurrent ? color : "#94a3b8" }}>
                                {p.sign}
                                {p.isCurrent && (
                                  <span className="ml-2 text-[14px] tracking-widest font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color }}>
                                    CURRENT
                                  </span>
                                )}
                              </p>
                              <p className="text-[13px]" style={{ color: "#334155" }}>
                                {formatDate(p.start)} â†’ {formatDate(p.end)}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[13px] font-bold" style={{ color: PLANET_COLORS[lord] ?? "#94a3b8" }}>
                                {PLANET_SYMBOLS[lord]} {lord}
                              </p>
                              <p className="text-[13px]" style={{ color: "#334155" }}>{p.years} yrs</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* â”€â”€â”€ SECONDARY PROGRESSIONS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {activeTab === "progressions" && (
                <motion.div
                  key="progressions"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Explainer */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4 mb-6"
                    style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)" }}
                  >
                    <p className="text-[13px] font-bold tracking-widest mb-1" style={{ color: "#a78bfa" }}>
                      SECONDARY PROGRESSIONS Â· DAY FOR A YEAR
                    </p>
                    <p className="text-[13px] leading-relaxed" style={{ color: "#64748b" }}>
                      Each day after birth represents one year of life. The sky on the day equal to your current age in years is your progressed chart. Inner planets (Sun, Moon, Mercury, Venus, Mars) move meaningfully; outer planets move less than a degree in a lifetime.
                    </p>
                    <p className="text-[13px] mt-2" style={{ color: "#334155" }}>
                      Shown as of today Â· {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </motion.div>

                  {/* Planets table */}
                  <SectionHeader label="Natal vs. Progressed Positions" sub="Degrees moved from birth position" />
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(4,4,28,0.6)" }}
                  >
                    {/* Header row */}
                    <div
                      className="grid grid-cols-5 px-4 py-2 text-[14px] font-bold tracking-widest"
                      style={{ color: "#334155", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <span>PLANET</span>
                      <span>NATAL</span>
                      <span>PROGRESSED</span>
                      <span>MOVEMENT</span>
                      <span>STATUS</span>
                    </div>
                    {progressions.map((p, i) => {
                      const color = PLANET_COLORS[p.name] ?? "#94a3b8";
                      const signColor = SIGN_COLORS[p.sign];
                      const natalSign = ZODIAC_SIGNS[Math.floor(p.natalLon / 30)];
                      const signChanged = p.sign !== natalSign;
                      const movDeg = Math.abs(p.movement);
                      return (
                        <motion.div
                          key={p.name}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="grid grid-cols-5 items-center px-4 py-2.5"
                          style={{
                            background: signChanged ? "rgba(245,158,11,0.04)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                            borderBottom: "1px solid rgba(255,255,255,0.03)",
                            borderLeft: signChanged ? "2px solid rgba(245,158,11,0.4)" : "2px solid transparent",
                          }}
                        >
                          {/* Planet */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[14px]" style={{ color }}>{PLANET_SYMBOLS[p.name]}</span>
                            <span className="text-[13px] font-medium" style={{ color: "#94a3b8" }}>{p.name}</span>
                          </div>
                          {/* Natal */}
                          <div>
                            <span className="text-[13px]" style={{ color: SIGN_COLORS[natalSign] }}>
                              {SIGN_SYMBOLS[natalSign]} {(p.natalLon % 30).toFixed(1)}Â°
                            </span>
                          </div>
                          {/* Progressed */}
                          <div>
                            <span className="text-[13px] font-semibold" style={{ color: signColor }}>
                              {SIGN_SYMBOLS[p.sign]} {p.signDegree.toFixed(1)}Â°
                              {p.retrograde && <span style={{ color: "#ef4444" }}> â„ž</span>}
                            </span>
                            {signChanged && (
                              <span className="ml-1 text-[14px] px-1 rounded" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                                NEW SIGN
              </span>
                            )}
                          </div>
                          {/* Movement */}
                          <div className="flex items-center gap-1">
                            <span className="text-[13px]" style={{ color: p.movement > 0 ? "#22c55e" : "#ef4444" }}>
                              {p.movement >= 0 ? "+" : ""}{p.movement.toFixed(2)}Â°
                            </span>
                          </div>
                          {/* Status */}
                          <div>
                            <div
                              className="h-1 rounded-full overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.06)", width: 48 }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min((movDeg / 30) * 100, 100)}%`,
                                  background: signChanged ? "#f59e0b" : color,
                                }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Sign-changed planets summary */}
                  {progressions.some(p => p.sign !== ZODIAC_SIGNS[Math.floor(p.natalLon / 30)]) && (
                    <div className="mt-5">
                      <SectionHeader label="Sign Ingresses" sub="Planets that have progressed into a new sign" />
                      <div className="space-y-2">
                        {progressions.filter(p => p.sign !== ZODIAC_SIGNS[Math.floor(p.natalLon / 30)]).map((p, i) => {
                          const color = PLANET_COLORS[p.name] ?? "#94a3b8";
                          const natalSign = ZODIAC_SIGNS[Math.floor(p.natalLon / 30)];
                          return (
                            <motion.div
                              key={p.name}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.06 }}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl"
                              style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
                            >
                              <span className="text-lg" style={{ color }}>{PLANET_SYMBOLS[p.name]}</span>
                              <div className="flex-1">
                                <p className="text-[13px] font-bold" style={{ color: "#e2e8f0" }}>{p.name}</p>
                                <p className="text-[13px]" style={{ color: "#64748b" }}>
                                  Natal: {SIGN_SYMBOLS[natalSign]} {natalSign} â†’ Progressed: {SIGN_SYMBOLS[p.sign]} {p.sign}
                                </p>
                              </div>
                              <span className="text-[13px] font-bold px-2 py-1 rounded" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                                INGRESS
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* â”€â”€â”€ FIRDARIA TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {activeTab === "firdaria" && (
                <motion.div
                  key="firdaria"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Explainer + sect info */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4 mb-6"
                    style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.18)" }}
                  >
                    <p className="text-[13px] font-bold tracking-widest mb-1" style={{ color: "#06b6d4" }}>
                      FIRDARIA Â· HELLENISTIC TIME LORDS
                    </p>
                    <p className="text-[13px] leading-relaxed" style={{ color: "#64748b" }}>
                      An ancient Persian timing system. Seven planets govern sequential main periods (firdars) of life, each subdivided into 7 sub-periods. The sequence differs for day and night sect charts.
                    </p>
                    {chart && (
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-[13px] font-bold tracking-widest" style={{ color: "#475569" }}>SECT</span>
                        <span className="text-[13px] font-bold" style={{ color: chart.sect === "day" ? "#fbbf24" : "#c4b5fd" }}>
                          {chart.sect === "day" ? "â˜€ Day" : "â˜½ Night"}
                        </span>
                        <span className="text-[13px]" style={{ color: "#334155" }}>
                          â€” using {chart.sect === "day" ? "Sun" : "Moon"}-led sequence
                        </span>
                      </div>
                    )}
                  </motion.div>

                  {/* Current period highlight */}
                  {(() => {
                    const mainCurr = firdaria.find(f => f.isCurrent && f.isMainPeriod);
                    const subCurr  = firdaria.find(f => f.isCurrent && !f.isMainPeriod);
                    if (!mainCurr) return null;
                    const mainColor = PLANET_COLORS[mainCurr.lord] ?? "#94a3b8";
                    const subColor  = subCurr ? PLANET_COLORS[subCurr.subLord ?? mainCurr.lord] ?? "#94a3b8" : "#94a3b8";
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid md:grid-cols-2 gap-3 mb-6"
                      >
                        {/* Main firdar */}
                        <div
                          className="rounded-2xl p-4"
                          style={{ background: `${mainColor}10`, border: `1px solid ${mainColor}28` }}
                        >
                          <p className="text-[14px] font-bold tracking-widest mb-2" style={{ color: "#06b6d4" }}>
                            CURRENT FIRDAR Â· MAIN PERIOD
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-3xl" style={{ color: mainColor }}>
                                {PLANET_SYMBOLS[mainCurr.lord]}
                              </span>
                              <div>
                                <p className="text-[14px] font-bold" style={{ color: mainColor }}>{mainCurr.lord}</p>
                                <p className="text-[13px]" style={{ color: "#475569" }}>{mainCurr.years} yr period</p>
                              </div>
                            </div>
                            {chart && (() => {
                              const pl = chart.planets.find(p => p.name === mainCurr.lord);
                              if (!pl) return null;
                              return (
                                <div className="text-right">
                                  <p className="text-[14px] tracking-widest" style={{ color: "#334155" }}>NATAL POSITION</p>
                                  <p className="text-[13px] font-semibold" style={{ color: SIGN_COLORS[pl.sign] }}>
                                    {SIGN_SYMBOLS[pl.sign]} {pl.sign}
                                  </p>
                                  <p className="text-[13px]" style={{ color: "#475569" }}>H{pl.house}</p>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${mainColor}15` }}>
                            <p className="text-[13px]" style={{ color: "#475569" }}>
                              {formatDate(mainCurr.start)} â†’ {formatDate(mainCurr.end)}
                            </p>
                          </div>
                        </div>

                        {/* Sub firdar */}
                        {subCurr && (
                          <div
                            className="rounded-2xl p-4"
                            style={{ background: `${subColor}08`, border: `1px solid ${subColor}20` }}
                          >
                            <p className="text-[14px] font-bold tracking-widest mb-2" style={{ color: "#a855f7" }}>
                              CURRENT SUB-PERIOD
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-3xl" style={{ color: subColor }}>
                                  {PLANET_SYMBOLS[subCurr.subLord ?? subCurr.lord]}
                                </span>
                                <div>
                                  <p className="text-[14px] font-bold" style={{ color: subColor }}>
                                    {subCurr.subLord ?? subCurr.lord}
                                  </p>
                                  <p className="text-[13px]" style={{ color: "#475569" }}>
                                    sub-lord of {mainCurr.lord}
                                  </p>
                                </div>
                              </div>
                              {chart && (() => {
                                const pl = chart.planets.find(p => p.name === (subCurr.subLord ?? subCurr.lord));
                                if (!pl) return null;
                                return (
                                  <div className="text-right">
                                    <p className="text-[14px] tracking-widest" style={{ color: "#334155" }}>NATAL</p>
                                    <p className="text-[13px] font-semibold" style={{ color: SIGN_COLORS[pl.sign] }}>
                                      {SIGN_SYMBOLS[pl.sign]} {pl.sign}
                                    </p>
                                    <p className="text-[13px]" style={{ color: "#475569" }}>H{pl.house}</p>
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${subColor}15` }}>
                              <p className="text-[13px]" style={{ color: "#475569" }}>
                                {formatDate(subCurr.start)} â†’ {formatDate(subCurr.end)}
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })()}

                  {/* Main periods bar */}
                  <SectionHeader label="Main Periods Â· Full Sequence" sub="One full Firdaria cycle" />
                  {(() => {
                    const mainPeriods = firdaria.filter(f => f.isMainPeriod);
                    const total = mainPeriods.reduce((s, f) => s + f.years, 0);
                    return (
                      <div className="rounded-xl overflow-hidden flex mb-4" style={{ height: 40, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        {mainPeriods.map((f, i) => {
                          const color = PLANET_COLORS[f.lord] ?? "#94a3b8";
                          const widthPct = (f.years / total) * 100;
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.06 }}
                              className="relative flex flex-col items-center justify-center overflow-hidden"
                              title={`${f.lord} (${f.years}y) Â· ${formatDate(f.start)} â€“ ${formatDate(f.end)}`}
                              style={{
                                width: `${widthPct}%`,
                                background: f.isCurrent ? `${color}30` : f.isPast ? `${color}08` : `${color}12`,
                                borderRight: i < mainPeriods.length - 1 ? "1px solid rgba(0,0,0,0.3)" : "none",
                                boxShadow: f.isCurrent ? `inset 0 0 14px ${color}22` : "none",
                              }}
                            >
                              {f.isCurrent && (
                                <motion.div className="absolute inset-0" animate={{ opacity: [0.3, 0.7, 0.3] }}
                                  transition={{ duration: 2, repeat: Infinity }} style={{ background: `${color}15` }} />
                              )}
                              <span className="relative text-base z-10" style={{ color: f.isCurrent ? color : `${color}70` }}>
                                {PLANET_SYMBOLS[f.lord]}
                              </span>
                              {f.isCurrent && (
                                <motion.div className="absolute bottom-0 left-0 right-0 h-0.5"
                                  style={{ background: color }} animate={{ opacity: [0.5, 1, 0.5] }}
                                  transition={{ duration: 1.5, repeat: Infinity }} />
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Sub-periods of current main period */}
                  {firdaria.some(f => f.isCurrent && f.isMainPeriod) && (
                    <>
                      <SectionHeader
                        label={`Sub-Periods Â· ${firdaria.find(f => f.isCurrent && f.isMainPeriod)?.lord ?? ""} Firdar`}
                        sub="7 sub-lords dividing the current main period"
                      />
                      <div className="space-y-1.5 mb-6">
                        {firdaria.filter(f => !f.isMainPeriod && f.lord === firdaria.find(x => x.isCurrent && x.isMainPeriod)?.lord).map((f, i) => {
                          const sl = f.subLord ?? f.lord;
                          const color = PLANET_COLORS[sl] ?? "#94a3b8";
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                              style={{
                                background: f.isCurrent ? `${color}10` : f.isPast ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.025)",
                                border: f.isCurrent ? `1px solid ${color}28` : "1px solid rgba(255,255,255,0.04)",
                              }}
                            >
                              {f.isCurrent
                                ? <motion.div animate={{ opacity: [0.5,1,0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                                : <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: f.isPast ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.1)" }} />
                              }
                              <span className="text-base" style={{ color }}>{PLANET_SYMBOLS[sl]}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold" style={{ color: f.isCurrent ? color : f.isPast ? "#334155" : "#64748b" }}>
                                  {sl}
                                  {f.isCurrent && <span className="ml-2 text-[14px] tracking-widest font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color }}>NOW</span>}
                                </p>
                                <p className="text-[13px]" style={{ color: "#334155" }}>
                                  {formatDate(f.start)} â†’ {formatDate(f.end)}
                                </p>
                              </div>
                              <span className="text-[13px] text-right flex-shrink-0" style={{ color: "#334155" }}>
                                {(f.years * 12).toFixed(0)} mo
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* All main periods list */}
                  <SectionHeader label="All Main Periods" sub="Complete Firdaria sequence from birth" />
                  <div className="space-y-1.5">
                    {firdaria.filter(f => f.isMainPeriod).map((f, i) => {
                      const color = PLANET_COLORS[f.lord] ?? "#94a3b8";
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl"
                          style={{
                            background: f.isCurrent ? `${color}10` : f.isPast ? "transparent" : "rgba(255,255,255,0.02)",
                            border: f.isCurrent ? `1px solid ${color}25` : "1px solid rgba(255,255,255,0.03)",
                            opacity: f.isPast ? 0.45 : 1,
                          }}
                        >
                          <span className="text-lg" style={{ color }}>{PLANET_SYMBOLS[f.lord]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold" style={{ color: f.isCurrent ? color : "#64748b" }}>
                              {f.lord}
                              {f.isCurrent && <span className="ml-2 text-[14px] tracking-widest font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color }}>CURRENT</span>}
                            </p>
                            <p className="text-[13px]" style={{ color: "#334155" }}>
                              {formatDate(f.start)} â†’ {formatDate(f.end)}
                            </p>
                          </div>
                          <span className="text-[13px]" style={{ color: "#475569" }}>{f.years} yrs</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* â”€â”€â”€ SOLAR ARC TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {activeTab === "solar-arc" && chart && profile && (
                <motion.div
                  key="solar-arc"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Explainer */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4 mb-6"
                    style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.18)" }}
                  >
                    <p className="text-[13px] font-bold tracking-widest mb-1" style={{ color: "#06b6d4" }}>
                      SOLAR ARC DIRECTIONS Â· 1Â° PER YEAR
                    </p>
                    <p className="text-[13px] leading-relaxed" style={{ color: "#64748b" }}>
                      Every planet in your chart advances by the same arc as your progressed Sun. Unlike secondary progressions where each planet moves at its own speed, solar arc directions move all planets in lock-step. One degree per year â€” your current solar arc is approximately{" "}
                      <strong style={{ color: "#06b6d4" }}>
                        {chart.annualProfection.age}Â°
                      </strong>
                      .
                    </p>
                  </motion.div>

                  {(() => {
                    const age = chart.annualProfection.age;
                    const arc = age; // ~1Â° per year

                    const natalPlanets = chart.planets.slice(0, 10);
                    const directed = natalPlanets.map(p => ({
                      ...p,
                      natalLon: p.longitude,
                      directedLon: (p.longitude + arc) % 360,
                      directedSignIdx: Math.floor(((p.longitude + arc) % 360) / 30),
                      directedDeg: ((p.longitude + arc) % 360) % 30,
                    }));

                    // Check for conjunctions within 1Â°
                    const triggers: { dir: typeof directed[0]; natal: typeof directed[0]; orb: number }[] = [];
                    for (const d of directed) {
                      for (const n of natalPlanets) {
                        if (d.name === n.name) continue;
                        const diff = Math.abs(((d.directedLon - n.longitude + 540) % 360) - 180);
                        const orb = Math.min(diff, 360 - diff);
                        if (orb <= 2) triggers.push({ dir: d, natal: { ...n, natalLon: n.longitude, directedLon: n.longitude, directedSignIdx: 0, directedDeg: 0 }, orb });
                      }
                    }

                    return (
                      <div className="space-y-5">
                        {/* Current trigger arcs */}
                        {triggers.length > 0 && (
                          <div>
                            <SectionHeader
                              label="Active Solar Arc Triggers"
                              sub={`Directed planets within 2Â° of natal points at age ${age}`}
                            />
                            <div className="space-y-2">
                              {triggers.sort((a, b) => a.orb - b.orb).map((t, i) => {
                                const dColor = PLANET_COLORS[t.dir.name as PlanetName] ?? "#94a3b8";
                                const nColor = PLANET_COLORS[t.natal.name as PlanetName] ?? "#94a3b8";
                                return (
                                  <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                                    style={{
                                      background: t.orb <= 0.5 ? `${dColor}12` : "rgba(255,255,255,0.03)",
                                      border: t.orb <= 0.5 ? `1px solid ${dColor}30` : "1px solid rgba(255,255,255,0.05)",
                                    }}
                                  >
                                    {t.orb <= 0.5 && (
                                      <motion.div
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                        style={{ background: dColor, boxShadow: `0 0 6px ${dColor}` }}
                                      />
                                    )}
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-base" style={{ color: dColor }}>{PLANET_SYMBOLS[t.dir.name as PlanetName]}</span>
                                      <span className="text-[13px] font-bold" style={{ color: dColor }}>{t.dir.name}</span>
                                      <span className="text-[13px]" style={{ color: "#475569" }}>arc â˜Œ</span>
                                      <span className="text-base" style={{ color: nColor }}>{PLANET_SYMBOLS[t.natal.name as PlanetName]}</span>
                                      <span className="text-[13px] font-bold" style={{ color: nColor }}>natal {t.natal.name}</span>
                                    </div>
                                    <span className="ml-auto text-[13px] font-mono" style={{ color: t.orb <= 0.5 ? dColor : "#475569" }}>
                                      {t.orb.toFixed(2)}Â° orb
                                    </span>
                                    {t.orb <= 0.5 && (
                                      <span className="text-[14px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${dColor}20`, color: dColor }}>PEAK</span>
                                    )}
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Full directed positions table */}
                        <div>
                          <SectionHeader
                            label="Directed Positions"
                            sub="All planets advanced by solar arc Â· click to compare"
                          />
                          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(4,4,28,0.6)" }}>
                            <div className="grid grid-cols-4 px-4 py-2 text-[14px] font-bold tracking-widest"
                              style={{ color: "#334155", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              <span>PLANET</span>
                              <span>NATAL</span>
                              <span>DIRECTED</span>
                              <span>ARC</span>
                            </div>
                            {directed.map((p, i) => {
                              const color = PLANET_COLORS[p.name as PlanetName] ?? "#94a3b8";
                              const nSign = ZODIAC_SIGNS[Math.floor(p.natalLon / 30)];
                              const dSign = ZODIAC_SIGNS[p.directedSignIdx];
                              const signChanged = nSign !== dSign;
                              return (
                                <motion.div
                                  key={p.name}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.04 }}
                                  className="grid grid-cols-4 items-center px-4 py-2.5"
                                  style={{
                                    background: signChanged ? "rgba(6,182,212,0.04)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                                    borderLeft: signChanged ? "2px solid rgba(6,182,212,0.4)" : "2px solid transparent",
                                  }}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[14px]" style={{ color }}>{PLANET_SYMBOLS[p.name as PlanetName]}</span>
                                    <span className="text-[13px] font-medium" style={{ color: "#94a3b8" }}>{p.name}</span>
                                  </div>
                                  <span className="text-[13px]" style={{ color: SIGN_COLORS[nSign] }}>
                                    {SIGN_SYMBOLS[nSign]} {(p.natalLon % 30).toFixed(1)}Â°
                                  </span>
                                  <div>
                                    <span className="text-[13px] font-semibold" style={{ color: signChanged ? "#06b6d4" : SIGN_COLORS[dSign] }}>
                                      {SIGN_SYMBOLS[dSign]} {p.directedDeg.toFixed(1)}Â°
                                    </span>
                                    {signChanged && (
                                      <span className="ml-1 text-[14px] px-1 rounded" style={{ background: "rgba(6,182,212,0.15)", color: "#06b6d4" }}>
                                        NEW
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[13px] font-mono" style={{ color: "#475569" }}>+{arc.toFixed(1)}Â°</span>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Sign ingresses by solar arc */}
                        {(() => {
                          const ingresses = directed.filter(p => {
                            const nSign = ZODIAC_SIGNS[Math.floor(p.natalLon / 30)];
                            return nSign !== ZODIAC_SIGNS[p.directedSignIdx];
                          });
                          if (!ingresses.length) return null;
                          return (
                            <div>
                              <SectionHeader
                                label="Solar Arc Sign Ingresses"
                                sub="Planets that have crossed into a new sign via solar arc"
                              />
                              <div className="space-y-2">
                                {ingresses.map((p, i) => {
                                  const color = PLANET_COLORS[p.name as PlanetName] ?? "#94a3b8";
                                  const nSign = ZODIAC_SIGNS[Math.floor(p.natalLon / 30)];
                                  const dSign = ZODIAC_SIGNS[p.directedSignIdx];
                                  return (
                                    <motion.div
                                      key={p.name}
                                      initial={{ opacity: 0, y: 8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: i * 0.06 }}
                                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                                      style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.2)" }}
                                    >
                                      <span className="text-lg" style={{ color }}>{PLANET_SYMBOLS[p.name as PlanetName]}</span>
                                      <div className="flex-1">
                                        <p className="text-[13px] font-bold" style={{ color: "#e2e8f0" }}>{p.name}</p>
                                        <p className="text-[13px]" style={{ color: "#64748b" }}>
                                          Natal: {SIGN_SYMBOLS[nSign]} {nSign} â†’ Directed: {SIGN_SYMBOLS[dSign]} {dSign}
                                        </p>
                                      </div>
                                      <span className="text-[13px] font-bold px-2 py-1 rounded" style={{ background: "rgba(6,182,212,0.15)", color: "#06b6d4" }}>
                                        INGRESS
                                      </span>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </motion.div>
              )}

              {/* â”€â”€â”€ LIFE MAP TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {activeTab === "life-map" && chart && profile && (
                <motion.div
                  key="life-map"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {(() => {
                    const currentAge = chart.annualProfection.age;
                    const birthYear  = new Date(profile.birthDate).getFullYear();
                    const MAX_AGE    = 84;

                    // â”€â”€ Major astrological milestones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    type Milestone = { age: number; label: string; sublabel: string; color: string; tier: "major" | "minor" };
                    const milestones: Milestone[] = [
                      // Jupiter Returns (every ~12 years)
                      ...[12, 24, 36, 48, 60, 72].map(age => ({
                        age, tier: "minor" as const,
                        label: "â™ƒ Return", sublabel: `Jupiter Return â€” renewal of faith & opportunity`,
                        color: "#f59e0b",
                      })),
                      // Saturn Returns (~29.5 & ~59)
                      { age: 29, tier: "major" as const, label: "â™„ Return", sublabel: "1st Saturn Return â€” initiation into adult authority", color: "#94a3b8" },
                      { age: 59, tier: "major" as const, label: "â™„ Return", sublabel: "2nd Saturn Return â€” legacy and mastery", color: "#94a3b8" },
                      // Chiron Return (~50-51)
                      { age: 51, tier: "major" as const, label: "âš· Return", sublabel: "Chiron Return â€” healing the core wound", color: "#22c55e" },
                      // Uranus Opposition (~42)
                      { age: 42, tier: "major" as const, label: "â™… Opp.", sublabel: "Uranus Opposition â€” midlife awakening", color: "#06b6d4" },
                      // Neptune Square (~41 for current gen)
                      { age: 41, tier: "minor" as const, label: "â™† â–¡", sublabel: "Neptune Square â€” dissolution of illusions", color: "#3b82f6" },
                      // Pluto Square (~36-40 for current gen, varies by sign)
                      { age: 38, tier: "minor" as const, label: "â™‡ â–¡", sublabel: "Pluto Square â€” power confrontation with fate", color: "#8b5cf6" },
                      // Node Return (~18.6 years)
                      { age: 19, tier: "minor" as const, label: "â˜Š Return", sublabel: "Nodal Return â€” karmic reset", color: "#64748b" },
                      { age: 37, tier: "minor" as const, label: "â˜Š Return", sublabel: "Nodal Return â€” karmic reset", color: "#64748b" },
                      { age: 56, tier: "minor" as const, label: "â˜Š Return", sublabel: "Nodal Return â€” karmic reset", color: "#64748b" },
                      { age: 75, tier: "minor" as const, label: "â˜Š Return", sublabel: "Nodal Return â€” karmic reset", color: "#64748b" },
                    ].filter(m => m.age <= MAX_AGE);

                    // â”€â”€ Profection year data (all 84 years, cycling 1â€“12) â”€â”€â”€â”€â”€
                    const profectionYears = Array.from({ length: MAX_AGE + 1 }, (_, age) => {
                      const house = ((age % 12) + 1);
                      const signIdx = (signIndex(chart.houses[0].sign) + age) % 12;
                      const sign = ZODIAC_SIGNS[signIdx];
                      const lord = TRADITIONAL_RULERS[sign];
                      return { age, house, sign, lord };
                    });

                    // â”€â”€ SVG dimensions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    const W = 900, H = 200;
                    const PAD_L = 40, PAD_R = 20;
                    const RULER_W = W - PAD_L - PAD_R;
                    const ageToX = (age: number) => PAD_L + (age / MAX_AGE) * RULER_W;
                    const currentX = ageToX(currentAge);

                    return (
                      <>
                        {/* Header */}
                        <div>
                          <p className="text-[13px] font-bold tracking-widest mb-1" style={{ color: "#475569" }}>COSMIC LIFE TIMELINE</p>
                          <p className="text-[14px]" style={{ color: "#334155" }}>
                            Your astrological cycles from birth to age 84 Â· Born {birthYear} Â· Currently age {currentAge}
                          </p>
                        </div>

                        {/* SVG Timeline */}
                        <div className="rounded-2xl p-4 overflow-x-auto" style={{ background: "rgba(4,4,28,0.7)", border: "1px solid rgba(99,102,241,0.15)" }}>
                          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ minWidth: W, display: "block" }}>
                            {/* Background gradient strip */}
                            <defs>
                              <linearGradient id="lifeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(124,58,237,0.04)" />
                                <stop offset="50%" stopColor="rgba(6,182,212,0.04)" />
                                <stop offset="100%" stopColor="rgba(124,58,237,0.04)" />
                              </linearGradient>
                              <clipPath id="lifeClip">
                                <rect x={PAD_L} y={20} width={RULER_W} height={140} rx={4} />
                              </clipPath>
                            </defs>
                            <rect x={PAD_L} y={20} width={RULER_W} height={140} rx={4} fill="url(#lifeGrad)" stroke="rgba(99,102,241,0.1)" strokeWidth={0.5} />

                            {/* Age decade lines + labels */}
                            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 84].map(age => {
                              const x = ageToX(age);
                              return (
                                <g key={age}>
                                  <line x1={x} y1={20} x2={x} y2={160} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                                  <text x={x} y={175} textAnchor="middle" fontSize={7} fill="#334155">{age}</text>
                                </g>
                              );
                            })}

                            {/* Profection house color bands (subtle) */}
                            {profectionYears.map(({ age, house }) => {
                              if (age >= MAX_AGE) return null;
                              const x1 = ageToX(age);
                              const x2 = ageToX(age + 1);
                              const hue = ((house - 1) / 12) * 220 + 200; // 200â€“420 hue range
                              return (
                                <rect
                                  key={age}
                                  x={x1} y={100} width={x2 - x1} height={50}
                                  fill={`hsla(${hue},70%,60%,0.12)`}
                                  clipPath="url(#lifeClip)"
                                />
                              );
                            })}

                            {/* House number labels for each profection year (every 2 years) */}
                            {profectionYears.filter(p => p.age % 2 === 0 && p.age < MAX_AGE).map(({ age, house }) => {
                              const x = ageToX(age + 0.5);
                              return (
                                <text key={age} x={x} y={135} textAnchor="middle" fontSize={6} fill="rgba(99,102,241,0.4)">
                                  H{house}
                                </text>
                              );
                            })}

                            {/* Milestone markers */}
                            {milestones.map((m, i) => {
                              const x = ageToX(m.age);
                              const isMajor = m.tier === "major";
                              return (
                                <g key={`${m.label}-${m.age}-${i}`}>
                                  <line
                                    x1={x} y1={isMajor ? 22 : 40}
                                    x2={x} y2={99}
                                    stroke={m.color}
                                    strokeWidth={isMajor ? 2 : 1}
                                    strokeOpacity={isMajor ? 0.8 : 0.5}
                                    strokeDasharray={isMajor ? "none" : "3,2"}
                                  />
                                  <text
                                    x={x} y={isMajor ? 18 : 36}
                                    textAnchor="middle" fontSize={isMajor ? 8 : 6.5}
                                    fill={m.color} fontWeight={isMajor ? "700" : "400"}
                                  >
                                    {m.label}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Current age line */}
                            <line x1={currentX} y1={20} x2={currentX} y2={160} stroke="#f59e0b" strokeWidth={2} strokeOpacity={0.9} />
                            <rect x={currentX - 16} y={153} width={32} height={12} rx={4} fill="#f59e0b" fillOpacity={0.15} />
                            <text x={currentX} y={162} textAnchor="middle" fontSize={7} fill="#f59e0b" fontWeight="700">AGE {currentAge}</text>

                            {/* "You are here" glow dot */}
                            <circle cx={currentX} cy={125} r={5} fill="#f59e0b" fillOpacity={0.9} filter="url(#webGlow)" />
                            <circle cx={currentX} cy={125} r={9} fill="none" stroke="#f59e0b" strokeWidth={1} strokeOpacity={0.3} />
                          </svg>
                        </div>

                        {/* Milestone legend */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {milestones
                            .filter((m, i, arr) => arr.findIndex(x => x.label === m.label) === i)
                            .map(m => (
                              <div key={m.label} className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                                style={{ background: "rgba(4,4,28,0.5)", border: `1px solid ${m.color}18` }}>
                                <div className="flex-shrink-0 mt-0.5 w-2 h-2 rounded-full" style={{ background: m.color, boxShadow: `0 0 4px ${m.color}` }} />
                                <div>
                                  <p className="text-[13px] font-bold" style={{ color: m.color }}>{m.label}</p>
                                  <p className="text-[13px] leading-relaxed" style={{ color: "#334155" }}>{m.sublabel}</p>
                                </div>
                              </div>
                            ))}
                        </div>

                        {/* Profection cycle for current 12-year block */}
                        <div>
                          <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#475569" }}>
                            CURRENT PROFECTION CYCLE Â· Ages {Math.floor(currentAge / 12) * 12}â€“{Math.floor(currentAge / 12) * 12 + 11}
                          </p>
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            {profectionYears
                              .slice(Math.floor(currentAge / 12) * 12, Math.floor(currentAge / 12) * 12 + 12)
                              .map(({ age, house, sign, lord }) => {
                                const isCurrent = age === currentAge;
                                const lordColor = PLANET_COLORS[lord as PlanetName] ?? "#94a3b8";
                                const signColor = SIGN_COLORS[sign];
                                return (
                                  <motion.div
                                    key={age}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: (age - Math.floor(currentAge / 12) * 12) * 0.05 }}
                                    className="rounded-xl p-2.5 text-center"
                                    style={{
                                      background: isCurrent ? "rgba(245,158,11,0.1)" : "rgba(4,4,28,0.5)",
                                      border: isCurrent ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.05)",
                                      boxShadow: isCurrent ? "0 0 20px rgba(245,158,11,0.12)" : "none",
                                    }}
                                  >
                                    <p className="text-[14px] font-bold mb-0.5" style={{ color: isCurrent ? "#f59e0b" : "#334155" }}>
                                      {birthYear + age}
                                    </p>
                                    <p className="text-[14px] font-black" style={{ color: isCurrent ? "#fbbf24" : "#64748b" }}>
                                      Age {age}
                                    </p>
                                    <p className="text-[13px] mt-1 font-bold" style={{ color: signColor }}>
                                      H{house}
                                    </p>
                                    <p className="text-[13px]" style={{ color: lordColor }}>
                                      {PLANET_SYMBOLS[lord as PlanetName]} {lord}
                                    </p>
                                    {isCurrent && (
                                      <div className="mt-1.5 w-full h-0.5 rounded-full" style={{ background: "#f59e0b" }} />
                                    )}
                                  </motion.div>
                                );
                              })}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

