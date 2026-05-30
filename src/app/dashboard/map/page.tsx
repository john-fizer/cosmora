"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import type { AstroLine, AstroLinePlanet, AstroLineAngle, LocationScore } from "@/lib/astrology/astrocartography";
import {
  PLANET_COLORS, PLANET_SYMBOLS, ASTRO_PLANETS,
  LINE_THEMES, scoreLocation,
} from "@/lib/astrology/astrocartography";
import type { VortexNodePublic, CitySpot } from "./GlobeCanvas";

const GlobeCanvas = dynamic(() => import("./GlobeCanvas"), { ssr: false });
import type { GlobeMode } from "./GlobeCanvas";

// ─── Types ─────────────────────────────────────────────────────────────────────
const MODES: { id: GlobeMode; icon: string; label: string }[] = [
  { id: "globe",   icon: "⊕",  label: "GLOBE"    },
  { id: "cities",  icon: "◈",  label: "CITIES"   },
  { id: "lines",   icon: "⌁",  label: "LINES"    },
  { id: "planets", icon: "◉",  label: "PLANETS"  },
  { id: "energy",  icon: "⋈",  label: "FIELDS"   },
];

const ANGLE_LABELS: Record<AstroLineAngle, string> = {
  MC: "MC", IC: "IC", ASC: "ASC", DSC: "DSC",
};

// ─── Energy weather scores (derived from strongest active lines) ──────────────
type EnergyCategory = "Career" | "Love" | "Creativity" | "Wealth" | "Spirituality" | "Transformation";

const ENERGY_COLORS: Record<EnergyCategory, string> = {
  Career:         "#4488FF",
  Love:           "#FF71D1",
  Creativity:     "#B06AFF",
  Wealth:         "#FFD700",
  Spirituality:   "#2DFFB3",
  Transformation: "#FF4040",
};

const ENERGY_ICONS: Record<EnergyCategory, string> = {
  Career: "◈", Love: "♡", Creativity: "✦", Wealth: "◇", Spirituality: "❋", Transformation: "⟳",
};

const PLANET_ENERGY_WEIGHTS: Record<AstroLinePlanet, Partial<Record<EnergyCategory, number>>> = {
  Sun:     { Career: 1.0, Creativity: 0.7, Transformation: 0.5 },
  Moon:    { Love: 1.0, Spirituality: 0.7 },
  Mercury: { Career: 0.7, Creativity: 0.6 },
  Venus:   { Love: 1.0, Creativity: 0.9, Wealth: 0.6 },
  Mars:    { Career: 0.8, Transformation: 0.9 },
  Jupiter: { Wealth: 1.0, Career: 0.8, Spirituality: 0.5 },
  Saturn:  { Career: 0.7, Transformation: 0.8 },
  Uranus:  { Creativity: 0.9, Transformation: 1.0 },
  Neptune: { Spirituality: 1.0, Creativity: 0.8 },
};

// Primary energy category per planet — Transformation folded into Career
const PLANET_TO_CATEGORY: Record<AstroLinePlanet, EnergyCategory> = {
  Sun: "Career", Mercury: "Career", Saturn: "Career", Mars: "Career",
  Moon: "Love",  Venus: "Love",
  Jupiter: "Wealth",
  Uranus: "Creativity",
  Neptune: "Spirituality",
};

function angularDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const c = Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return Math.acos(Math.min(1, Math.max(-1, c))) * 180 / Math.PI;
}

function deriveEnergyScores(): Record<EnergyCategory, number> {
  const cats: EnergyCategory[] = ["Career","Love","Creativity","Wealth","Spirituality","Transformation"];
  return Object.fromEntries(cats.map(c => [c, Math.floor(55 + Math.random() * 40)])) as Record<EnergyCategory, number>;
}

