"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import type { ProgressionResult, ProgPlacement, DirectedPlacement } from "@/lib/astrology/progressions";

const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#BFB6E8", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#7B6FD4",
  NorthNode: "#06b6d4", Chiron: "#a78bfa",
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "⛢", Neptune: "♆", Pluto: "♇",
  NorthNode: "☊", Chiron: "⚷",
};

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

function degStr(lon: number) {
  const deg = Math.floor(lon % 30);
  const min = Math.round((lon % 1) * 60);
  return `${deg}°${min.toString().padStart(2, "0")}′`;
}

function PlacementRow({ p, accent }: { p: ProgPlacement; accent?: string }) {
  const col = accent ?? PLANET_COLORS[p.name] ?? "#8899BB";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, background: "rgba(10,15,35,0.5)" }}>
      <span style={{ color: col, fontSize: 14, width: 20, textAlign: "center" }}>{PLANET_SYMBOLS[p.name] ?? "·"}</span>
      <span style={{ color: col, fontSize: 10, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.08em", width: 70 }}>
        {p.name.replace("NorthNode", "N.Node")}
      </span>
      <span style={{ color: "#8899BB", fontSize: 10, fontFamily: "'Fragment Mono', monospace" }}>
        {SIGN_SYMBOLS[p.sign] ?? ""} {degStr(p.signDegree)} {p.sign}
      </span>
      <span style={{ color: "#445577", fontSize: 9, fontFamily: "'Fragment Mono', monospace", marginLeft: "auto" }}>
        H{p.house}{p.retrograde ? " Rx" : ""}
      </span>
    </div>
  );
}

function DirectedRow({ p }: { p: DirectedPlacement }) {
  const col = PLANET_COLORS[p.name] ?? "#8899BB";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, background: "rgba(10,15,35,0.5)" }}>
      <span style={{ color: col, fontSize: 14, width: 20, textAlign: "center" }}>{PLANET_SYMBOLS[p.name] ?? "·"}</span>
      <span style={{ color: col, fontSize: 10, fontFamily: "'Fragment Mono', monospace", width: 70 }}>
        {p.name.replace("NorthNode", "N.Node")}
      </span>
      <span style={{ color: "#8899BB", fontSize: 9, fontFamily: "'Fragment Mono', monospace", width: 90 }}>
        {SIGN_SYMBOLS[p.sign] ?? ""} {degStr(p.signDegree)} {p.sign}
      </span>
      <span style={{ color: "#334466", fontSize: 9, fontFamily: "'Fragment Mono', monospace", marginLeft: "auto" }}>
        +{p.arcDeg.toFixed(2)}°
      </span>
    </div>
  );
}

export default function ProgressionsPage() {
  const [result, setResult]       = useState<ProgressionResult | null>(null);
  const [loading, setLoading]     = useState(true);
  const [noProfile, setNoProfile] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [tab, setTab]             = useState<"prog" | "arcs">("prog");

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setNoProfile(true); setLoading(false); return; }
    const profile = getProfile(id);
    const chart   = getCachedChart(id);
    if (!profile || !chart) { setNoProfile(true); setLoading(false); return; }

    const birthDatetime = `${profile.birthDate}T${profile.birthTime}Z`;
    fetch("/api/progressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthDatetime, latitude: profile.latitude, longitude: profile.longitude, timezone: profile.timezone, houseSystem: chart.houseSystem }),
    })
      .then(r => r.json())
      .then(d => { setResult(d.result ?? null); setLoading(false); })
      .catch(() => { setFetchError(true); setLoading(false); });
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

  if (fetchError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <div className="text-center ml-16">
          <p style={{ color: "#C8A55B", fontSize: 13, fontFamily: "'Fragment Mono', monospace" }}>CALCULATION ERROR</p>
          <p style={{ color: "#445577", fontSize: 11, marginTop: 6 }}>Could not load progressions. Try refreshing.</p>
        </div>
      </div>
    );
  }

  if (loading || !result) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ width: 40, height: 40, border: "1px solid #1A3A8A", borderTopColor: "#C8A55B", borderRadius: "50%" }} />
      </div>
    );
  }

  const sunColor = "#fbbf24";
  const moonColor = "#BFB6E8";

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#010810" }}>
      <DashboardBg />
      <div className="absolute inset-0 overflow-y-auto" style={{ left: 64, scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 48px" }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ width: 6, height: 28, background: sunColor, borderRadius: 3, boxShadow: `0 0 10px ${sunColor}` }} />
              <h1 style={{ color: "#C0D4FF", fontSize: 22, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Progressions
              </h1>
            </div>
            <p style={{ color: "#445577", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", paddingLeft: 18 }}>
              Secondary progressions + solar arc directions — symbolic timing: 1 day = 1 year
            </p>
          </div>

          {/* Key metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { label: "AGE", value: result.ageYears.toFixed(1) + " yrs", color: "#C8A55B" },
              { label: "SOLAR ARC", value: result.solarArc.toFixed(2) + "°", color: sunColor },
              { label: "PROG DATE", value: result.progDate.split("T")[0], color: "#8899BB" },
            ].map(m => (
              <div key={m.label} style={{ background: "rgba(10,15,35,0.7)", border: "1px solid rgba(40,60,100,0.35)", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ color: "#445577", fontSize: 8, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 6 }}>{m.label}</div>
                <div style={{ color: m.color, fontSize: 18, fontFamily: "'Fragment Mono', monospace", fontWeight: 700 }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Progressed Sun + Moon spotlight */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
            {[
              { label: "PROGRESSED SUN", p: result.progressedSun, col: sunColor },
              { label: "PROGRESSED MOON", p: result.progressedMoon, col: moonColor },
            ].map(({ label, p, col }) => (
              <div key={label} style={{ background: `linear-gradient(135deg, ${col}12, rgba(5,8,22,0.8))`, border: `1px solid ${col}35`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ color: col, fontSize: 8, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>{label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 32, color: col }}>{PLANET_SYMBOLS[p.name]}</span>
                  <div>
                    <div style={{ color: "#C0D4FF", fontSize: 16, fontFamily: "'Fragment Mono', monospace" }}>
                      {SIGN_SYMBOLS[p.sign]} {p.sign}
                    </div>
                    <div style={{ color: "#8899BB", fontSize: 11, fontFamily: "'Fragment Mono', monospace" }}>
                      {degStr(p.signDegree)} · House {p.house}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tab: all progressed planets / solar arc directed */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {(["prog", "arcs"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "5px 16px",
                background: tab === t ? "rgba(50,213,255,0.12)" : "transparent",
                border: `1px solid ${tab === t ? "rgba(50,213,255,0.3)" : "rgba(40,60,100,0.3)"}`,
                borderRadius: 20, color: tab === t ? "#C8A55B" : "#445577",
                fontSize: 9, letterSpacing: "0.12em",
                fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
              }}>
                {t === "prog" ? "PROGRESSED PLANETS" : "SOLAR ARC DIRECTED"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {tab === "prog"
              ? result.allPlanets.map((p, i) => <PlacementRow key={i} p={p} />)
              : result.directedPlanets.map((p, i) => <DirectedRow key={i} p={p} />)
            }
          </div>

        </div>
      </div>
    </div>
  );
}
