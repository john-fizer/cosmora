"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ChartWheel } from "@/components/chart/ChartWheel";
import { getActiveProfileId, getProfile, getCachedChart, getOraclePersona } from "@/lib/storage";
import type { ChartData, PlanetName } from "@/lib/astrology/types";
import { PLANET_SYMBOLS } from "@/lib/astrology/types";

// ─── Lens data ────────────────────────────────────────────────────────────────
const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

const LENSES = [
  {
    offset: 0,  keyword: "SELF",      color: "#c4b5fd",
    title: "Your Own Story",
    subtitle: "The natal chart as experienced through your own eyes.",
    domains: ["Identity", "Body", "First Impressions", "Life Direction"],
    reading: "The chart in its natural state — the 1st house as Ascendant. This is who you are: your appearance, temperament, and the lens through which you meet the world.",
  },
  {
    offset: 1,  keyword: "RESOURCES", color: "#34d399",
    title: "Money & Values",
    subtitle: "2nd house as Ascendant — what you own, earn, and deeply value.",
    domains: ["Income", "Possessions", "Self-Worth", "Talents"],
    reading: "Turn the chart so the 2nd house becomes the Ascendant. The planets now speak to your financial instincts, material security, and what you consider truly valuable.",
  },
  {
    offset: 2,  keyword: "MIND",      color: "#fbbf24",
    title: "Siblings & Communication",
    subtitle: "3rd house as Ascendant — your mental world, siblings, local journeys.",
    domains: ["Communication", "Siblings", "Learning", "Short Travel"],
    reading: "The 3rd house as ASC reveals your mental style, how you speak and write, your relationship with siblings, and how your immediate environment shapes you.",
  },
  {
    offset: 3,  keyword: "ROOTS",     color: "#67e8f9",
    title: "Family & Foundation",
    subtitle: "4th house as Ascendant — your ancestry, home, inner foundation.",
    domains: ["Parents", "Home", "Heritage", "Inner Life"],
    reading: "When the 4th house rises, you read the chart as your family karma. The planets describe your parents, your childhood home, and the roots you carry within you.",
  },
  {
    offset: 4,  keyword: "CREATION",  color: "#fb923c",
    title: "Creativity & Children",
    subtitle: "5th house as Ascendant — what you give birth to, creative fire.",
    domains: ["Children", "Romance", "Art", "Pleasure"],
    reading: "The 5th house as ASC describes your creative children — biological or artistic. Planets here reveal the nature of your joy, your romances, and what you create purely for love.",
  },
  {
    offset: 5,  keyword: "SERVICE",   color: "#818cf8",
    title: "Health & Daily Work",
    subtitle: "6th house as Ascendant — your body, routines, and co-workers.",
    domains: ["Health", "Routines", "Pets", "Service"],
    reading: "With the 6th house rising, read the chart as your body's story. Planets speak to your health patterns, daily work environment, and relationship with service.",
  },
  {
    offset: 6,  keyword: "PARTNER",   color: "#f472b6",
    title: "Your Partner's Story",
    subtitle: "7th house as Ascendant — spouse, open enemies, one-on-one bonds.",
    domains: ["Spouse", "Business Partner", "Open Enemies", "Contracts"],
    reading: "The classic derived house: the 7th as ASC reads your partner's chart. Their appearance, motivations, and resources are all revealed through this lens.",
  },
  {
    offset: 7,  keyword: "DEPTH",     color: "#f87171",
    title: "Shared Resources & Death",
    subtitle: "8th house as Ascendant — transformation, inheritance, the psyche.",
    domains: ["Joint Finances", "Death", "Occult", "Regeneration"],
    reading: "8th house rising exposes what is shared, owed, and transformed. Planets here describe inheritance, debt, your deepest fears, and the process of radical change.",
  },
  {
    offset: 8,  keyword: "WISDOM",    color: "#fcd34d",
    title: "Higher Learning & Belief",
    subtitle: "9th house as Ascendant — philosophy, foreign lands, gurus.",
    domains: ["Travel", "Philosophy", "Higher Education", "Spirituality"],
    reading: "Turn the chart to the 9th and you read your quest for meaning. Planets describe the teachers you attract, how you encounter the divine, and where the world expands you.",
  },
  {
    offset: 9,  keyword: "CALLING",   color: "#94a3b8",
    title: "Career & Public Life",
    subtitle: "10th house as Ascendant — your reputation and vocation.",
    domains: ["Career", "Reputation", "Authority", "Legacy"],
    reading: "With the Midheaven as the new ASC, the chart reads as your public destiny. Planets describe bosses, the career you're called to, and how the world will remember you.",
  },
  {
    offset: 10, keyword: "NETWORK",   color: "#22d3ee",
    title: "Community & Allies",
    subtitle: "11th house as Ascendant — your tribes, hopes, and social web.",
    domains: ["Friends", "Groups", "Aspirations", "Collective Work"],
    reading: "The 11th as ASC shows your people. Planets describe the quality of friendships, your role in communities, the kinds of allies you draw, and the dreams you hold for the future.",
  },
  {
    offset: 11, keyword: "HIDDEN",    color: "#c084fc",
    title: "The Invisible Realm",
    subtitle: "12th house as Ascendant — secrets, karma, spiritual retreat.",
    domains: ["Karma", "Isolation", "Hidden Enemies", "Mysticism"],
    reading: "The most esoteric lens. The 12th as ASC reads the chart as your hidden life — what you keep from the world, where you retreat, unconscious patterns, and spiritual work.",
  },
];

