"use client";

import { motion } from "framer-motion";
import type { ChartData, ZodiacSign, PlanetName } from "@/lib/astrology/types";
import { PLANET_SYMBOLS, SIGN_SYMBOLS, TRADITIONAL_RULERS } from "@/lib/astrology/types";

const HOUSE_TOPICS: Record<number, { title: string; keywords: string; quadrant: string }> = {
  1:  { title: "Self & Identity",        keywords: "body, appearance, life orientation, vitality", quadrant: "Angular" },
  2:  { title: "Resources & Value",      keywords: "money, possessions, livelihood, self-worth",   quadrant: "Succedent" },
  3:  { title: "Mind & Community",       keywords: "siblings, communication, short travel, learning", quadrant: "Cadent" },
  4:  { title: "Roots & Home",           keywords: "family, ancestry, private life, real estate",  quadrant: "Angular" },
  5:  { title: "Creativity & Pleasure",  keywords: "children, romance, games, speculation, joy",   quadrant: "Succedent" },
  6:  { title: "Health & Service",       keywords: "illness, work, daily routine, employees",      quadrant: "Cadent" },
  7:  { title: "Partnership",            keywords: "marriage, contracts, open enemies, others",     quadrant: "Angular" },
  8:  { title: "Transformation",         keywords: "shared resources, inheritance, debt, death",   quadrant: "Succedent" },
  9:  { title: "Philosophy & Expansion", keywords: "travel, religion, law, higher education",      quadrant: "Cadent" },
  10: { title: "Career & Reputation",    keywords: "public role, authority, achievement, father",  quadrant: "Angular" },
  11: { title: "Networks & Hopes",       keywords: "friends, alliances, groups, gains, aspirations", quadrant: "Succedent" },
  12: { title: "Retreat & Undoing",      keywords: "hidden enemies, isolation, spirituality, grief", quadrant: "Cadent" },
};

const QUADRANT_COLORS: Record<string, string> = {
  Angular:   "#9C8AC4",
  Succedent: "#06b6d4",
  Cadent:    "#64748b",
};

const SIGN_COLORS: Record<ZodiacSign, string> = {
  Aries:"#ef4444", Taurus:"#22c55e", Gemini:"#eab308", Cancer:"#9C8AC4",
  Leo:"#f97316", Virgo:"#7B6FD4", Libra:"#ec4899", Scorpio:"#dc2626",
  Sagittarius:"#f59e0b", Capricorn:"#64748b", Aquarius:"#06b6d4", Pisces:"#7B6FD4",
};

function formatCusp(lon: number): string {
  const deg = Math.floor(lon % 30);
  const min = Math.floor(((lon % 30) - deg) * 60);
  return `${deg}°${String(min).padStart(2, "0")}′`;
}

interface HousesTableProps {
  chart: ChartData;
  onSelectHouse?: (house: number | null) => void;
  selectedHouse?: number | null;
  onHouseNavigate?: (house: number) => void;
}

export function HousesTable({ chart, onSelectHouse, selectedHouse, onHouseNavigate }: HousesTableProps) {
  // Map planets to houses
  const planetsByHouse: Record<number, PlanetName[]> = {};
  for (const planet of chart.planets) {
    if (!planetsByHouse[planet.house]) planetsByHouse[planet.house] = [];
    planetsByHouse[planet.house].push(planet.name);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Headers */}
      <div
        className="grid gap-3 px-4 py-2 text-[13px] font-bold tracking-widest flex-shrink-0"
        style={{
          color: "#475569",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          gridTemplateColumns: "0.5fr 0.7fr 1fr 1.2fr 2fr 1.2fr",
        }}
      >
        <span>HOUSE</span>
        <span>CUSP</span>
        <span>SIGN</span>
        <span>LORD</span>
        <span>TOPICS</span>
        <span>OCCUPANTS</span>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        {chart.houses.map((house, i) => {
          const topic = HOUSE_TOPICS[house.house];
          const lord = TRADITIONAL_RULERS[house.sign];
          const lordPlanet = chart.planets.find(p => p.name === lord);
          const occupants = planetsByHouse[house.house] ?? [];
          const isSelected = selectedHouse === house.house;
          const signColor = SIGN_COLORS[house.sign];
          const qColor = QUADRANT_COLORS[topic.quadrant];

          return (
            <motion.div
              key={house.house}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => { onSelectHouse?.(isSelected ? null : house.house); onHouseNavigate?.(house.house); }}
              className="grid gap-3 px-4 py-3 cursor-pointer transition-all duration-150"
              style={{
                gridTemplateColumns: "0.5fr 0.7fr 1fr 1.2fr 2fr 1.2fr",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: isSelected ? `${signColor}08` : "transparent",
                borderLeft: isSelected ? `2px solid ${signColor}` : "2px solid transparent",
              }}
              whileHover={{ background: `${signColor}06` }}
            >
              {/* House number */}
              <div className="flex items-center">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg text-[13px] font-bold"
                  style={{ background: `${qColor}15`, color: qColor, border: `1px solid ${qColor}30` }}>
                  {house.house}
                </div>
              </div>

              {/* Cusp */}
              <div className="flex items-center">
                <span className="text-[13px] font-mono" style={{ color: "#94a3b8" }}>
                  {formatCusp(house.longitude)}
                </span>
              </div>

              {/* Sign */}
              <div className="flex items-center gap-1.5">
                <span className="text-base" style={{ color: signColor }}>{SIGN_SYMBOLS[house.sign]}</span>
                <span className="text-[13px]" style={{ color: "#cbd5e1" }}>{house.sign}</span>
              </div>

              {/* Lord */}
              <div className="flex items-center gap-1.5">
                <span className="text-[14px]" style={{ color: lordPlanet?.dignity === "domicile" ? "#22c55e" : "#94a3b8" }}>
                  {PLANET_SYMBOLS[lord]}
                </span>
                <div>
                  <span className="text-[13px]" style={{ color: "#94a3b8" }}>{lord}</span>
                  {lordPlanet && (
                    <span className="text-[13px] ml-1" style={{ color: "#475569" }}>
                      H{lordPlanet.house}
                    </span>
                  )}
                </div>
              </div>

              {/* Topics */}
              <div className="flex flex-col justify-center">
                <span className="text-[14px] font-semibold" style={{ color: "#e2e8f0" }}>{topic.title}</span>
                <span className="text-[13px] leading-tight mt-0.5" style={{ color: "#475569" }}>{topic.keywords}</span>
              </div>

              {/* Occupants */}
              <div className="flex items-center gap-1 flex-wrap">
                {occupants.length === 0 ? (
                  <span className="text-[13px]" style={{ color: "#2d3748" }}>empty</span>
                ) : (
                  occupants.map(pName => (
                    <span key={pName} className="text-[14px]" title={pName}
                      style={{ color: pName === "Sun" ? "#fbbf24" : pName === "Moon" ? "#94a3b8" : "#a78bfa" }}>
                      {PLANET_SYMBOLS[pName]}
                    </span>
                  ))
                )}
              </div>
            </motion.div>
          );
        })}

        {/* House system note */}
        <div className="px-4 py-3 flex items-center gap-2">
          <span className="text-[13px] tracking-widest" style={{ color: "#334155" }}>
            USING {chart.houseSystem.replace("_", " ").toUpperCase()} HOUSE SYSTEM
            {chart.houseSystem === "whole_sign" && " — EACH HOUSE SPANS A FULL SIGN"}
          </span>
        </div>
      </div>
    </div>
  );
}
