"use client";

import { use, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { HolographicCard } from "@/components/ui/HolographicCard";
import { useWarpTo } from "@/components/ui/WarpTransition";
import { SIGN_SYMBOLS, PLANET_SYMBOLS, TRADITIONAL_RULERS } from "@/lib/astrology/types";
import { PLANET_META } from "@/lib/astrology/planetMeta";
import { getActiveProfileId, getCachedChart } from "@/lib/storage";
import type { ChartData, PlanetName } from "@/lib/astrology/types";

// ─── House metadata ───────────────────────────────────────────────────────────

interface HouseMeta {
  latinName: string;
  title: string;
  keywords: string[];
  color: string;
  themes: string;
  body: string;
  quadrant: "Angular" | "Succedent" | "Cadent";
  element: string;
}

const HOUSE_META: Record<number, HouseMeta> = {
  1:  { latinName: "Vita",             title: "House of Life",      color: "#ef4444", quadrant: "Angular",   element: "Fire",  body: "Head & Face",       keywords: ["Identity","Appearance","Vitality","Beginnings","The Body"],         themes: "The first house is the lens through which the world sees you — your physical form, your temperament, and the orientation of your entire life. It governs how you begin things and the energy you project into the world." },
  2:  { latinName: "Lucrum",           title: "House of Wealth",    color: "#22c55e", quadrant: "Succedent", element: "Earth", body: "Neck & Throat",     keywords: ["Resources","Money","Possessions","Values","Self-Worth"],           themes: "The second house governs everything you own, earn, and value. It shows your relationship with material security and the resources you use to sustain yourself — both financial and physical." },
  3:  { latinName: "Fratres",          title: "House of Siblings",  color: "#eab308", quadrant: "Cadent",    element: "Air",   body: "Shoulders & Arms",  keywords: ["Communication","Siblings","Short Travel","Mind","Learning"],       themes: "The third house rules the local environment — siblings, neighbors, short journeys, and the daily exchange of ideas. It shows how you think, communicate, and connect with the world immediately around you." },
  4:  { latinName: "Genitor",          title: "House of Origins",   color: "#38bdf8", quadrant: "Angular",   element: "Water", body: "Chest & Stomach",   keywords: ["Home","Family","Roots","Ancestry","Private Life"],                 themes: "The fourth house is the foundation of your life — your home, family heritage, private world, and the psychological roots that shape everything you build. It often reveals the parent who most shaped your inner world." },
  5:  { latinName: "Nati",             title: "House of Children",  color: "#f97316", quadrant: "Succedent", element: "Fire",  body: "Heart & Spine",     keywords: ["Creativity","Romance","Children","Pleasure","Joy"],               themes: "The fifth house is the realm of self-expression, creation, and delight. It governs creative output, romantic affairs, children, play, and speculation. It shows how you experience joy and how you put your mark on the world." },
  6:  { latinName: "Valetudo",         title: "House of Health",    color: "#4ade80", quadrant: "Cadent",    element: "Earth", body: "Intestines",        keywords: ["Health","Work","Service","Routine","Employees"],                  themes: "The sixth house rules the daily disciplines of life — health regimens, work habits, service to others, and the small routines that either sustain or undermine your vitality. It is also the house of apprenticeship and craft." },
  7:  { latinName: "Uxor",             title: "House of Partners",  color: "#ec4899", quadrant: "Angular",   element: "Air",   body: "Kidneys",           keywords: ["Partnership","Marriage","Contracts","Open Enemies","Others"],     themes: "The seventh house is the mirror — it shows what you attract in others and what you project outward. It governs all binding partnerships: marriage, business contracts, and even open adversaries who challenge you openly." },
  8:  { latinName: "Mors",             title: "House of Death",     color: "#dc2626", quadrant: "Succedent", element: "Water", body: "Reproductive System", keywords: ["Transformation","Shared Resources","Debt","Inheritance","Death"], themes: "The eighth house plunges into the depths — death, rebirth, and transformation. It governs shared finances, inheritances, sexuality, and the psychological processes of ego dissolution and renewal. It is the house of radical change." },
  9:  { latinName: "Peregrinatio",     title: "House of God",       color: "#f59e0b", quadrant: "Cadent",    element: "Fire",  body: "Hips & Thighs",     keywords: ["Philosophy","Travel","Religion","Higher Education","Wisdom"],      themes: "The ninth house is the horizon of the mind — long journeys, both physical and intellectual. It governs philosophy, religion, law, foreign cultures, and the search for ultimate meaning. It shows how you expand beyond your immediate world." },
  10: { latinName: "Regnum",           title: "House of Career",    color: "#94a3b8", quadrant: "Angular",   element: "Earth", body: "Knees & Joints",    keywords: ["Career","Reputation","Authority","Achievement","Public Life"],    themes: "The tenth house is the pinnacle of the chart — your public role, career, and the legacy you build. It shows your relationship with authority and your own ambition. Often associated with the more public or authoritative parent." },
  11: { latinName: "Bonus Daemon",     title: "House of Spirit",    color: "#06b6d4", quadrant: "Succedent", element: "Air",   body: "Ankles & Calves",   keywords: ["Friends","Networks","Hopes","Community","Gifts"],                 themes: "The eleventh house is the house of the good spirit — friends, alliances, groups, and aspirations. It shows the networks you belong to, the communities that sustain you, and the long-range hopes that guide your choices." },
  12: { latinName: "Malus Daemon",     title: "House of Undoing",   color: "#8b5cf6", quadrant: "Cadent",    element: "Water", body: "Feet & Lymphatics", keywords: ["Hidden Enemies","Isolation","Spirituality","Karma","Dreams"],     themes: "The twelfth house contains what is hidden, forgotten, or transcended. It rules self-undoing, secret enemies, institutions of confinement, karma, and the mystical dimension of experience. Planets here operate beneath the surface of ordinary consciousness." },
};

const QUADRANT_COLORS = { Angular: "#a855f7", Succedent: "#06b6d4", Cadent: "#64748b" };

const PLANET_COLORS: Partial<Record<PlanetName, string>> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#8b5cf6",
  NorthNode: "#64748b", Chiron: "#6366f1",
};

