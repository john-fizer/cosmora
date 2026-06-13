"use client";

import { use, useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { DashboardBg } from "@/components/ui/DashboardBg";

const PlanetView3D = dynamic(() => import("@/components/three/PlanetView3D"), { ssr: false });
import { getPlanetMeta, PLANET_ORDER } from "@/lib/astrology/planetMeta";
import { useWarpTo } from "@/components/ui/WarpTransition";
import { getActiveProfileId, getCachedChart } from "@/lib/storage";
import { PLANET_SYMBOLS, SIGN_SYMBOLS } from "@/lib/astrology/types";
import type { ChartData, PlanetName } from "@/lib/astrology/types";
import type { TransitAspect } from "@/lib/astrology/transits";

// ─── Constants ────────────────────────────────────────────────────────────────

const ASPECT_GLYPHS: Record<string, string> = {
  conjunction: "☌", opposition: "☍", trine: "△",
  square: "□", sextile: "⚹", quincunx: "⊻",
};

const ASPECT_COLORS: Record<string, string> = {
  conjunction: "#a78bfa", opposition: "#ef4444", trine: "#22c55e",
  square: "#f97316", sextile: "#06b6d4", quincunx: "#64748b",
};

const PLANET_COLORS: Partial<Record<PlanetName, string>> = {
  Sun: "#ffd700", Moon: "#BFB6E8", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#7B6FD4",
  NorthNode: "#64748b", Chiron: "#7B6FD4",
};

const DIGNITY_COLORS: Record<string, string> = {
  domicile: "#22c55e", exaltation: "#86efac",
  detriment: "#f97316", fall: "#ef4444", peregrine: "#475569",
};

function formatDeg(lon: number) {
  const deg = Math.floor(lon % 30);
  const min = Math.floor(((lon % 30) - deg) * 60);
  return `${deg}°${String(min).padStart(2, "0")}′`;
}

// ─── Animated Planet Orb ──────────────────────────────────────────────────────

function PlanetOrb({ color, glyph, glowColor }: { color: string; glyph: string; glowColor: string }) {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: 300, height: 300 }}
    >
      {[1.0, 0.72, 0.48].map((s, i) => (
        <motion.div
          key={i}
          animate={{ scale: [s, s * 1.06, s], opacity: [0.25, 0.08, 0.25] }}
          transition={{ duration: 3.5 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
          style={{
            position: "absolute", width: "100%", height: "100%",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          }}
        />
      ))}

      <motion.div
        animate={{ scale: [1, 1.025, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 190, height: 190, borderRadius: "50%",
          background: `radial-gradient(circle at 33% 33%, ${color}dd 0%, ${color}88 30%, ${color}22 65%, transparent 100%)`,
          boxShadow: `0 0 50px ${color}44, 0 0 100px ${color}20, inset 0 0 30px rgba(0,0,0,0.4)`,
          position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <div style={{
          position: "absolute", top: "18%", left: "20%",
          width: "38%", height: "26%", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 70%)",
          transform: "rotate(-25deg)",
        }} />
        <span style={{
          fontSize: "3.8rem", color,
          filter: "drop-shadow(0 0 16px currentColor)",
          zIndex: 1, userSelect: "none",
        }}>
          {glyph}
        </span>
      </motion.div>
    </motion.div>
  );
}

// ─── Oracle Panel ─────────────────────────────────────────────────────────────

function OraclePanel({ text, loading }: { text: string; loading: boolean }) {
  return (
    <div
      className="rounded-2xl p-6 relative overflow-hidden"
      style={{
        background: "rgba(4,4,28,0.75)",
        border: "1px solid rgba(123,111,212,0.2)",
        backdropFilter: "blur(24px)",
        minHeight: 100,
      }}
    >
      {loading && (
        <motion.div
          animate={{ y: ["-110%", "210%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", left: 0, right: 0, height: 2, top: 0,
            background: "linear-gradient(to right, transparent, rgba(123,111,212,0.7), transparent)",
            zIndex: 2, pointerEvents: "none",
          }}
        />
      )}

      <div className="flex items-center gap-3 mb-4">
        <span className="text-[13px] font-bold tracking-widest" style={{ color: "#7B6FD4" }}>
          ✶ ORACLE
        </span>
        {loading && (
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#7B6FD4" }}
          />
        )}
      </div>

      {text ? (
        <p className="text-[16px] leading-relaxed" style={{ color: "#94a3b8", whiteSpace: "pre-wrap" }}>
          {text}
        </p>
      ) : loading ? (
        <p className="text-[14px]" style={{ color: "#334155" }}>Reading the celestial spheres…</p>
      ) : null}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanetDetailPage({
  params,
}: {
  params: Promise<{ planet: string }>;
}) {
  const { planet: planetSlug } = use(params);
  const planetName = (planetSlug.charAt(0).toUpperCase() + planetSlug.slice(1)) as PlanetName;
  const meta = getPlanetMeta(planetName);

  const [chart, setChart] = useState<ChartData | null>(null);
  const [liveTransits, setLiveTransits] = useState<TransitAspect[]>([]);
  const [oracleText, setOracleText] = useState("");
  const [oracleLoading, setOracleLoading] = useState(false);
  const oracleStarted = useRef(false);
  const warpTo = useWarpTo();

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) return;
    const cached = getCachedChart(id);
    if (cached) setChart(cached);
  }, []);

  // Fetch live transits for this planet
  useEffect(() => {
    if (!chart) return;
    fetch("/api/transits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ natal: chart }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { aspects?: TransitAspect[] } | null) => {
        if (data?.aspects) {
          const mine = data.aspects
            .filter(a => a.natalPlanet === planetName)
            .sort((a, b) => a.orb - b.orb);
          setLiveTransits(mine);
        }
      })
      .catch(() => {});
  }, [chart, planetName]);

  useEffect(() => {
    if (!chart || oracleStarted.current) return;
    const pd = chart.planets.find(p => p.name === planetName);
    if (!pd) return;
    oracleStarted.current = true;

    const aspects = chart.aspects
      .filter(a => a.planet1 === planetName || a.planet2 === planetName)
      .slice(0, 5)
      .map(a => {
        const other = a.planet1 === planetName ? a.planet2 : a.planet1;
        return `${a.type} ${other} (${a.orb.toFixed(1)}°)`;
      });

    const query = `Give me a focused reading of my ${planetName} in ${pd.sign}, House ${pd.house}${pd.dignity ? `, dignity: ${pd.dignity}` : ""}${pd.retrograde ? ", retrograde" : ""}. Key aspects: ${aspects.length ? aspects.join("; ") : "none notable"}. Include the archetype, core expression in this sign and house, and practical insight.`;

    setOracleLoading(true);
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: query, chart }),
    })
      .then(async res => {
        if (!res.ok || !res.body) { setOracleLoading(false); return; }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        setOracleLoading(false);
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            const payload = part.slice(6).trim();
            if (payload === "[DONE]") return;
            try {
              const parsed = JSON.parse(payload) as { text?: string };
              if (parsed.text) setOracleText(prev => prev + parsed.text);
            } catch { /* ignore */ }
          }
        }
      })
      .catch(() => setOracleLoading(false));
  }, [chart, planetName]);

  const planetData = chart?.planets.find(p => p.name === planetName);
  const myAspects = chart?.aspects.filter(
    a => a.planet1 === planetName || a.planet2 === planetName,
  ) ?? [];
  const isLordOfYear = chart?.annualProfection?.lordOfYear === planetName;

  const planetIdx = PLANET_ORDER.indexOf(planetName);
  const prevPlanet = PLANET_ORDER[(planetIdx - 1 + PLANET_ORDER.length) % PLANET_ORDER.length];
  const nextPlanet = PLANET_ORDER[(planetIdx + 1) % PLANET_ORDER.length];

  return (
    <div className="relative min-h-screen">
      <DashboardBg />

      {/* ── Horizon Hero ── */}
      <section style={{ position: "relative", height: "62vh", minHeight: 480, overflow: "hidden", marginLeft: 68 }}>
        {/* Space → atmosphere gradient */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, #00000a 25%, ${meta.bgColor}99 100%)` }} />

        {/* Atmospheric glow spreading from the horizon */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }}
          style={{ position: "absolute", bottom: -40, left: "50%", transform: "translateX(-50%)", width: 1200, height: 340, background: `radial-gradient(ellipse, ${meta.glowColor} 0%, transparent 60%)`, filter: "blur(55px)", zIndex: 1 }}
        />

        {/* Realistic 3D planet rising over the horizon */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }}
          style={{ position: "absolute", inset: 0, zIndex: 2 }}
        >
          <PlanetView3D name={planetName} color={meta.color} atmoColor={meta.glowColor} />
        </motion.div>

        {/* Planet name watermark on the sphere surface */}
        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.04)", fontSize: "clamp(4rem, 9vw, 8rem)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 900, letterSpacing: "-0.04em", whiteSpace: "nowrap", userSelect: "none", zIndex: 3 }}>
          {planetName.toUpperCase()}
        </div>

        {/* Text overlay — top of the hero */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "1.5rem 2.5rem 0", zIndex: 4 }}>
          <div className="flex items-center justify-between mb-8">
            <motion.button
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              onClick={() => warpTo("/dashboard/chart")} whileHover={{ color: "#94a3b8" }}
              className="flex items-center gap-2 text-[13px] font-bold tracking-widest cursor-pointer"
              style={{ color: "#334155", background: "none", border: "none" }}
            >
              ← CHART
            </motion.button>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="text-[13px] font-bold tracking-widest" style={{ color: meta.color }}>
              {meta.archetype.toUpperCase()}
            </motion.p>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.8 }}>
            <div className="flex items-start gap-4 mb-4">
              <span style={{ fontSize: "3.5rem", color: meta.color, filter: "drop-shadow(0 0 24px currentColor)", lineHeight: 1 }}>
                {meta.glyph}
              </span>
              <div>
                <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(2.2rem, 5vw, 3.8rem)", color: "#f1f5f9", letterSpacing: "-0.03em", lineHeight: 1, textShadow: "0 2px 30px rgba(0,0,0,0.9)" }}>
                  {planetName}
                </h1>
                {planetData && (
                  <p className="text-[14px] mt-1" style={{ color: "#64748b" }}>
                    {formatDeg(planetData.longitude)}&nbsp;{planetData.sign}&nbsp;·&nbsp;House&nbsp;{planetData.house}
                    {planetData.retrograde && <span className="ml-2 font-bold" style={{ color: "#f97316" }}>℞</span>}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {meta.keywords.slice(0, 5).map(k => (
                <span key={k} className="px-3 py-1 rounded-xl text-[13px] font-bold tracking-wide"
                  style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30`, color: meta.color, backdropFilter: "blur(12px)" }}>
                  {k}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <main style={{ marginLeft: 68, padding: "2rem 2.5rem", position: "relative", zIndex: 1 }}>

        {planetData && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl p-5 mb-8"
            style={{ background: "rgba(4,4,28,0.65)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            {[
              { label: "SIGN", value: `${SIGN_SYMBOLS[planetData.sign] ?? ""} ${planetData.sign}`, color: meta.color },
              { label: "HOUSE", value: `H${planetData.house}`, color: "#818cf8" },
              {
                label: "DIGNITY",
                value: planetData.dignity
                  ? planetData.dignity.charAt(0).toUpperCase() + planetData.dignity.slice(1)
                  : "Peregrine",
                color: DIGNITY_COLORS[planetData.dignity ?? "peregrine"] ?? "#475569",
              },
              {
                label: "SPEED",
                value: `${planetData.speed > 0 ? "+" : ""}${planetData.speed.toFixed(3)}°`,
                color: planetData.retrograde ? "#f97316" : "#64748b",
              },
              { label: "DEGREE", value: formatDeg(planetData.longitude), color: "#94a3b8" },
              { label: "RULES", value: meta.rules, color: "#94a3b8" },
              { label: "EXALTED IN", value: meta.exaltedIn, color: "#94a3b8" },
              { label: "BODY", value: meta.body, color: "#94a3b8" },
            ].map(row => (
              <div key={row.label}>
                <p className="text-[13px] font-bold tracking-widest mb-1" style={{ color: "#334155" }}>{row.label}</p>
                <p className="text-[14px] font-semibold" style={{ color: row.color }}>{row.value}</p>
              </div>
            ))}
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="text-[14px] leading-relaxed mb-10 max-w-2xl"
          style={{ color: "#64748b" }}
        >
          {meta.myth}
        </motion.p>

        {/* Lord of Year Banner */}
        {isLordOfYear && chart && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4 rounded-2xl px-6 py-4 mb-10"
            style={{ background: `${meta.color}10`, border: `1px solid ${meta.color}30` }}
          >
            <span style={{ fontSize: "1.4rem", color: meta.color }}>✶</span>
            <div>
              <p className="text-[14px] font-bold" style={{ color: meta.color }}>
                Lord of Your Profection Year
              </p>
              <p className="text-[13px] mt-0.5" style={{ color: "#64748b" }}>
                {planetName} governs House {chart.annualProfection.activatedHouse} this year (age {chart.annualProfection.age}).
                All matters of House {chart.annualProfection.activatedHouse} are activated by {planetName}&apos;s condition and transits.
              </p>
            </div>
          </motion.div>
        )}

        {/* Aspects */}
        {myAspects.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-10"
          >
            <p className="text-[13px] font-bold tracking-widest mb-4" style={{ color: "#334155" }}>
              ASPECTS — {myAspects.length} CONNECTION{myAspects.length !== 1 ? "S" : ""}
            </p>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {myAspects.map((a, i) => {
                const other = (a.planet1 === planetName ? a.planet2 : a.planet1) as PlanetName;
                const otherColor = PLANET_COLORS[other] ?? "#94a3b8";
                const aspColor = ASPECT_COLORS[a.type] ?? "#64748b";
                return (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.04 }}
                    onClick={() => warpTo(`/dashboard/chart/${other.toLowerCase()}`)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left cursor-pointer"
                    style={{
                      background: "rgba(4,4,28,0.55)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      width: "100%",
                    }}
                    whileHover={{ background: "rgba(4,4,28,0.85)", borderColor: `${aspColor}28` }}
                  >
                    <span style={{ fontSize: "1.1rem", color: meta.color }}>{meta.glyph}</span>

                    <div className="flex flex-col items-center" style={{ minWidth: 34 }}>
                      <span className="text-[14px] font-bold" style={{ color: aspColor }}>
                        {ASPECT_GLYPHS[a.type] ?? "~"}
                      </span>
                      <span className="text-[13px] font-mono" style={{ color: "#334155" }}>
                        {a.orb.toFixed(1)}°
                      </span>
                    </div>

                    <span style={{ fontSize: "1.1rem", color: otherColor }}>
                      {PLANET_SYMBOLS[other] ?? "?"}
                    </span>
                    <span className="text-[13px] font-semibold flex-1" style={{ color: "#94a3b8" }}>{other}</span>

                    <div className="flex gap-1">
                      {a.exact && (
                        <span
                          className="text-[12px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
                        >
                          EX
                        </span>
                      )}
                      <span
                        className="text-[12px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: `${aspColor}15`, color: aspColor }}
                      >
                        {a.type.slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Live Transits */}
        {liveTransits.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-4">
              <p className="text-[13px] font-bold tracking-widest" style={{ color: "#334155" }}>
                LIVE TRANSITS TO {planetName.toUpperCase()}
              </p>
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#22c55e" }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {liveTransits.map((t, i) => {
                const tColor = PLANET_COLORS[t.transitPlanet] ?? "#94a3b8";
                const aspColor = ASPECT_COLORS[t.type] ?? "#64748b";
                const urgent = t.exact || t.orb < 0.3;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{
                      background: urgent ? `${aspColor}12` : "rgba(4,4,28,0.55)",
                      border: `1px solid ${urgent ? aspColor + "40" : "rgba(255,255,255,0.05)"}`,
                    }}
                  >
                    <span style={{ fontSize: "0.95rem", color: tColor }}>
                      {PLANET_SYMBOLS[t.transitPlanet] ?? "?"}
                    </span>
                    {t.transitRetrograde && (
                      <span className="text-[13px] font-bold" style={{ color: "#f97316" }}>℞</span>
                    )}
                    <span className="text-[13px] font-bold" style={{ color: aspColor }}>
                      {ASPECT_GLYPHS[t.type] ?? "~"}
                    </span>
                    <span className="text-[14px] font-mono" style={{ color: "#475569" }}>
                      {t.orb.toFixed(1)}°
                    </span>
                    {t.exact && (
                      <span
                        className="text-[12px] font-bold px-1 py-0.5 rounded"
                        style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
                      >
                        EXACT
                      </span>
                    )}
                    {!t.exact && t.applying && t.daysToExact !== null && t.daysToExact <= 30 && (
                      <span
                        className="text-[12px] font-bold px-1 py-0.5 rounded"
                        style={{ background: "rgba(6,182,212,0.12)", color: "#06b6d4" }}
                      >
                        {t.daysToExact < 1 ? "&lt;1d" : `${Math.round(t.daysToExact)}d`}
                      </span>
                    )}
                    {!t.exact && !t.applying && (
                      <span className="text-[12px]" style={{ color: "#334155" }}>sep</span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Oracle */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <p className="text-[13px] font-bold tracking-widest mb-4" style={{ color: "#334155" }}>
            ORACLE READING
          </p>
          <OraclePanel text={oracleText} loading={oracleLoading} />
          {oracleText && !oracleLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-3 flex justify-end"
            >
              <motion.button
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (chart) {
                    const planetData = chart.planets.find(p => p.name === planetName);
                    const q = encodeURIComponent(`Let's go deeper on my ${planetName} in ${planetData?.sign} in House ${planetData?.house}. ${oracleText.slice(0, 120)}... What else should I know?`);
                    warpTo(`/dashboard/oracle?q=${q}`);
                  }
                }}
                className="flex items-center gap-1.5 text-[13px] font-bold tracking-widest cursor-pointer"
                style={{ color: "#475569" }}
              >
                CONTINUE IN ORACLE
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            </motion.div>
          )}
        </motion.section>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between pt-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          {([
            { planet: prevPlanet, dir: "prev" },
            { planet: nextPlanet, dir: "next" },
          ] as const).map(({ planet, dir }) => {
            const m = getPlanetMeta(planet);
            return (
              <motion.button
                key={planet}
                onClick={() => warpTo(`/dashboard/chart/${planet.toLowerCase()}`)}
                className="flex items-center gap-2.5 px-5 py-3 rounded-2xl cursor-pointer"
                style={{
                  background: "rgba(4,4,28,0.5)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: "#334155",
                }}
                whileHover={{ borderColor: `${m.color}30`, color: m.color }}
              >
                {dir === "prev" && <span>←</span>}
                <span style={{ fontSize: "1.1rem", color: m.color }}>{m.glyph}</span>
                <span className="text-[13px] font-bold tracking-wide">{planet}</span>
                {dir === "next" && <span>→</span>}
              </motion.button>
            );
          })}
        </motion.div>

      </main>
    </div>
  );
}