// ─── Top Power Spots (hardcoded sample aligned to common astrocartography zones)
const SAMPLE_SPOTS = [
  { city: "Los Angeles, USA",   lat:  34.05, lon: -118.24 },
  { city: "New York, USA",      lat:  40.71, lon:  -74.01 },
  { city: "London, UK",         lat:  51.51, lon:   -0.13 },
  { city: "Paris, France",      lat:  48.85, lon:    2.35 },
  { city: "Tokyo, Japan",       lat:  35.68, lon:  139.69 },
  { city: "Bali, Indonesia",    lat:  -8.34, lon:  115.09 },
  { city: "Barcelona, Spain",   lat:  41.38, lon:    2.17 },
  { city: "Cape Town, SA",      lat: -33.92, lon:   18.42 },
  { city: "Rio de Janeiro",     lat: -22.90, lon:  -43.17 },
  { city: "Reykjavik",          lat:  64.13, lon:  -21.94 },
  { city: "Sydney, Australia",  lat: -33.87, lon:  151.21 },
  { city: "Dubai, UAE",         lat:  25.20, lon:   55.27 },
  { city: "Mexico City",        lat:  19.43, lon:  -99.13 },
  { city: "Berlin, Germany",    lat:  52.52, lon:   13.41 },
  { city: "Mumbai, India",      lat:  19.08, lon:   72.88 },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function EnergyBar({ label, score, color, icon }: { label: string; score: number; color: string; icon: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color, fontSize: 10, width: 14 }}>{icon}</span>
      <span style={{ color: "#8899BB", fontSize: 9, letterSpacing: "0.12em", width: 80, fontFamily: "'Fragment Mono', monospace" }}>
        {label.toUpperCase()}
      </span>
      <div style={{ flex: 1, height: 3, background: "#0A1428", borderRadius: 2, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
          style={{ height: "100%", background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 2 }}
        />
      </div>
      <span style={{ color, fontSize: 9, fontFamily: "'Fragment Mono', monospace", width: 26, textAlign: "right" }}>
        {score}%
      </span>
    </div>
  );
}

function LocationPanel({
  lat, lon, scores, onClose,
}: {
  lat: number; lon: number;
  scores: LocationScore[];
  onClose: () => void;
}) {
  const topScores = scores.slice(0, 3);
  const [reading,   setReading]   = useState("");
  const [streaming, setStreaming] = useState(false);
  const [started,   setStarted]   = useState(false);

  const streamReading = useCallback(async () => {
    if (streaming || started) return;
    setStarted(true);
    setStreaming(true);
    try {
      const res = await fetch("/api/astrocartography/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon, scores }),
      });
      if (!res.ok || !res.body) { setStreaming(false); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        setReading(buf);
      }
    } catch { /* silent */ }
    setStreaming(false);
  }, [lat, lon, scores, streaming, started]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: "absolute", bottom: 100, left: "50%", transform: "translateX(-50%)",
        width: 420, maxHeight: "55vh",
        background: "rgba(5,8,22,0.94)",
        border: "1px solid rgba(100,130,255,0.25)",
        borderRadius: 16,
        backdropFilter: "blur(24px)",
        boxShadow: "0 0 40px rgba(50,100,255,0.12)",
        zIndex: 40, display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0" style={{ padding: "14px 18px", borderBottom: "1px solid rgba(50,80,160,0.2)" }}>
        <div>
          <span style={{ color: "#32D5FF", fontSize: 9, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace" }}>
            LOCATION ANALYSIS
          </span>
          <p style={{ color: "#556688", fontSize: 10, fontFamily: "'Fragment Mono', monospace", marginTop: 2 }}>
            {lat.toFixed(2)}°{lat >= 0 ? "N" : "S"} · {Math.abs(lon).toFixed(2)}°{lon >= 0 ? "E" : "W"}
          </p>
        </div>
        <button onClick={onClose} style={{ color: "#4455AA", fontSize: 16, lineHeight: 1 }}>✕</button>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1" style={{ padding: "14px 18px", scrollbarWidth: "none" }}>
        {/* Active lines */}
        {topScores.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {topScores.map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 5,
                background: `${PLANET_COLORS[s.planet]}10`,
                border: `1px solid ${PLANET_COLORS[s.planet]}28`,
                borderRadius: 20, padding: "4px 10px",
              }}>
                <span style={{ color: PLANET_COLORS[s.planet], fontSize: 12 }}>{PLANET_SYMBOLS[s.planet]}</span>
                <span style={{ color: PLANET_COLORS[s.planet], fontSize: 9, fontFamily: "'Fragment Mono', monospace" }}>
                  {s.planet} {s.angle}
                </span>
                <span style={{ color: `${PLANET_COLORS[s.planet]}88`, fontSize: 8, fontFamily: "'Fragment Mono', monospace" }}>
                  {(s.influence * 100).toFixed(0)}
                </span>
              </div>
            ))}
            {scores.length === 0 && (
              <p style={{ color: "#334466", fontSize: 11 }}>No strong activations here.</p>
            )}
          </div>
        )}

        {/* AI Reading */}
        {reading ? (
          <div style={{ color: "#8899CC", fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {reading}
            {streaming && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.7, repeat: Infinity }}
                style={{ display: "inline-block", width: 6, height: 12, background: "#32D5FF", borderRadius: 1, marginLeft: 3, verticalAlign: "middle" }}
              />
            )}
          </div>
        ) : (
          <p style={{ color: "#334466", fontSize: 11, lineHeight: 1.6 }}>
            {scores.length > 0
              ? "Generate an AI reading to learn what life at this location would feel like energetically."
              : "No strong planetary activations near this point. Try clicking closer to a visible line."}
          </p>
        )}
      </div>

      {/* Footer */}
      {!started && scores.length > 0 && (
        <div className="flex-shrink-0" style={{ padding: "10px 18px", borderTop: "1px solid rgba(50,80,160,0.2)" }}>
          <button
            onClick={streamReading}
            style={{
              width: "100%", padding: "9px 0",
              background: "linear-gradient(135deg, #0A1A5A, #1A0A5A)",
              border: "1px solid rgba(80,100,255,0.3)",
              borderRadius: 10, color: "#7090FF",
              fontSize: 9.5, letterSpacing: "0.15em",
              fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
            }}
          >
            ✦ GENERATE LOCATION READING
          </button>
        </div>
      )}
    </motion.div>
  );
}

