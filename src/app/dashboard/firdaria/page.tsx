"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart, getOraclePersona } from "@/lib/storage";
import {
  buildFirdariaData, FIRDARIA_YEARS,
} from "@/lib/astrology/firdaria";
import type { FirdariaData, FirdariaPeriod, FirdariaRuler } from "@/lib/astrology/firdaria";

const PLANET_COLORS: Record<FirdariaRuler, string> = {
  Sun: "#fbbf24", Venus: "#f472b6", Mercury: "#a78bfa", Moon: "#BFB6E8",
  Saturn: "#94a3b8", Jupiter: "#f59e0b", Mars: "#ef4444",
  NorthNode: "#06b6d4", SouthNode: "#7B6FD4",
};

const PLANET_SYMBOLS: Record<FirdariaRuler, string> = {
  Sun: "☉", Venus: "♀", Mercury: "☿", Moon: "☽", Saturn: "♄",
  Jupiter: "♃", Mars: "♂", NorthNode: "☊", SouthNode: "☋",
};

const RULER_THEMES: Record<FirdariaRuler, string> = {
  Sun: "identity, vitality, leadership, recognition",
  Venus: "love, beauty, pleasure, resources, relationships",
  Mercury: "mind, communication, trade, learning, siblings",
  Moon: "home, emotion, the public, change, nurturing",
  Saturn: "discipline, restriction, karma, time, structure",
  Jupiter: "expansion, wisdom, faith, abundance, philosophy",
  Mars: "drive, conflict, courage, ambition, physical energy",
  NorthNode: "destiny, growth, collective direction",
  SouthNode: "past, release, accumulated karma",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function fmtYears(years: number) {
  const y = Math.floor(years);
  const m = Math.round((years - y) * 12);
  if (m === 0) return `${y} yr${y !== 1 ? "s" : ""}`;
  return `${y}y ${m}m`;
}

function PeriodBar({ period, isSubPeriod = false }: { period: FirdariaPeriod; isSubPeriod?: boolean }) {
  const ruler = (isSubPeriod ? period.subRuler : period.ruler) as FirdariaRuler;
  const col = PLANET_COLORS[ruler];
  const now = new Date();
  const totalMs = period.end.getTime() - period.start.getTime();
  const elapsedMs = Math.max(0, Math.min(now.getTime() - period.start.getTime(), totalMs));
  const pct = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        position: "relative",
        background: period.isCurrent
          ? `linear-gradient(135deg, ${col}1A, ${col}0A)`
          : "rgba(10,15,35,0.4)",
        border: `1px solid ${period.isCurrent ? col + "50" : "rgba(40,60,100,0.3)"}`,
        borderRadius: 10, padding: "10px 14px",
        boxShadow: period.isCurrent ? `0 0 20px ${col}15` : "none",
      }}
    >
      {/* Progress fill */}
      {period.isCurrent && (
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0,
          width: `${pct}%`, borderRadius: 10,
          background: `linear-gradient(90deg, ${col}08, transparent)`,
          pointerEvents: "none",
        }} />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
        <div style={{
          width: isSubPeriod ? 28 : 36, height: isSubPeriod ? 28 : 36,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${col}25, ${col}05)`,
          border: `1.5px solid ${col}60`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: isSubPeriod ? 14 : 18, color: col, flexShrink: 0,
        }}>
          {PLANET_SYMBOLS[ruler]}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{
              color: period.isCurrent ? col : "#C0D4FF",
              fontSize: isSubPeriod ? 11 : 13,
              fontFamily: "'Fragment Mono', monospace",
              letterSpacing: "0.1em", fontWeight: 600,
              textTransform: "uppercase",
            }}>
              {ruler.replace("NorthNode", "North Node").replace("SouthNode", "South Node")}
            </span>
            {period.isCurrent && (
              <span style={{
                background: `${col}25`, border: `1px solid ${col}50`,
                borderRadius: 20, padding: "1px 8px",
                color: col, fontSize: 8,
                fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em",
              }}>
                ACTIVE
              </span>
            )}
          </div>
          <div style={{
            color: "#445577", fontSize: 10,
            fontFamily: "'Fragment Mono', monospace", marginTop: 2,
          }}>
            {fmtDate(period.start)} — {fmtDate(period.end)} · {fmtYears(period.years)}
          </div>
        </div>

        {period.isCurrent && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ color: col, fontSize: 18, fontFamily: "'Fragment Mono', monospace", fontWeight: 700 }}>
              {Math.round(pct)}%
            </div>
            <div style={{ color: "#445577", fontSize: 8, fontFamily: "'Fragment Mono', monospace" }}>elapsed</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function FirdariaPage() {
  const [firdaria, setFirdaria]   = useState<FirdariaData | null>(null);
  const [noProfile, setNoProfile] = useState(false);
  const [sect, setSect]           = useState<"day" | "night">("day");
  const [profileName, setProfileName] = useState("Native");
  const [reading, setReading]     = useState("");
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setNoProfile(true); return; }
    const profile = getProfile(id);
    if (!profile) { setNoProfile(true); return; }
    const chart = getCachedChart(id);
    if (!chart) { setNoProfile(true); return; }
    const s = chart.sect ?? "day";
    setSect(s);
    setProfileName(profile.name ?? "Native");
    const birthDatetime = `${profile.birthDate}T${profile.birthTime}Z`;
    setFirdaria(buildFirdariaData(s, birthDatetime));
  }, []);

  const streamReading = async () => {
    if (streaming || !firdaria?.currentMajor) return;
    const major = firdaria.currentMajor.ruler;
    const sub = firdaria.currentSub?.subRuler ?? "—";
    const prompt = `[FIRDARIA for ${profileName}] Major period: ${major} (${RULER_THEMES[major]}). Sub-period: ${sub} (${RULER_THEMES[sub as FirdariaRuler] ?? ""}). Sect: ${sect} chart. Give a 3-4 sentence interpretive reading of this period — what life themes are being activated, what the native should watch for, and what opportunities or challenges this combination typically brings.`;
    setStreaming(true); setReading("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [], persona: getOraclePersona() }),
      });
      if (!res.ok || !res.body) { setStreaming(false); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") break;
          try { const p = JSON.parse(payload); if (p.text) { acc += p.text; setReading(acc); } } catch { /* skip */ }
        }
      }
    } catch { /* silent */ }
    setStreaming(false);
  };

  if (noProfile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <div className="text-center ml-16">
          <p style={{ color: "#C8A55B", fontSize: 13, fontFamily: "'Fragment Mono', monospace" }}>BIRTH DATA REQUIRED</p>
          <p style={{ color: "#445577", fontSize: 11, marginTop: 6 }}>Complete your profile in Settings to activate Firdaria.</p>
        </div>
      </div>
    );
  }

  if (!firdaria) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ width: 40, height: 40, border: "1px solid #1A3A8A", borderTopColor: "#C8A55B", borderRadius: "50%" }} />
      </div>
    );
  }

  const { currentMajor, subperiods, currentSub, major } = firdaria;
  const currentRulerColor = currentMajor ? PLANET_COLORS[currentMajor.ruler] : "#C8A55B";

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#010810" }}>
      <DashboardBg />
      <div className="absolute inset-0 overflow-y-auto" style={{ left: 64, scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 48px" }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ width: 6, height: 28, background: currentRulerColor, borderRadius: 3, boxShadow: `0 0 10px ${currentRulerColor}` }} />
              <h1 style={{ color: "#C0D4FF", fontSize: 22, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Firdaria
              </h1>
              <span style={{ background: `${currentRulerColor}18`, border: `1px solid ${currentRulerColor}40`, borderRadius: 20, padding: "3px 12px", color: currentRulerColor, fontSize: 9, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em" }}>
                {sect === "day" ? "DAY CHART" : "NIGHT CHART"}
              </span>
            </div>
            <p style={{ color: "#445577", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", paddingLeft: 18 }}>
              Medieval Persian planetary period system — 75-year cycle of planetary rulers governing life chapters
            </p>
          </div>

          {/* Current period spotlight */}
          {currentMajor && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{
                background: `linear-gradient(135deg, ${currentRulerColor}12, rgba(5,8,22,0.9))`,
                border: `1px solid ${currentRulerColor}40`,
                borderRadius: 16, padding: "20px 24px", marginBottom: 24,
                boxShadow: `0 0 40px ${currentRulerColor}10`,
              }}
            >
              <p style={{ color: currentRulerColor, fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 12 }}>
                CURRENT PERIOD
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 44, color: currentRulerColor }}>{PLANET_SYMBOLS[currentMajor.ruler]}</div>
                <div>
                  <div style={{ color: currentRulerColor, fontSize: 24, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {currentMajor.ruler.replace("NorthNode", "North Node").replace("SouthNode", "South Node")}
                  </div>
                  {currentSub && (
                    <div style={{ color: "#8899BB", fontSize: 13, fontFamily: "'Fragment Mono', monospace", marginTop: 4 }}>
                      ↳ Sub: {PLANET_SYMBOLS[currentSub.subRuler!]} {currentSub.subRuler?.replace("NorthNode", "North Node").replace("SouthNode", "South Node")}
                    </div>
                  )}
                </div>
              </div>
              <p style={{ color: "#8899BB", fontSize: 13, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", lineHeight: 1.6, marginBottom: 16 }}>
                {RULER_THEMES[currentMajor.ruler]}
              </p>

              {/* AI reading */}
              {reading ? (
                <div style={{ color: "#A0B0D0", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {reading}
                  {streaming && (
                    <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
                      style={{ display: "inline-block", width: 6, height: 12, background: currentRulerColor, borderRadius: 1, marginLeft: 3, verticalAlign: "middle" }} />
                  )}
                </div>
              ) : (
                <button onClick={streamReading} disabled={streaming} style={{
                  padding: "7px 18px",
                  background: `${currentRulerColor}12`,
                  border: `1px solid ${currentRulerColor}35`,
                  borderRadius: 8, color: currentRulerColor,
                  fontSize: 9, letterSpacing: "0.15em",
                  fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
                }}>
                  ✦ ORACLE READING
                </button>
              )}
            </motion.div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
            {/* Sub-periods */}
            {currentMajor && (
              <div>
                <p style={{ color: "#445577", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>
                  SUB-PERIODS OF {currentMajor.ruler.toUpperCase()}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {subperiods.map((p, i) => (
                    <PeriodBar key={i} period={p} isSubPeriod />
                  ))}
                </div>
              </div>
            )}

            {/* Major period timeline */}
            <div>
              <p style={{ color: "#445577", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>
                MAJOR PERIODS (FULL LIFE)
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {major.slice(0, 18).map((p, i) => (
                  <PeriodBar key={i} period={p} />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
