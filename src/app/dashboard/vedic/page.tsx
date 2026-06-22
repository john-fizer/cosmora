"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import { toSiderealChart, buildVimshottariDasha } from "@/lib/astrology/sidereal";
import type { SiderealChart, VimshottariData, DashaPeriod, DashaRuler } from "@/lib/astrology/sidereal";

const DASHA_COLORS: Record<DashaRuler, string> = {
  Ketu: "#7B6FD4", Venus: "#f472b6", Sun: "#fbbf24", Moon: "#BFB6E8",
  Mars: "#ef4444", Rahu: "#06b6d4", Jupiter: "#f59e0b", Saturn: "#94a3b8", Mercury: "#a78bfa",
};

const DASHA_SYMBOLS: Record<DashaRuler, string> = {
  Ketu: "☋", Venus: "♀", Sun: "☉", Moon: "☽", Mars: "♂",
  Rahu: "☊", Jupiter: "♃", Saturn: "♄", Mercury: "☿",
};

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "⛢", Neptune: "♆", Pluto: "♇",
  NorthNode: "☊", Chiron: "⚷",
};

const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#BFB6E8", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#7B6FD4",
  NorthNode: "#06b6d4", Chiron: "#a78bfa",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function fmtYears(y: number) {
  const yy = Math.floor(y), m = Math.round((y - yy) * 12);
  return m === 0 ? `${yy}y` : `${yy}y ${m}m`;
}