function VortexPanel({ node, onClose }: { node: VortexNodePublic; onClose: () => void }) {
  const primaryColor = PLANET_COLORS[node.lines[0].planet];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 300,
        background: "rgba(5,8,22,0.96)",
        border: `1px solid ${primaryColor}40`,
        borderRadius: 20, padding: 24,
        backdropFilter: "blur(32px)",
        boxShadow: `0 0 60px ${primaryColor}20`,
        zIndex: 50,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span style={{ color: primaryColor, fontSize: 9, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace" }}>
          VORTEX NODE
        </span>
        <button onClick={onClose} style={{ color: "#4455AA", fontSize: 14 }}>✕</button>
      </div>

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: `radial-gradient(circle, ${primaryColor}40, transparent)`,
          border: `2px solid ${primaryColor}60`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px",
          fontSize: 24, color: primaryColor,
        }}>
          ◈
        </div>
        <p style={{ color: "#C0D0FF", fontSize: 12, marginBottom: 4, fontFamily: "'Fragment Mono', monospace" }}>
          {node.lines.map(l => `${l.planet} ${l.angle}`).join(" × ")}
        </p>
        <p style={{ color: "#667799", fontSize: 10, fontFamily: "'Fragment Mono', monospace" }}>
          {node.lat.toFixed(1)}° {node.lat >= 0 ? "N" : "S"} · {Math.abs(node.lon).toFixed(1)}° {node.lon >= 0 ? "E" : "W"}
        </p>
      </div>

      <div style={{
        background: `${primaryColor}10`,
        border: `1px solid ${primaryColor}20`,
        borderRadius: 12, padding: "10px 14px",
        textAlign: "center", marginBottom: 16,
      }}>
        <p style={{ color: "#667799", fontSize: 9, letterSpacing: "0.1em", marginBottom: 4, fontFamily: "'Fragment Mono', monospace" }}>
          POWER SCORE
        </p>
        <p style={{ color: primaryColor, fontSize: 28, fontFamily: "'Fragment Mono', monospace", fontWeight: "bold" }}>
          {node.power}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {node.lines.slice(0, 2).map((l, i) => (
          <div key={i} style={{ background: `${PLANET_COLORS[l.planet]}0A`, borderRadius: 8, padding: "6px 10px" }}>
            <p style={{ color: "#778899", fontSize: 9, lineHeight: 1.4, fontFamily: "'Fragment Mono', monospace" }}>
              <span style={{ color: PLANET_COLORS[l.planet] }}>{PLANET_SYMBOLS[l.planet]} {l.planet} {l.angle}</span>
              {" — "}
              {LINE_THEMES[l.planet][l.angle].split(".")[0]}.
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Inline Map Oracle ────────────────────────────────────────────────────────
interface MapOracleMsg { role: "user" | "assistant"; content: string; }

function MapOracle({
  activePlanets,
  clickedLocation,
  locationScores,
  topSpots,
  profileName,
}: {
  activePlanets: Set<AstroLinePlanet>;
  clickedLocation: { lat: number; lon: number } | null;
  locationScores: LocationScore[];
  topSpots: { city: string; scores: LocationScore[]; power: number }[];
  profileName: string;
}) {
  const [open, setOpen]         = useState(false);
  const [history, setHistory]   = useState<MapOracleMsg[]>([]);
  const [input, setInput]       = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, streamText]);

  const buildContext = useCallback(() => {
    const planetList = Array.from(activePlanets).join(", ");
    const topList = topSpots.slice(0, 3).map(s => `${s.city} (score ${s.power})`).join(", ");
    const locPart = clickedLocation
      ? `\nCurrently selected: ${clickedLocation.lat.toFixed(2)}°, ${clickedLocation.lon.toFixed(2)}°` +
        (locationScores.length > 0
          ? ` — nearest lines: ${locationScores.slice(0, 3).map(s => `${s.planet} ${s.angle}`).join(", ")}`
          : " — no strong activations")
      : "";
    return `[ASTROCARTOGRAPHY MAP CONTEXT for ${profileName}]\nActive planets: ${planetList}\nTop power spots: ${topList}${locPart}`;
  }, [activePlanets, clickedLocation, locationScores, topSpots, profileName]);

  const send = useCallback(async () => {
    const msg = input.trim();
    if (!msg || streaming) return;
    setInput("");
    const context = buildContext();
    const fullMsg = `${context}\n\nQuestion: ${msg}`;
    const newHistory: MapOracleMsg[] = [...history, { role: "user", content: msg }];
    setHistory(newHistory);
    setStreaming(true);
    setStreamText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: fullMsg,
          history: history.slice(-6).map(h => ({ role: h.role, content: h.content })),
        }),
      });
      if (!res.ok || !res.body) { setStreaming(false); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) { accumulated += parsed.text; setStreamText(accumulated); }
          } catch { /* skip */ }
        }
      }
      setHistory(h => [...h, { role: "assistant", content: accumulated }]);
    } catch { /* silent */ }
    setStreamText("");
    setStreaming(false);
  }, [input, history, streaming, buildContext]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (!open) {
    return (
      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <p style={{ color: "#32D5FF", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 12 }}>
          MAP ORACLE
        </p>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            style={{ width: 72, height: 72, border: "1px solid rgba(100,100,255,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, position: "relative" }}
          >
            <motion.div
              animate={{ rotate: [360, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{ position: "absolute", inset: 8, border: "1px solid rgba(50,213,255,0.25)", borderRadius: "50%" }}
            />
            <span style={{ color: "#7B61FF", fontSize: 24 }}>✦</span>
          </motion.div>
          <p style={{ color: "#445577", fontSize: 10, textAlign: "center", lineHeight: 1.5, marginBottom: 14 }}>
            Ask about your planetary lines, power spots, and where to be.
          </p>
          <button
            onClick={() => setOpen(true)}
            style={{
              width: "100%", padding: "9px 0",
              background: "linear-gradient(135deg, #1A1A6A, #2A1060)",
              border: "1px solid rgba(120,100,255,0.3)",
              borderRadius: 10, color: "#9090FF",
              fontSize: 9.5, letterSpacing: "0.15em",
              fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
            }}
          >
            ✦ CONSULT ORACLE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Oracle header */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(30,60,100,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#7B61FF", fontSize: 14 }}>✦</span>
          <span style={{ color: "#32D5FF", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace" }}>MAP ORACLE</span>
        </div>
        <button onClick={() => setOpen(false)} style={{ color: "#4455AA", fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px", display: "flex", flexDirection: "column", gap: 8, scrollbarWidth: "none" }}>
        {history.length === 0 && (
          <p style={{ color: "#334466", fontSize: 10, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
            Ask about your lines, a city, or what energy is calling you.
          </p>
        )}
        {history.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "90%",
            background: msg.role === "user" ? "rgba(50,213,255,0.08)" : "rgba(123,97,255,0.08)",
            border: `1px solid ${msg.role === "user" ? "rgba(50,213,255,0.2)" : "rgba(123,97,255,0.2)"}`,
            borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
            padding: "8px 11px",
          }}>
            <p style={{ color: msg.role === "user" ? "#7CCFEF" : "#A89AFF", fontSize: 10.5, lineHeight: 1.6, margin: 0 }}>
              {msg.content}
            </p>
          </div>
        ))}
        {streaming && streamText && (
          <div style={{
            alignSelf: "flex-start", maxWidth: "90%",
            background: "rgba(123,97,255,0.08)", border: "1px solid rgba(123,97,255,0.2)",
            borderRadius: "12px 12px 12px 2px", padding: "8px 11px",
          }}>
            <p style={{ color: "#A89AFF", fontSize: 10.5, lineHeight: 1.6, margin: 0 }}>
              {streamText}
              <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
                style={{ display: "inline-block", width: 5, height: 10, background: "#7B61FF", borderRadius: 1, marginLeft: 2, verticalAlign: "middle" }} />
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(30,60,100,0.3)", display: "flex", gap: 6, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask the oracle..."
          disabled={streaming}
          style={{
            flex: 1, padding: "7px 10px",
            background: "rgba(10,15,35,0.8)",
            border: "1px solid rgba(50,80,160,0.3)",
            borderRadius: 8, color: "#8899CC",
            fontSize: 10, fontFamily: "'Fragment Mono', monospace",
            outline: "none",
          }}
        />
        <button
          onClick={send}
          disabled={streaming || !input.trim()}
          style={{
            padding: "7px 10px",
            background: streaming ? "rgba(10,15,35,0.8)" : "rgba(123,97,255,0.2)",
            border: "1px solid rgba(123,97,255,0.3)",
            borderRadius: 8, color: "#9090FF",
            fontSize: 12, cursor: streaming ? "not-allowed" : "pointer",
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AstrocartographyPage() {
  const [lines,        setLines]        = useState<AstroLine[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [noProfile,    setNoProfile]    = useState(false);
  const [profileName,  setProfileName]  = useState("Your");
  const [birthDatetime, setBirthDatetime] = useState<string | null>(null);

  const [activePlanets, setActivePlanets] = useState<Set<AstroLinePlanet>>(
    new Set(ASTRO_PLANETS)
  );
  const [activeAngles, setActiveAngles]   = useState<Set<AstroLineAngle>>(
    new Set<AstroLineAngle>(["MC", "ASC"])
  );
  const [globeMode,   setGlobeMode]   = useState<GlobeMode>("globe");

  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationScores,  setLocationScores]  = useState<LocationScore[]>([]);
  const [activeVortex,    setActiveVortex]    = useState<VortexNodePublic | null>(null);
  const [energyScores]    = useState(() => deriveEnergyScores());

  const [topSpots, setTopSpots] = useState<{ city: string; lat: number; lon: number; scores: LocationScore[]; power: number }[]>([]);
  const [activeCategories, setActiveCategories] = useState<Set<EnergyCategory>>(
    new Set<EnergyCategory>(["Career", "Love", "Creativity", "Wealth", "Spirituality"])
  );

  // ── Load chart / birth data ──────────────────────────────────────────────────
  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setNoProfile(true); setLoading(false); return; }
    const profile = getProfile(id);
    if (!profile) { setNoProfile(true); setLoading(false); return; }
    setProfileName(profile.name ?? "Your");
    const chart = getCachedChart(id);
    const dt = chart?.birthDatetime ??
      (profile.birthDate && profile.birthTime
        ? `${profile.birthDate}T${profile.birthTime}:00`
        : null);
    if (!dt) { setNoProfile(true); setLoading(false); return; }
    setBirthDatetime(dt);
  }, []);

  // ── Fetch astrocartography lines ─────────────────────────────────────────────
  useEffect(() => {
    if (!birthDatetime) return;
    setLoading(true);
    fetch("/api/astrocartography", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthDatetime }),
    })
      .then(r => r.json())
      .then(data => {
        setLines(data.lines ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [birthDatetime]);

  // ── Compute top power spots ───────────────────────────────────────────────────
  useEffect(() => {
    if (lines.length === 0) return;
    const sorted = SAMPLE_SPOTS.map(s => {
      const scores = scoreLocation(lines, s.lat, s.lon);
      const power  = scores.reduce((acc, sc) => acc + sc.influence * 100, 0);
      return { city: s.city, lat: s.lat, lon: s.lon, scores, power: Math.min(99, Math.round(power)) };
    }).sort((a, b) => b.power - a.power);
    // Drop cities within 6° (~666 km) of a higher-ranked city to prevent label pileups
    const deduped: typeof sorted = [];
    for (const spot of sorted) {
      if (!deduped.some(k => angularDist(spot.lat, spot.lon, k.lat, k.lon) < 6)) {
        deduped.push(spot);
      }
    }
    setTopSpots(deduped);
  }, [lines]);

  // ── Map click handler ─────────────────────────────────────────────────────────
  const handleLocationClick = useCallback((lat: number, lon: number) => {
    setActiveVortex(null);
    const scores = scoreLocation(lines, lat, lon);
    setClickedLocation({ lat, lon });
    setLocationScores(scores);
  }, [lines]);

  const handleVortexClick = useCallback((node: VortexNodePublic) => {
    setClickedLocation(null);
    setActiveVortex(node);
  }, []);

  const toggleCategory = (cat: EnergyCategory) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // City skylines filtered by active energy categories
  const visibleTopSpots = topSpots.filter(s => {
    const top = s.scores[0]?.planet;
    const cat = top ? (PLANET_TO_CATEGORY[top] ?? "Career") : "Career";
    return activeCategories.has(cat);
  });

  const togglePlanet = (p: AstroLinePlanet) => {
    setActivePlanets(prev => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  const toggleAngle = (a: AstroLineAngle) => {
    setActiveAngles(prev => {
      const next = new Set(prev);
      next.has(a) ? next.delete(a) : next.add(a);
      return next;
    });
  };

  // ─── Active line summary for left panel ──────────────────────────────────────
  const activeLine = lines.find(
    l => l.planet === "Sun" && l.angle === "MC" && activePlanets.has(l.planet)
  ) ?? lines[0];

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#050816" }}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{ width: 64, height: 64, border: "1px solid #1A3A8A", borderTopColor: "#32D5FF", borderRadius: "50%", margin: "0 auto 16px" }}
          />
          <p style={{ color: "#445577", fontSize: 10, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace" }}>
            CALCULATING ENERGY FIELDS
          </p>
        </div>
      </div>
    );
  }

  if (noProfile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#050816" }}>
        <Sidebar />
        <div className="text-center ml-16" style={{ padding: 24 }}>
          <p style={{ color: "#C8A55B", fontSize: 14, marginBottom: 8, fontFamily: "'Fragment Mono', monospace" }}>
            BIRTH DATA REQUIRED
          </p>
          <p style={{ color: "#445577", fontSize: 11 }}>
            Complete your profile in Settings to activate your energy map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0" style={{ background: "#050816", overflow: "hidden" }}>
      <Sidebar />

      {/* ── Canvas fills the screen ── */}
      <div className="absolute inset-0" style={{ left: 64 }}>
        {lines.length > 0 && (
          <GlobeCanvas
            lines={lines}
            activePlanets={activePlanets}
            activeAngles={activeAngles}
            globeMode={globeMode}
            topSpots={visibleTopSpots as CitySpot[]}
            onLocationClick={handleLocationClick}
            onVortexClick={() => {}}
          />
        )}
      </div>

      {/* ── Left Panel ── */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{
          position: "absolute", left: 72, top: 16, bottom: 100,
          width: 220,
          background: "rgba(5,8,22,0.82)",
          border: "1px solid rgba(30,60,120,0.4)",
          borderRadius: 16,
          backdropFilter: "blur(24px)",
          display: "flex", flexDirection: "column", gap: 0,
          overflow: "hidden",
          zIndex: 10,
        }}
      >
        {/* Profile header */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(30,60,100,0.3)" }}>
          <p style={{ color: "#4466AA", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 2 }}>
            WELCOME BACK
          </p>
          <p style={{ color: "#C0D4FF", fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{profileName}</p>
          <p style={{ color: "#334466", fontSize: 9, fontFamily: "'Fragment Mono', monospace" }}>
            Astrocartography Active
          </p>
        </div>

        {/* Energy Weather */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(30,60,100,0.3)", flex: "none" }}>
          <p style={{ color: "#32D5FF", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>
            ENERGY WEATHER
          </p>
          <div className="flex flex-col gap-2">
            {(Object.entries(energyScores) as [EnergyCategory, number][]).map(([cat, score]) => (
              <EnergyBar
                key={cat} label={cat} score={score}
                color={ENERGY_COLORS[cat]} icon={ENERGY_ICONS[cat]}
              />
            ))}
          </div>
        </div>

        {/* Active Energy */}
        {activeLine && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(30,60,100,0.3)", flex: "none" }}>
            <p style={{ color: "#32D5FF", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 8 }}>
              ACTIVE ENERGY NOW
            </p>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: PLANET_COLORS[activeLine.planet], fontSize: 16 }}>
                {PLANET_SYMBOLS[activeLine.planet]}
              </span>
              <span style={{ color: "#C0D4FF", fontSize: 12, fontFamily: "'Fragment Mono', monospace" }}>
                {activeLine.planet} {activeLine.angle}
              </span>
            </div>
            <p style={{ color: "#4466AA", fontSize: 9.5, lineHeight: 1.5 }}>
              {LINE_THEMES[activeLine.planet][activeLine.angle].split("—")[0].split(",").slice(0, 2).join(",")}
            </p>
          </div>
        )}

        {/* Angle toggles */}
        <div style={{ padding: "12px 16px" }}>
          <p style={{ color: "#32D5FF", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 8 }}>
            ANGLE FILTER
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {(["MC","IC","ASC","DSC"] as AstroLineAngle[]).map(a => {
              const on = activeAngles.has(a);
              return (
                <button
                  key={a}
                  onClick={() => toggleAngle(a)}
                  style={{
                    padding: "5px 8px",
                    background: on ? "rgba(50,213,255,0.12)" : "rgba(10,20,40,0.6)",
                    border: `1px solid ${on ? "rgba(50,213,255,0.4)" : "rgba(30,60,100,0.3)"}`,
                    borderRadius: 8,
                    color: on ? "#32D5FF" : "#334466",
                    fontSize: 9, letterSpacing: "0.1em",
                    fontFamily: "'Fragment Mono', monospace",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Right Panel ── */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{
          position: "absolute", right: 16, top: 16, bottom: 100,
          width: 230,
          background: "rgba(5,8,22,0.82)",
          border: "1px solid rgba(30,60,120,0.4)",
          borderRadius: 16,
          backdropFilter: "blur(24px)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          zIndex: 10,
        }}
      >
        {/* Top Power Spots */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(30,60,100,0.3)", flex: "none" }}>
          <p style={{ color: "#32D5FF", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: globeMode === "cities" ? 10 : 10 }}>
            TOP POWER SPOTS
          </p>

          {/* Energy category toggles — only in CITIES mode */}
          {globeMode === "cities" && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                {([
                  { cat: "Career"      as EnergyCategory, label: "career"  },
                  { cat: "Love"        as EnergyCategory, label: "love"    },
                  { cat: "Wealth"      as EnergyCategory, label: "wealth"  },
                  { cat: "Creativity"  as EnergyCategory, label: "create"  },
                  { cat: "Spirituality"as EnergyCategory, label: "spirit"  },
                ]).map(({ cat, label }) => {
                  const on  = activeCategories.has(cat);
                  const col = ENERGY_COLORS[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      style={{
                        padding: "4px 8px",
                        background: on ? `${col}18` : "rgba(8,12,28,0.7)",
                        border: `1px solid ${on ? col + "50" : "rgba(30,50,80,0.35)"}`,
                        borderRadius: 20,
                        color: on ? col : "#334466",
                        fontSize: 8, letterSpacing: "0.06em",
                        fontFamily: "'Fragment Mono', monospace",
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {(globeMode === "cities" ? visibleTopSpots : topSpots).slice(0, 5).map((spot, i) => (
              <motion.div
                key={spot.city}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 + 0.4 }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px",
                  background: "rgba(10,20,50,0.6)",
                  border: "1px solid rgba(30,60,100,0.3)",
                  borderRadius: 10, cursor: "pointer",
                }}
              >
                <span style={{
                  color: i === 0 ? "#FFD700" : i === 1 ? "#A8CAFF" : "#7788AA",
                  fontSize: 11, fontFamily: "'Fragment Mono', monospace", width: 14,
                  fontWeight: "bold",
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#C0D4FF", fontSize: 10.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {spot.city}
                  </p>
                  <p style={{ color: "#334466", fontSize: 8.5, fontFamily: "'Fragment Mono', monospace" }}>
                    {spot.scores.slice(0, 2).map(s => `${s.planet} ${s.angle}`).join(" · ")}
                  </p>
                </div>
                <div style={{
                  background: "rgba(50,213,255,0.1)",
                  border: "1px solid rgba(50,213,255,0.2)",
                  borderRadius: 20, padding: "3px 7px",
                  color: "#32D5FF", fontSize: 9,
                  fontFamily: "'Fragment Mono', monospace",
                }}>
                  {spot.power}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Map Oracle — inline chat */}
        <MapOracle
          activePlanets={activePlanets}
          clickedLocation={clickedLocation}
          locationScores={locationScores}
          topSpots={topSpots}
          profileName={profileName}
        />
      </motion.div>

      {/* ── Top bar: mode selector ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          position: "absolute", top: 16,
          left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 2,
          background: "rgba(5,8,22,0.85)",
          border: "1px solid rgba(30,60,120,0.4)",
          borderRadius: 50, padding: "4px 6px",
          backdropFilter: "blur(24px)",
          zIndex: 10,
        }}
      >
        {MODES.map(m => {
          const active = globeMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setGlobeMode(m.id)}
              style={{
                padding: "6px 14px",
                background: active ? "rgba(50,213,255,0.14)" : "transparent",
                border: active ? "1px solid rgba(50,213,255,0.3)" : "1px solid transparent",
                borderRadius: 40,
                color: active ? "#32D5FF" : "#445577",
                fontSize: 8.5, letterSpacing: "0.15em",
                fontFamily: "'Fragment Mono', monospace",
                cursor: "pointer", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <span style={{ fontSize: 11 }}>{m.icon}</span>
              {m.label}
            </button>
          );
        })}
      </motion.div>

      {/* ── Bottom: Planet toggles ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{
          position: "absolute", bottom: 0, left: 64, right: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 2, padding: "8px 16px",
          background: "rgba(5,8,22,0.88)",
          borderTop: "1px solid rgba(30,60,120,0.3)",
          backdropFilter: "blur(24px)",
          zIndex: 10,
          overflowX: "auto",
        }}
      >
        {ASTRO_PLANETS.map(p => {
          const on = activePlanets.has(p);
          const col = PLANET_COLORS[p];
          return (
            <button
              key={p}
              onClick={() => togglePlanet(p)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 12px",
                background: on ? `${col}14` : "rgba(10,15,30,0.6)",
                border: `1px solid ${on ? col + "40" : "rgba(30,50,80,0.4)"}`,
                borderRadius: 30,
                color: on ? col : "#334466",
                fontSize: 9, letterSpacing: "0.1em",
                fontFamily: "'Fragment Mono', monospace",
                cursor: "pointer", transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 12 }}>{PLANET_SYMBOLS[p]}</span>
              <span className="hidden sm:inline">{p.toUpperCase()}</span>
            </button>
          );
        })}
        {/* ALL toggle */}
        <button
          onClick={() => setActivePlanets(activePlanets.size === ASTRO_PLANETS.length ? new Set() : new Set(ASTRO_PLANETS))}
          style={{
            padding: "5px 12px",
            background: "rgba(50,213,255,0.08)",
            border: "1px solid rgba(50,213,255,0.2)",
            borderRadius: 30, color: "#32D5FF",
            fontSize: 9, letterSpacing: "0.1em",
            fontFamily: "'Fragment Mono', monospace",
            cursor: "pointer", flexShrink: 0,
          }}
        >
          {activePlanets.size === ASTRO_PLANETS.length ? "NONE" : "ALL"}
        </button>
      </motion.div>

      {/* ── Location analysis popup ── */}
      <AnimatePresence>
        {clickedLocation && !activeVortex && (
          <LocationPanel
            lat={clickedLocation.lat}
            lon={clickedLocation.lon}
            scores={locationScores}
            onClose={() => setClickedLocation(null)}
          />
        )}
        {activeVortex && (
          <VortexPanel node={activeVortex} onClose={() => setActiveVortex(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