// ─── Planet house calculation ─────────────────────────────────────────────────
function derivedHouseOf(natalHouse: number, offset: number): number {
  return ((natalHouse - 1 - offset + 12) % 12) + 1;
}

const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#94a3b8", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#8b9ab4", Uranus: "#06b6d4",
  Neptune: "#3b82f6", Pluto: "#8b5cf6", NorthNode: "#64748b", Chiron: "#6366f1",
};

// ─── Reading stream ───────────────────────────────────────────────────────────
function useReadingStream() {
  const [text, setText]       = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const generate = useCallback(async (prompt: string) => {
    if (started) return;
    setStarted(true); setLoading(true); setText("");
    try {
      const res = await fetch("/api/oracle/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, maxTokens: 280, persona: getOraclePersona() }),
      });
      if (!res.ok || !res.body) { setLoading(false); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        setText(buf);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [started]);

  const reset = useCallback(() => { setText(""); setStarted(false); setLoading(false); }, []);
  return { text, loading, started, generate, reset };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PrismPage() {
  const [chart, setChart]           = useState<ChartData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [selectedLens, setSelectedLens] = useState(0);
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const reading = useReadingStream();

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setLoading(false); return; }
    const profile = getProfile(id);
    if (!profile) { setLoading(false); return; }
    const cached = getCachedChart(id);
    if (cached) { setChart(cached); setLoading(false); return; }

    const dt = profile.birthDate && profile.birthTime
      ? `${profile.birthDate}T${profile.birthTime}:00`
      : null;
    if (!dt) { setLoading(false); return; }

    fetch("/api/chart/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthDatetime: dt,
        latitude:  profile.latitude  ?? 34.05,
        longitude: profile.longitude ?? -118.24,
      }),
    })
      .then(r => r.json())
      .then(data => { setChart(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const lens = LENSES[selectedLens];

  // Group planets by derived house
  const planetsByDerivedHouse = (() => {
    if (!chart) return {};
    const groups: Record<number, typeof chart.planets> = {};
    for (const planet of chart.planets) {
      const dh = derivedHouseOf(planet.house, lens.offset);
      if (!groups[dh]) groups[dh] = [];
      groups[dh].push(planet);
    }
    return groups;
  })();

  const handleLensSelect = (idx: number) => {
    setSelectedLens(idx);
    reading.reset();
  };

  const handleGenerateReading = () => {
    if (!chart) return;
    const planetList = chart.planets
      .map(p => `${p.name} in natal house ${p.house} (derived house ${derivedHouseOf(p.house, lens.offset)})`)
      .join(", ");
    const prompt = `You are an expert astrologer. Give a concise but insightful reading of this derived chart: ${lens.title}. The ${lens.offset + 1}th natal house becomes the Ascendant. Context: ${lens.subtitle}. Planets: ${planetList}. Focus on what this lens reveals about ${lens.keyword.toLowerCase()}. Be specific, not generic. 3-4 sentences.`;
    reading.generate(prompt);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#050510" }}>
        <Sidebar />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ width: 48, height: 48, border: "1px solid rgba(232,121,249,0.3)", borderTopColor: "#e879f9", borderRadius: "50%" }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#050510" }}>
      <Sidebar />

      {/* ── Background prismatic gradient ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 20% 50%, rgba(232,121,249,0.05) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(99,102,241,0.06) 0%, transparent 50%)",
      }} />

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "absolute", top: 0, left: 64, right: 0, height: 48,
          display: "flex", alignItems: "center", gap: 20, paddingLeft: 20, paddingRight: 20,
          background: "rgba(5,5,16,0.9)", borderBottom: "1px solid rgba(232,121,249,0.12)",
          backdropFilter: "blur(24px)", zIndex: 20,
        }}
      >
        <div>
          <span style={{ color: "#e879f9", fontSize: 14, fontWeight: 700, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace" }}>
            PRISM
          </span>
          <span style={{ color: "#334466", fontSize: 10, letterSpacing: "0.1em", fontFamily: "'Fragment Mono', monospace", marginLeft: 10 }}>
            DERIVED HOUSE ORACLE
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {/* Active lens chip */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedLens}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "4px 12px",
              background: `${lens.color}12`,
              border: `1px solid ${lens.color}30`,
              borderRadius: 20,
            }}
          >
            <span style={{ color: lens.color, fontSize: 9, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.12em" }}>
              {ROMAN[selectedLens]}
            </span>
            <span style={{ color: lens.color, fontSize: 9, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.12em" }}>
              {lens.keyword}
            </span>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ── Main layout ── */}
      <div style={{ position: "absolute", top: 48, left: 64, right: 0, bottom: 0, display: "flex" }}>

        {/* ── Left: House lens selector ── */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            width: 160, flexShrink: 0,
            borderRight: "1px solid rgba(232,121,249,0.1)",
            overflowY: "auto", scrollbarWidth: "none",
            padding: "12px 8px",
            display: "flex", flexDirection: "column", gap: 3,
          }}
        >
          <p style={{ color: "#334466", fontSize: 7, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", padding: "4px 6px 8px" }}>
            SELECT LENS
          </p>
          {LENSES.map((l, i) => {
            const active = selectedLens === i;
            return (
              <motion.button
                key={i}
                onClick={() => handleLensSelect(i)}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 8px", borderRadius: 8, textAlign: "left",
                  background: active ? `${l.color}12` : "transparent",
                  border: `1px solid ${active ? l.color + "35" : "transparent"}`,
                  cursor: "pointer", transition: "background 0.15s, border 0.15s",
                  boxShadow: active ? `0 0 12px ${l.color}18` : "none",
                }}
              >
                {/* Roman numeral */}
                <span style={{
                  color: active ? l.color : "#2A3456",
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.05em",
                  fontFamily: "'Fragment Mono', monospace", width: 24, flexShrink: 0,
                  transition: "color 0.15s",
                }}>
                  {ROMAN[i]}
                </span>
                {/* Keyword */}
                <span style={{
                  color: active ? l.color : "#445577",
                  fontSize: 8.5, letterSpacing: "0.08em",
                  fontFamily: "'Fragment Mono', monospace",
                  transition: "color 0.15s",
                }}>
                  {l.keyword}
                </span>
                {/* Active indicator dot */}
                {active && (
                  <motion.div
                    layoutId="lens-dot"
                    style={{
                      marginLeft: "auto", width: 4, height: 4, borderRadius: "50%",
                      background: l.color,
                      boxShadow: `0 0 6px ${l.color}`,
                      flexShrink: 0,
                    }}
                  />
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Center: Chart wheel ── */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24, minWidth: 0,
        }}>
          <motion.div
            key={selectedLens}
            initial={{ opacity: 0.6, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            <ChartWheel
              size={Math.min(520, window?.innerWidth ? window.innerWidth - 500 : 480)}
              chart={chart ?? undefined}
              interactive
              derivedOffset={lens.offset}
              onHouseClick={handleLensSelect}
              onPlanetClick={(name) => setHoveredPlanet(h => h === name ? null : name)}
            />
          </motion.div>
        </div>

        {/* ── Right: Derived reading panel ── */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{
            width: 272, flexShrink: 0,
            borderLeft: "1px solid rgba(232,121,249,0.1)",
            overflowY: "auto", scrollbarWidth: "none",
            display: "flex", flexDirection: "column",
          }}
        >
          {/* Lens info header */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedLens}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              style={{ padding: "18px 18px 0" }}
            >
              {/* House number + title */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                <span style={{
                  color: lens.color, fontSize: 28, fontWeight: 700,
                  fontFamily: "'Fragment Mono', monospace", lineHeight: 1,
                  textShadow: `0 0 20px ${lens.color}60`,
                }}>
                  {ROMAN[selectedLens]}
                </span>
                <span style={{
                  color: lens.color, fontSize: 10, letterSpacing: "0.18em",
                  fontFamily: "'Fragment Mono', monospace",
                }}>
                  {lens.keyword}
                </span>
              </div>

              <p style={{
                color: "#C0D4FF", fontSize: 14, fontWeight: 600,
                marginBottom: 4, lineHeight: 1.3,
                fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.06em",
              }}>
                {lens.title.toUpperCase()}
              </p>
              <p style={{ color: "#4A5A7A", fontSize: 10, lineHeight: 1.5, marginBottom: 12 }}>
                {lens.subtitle}
              </p>

              {/* Domain tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
                {lens.domains.map(d => (
                  <span key={d} style={{
                    padding: "2px 7px",
                    background: `${lens.color}0F`,
                    border: `1px solid ${lens.color}28`,
                    borderRadius: 20,
                    color: lens.color, fontSize: 7.5,
                    fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.08em",
                    opacity: 0.8,
                  }}>
                    {d}
                  </span>
                ))}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: `linear-gradient(90deg, ${lens.color}25, transparent)`, marginBottom: 16 }} />
            </motion.div>
          </AnimatePresence>

          {/* Planets by derived house */}
          <div style={{ padding: "0 18px", flex: 1 }}>
            <p style={{ color: "#334466", fontSize: 7, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>
              PLANETS IN DERIVED HOUSES
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(dh => {
                const planets = planetsByDerivedHouse[dh];
                if (!planets?.length) return null;
                return (
                  <motion.div
                    key={dh}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: dh * 0.04, duration: 0.3 }}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      padding: "6px 8px", borderRadius: 7,
                      background: dh === 1 ? `${lens.color}0E` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${dh === 1 ? lens.color + "28" : "rgba(255,255,255,0.04)"}`,
                    }}
                  >
                    {/* Derived house number */}
                    <span style={{
                      color: dh === 1 ? lens.color : "#334466",
                      fontSize: 8, fontWeight: 700, fontFamily: "'Fragment Mono', monospace",
                      width: 20, flexShrink: 0, paddingTop: 1,
                    }}>
                      {ROMAN[dh - 1]}
                    </span>
                    {/* Planets */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {planets.map(p => (
                        <motion.div
                          key={p.name}
                          whileHover={{ scale: 1.08 }}
                          onClick={() => setHoveredPlanet(h => h === p.name ? null : p.name)}
                          style={{
                            display: "flex", alignItems: "center", gap: 3,
                            padding: "1px 6px", borderRadius: 12, cursor: "pointer",
                            background: `${PLANET_COLORS[p.name] ?? "#4488FF"}12`,
                            border: `1px solid ${PLANET_COLORS[p.name] ?? "#4488FF"}28`,
                            outline: hoveredPlanet === p.name ? `1px solid ${PLANET_COLORS[p.name] ?? "#4488FF"}88` : "none",
                          }}
                        >
                          <span style={{ color: PLANET_COLORS[p.name] ?? "#aaa", fontSize: 11 }}>
                            {PLANET_SYMBOLS[p.name as PlanetName] ?? "·"}
                          </span>
                          <span style={{ color: PLANET_COLORS[p.name] ?? "#aaa", fontSize: 7.5, fontFamily: "'Fragment Mono', monospace" }}>
                            {p.name.toUpperCase()}
                          </span>
                          {p.retrograde && (
                            <span style={{ color: PLANET_COLORS[p.name] ?? "#aaa", fontSize: 7, opacity: 0.6 }}>℞</span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* AI reading section */}
          <div style={{ padding: 18, borderTop: "1px solid rgba(232,121,249,0.1)", flexShrink: 0 }}>
            <AnimatePresence mode="wait">
              {reading.text ? (
                <motion.div
                  key="reading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ marginBottom: 12 }}
                >
                  <p style={{
                    color: "#8899CC", fontSize: 11.5, lineHeight: 1.75,
                    whiteSpace: "pre-wrap",
                  }}>
                    {reading.text}
                    {reading.loading && (
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.7, repeat: Infinity }}
                        style={{ display: "inline-block", width: 5, height: 11, background: lens.color, borderRadius: 1, marginLeft: 3, verticalAlign: "middle" }}
                      />
                    )}
                  </p>
                  {!reading.loading && (
                    <button
                      onClick={reading.reset}
                      style={{
                        marginTop: 8, fontSize: 8, color: "#334466",
                        background: "none", border: "none", cursor: "pointer",
                        fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em",
                      }}
                    >
                      ↺ CLEAR
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.p
                  key="prompt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ color: "#2A3456", fontSize: 10, lineHeight: 1.6, marginBottom: 12 }}
                >
                  {lens.reading}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerateReading}
              disabled={reading.started || !chart}
              style={{
                width: "100%", padding: "9px 0",
                background: reading.started
                  ? "rgba(232,121,249,0.04)"
                  : `linear-gradient(135deg, ${lens.color}18, rgba(232,121,249,0.08))`,
                border: `1px solid ${reading.started ? "rgba(232,121,249,0.1)" : lens.color + "40"}`,
                borderRadius: 10, cursor: reading.started ? "default" : "pointer",
                color: reading.started ? "#334466" : lens.color,
                fontSize: 8.5, letterSpacing: "0.14em",
                fontFamily: "'Fragment Mono', monospace",
                transition: "all 0.2s",
              }}
            >
              {reading.loading ? "◎ READING THE PRISM..." : reading.started ? "✦ READING COMPLETE" : `✦ GENERATE ${lens.keyword} READING`}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