function DashaRow({ p, isAntar = false }: { p: DashaPeriod; isAntar?: boolean }) {
  const ruler = (isAntar ? p.antardasha : p.ruler) as DashaRuler;
  const col = DASHA_COLORS[ruler];
  const now = new Date();
  const totalMs = p.end.getTime() - p.start.getTime();
  const elapsedMs = Math.max(0, Math.min(now.getTime() - p.start.getTime(), totalMs));
  const pct = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      background: p.isCurrent ? `${col}10` : "rgba(10,15,35,0.4)",
      border: `1px solid ${p.isCurrent ? col + "45" : "rgba(40,60,100,0.25)"}`,
      borderRadius: 9, padding: "8px 12px",
    }}>
      {p.isCurrent && (
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${pct}%`, background: `${col}08`, pointerEvents: "none" }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <span style={{ color: col, fontSize: isAntar ? 12 : 16, width: 22, textAlign: "center" }}>{DASHA_SYMBOLS[ruler]}</span>
        <div style={{ flex: 1 }}>
          <span style={{ color: p.isCurrent ? col : "#C0D4FF", fontSize: isAntar ? 10 : 12, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {ruler}
          </span>
          <div style={{ color: "#445577", fontSize: 9, fontFamily: "'Fragment Mono', monospace" }}>
            {fmtDate(p.start)} — {fmtDate(p.end)} · {fmtYears(p.years)}
          </div>
        </div>
        {p.isCurrent && <span style={{ color: col, fontSize: 8, fontFamily: "'Fragment Mono', monospace" }}>{Math.round(pct)}%</span>}
      </div>
    </div>
  );
}

export default function VedicPage() {
  const [sidereal, setSidereal]     = useState<SiderealChart | null>(null);
  const [dasha, setDasha]           = useState<VimshottariData | null>(null);
  const [noProfile, setNoProfile]   = useState(false);
  const [tab, setTab]               = useState<"placements" | "dasha">("placements");

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setNoProfile(true); return; }
    const profile = getProfile(id);
    const chart   = getCachedChart(id);
    if (!profile || !chart) { setNoProfile(true); return; }
    const birthDatetime = `${profile.birthDate}T${profile.birthTime}Z`;
    const sc = toSiderealChart(chart, birthDatetime);
    setSidereal(sc);
    const moonP = chart.planets.find(p => p.name === "Moon");
    if (moonP) {
      const moonSidereal = ((moonP.longitude - sc.ayanamsa) % 360 + 360) % 360;
      setDasha(buildVimshottariDasha(moonSidereal, birthDatetime));
    }
  }, []);

  if (noProfile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <div className="text-center ml-16">
          <p style={{ color: "#C8A55B", fontSize: 13, fontFamily: "'Fragment Mono', monospace" }}>BIRTH DATA REQUIRED</p>
          <p style={{ color: "#445577", fontSize: 11, marginTop: 6 }}>Complete your profile in Settings.</p>
        </div>
      </div>
    );
  }

  if (!sidereal) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ width: 40, height: 40, border: "1px solid #1A3A8A", borderTopColor: "#C8A55B", borderRadius: "50%" }} />
      </div>
    );
  }

  const moonPlacement = sidereal.placements.find(p => p.name === "Moon");
  const moonNak = moonPlacement?.nakshatra;
  const currentMajorColor = dasha?.currentMajor ? DASHA_COLORS[dasha.currentMajor.ruler] : "#C8A55B";

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#010810" }}>
      <DashboardBg />
      <div className="absolute inset-0 overflow-y-auto" style={{ left: 64, scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 48px" }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ width: 6, height: 28, background: "#a78bfa", borderRadius: 3, boxShadow: "0 0 10px #a78bfa" }} />
              <h1 style={{ color: "#C0D4FF", fontSize: 22, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Vedic Chart
              </h1>
              <span style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)", borderRadius: 20, padding: "3px 12px", color: "#a78bfa", fontSize: 9, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em" }}>
                LAHIRI · SIDEREAL
              </span>
            </div>
            <p style={{ color: "#445577", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", paddingLeft: 18 }}>
              Sidereal (Jyotish) chart · Lahiri ayanamsa {sidereal.ayanamsa.toFixed(2)}° · 27 Nakshatras
            </p>
          </div>

          {/* Lagna + Moon nakshatra spotlight */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
            <div style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(5,8,22,0.8))", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ color: "#a78bfa", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>LAGNA (SIDEREAL ASCENDANT)</div>
              <div style={{ color: "#C0D4FF", fontSize: 18, fontFamily: "'Fragment Mono', monospace" }}>
                {SIGN_SYMBOLS[sidereal.ascendant.sign]} {sidereal.ascendant.signDegree.toFixed(1)}° {sidereal.ascendant.sign}
              </div>
              <div style={{ color: "#8899BB", fontSize: 11, fontFamily: "'Fragment Mono', monospace", marginTop: 4 }}>
                {sidereal.ascendant.nakshatra.nakshatra.name} · Pada {sidereal.ascendant.nakshatra.pada}
              </div>
            </div>

            {moonNak && (
              <div style={{ background: `linear-gradient(135deg, ${currentMajorColor}12, rgba(5,8,22,0.8))`, border: `1px solid ${currentMajorColor}30`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ color: currentMajorColor, fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>MOON NAKSHATRA · DASHA LORD</div>
                <div style={{ color: "#C0D4FF", fontSize: 16, fontFamily: "'Fragment Mono', monospace" }}>
                  {moonNak.nakshatra.name}
                </div>
                <div style={{ color: "#8899BB", fontSize: 11, fontFamily: "'Fragment Mono', monospace", marginTop: 4 }}>
                  Lord: {moonNak.nakshatra.lord} · Pada {moonNak.pada} · {moonNak.nakshatra.deity}
                </div>
                <div style={{ color: "#556688", fontSize: 11, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", marginTop: 4 }}>
                  "{moonNak.nakshatra.nature}"
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {(["placements", "dasha"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "5px 16px",
                background: tab === t ? "rgba(167,139,250,0.12)" : "transparent",
                border: `1px solid ${tab === t ? "rgba(167,139,250,0.3)" : "rgba(40,60,100,0.3)"}`,
                borderRadius: 20, color: tab === t ? "#C8A55B" : "#445577",
                fontSize: 9, letterSpacing: "0.12em",
                fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
              }}>
                {t === "placements" ? "SIDEREAL PLACEMENTS" : "VIMSHOTTARI DASHA"}
              </button>
            ))}
          </div>

          {tab === "placements" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {sidereal.placements.map((p, i) => {
                const col = PLANET_COLORS[p.name] ?? "#8899BB";
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 100px 1fr 1fr auto", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 9, background: "rgba(10,15,35,0.5)" }}>
                    <span style={{ color: col, fontSize: 14, textAlign: "center" }}>{PLANET_SYMBOLS[p.name] ?? "·"}</span>
                    <span style={{ color: col, fontSize: 10, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.06em" }}>{p.name}</span>
                    <span style={{ color: "#C0D4FF", fontSize: 11, fontFamily: "'Fragment Mono', monospace" }}>
                      {SIGN_SYMBOLS[p.sign] ?? ""} {p.signDegree.toFixed(1)}° {p.sign}
                    </span>
                    <span style={{ color: "#8899BB", fontSize: 10, fontFamily: "'Fragment Mono', monospace" }}>
                      {p.nakshatra.nakshatra.name} · P{p.nakshatra.pada} · {p.nakshatra.nakshatra.lord}
                    </span>
                    <span style={{ color: "#445577", fontSize: 9, fontFamily: "'Fragment Mono', monospace" }}>
                      H{p.house}{p.retrograde ? " Rx" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "dasha" && dasha && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <p style={{ color: "#445577", fontSize: 8, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>MAJOR DASHAS</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {dasha.major.slice(0, 12).map((p, i) => <DashaRow key={i} p={p} />)}
                </div>
              </div>
              <div>
                <p style={{ color: "#445577", fontSize: 8, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>
                  ANTARDASHA OF {dasha.currentMajor?.ruler?.toUpperCase() ?? "—"}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {dasha.antardasha.map((p, i) => <DashaRow key={i} p={p} isAntar />)}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