// ─── Oracle panel ─────────────────────────────────────────────────────────────

function HouseOracle({ houseNum, chart, meta }: { houseNum: number; chart: ChartData; meta: HouseMeta }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const started = useRef(false);

  const house = chart.houses[houseNum - 1];
  const lord = house ? TRADITIONAL_RULERS[house.sign] : null;
  const lordPlanet = lord ? chart.planets.find(p => p.name === lord) : null;
  const occupants = chart.planets.filter(p => p.house === houseNum);

  useEffect(() => {
    if (started.current || !house) return;
    started.current = true;

    const occupantStr = occupants.length > 0
      ? occupants.map(p => `${p.name} (${p.sign}${p.retrograde ? " ℞" : ""}${p.dignity ? ", " + p.dignity : ""})`).join(", ")
      : "empty (no planets)";
    const lordStr = lordPlanet
      ? `${lord} in ${lordPlanet.sign}, House ${lordPlanet.house}${lordPlanet.dignity ? ", " + lordPlanet.dignity : ""}${lordPlanet.retrograde ? " ℞" : ""}`
      : lord ?? "unknown";

    const prompt = `You are Cosmora, a visionary astrology intelligence. Give me a rich interpretation of my House ${houseNum} (${meta.title} — ${meta.latinName}). Sign on cusp: ${house.sign}. Lord: ${lordStr}. Occupants: ${occupantStr}. Explore what this house means in my life, how the sign colors its expression, and what the lord's placement reveals about how I navigate these themes. 3–4 paragraphs.`;

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
    })
      .then(async (res) => {
        const reader = res.body?.getReader();
        if (!reader) return;
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = dec.decode(value);
          const lines = chunk.split("\n\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const raw = line.slice(6).trim();
              if (raw === "[DONE]") { setLoading(false); return; }
              try {
                const parsed = JSON.parse(raw);
                buf += parsed.text ?? parsed.content ?? "";
                setText(buf);
              } catch { /* skip */ }
            }
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [houseNum, house, lord, lordPlanet, occupants]);

  return (
    <HolographicCard glowColor={`${meta.color}22`} scanLine={loading} style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 16, color: meta.color }}>◈</span>
        <span style={{ fontSize: 13, letterSpacing: 3, color: meta.color, textTransform: "uppercase" }}>
          Oracle · House {houseNum} Reading
        </span>
        {loading && (
          <span style={{ marginLeft: "auto", fontSize: 14, color: "#64748b", letterSpacing: 2 }}>STREAMING...</span>
        )}
      </div>
      {text ? (
        <div style={{ color: "#cbd5e1", lineHeight: 1.85, fontSize: 14 }}>
          {text.split("\n\n").map((para, i) => (
            <p key={i} style={{ marginBottom: 16 }}>{para}</p>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#475569", fontSize: 13 }}>
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color }}
          />
          Consulting the cosmos...
        </div>
      )}
    </HolographicCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HousePage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = use(params);
  const houseNum = parseInt(n, 10);
  const warpTo = useWarpTo();

  const [chart, setChart] = useState<ChartData | null>(null);

  useEffect(() => {
    const pid = getActiveProfileId();
    if (pid) {
      const c = getCachedChart(pid);
      if (c) setChart(c);
    }
  }, []);

  const meta = HOUSE_META[houseNum];
  if (!meta || houseNum < 1 || houseNum > 12) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", color: "var(--text-2)" }}>
        Invalid house number.
      </div>
    );
  }

  const prevHouse = houseNum === 1 ? 12 : houseNum - 1;
  const nextHouse = houseNum === 12 ? 1 : houseNum + 1;

  const houseData = chart?.houses[houseNum - 1] ?? null;
  const lord = houseData ? TRADITIONAL_RULERS[houseData.sign] : null;
  const lordPlanet = lord ? chart?.planets.find(p => p.name === lord) : null;
  const lordMeta = lord ? PLANET_META[lord as PlanetName] : null;
  const occupants = chart?.planets.filter(p => p.house === houseNum) ?? [];
  const qColor = QUADRANT_COLORS[meta.quadrant];

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      <DashboardBg />

      {/* Colored nebula */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          background: `radial-gradient(ellipse 60% 50% at 60% 35%, ${meta.color}14 0%, transparent 65%)`,
        }}
      />

      <Sidebar />

      <main style={{ flex: 1, marginLeft: 64, padding: "32px 32px 80px", position: "relative", zIndex: 1, maxWidth: 1100 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40, flexWrap: "wrap" }}
        >
          <button
            onClick={() => warpTo("/dashboard/chart")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "6px 14px", cursor: "pointer",
              color: "#94a3b8", fontSize: 14, letterSpacing: 1.5, textTransform: "uppercase",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color + "66"; e.currentTarget.style.color = meta.color; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#94a3b8"; }}
          >
            ← Chart
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* House number badge */}
            <div style={{
              width: 48, height: 48, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              background: `${meta.color}18`, border: `2px solid ${meta.color}55`,
              boxShadow: `0 0 20px ${meta.color}33`,
            }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: meta.color }}>{houseNum}</span>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", letterSpacing: 1 }}>
                {meta.title}
              </div>
              <div style={{ fontSize: 14, color: "#64748b", letterSpacing: 1, fontStyle: "italic" }}>
                {meta.latinName} · {meta.quadrant} · {meta.element}
              </div>
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <span style={{
              fontSize: 14, letterSpacing: 2, color: qColor,
              background: `${qColor}15`, border: `1px solid ${qColor}30`,
              borderRadius: 6, padding: "4px 10px",
            }}>
              {meta.quadrant.toUpperCase()}
            </span>
          </div>
        </motion.div>

        {/* Hero: cusp data + themes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 40 }}>

          {/* Left: cusp visualization */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            {/* Big house glyph */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "100%", height: 200, position: "relative", marginBottom: 24,
            }}>
              <motion.div
                animate={{ scale: [1, 1.03, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute", width: 220, height: 220, borderRadius: "50%",
                  background: `radial-gradient(circle, ${meta.color}20 0%, transparent 70%)`,
                  filter: "blur(20px)",
                }}
              />
              <div style={{
                width: 160, height: 160, borderRadius: "50%",
                background: `radial-gradient(circle at 35% 32%, ${meta.color}44 0%, ${meta.color}18 40%, rgba(3,4,10,0.9) 72%)`,
                boxShadow: `0 0 48px ${meta.color}33, inset 0 0 24px ${meta.color}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `1px solid ${meta.color}33`,
                position: "relative",
              }}>
                {/* House number */}
                <span style={{
                  fontSize: 64, fontWeight: 900, color: meta.color,
                  textShadow: `0 0 30px ${meta.color}`,
                  lineHeight: 1, fontVariantNumeric: "tabular-nums",
                }}>
                  {houseNum}
                </span>
              </div>
            </div>

            {/* Position data */}
            {houseData ? (
              <HolographicCard glowColor={`${meta.color}22`} style={{ padding: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, letterSpacing: 2.5, color: "#475569", textTransform: "uppercase", marginBottom: 3 }}>
                      Cusp Sign
                    </div>
                    <div style={{ fontSize: 16, color: meta.color }}>
                      {SIGN_SYMBOLS[houseData.sign]} {houseData.sign}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, letterSpacing: 2.5, color: "#475569", textTransform: "uppercase", marginBottom: 3 }}>
                      Cusp Degree
                    </div>
                    <div style={{ fontSize: 14, color: "#cbd5e1", fontVariantNumeric: "tabular-nums" }}>
                      {Math.floor(houseData.longitude % 30)}°{String(Math.floor(((houseData.longitude % 30) - Math.floor(houseData.longitude % 30)) * 60)).padStart(2, "0")}′
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, letterSpacing: 2.5, color: "#475569", textTransform: "uppercase", marginBottom: 3 }}>
                      House Lord
                    </div>
                    {lord && lordPlanet ? (
                      <button
                        onClick={() => warpTo(`/dashboard/chart/${lord.toLowerCase()}`)}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        <span style={{ fontSize: 18, color: lordMeta?.color ?? "#94a3b8" }}>
                          {PLANET_SYMBOLS[lord as PlanetName] ?? "○"}
                        </span>
                        <span style={{ fontSize: 13, color: lordMeta?.color ?? "#94a3b8", textDecoration: "underline" }}>{lord}</span>
                        <span style={{ fontSize: 13, color: "#64748b" }}>→ H{lordPlanet.house}</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: 13, color: "#94a3b8" }}>{lord ?? "—"}</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, letterSpacing: 2.5, color: "#475569", textTransform: "uppercase", marginBottom: 3 }}>
                      Occupants
                    </div>
                    {occupants.length > 0 ? (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {occupants.map(p => (
                          <button
                            key={p.name}
                            onClick={() => warpTo(`/dashboard/chart/${p.name.toLowerCase()}`)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            title={p.name}
                          >
                            <span style={{ fontSize: 18, color: PLANET_COLORS[p.name] ?? "#94a3b8" }}>
                              {PLANET_SYMBOLS[p.name] ?? "○"}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 14, color: "#334155" }}>Empty house</span>
                    )}
                  </div>
                </div>
              </HolographicCard>
            ) : (
              <div style={{ color: "#475569", fontSize: 13, padding: 20 }}>No chart loaded.</div>
            )}
          </motion.div>

          {/* Right: themes + keywords */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, letterSpacing: 3, color: meta.color, textTransform: "uppercase", marginBottom: 8 }}>
                Traditional Theme
              </div>
              <p style={{ fontSize: 15, color: "#94a3b8", lineHeight: 1.75 }}>
                {meta.themes}
              </p>
            </div>

            {/* Keywords */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {meta.keywords.map(kw => (
                <span
                  key={kw}
                  style={{
                    fontSize: 14, letterSpacing: 2, textTransform: "uppercase",
                    color: meta.color, background: `${meta.color}18`,
                    border: `1px solid ${meta.color}33`, borderRadius: 20, padding: "4px 12px",
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>

            {/* Lord detail */}
            {lord && lordPlanet && (
              <HolographicCard glowColor={`${lordMeta?.color ?? meta.color}22`} style={{ padding: 18 }}>
                <div style={{ fontSize: 13, letterSpacing: 2.5, color: "#475569", textTransform: "uppercase", marginBottom: 12 }}>
                  Lord of this House
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 28, color: lordMeta?.color ?? "#94a3b8" }}>
                    {PLANET_SYMBOLS[lord as PlanetName] ?? "○"}
                  </span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: lordMeta?.color ?? "#f1f5f9" }}>{lord}</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>
                      {SIGN_SYMBOLS[lordPlanet.sign]} {lordPlanet.sign} · House {lordPlanet.house}
                      {lordPlanet.retrograde && <span style={{ color: "#f59e0b", marginLeft: 4 }}>℞</span>}
                    </div>
                  </div>
                  {lordPlanet.dignity && (
                    <div style={{ marginLeft: "auto" }}>
                      <span style={{
                        fontSize: 13, letterSpacing: 2, textTransform: "uppercase",
                        color: lordPlanet.dignity === "domicile" || lordPlanet.dignity === "exaltation" ? "#22c55e" : "#ef4444",
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 6, padding: "3px 8px",
                      }}>
                        {lordPlanet.dignity}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
                  As lord of House {houseNum}, {lord} in {lordPlanet.sign} House {lordPlanet.house} shows how {meta.title.toLowerCase()} themes play out through {lordMeta?.archetype?.toLowerCase() ?? lord.toLowerCase()} energy.
                </div>
                <button
                  onClick={() => warpTo(`/dashboard/chart/${lord.toLowerCase()}`)}
                  style={{
                    marginTop: 12, padding: "6px 14px", borderRadius: 8,
                    background: `${lordMeta?.color ?? meta.color}12`,
                    border: `1px solid ${lordMeta?.color ?? meta.color}33`,
                    color: lordMeta?.color ?? meta.color,
                    fontSize: 14, letterSpacing: 2, textTransform: "uppercase",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  Full {lord} Reading →
                </button>
              </HolographicCard>
            )}
          </motion.div>
        </div>

        {/* Planets in house */}
        {occupants.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            style={{ marginBottom: 40 }}
          >
            <div style={{ fontSize: 14, letterSpacing: 4, color: "#475569", textTransform: "uppercase", marginBottom: 14 }}>
              Planets in House {houseNum}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {occupants.map((p, i) => {
                const pm = PLANET_META[p.name as PlanetName];
                return (
                  <motion.div
                    key={p.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                  >
                    <HolographicCard
                      glowColor={`${pm?.color ?? "#94a3b8"}22`}
                      style={{ padding: "14px 16px", cursor: "pointer" }}
                    >
                      <div
                        onClick={() => warpTo(`/dashboard/chart/${p.name.toLowerCase()}`)}
                        style={{ display: "flex", alignItems: "center", gap: 12 }}
                      >
                        <span style={{ fontSize: 24, color: pm?.color ?? "#94a3b8" }}>
                          {PLANET_SYMBOLS[p.name] ?? "○"}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                            {p.name}
                            {p.retrograde && <span style={{ color: "#f59e0b", marginLeft: 4, fontSize: 14 }}>℞</span>}
                          </div>
                          <div style={{ fontSize: 13, color: "#64748b" }}>
                            {SIGN_SYMBOLS[p.sign]} {p.sign}
                            {p.dignity && p.dignity !== "peregrine" && (
                              <span style={{ marginLeft: 6, fontSize: 13, color: p.dignity === "domicile" || p.dignity === "exaltation" ? "#22c55e" : "#ef4444" }}>
                                {p.dignity}
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ fontSize: 13, color: "#334155" }}>→</span>
                      </div>
                    </HolographicCard>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Oracle */}
        {chart && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            style={{ marginBottom: 48 }}
          >
            <div style={{ fontSize: 14, letterSpacing: 4, color: "#475569", textTransform: "uppercase", marginBottom: 14 }}>
              Oracle
            </div>
            <HouseOracle houseNum={houseNum} chart={chart} meta={meta} />
          </motion.section>
        )}

        {/* Previous / Next navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          {[
            { house: prevHouse, dir: "prev" as const },
            { house: nextHouse, dir: "next" as const },
          ].map(({ house, dir }) => {
            const m = HOUSE_META[house];
            return (
              <button
                key={house}
                onClick={() => warpTo(`/dashboard/chart/house/${house}`)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10, padding: "12px 20px", cursor: "pointer",
                  color: "#64748b", fontSize: 14, letterSpacing: 1, transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = m.color + "55"; e.currentTarget.style.color = m.color; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#64748b"; }}
              >
                {dir === "prev" && "←  "}
                House {house} · {m.latinName}
                {dir === "next" && "  →"}
              </button>
            );
          })}
        </motion.div>

      </main>
    </div>
  );
}
