"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getActiveProfileId, getProfile, getCachedChart, getOraclePersona } from "@/lib/storage";
import type { AstroLine, AstroLinePlanet, AstroLineAngle, LocationScore } from "@/lib/astrology/astrocartography";
import {
  PLANET_COLORS, PLANET_SYMBOLS, ASTRO_PLANETS,
  LINE_THEMES, scoreLocation,
} from "@/lib/astrology/astrocartography";
import type { VortexNodePublic, CitySpot } from "./GlobeCanvas";

const GlobeCanvas     = dynamic(() => import("./GlobeCanvas"),     { ssr: false });
const FlatEarthCanvas = dynamic(() => import("./FlatEarthCanvas"), { ssr: false });
import type { GlobeMode } from "./GlobeCanvas";

// ─── Types ─────────────────────────────────────────────────────────────────────
type ViewMode = "globe" | "flat" | "heatmap";
type EnergyCategory = "Career" | "Love" | "Creativity" | "Wealth" | "Spirituality" | "Transformation";

const ENERGY_COLORS: Record<EnergyCategory, string> = {
  Career: "#4488FF", Love: "#FF71D1", Creativity: "#B06AFF",
  Wealth: "#FFD700", Spirituality: "#2DFFB3", Transformation: "#FF4040",
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

const SAMPLE_SPOTS = [
  // Americas
  { city: "Los Angeles",       lat:  34.05, lon: -118.24 },
  { city: "San Francisco",     lat:  37.77, lon: -122.42 },
  { city: "Seattle",           lat:  47.61, lon: -122.33 },
  { city: "Las Vegas",         lat:  36.17, lon: -115.14 },
  { city: "Denver",            lat:  39.74, lon: -104.98 },
  { city: "Chicago",           lat:  41.88, lon:  -87.63 },
  { city: "New York",          lat:  40.71, lon:  -74.01 },
  { city: "Miami",             lat:  25.76, lon:  -80.19 },
  { city: "Atlanta",           lat:  33.75, lon:  -84.39 },
  { city: "Nashville",         lat:  36.17, lon:  -86.78 },
  { city: "Vancouver",         lat:  49.28, lon: -123.12 },
  { city: "Toronto",           lat:  43.65, lon:  -79.38 },
  { city: "Mexico City",       lat:  19.43, lon:  -99.13 },
  { city: "Havana",            lat:  23.14, lon:  -82.36 },
  { city: "Bogotá",            lat:   4.71, lon:  -74.07 },
  { city: "Lima",              lat: -12.05, lon:  -77.04 },
  { city: "Rio de Janeiro",    lat: -22.90, lon:  -43.17 },
  { city: "Buenos Aires",      lat: -34.60, lon:  -58.38 },
  { city: "Santiago",          lat: -33.45, lon:  -70.67 },
  // Europe
  { city: "London",            lat:  51.51, lon:   -0.13 },
  { city: "Paris",             lat:  48.85, lon:    2.35 },
  { city: "Madrid",            lat:  40.42, lon:   -3.70 },
  { city: "Barcelona",         lat:  41.38, lon:    2.17 },
  { city: "Lisbon",            lat:  38.72, lon:   -9.14 },
  { city: "Amsterdam",         lat:  52.37, lon:    4.90 },
  { city: "Berlin",            lat:  52.52, lon:   13.41 },
  { city: "Rome",              lat:  41.90, lon:   12.49 },
  { city: "Athens",            lat:  37.98, lon:   23.73 },
  { city: "Vienna",            lat:  48.21, lon:   16.37 },
  { city: "Prague",            lat:  50.08, lon:   14.44 },
  { city: "Stockholm",         lat:  59.33, lon:   18.07 },
  { city: "Oslo",              lat:  59.91, lon:   10.75 },
  { city: "Reykjavik",         lat:  64.13, lon:  -21.94 },
  // Africa & Middle East
  { city: "Istanbul",          lat:  41.01, lon:   28.98 },
  { city: "Cairo",             lat:  30.04, lon:   31.24 },
  { city: "Casablanca",        lat:  33.59, lon:   -7.62 },
  { city: "Lagos",             lat:   6.52, lon:    3.38 },
  { city: "Nairobi",           lat:  -1.29, lon:   36.82 },
  { city: "Cape Town",         lat: -33.92, lon:   18.42 },
  { city: "Johannesburg",      lat: -26.20, lon:   28.04 },
  { city: "Dubai",             lat:  25.20, lon:   55.27 },
  { city: "Tel Aviv",          lat:  32.08, lon:   34.78 },
  { city: "Riyadh",            lat:  24.69, lon:   46.72 },
  // Asia & Pacific
  { city: "Moscow",            lat:  55.75, lon:   37.62 },
  { city: "Mumbai",            lat:  19.08, lon:   72.88 },
  { city: "Delhi",             lat:  28.66, lon:   77.22 },
  { city: "Bangkok",           lat:  13.76, lon:  100.50 },
  { city: "Singapore",         lat:   1.35, lon:  103.82 },
  { city: "Bali",              lat:  -8.34, lon:  115.09 },
  { city: "Jakarta",           lat:  -6.21, lon:  106.85 },
  { city: "Hong Kong",         lat:  22.32, lon:  114.17 },
  { city: "Shanghai",          lat:  31.23, lon:  121.47 },
  { city: "Beijing",           lat:  39.90, lon:  116.41 },
  { city: "Tokyo",             lat:  35.68, lon:  139.69 },
  { city: "Osaka",             lat:  34.69, lon:  135.50 },
  { city: "Seoul",             lat:  37.57, lon:  126.98 },
  { city: "Sydney",            lat: -33.87, lon:  151.21 },
  { city: "Melbourne",         lat: -37.81, lon:  144.96 },
  { city: "Auckland",          lat: -36.85, lon:  174.76 },
];

// ─── Eye icon ─────────────────────────────────────────────────────────────────
function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg width="15" height="11" viewBox="0 0 15 11" fill="none" style={{ flexShrink: 0 }}>
      <path d="M7.5 1C4 1 1 5.5 1 5.5s3 4.5 6.5 4.5 6.5-4.5 6.5-4.5S11 1 7.5 1z"
        stroke={visible ? "#C8A55B" : "#334466"} strokeWidth="0.9" />
      {visible
        ? <circle cx="7.5" cy="5.5" r="1.8" fill="#C8A55B" />
        : <line x1="1" y1="1" x2="14" y2="10" stroke="#334466" strokeWidth="1" strokeLinecap="round" />
      }
    </svg>
  );
}

// ─── Location analysis popup ──────────────────────────────────────────────────
function LocationPanel({ lat, lon, scores, onClose }: {
  lat: number; lon: number; scores: LocationScore[]; onClose: () => void;
}) {
  const topScores = scores.slice(0, 3);
  const [reading, setReading]     = useState("");
  const [streaming, setStreaming] = useState(false);
  const [started, setStarted]     = useState(false);

  const streamReading = useCallback(async () => {
    if (streaming || started) return;
    setStarted(true); setStreaming(true);
    try {
      const res = await fetch("/api/astrocartography/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon, scores, persona: getOraclePersona() }),
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
        position: "absolute", bottom: 90, left: "50%", transform: "translateX(-50%)",
        width: 400, maxHeight: "50vh",
        background: "rgba(5,8,22,0.94)",
        border: "1px solid rgba(100,130,255,0.25)",
        borderRadius: 16, backdropFilter: "blur(24px)",
        boxShadow: "0 0 40px rgba(50,100,255,0.12)",
        zIndex: 40, display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >
      <div className="flex items-center justify-between flex-shrink-0"
        style={{ padding: "12px 16px", borderBottom: "1px solid rgba(50,80,160,0.2)" }}>
        <div>
          <span style={{ color: "#C8A55B", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace" }}>
            LOCATION ANALYSIS
          </span>
          <p style={{ color: "#556688", fontSize: 11, fontFamily: "'Fragment Mono', monospace", marginTop: 2 }}>
            {lat.toFixed(2)}°{lat >= 0 ? "N" : "S"} · {Math.abs(lon).toFixed(2)}°{lon >= 0 ? "E" : "W"}
          </p>
        </div>
        <button onClick={onClose} style={{ color: "#4455AA", fontSize: 15, lineHeight: 1, background: "none", border: "none", cursor: "pointer" }}>✕</button>
      </div>

      <div className="overflow-y-auto flex-1" style={{ padding: "12px 16px", scrollbarWidth: "none" }}>
        {topScores.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {topScores.map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 4,
                background: `${PLANET_COLORS[s.planet]}10`,
                border: `1px solid ${PLANET_COLORS[s.planet]}28`,
                borderRadius: 20, padding: "3px 9px",
              }}>
                <span style={{ color: PLANET_COLORS[s.planet], fontSize: 11 }}>{PLANET_SYMBOLS[s.planet]}</span>
                <span style={{ color: PLANET_COLORS[s.planet], fontSize: 8, fontFamily: "'Fragment Mono', monospace" }}>
                  {s.planet} {s.angle}
                </span>
                <span style={{ color: `${PLANET_COLORS[s.planet]}88`, fontSize: 8, fontFamily: "'Fragment Mono', monospace" }}>
                  {(s.influence * 100).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        )}
        {reading ? (
          <div style={{ color: "#8899CC", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {reading}
            {streaming && (
              <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
                style={{ display: "inline-block", width: 6, height: 12, background: "#C8A55B", borderRadius: 1, marginLeft: 3, verticalAlign: "middle" }} />
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

      {!started && scores.length > 0 && (
        <div className="flex-shrink-0" style={{ padding: "10px 16px", borderTop: "1px solid rgba(50,80,160,0.2)" }}>
          <button onClick={streamReading} style={{
            width: "100%", padding: "8px 0",
            background: "linear-gradient(135deg, #0A1A5A, #1A0A5A)",
            border: "1px solid rgba(80,100,255,0.3)", borderRadius: 10,
            color: "#7090FF", fontSize: 9, letterSpacing: "0.15em",
            fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
          }}>
            ✦ GENERATE LOCATION READING
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Vortex detail popup ──────────────────────────────────────────────────────
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
        width: 290,
        background: "rgba(5,8,22,0.96)",
        border: `1px solid ${primaryColor}40`,
        borderRadius: 20, padding: 22,
        backdropFilter: "blur(32px)",
        boxShadow: `0 0 60px ${primaryColor}20`,
        zIndex: 50,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span style={{ color: primaryColor, fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace" }}>VORTEX NODE</span>
        <button onClick={onClose} style={{ color: "#4455AA", fontSize: 14, background: "none", border: "none", cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          background: `radial-gradient(circle, ${primaryColor}40, transparent)`,
          border: `2px solid ${primaryColor}60`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 10px", fontSize: 22, color: primaryColor,
        }}>◈</div>
        <p style={{ color: "#C0D0FF", fontSize: 11, marginBottom: 2, fontFamily: "'Fragment Mono', monospace" }}>
          {node.lines.map(l => `${l.planet} ${l.angle}`).join(" × ")}
        </p>
        <p style={{ color: "#667799", fontSize: 11, fontFamily: "'Fragment Mono', monospace" }}>
          {node.lat.toFixed(1)}° {node.lat >= 0 ? "N" : "S"} · {Math.abs(node.lon).toFixed(1)}° {node.lon >= 0 ? "E" : "W"}
        </p>
      </div>
      <div style={{ background: `${primaryColor}10`, border: `1px solid ${primaryColor}20`, borderRadius: 10, padding: "8px 12px", textAlign: "center", marginBottom: 12 }}>
        <p style={{ color: "#667799", fontSize: 8, letterSpacing: "0.1em", marginBottom: 2, fontFamily: "'Fragment Mono', monospace" }}>POWER SCORE</p>
        <p style={{ color: primaryColor, fontSize: 26, fontFamily: "'Fragment Mono', monospace", fontWeight: "bold" }}>{node.power}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {node.lines.slice(0, 2).map((l, i) => (
          <div key={i} style={{ background: `${PLANET_COLORS[l.planet]}0A`, borderRadius: 8, padding: "5px 9px" }}>
            <p style={{ color: "#778899", fontSize: 8, lineHeight: 1.4, fontFamily: "'Fragment Mono', monospace" }}>
              <span style={{ color: PLANET_COLORS[l.planet] }}>{PLANET_SYMBOLS[l.planet]} {l.planet} {l.angle}</span>
              {" — "}{LINE_THEMES[l.planet][l.angle].split(".")[0]}.
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Map Oracle floating panel ────────────────────────────────────────────────
interface MapOracleMsg { role: "user" | "assistant"; content: string; }

function MapOracle({
  activePlanets, clickedLocation, locationScores, topSpots, profileName,
}: {
  activePlanets: Set<AstroLinePlanet>;
  clickedLocation: { lat: number; lon: number } | null;
  locationScores: LocationScore[];
  topSpots: { city: string; scores: LocationScore[]; power: number }[];
  profileName: string;
}) {
  const [history, setHistory]     = useState<MapOracleMsg[]>([]);
  const [input, setInput]         = useState("");
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
      ? `\nSelected: ${clickedLocation.lat.toFixed(2)}°, ${clickedLocation.lon.toFixed(2)}°` +
        (locationScores.length > 0
          ? ` — lines: ${locationScores.slice(0, 3).map(s => `${s.planet} ${s.angle}`).join(", ")}`
          : " — no strong activations")
      : "";
    return `[MAP for ${profileName}] Active: ${planetList}. Top spots: ${topList}${locPart}`;
  }, [activePlanets, clickedLocation, locationScores, topSpots, profileName]);

  const send = useCallback(async () => {
    const msg = input.trim();
    if (!msg || streaming) return;
    setInput("");
    const context = buildContext();
    const fullMsg = `${context}\n\nQuestion: ${msg}`;
    const newHistory: MapOracleMsg[] = [...history, { role: "user", content: msg }];
    setHistory(newHistory);
    setStreaming(true); setStreamText("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fullMsg, history: history.slice(-6) }),
      });
      if (!res.ok || !res.body) { setStreaming(false); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", accumulated = "";
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
    setStreamText(""); setStreaming(false);
  }, [input, history, streaming, buildContext]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7, scrollbarWidth: "none" }}>
        {history.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <motion.div
              animate={{ rotate: 360 }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
              style={{ width: 52, height: 52, border: "1px solid rgba(100,100,255,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <span style={{ color: "#7B61FF", fontSize: 20 }}>✦</span>
            </motion.div>
            <p style={{ color: "#445577", fontSize: 11, textAlign: "center", lineHeight: 1.5 }}>
              Ask about your planetary lines,<br />power spots, or energetic calling.
            </p>
          </div>
        )}
        {history.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "90%",
            background: msg.role === "user" ? "rgba(50,213,255,0.08)" : "rgba(123,97,255,0.08)",
            border: `1px solid ${msg.role === "user" ? "rgba(50,213,255,0.2)" : "rgba(123,97,255,0.2)"}`,
            borderRadius: msg.role === "user" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
            padding: "7px 10px",
          }}>
            <p style={{ color: msg.role === "user" ? "#7CCFEF" : "#A89AFF", fontSize: 12, lineHeight: 1.6, margin: 0 }}>
              {msg.content}
            </p>
          </div>
        ))}
        {streaming && streamText && (
          <div style={{
            alignSelf: "flex-start", maxWidth: "90%",
            background: "rgba(123,97,255,0.08)", border: "1px solid rgba(123,97,255,0.2)",
            borderRadius: "10px 10px 10px 2px", padding: "7px 10px",
          }}>
            <p style={{ color: "#A89AFF", fontSize: 12, lineHeight: 1.6, margin: 0 }}>
              {streamText}
              <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
                style={{ display: "inline-block", width: 5, height: 10, background: "#7B61FF", borderRadius: 1, marginLeft: 2, verticalAlign: "middle" }} />
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(30,60,100,0.3)", display: "flex", gap: 5, flexShrink: 0 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Ask the oracle..." disabled={streaming}
          style={{
            flex: 1, padding: "6px 10px",
            background: "rgba(10,15,35,0.8)", border: "1px solid rgba(50,80,160,0.3)",
            borderRadius: 8, color: "#8899CC", fontSize: 12,
            fontFamily: "'Fragment Mono', monospace", outline: "none",
          }}
        />
        <button onClick={send} disabled={streaming || !input.trim()} style={{
          padding: "6px 10px",
          background: streaming ? "rgba(10,15,35,0.8)" : "rgba(123,97,255,0.2)",
          border: "1px solid rgba(123,97,255,0.3)",
          borderRadius: 8, color: "#9090FF", fontSize: 12,
          cursor: streaming ? "not-allowed" : "pointer",
        }}>↑</button>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function AstrocartographyPage() {
  const [lines,          setLines]          = useState<AstroLine[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [noProfile,      setNoProfile]      = useState(false);
  const [profileName,    setProfileName]    = useState("Native");
  const [birthDatetime,  setBirthDatetime]  = useState<string | null>(null);
  const [birthPlace,     setBirthPlace]     = useState("—");
  const [birthLat,       setBirthLat]       = useState(0);
  const [birthLon,       setBirthLon]       = useState(0);

  const [activePlanets,  setActivePlanets]  = useState<Set<AstroLinePlanet>>(new Set(ASTRO_PLANETS));
  const [activeAngles,   setActiveAngles]   = useState<Set<AstroLineAngle>>(new Set<AstroLineAngle>(["MC", "ASC"]));

  const [viewMode, setViewMode] = useState<ViewMode>("globe");

  const [layers, setLayers] = useState({
    planetLines: true,
    energyCenters: true,
    citySkylines: true,
    paranLines: false,
    localSpace: false,
  });
  const [viewOptions, setViewOptions] = useState({
    houses: true, aspects: true, midpoints: false, parans: true,
  });

  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationScores,  setLocationScores]  = useState<LocationScore[]>([]);
  const [activeVortex,    setActiveVortex]    = useState<VortexNodePublic | null>(null);
  const [showOracle,      setShowOracle]      = useState(false);

  const [topSpots, setTopSpots] = useState<{ city: string; lat: number; lon: number; scores: LocationScore[]; power: number }[]>([]);
  const [activeCategories] = useState<Set<EnergyCategory>>(
    new Set<EnergyCategory>(["Career", "Love", "Creativity", "Wealth", "Spirituality"])
  );

  // ── Load profile ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setNoProfile(true); setLoading(false); return; }
    const profile = getProfile(id);
    if (!profile) { setNoProfile(true); setLoading(false); return; }
    setProfileName(profile.name ?? "Native");
    setBirthPlace(profile.birthPlace ?? "—");
    if (profile.latitude)  setBirthLat(profile.latitude);
    if (profile.longitude) setBirthLon(profile.longitude);
    const chart = getCachedChart(id);
    const dt = chart?.birthDatetime ??
      (profile.birthDate && profile.birthTime ? `${profile.birthDate}T${profile.birthTime}:00` : null);
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
      .then(data => { setLines(data.lines ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [birthDatetime]);

  // ── Compute top power spots ───────────────────────────────────────────────────
  useEffect(() => {
    if (lines.length === 0) return;
    const CLOSE_LINE_DEG = 2; // ~200 km — must have a line passing this close to show skyline
    const scored = SAMPLE_SPOTS.map(s => {
      const scores = scoreLocation(lines, s.lat, s.lon);
      const power  = scores.reduce((acc, sc) => acc + sc.influence * 100, 0);
      const hasCloseLine = scores.some(sc => sc.distanceDeg <= CLOSE_LINE_DEG);
      return { city: s.city, lat: s.lat, lon: s.lon, scores, power: Math.min(99, Math.round(power)), hasCloseLine };
    });
    // Only include cities with an actual line passing close by
    const sorted = scored.filter(s => s.hasCloseLine).sort((a, b) => b.power - a.power);
    const deduped: typeof sorted = [];
    for (const spot of sorted) {
      if (!deduped.some(k => angularDist(spot.lat, spot.lon, k.lat, k.lon) < 5)) deduped.push(spot);
    }
    setTopSpots(deduped.slice(0, 8));
  }, [lines]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleLocationClick = useCallback((lat: number, lon: number) => {
    setActiveVortex(null);
    setClickedLocation({ lat, lon });
    setLocationScores(scoreLocation(lines, lat, lon));
  }, [lines]);

  const toggleLayer  = (k: keyof typeof layers)      => setLayers(p => ({ ...p, [k]: !p[k] }));
  const toggleOption = (k: keyof typeof viewOptions)  => setViewOptions(p => ({ ...p, [k]: !p[k] }));
  const togglePlanet = (p: AstroLinePlanet) => setActivePlanets(prev => {
    const next = new Set(prev);
    next.has(p) ? next.delete(p) : next.add(p);
    return next;
  });

  const visibleTopSpots = topSpots.filter(s => {
    const top = s.scores[0]?.planet;
    const cat = top ? (PLANET_TO_CATEGORY[top] ?? "Career") : "Career";
    return activeCategories.has(cat);
  });

  const globeMode: GlobeMode = viewMode === "heatmap" ? "energy" : "globe";

  // Format birth datetime for display
  const birthDisplay = birthDatetime ? (() => {
    try {
      const d = new Date(birthDatetime);
      return {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase(),
        time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase() + " UTC",
      };
    } catch { return { date: "—", time: "—" }; }
  })() : { date: "—", time: "—" };

  const latStr = `${Math.abs(birthLat).toFixed(2)}° ${birthLat >= 0 ? "N" : "S"}`;
  const lonStr = `${Math.abs(birthLon).toFixed(2)}° ${birthLon >= 0 ? "E" : "W"}`;

  // ── Loading / no profile ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{ width: 56, height: 56, border: "1px solid #1A3A8A", borderTopColor: "#C8A55B", borderRadius: "50%", margin: "0 auto 14px" }}
          />
          <p style={{ color: "#445577", fontSize: 11, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace" }}>
            CALCULATING ENERGY FIELDS
          </p>
        </div>
      </div>
    );
  }

  if (noProfile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <div className="text-center ml-16">
          <p style={{ color: "#C8A55B", fontSize: 13, marginBottom: 8, fontFamily: "'Fragment Mono', monospace" }}>BIRTH DATA REQUIRED</p>
          <p style={{ color: "#445577", fontSize: 11 }}>Complete your profile in Settings to activate your energy map.</p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0" style={{ background: "#010810", overflow: "hidden" }}>

      {/* ── Canvas ── */}
      <div className="absolute inset-0" style={{ left: 64, bottom: 74 }}>
        {viewMode === "flat" ? (
          lines.length > 0 && (
            <FlatEarthCanvas
              lines={lines}
              activePlanets={activePlanets}
              activeAngles={activeAngles}
              topSpots={visibleTopSpots as CitySpot[]}
              birthLat={birthLat}
              birthLon={birthLon}
              showCities={layers.citySkylines}
              showLines={layers.planetLines}
              onLocationClick={handleLocationClick}
            />
          )
        ) : (
          lines.length > 0 && (
            <GlobeCanvas
              lines={lines}
              activePlanets={activePlanets}
              activeAngles={activeAngles}
              globeMode={globeMode}
              topSpots={visibleTopSpots as CitySpot[]}
              onLocationClick={handleLocationClick}
              onVortexClick={() => {}}
              birthLat={birthLat}
              birthLon={birthLon}
              showCities={layers.citySkylines}
              showLines={layers.planetLines}
            />
          )
        )}
      </div>

      {/* ── Top bar: title + planet filter ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "absolute", top: 0, left: 64, right: 0, height: 44,
          display: "flex", alignItems: "center",
          background: "rgba(5,8,22,0.88)",
          borderBottom: "1px solid rgba(30,60,120,0.3)",
          backdropFilter: "blur(24px)",
          zIndex: 20, paddingLeft: 14, paddingRight: 14, gap: 16,
        }}
      >
        {/* Title */}
        <div style={{ flexShrink: 0 }}>
          <span style={{ color: "#C0D4FF", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em" }}>COSMORA 2070</span>
          <span style={{ color: "#334466", fontSize: 11, letterSpacing: "0.08em" }}> · ASTROCARTOGRAPHY{viewMode === "flat" ? " · FLAT EARTH MODEL" : ""}</span>
        </div>

        {/* Planet toggles */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {ASTRO_PLANETS.map(p => {
            const on  = activePlanets.has(p);
            const col = PLANET_COLORS[p];
            return (
              <button key={p} onClick={() => togglePlanet(p)} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "3px 10px",
                background: on ? `${col}14` : "transparent",
                border: `1px solid ${on ? col + "45" : "transparent"}`,
                borderRadius: 20, color: on ? col : "#334466",
                fontSize: 9, letterSpacing: "0.08em",
                fontFamily: "'Fragment Mono', monospace",
                cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
              }}>
                <span style={{ fontSize: 11 }}>{PLANET_SYMBOLS[p]}</span>
                <span>{p.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {/* ALL / NONE */}
        <button
          onClick={() => setActivePlanets(activePlanets.size === ASTRO_PLANETS.length ? new Set() : new Set(ASTRO_PLANETS))}
          style={{
            padding: "3px 10px", flexShrink: 0,
            background: "rgba(50,213,255,0.06)", border: "1px solid rgba(50,213,255,0.2)",
            borderRadius: 20, color: "#C8A55B", fontSize: 8,
            letterSpacing: "0.1em", fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
          }}
        >
          {activePlanets.size === ASTRO_PLANETS.length ? "NONE" : "ALL"}
        </button>
      </motion.div>

      {/* ── Top-left: Birth data panel ── */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{
          position: "absolute", top: 54, left: 80, width: 174,
          background: "rgba(5,8,22,0.82)",
          border: "1px solid rgba(30,60,120,0.35)",
          borderRadius: 12, padding: "12px 14px",
          backdropFilter: "blur(20px)", zIndex: 10,
        }}
      >
        <p style={{ color: "#C8A55B", fontSize: 7.5, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 8 }}>
          YOUR BIRTH DATA
        </p>
        <div className="flex flex-col gap-1">
          {[
            birthDisplay.date,
            birthDisplay.time,
            birthPlace,
            `${latStr}  ${lonStr}`,
          ].map((v, i) => (
            <p key={i} style={{
              color: i === 0 ? "#C0D4FF" : i === 1 ? "#8899BB" : "#556688",
              fontSize: 11, fontFamily: "'Fragment Mono', monospace",
              lineHeight: 1.4,
            }}>{v}</p>
          ))}
        </div>
      </motion.div>

      {/* ── Top-right: Map controls panel ── */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{
          position: "absolute", top: 54, right: 16, width: 192,
          background: "rgba(5,8,22,0.82)",
          border: "1px solid rgba(30,60,120,0.35)",
          borderRadius: 12, padding: "12px 14px",
          backdropFilter: "blur(20px)", zIndex: 10,
        }}
      >
        <p style={{ color: "#C8A55B", fontSize: 7.5, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>
          MAP CONTROLS
        </p>
        <div className="flex flex-col gap-2">
          {([
            { key: "planetLines",   label: "PLANET LINES"    },
            { key: "energyCenters", label: "ENERGY CENTERS"  },
            { key: "citySkylines",  label: "CITY SKYLINES"   },
            { key: "paranLines",    label: "PARAN LINES"      },
            { key: "localSpace",    label: "LOCAL SPACE"      },
          ] as { key: keyof typeof layers; label: string }[]).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleLayer(key)}>
              <span style={{ color: layers[key] ? "#8899BB" : "#334466", fontSize: 9, letterSpacing: "0.1em", fontFamily: "'Fragment Mono', monospace" }}>
                {label}
              </span>
              <EyeIcon visible={layers[key]} />
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            setActivePlanets(new Set(ASTRO_PLANETS));
            setActiveAngles(new Set<AstroLineAngle>(["MC", "ASC"]));
          }}
          style={{
            marginTop: 10, width: "100%", padding: "5px 0",
            background: "rgba(50,213,255,0.06)",
            border: "1px solid rgba(50,213,255,0.2)",
            borderRadius: 7, color: "#C8A55B",
            fontSize: 8, letterSpacing: "0.12em",
            fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
          }}
        >
          RESET VIEW
        </button>
      </motion.div>

      {/* ── Bottom-left: Energy intensity gauge ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        style={{
          position: "absolute", bottom: 84, left: 80, width: 140,
          background: "rgba(5,8,22,0.82)",
          border: "1px solid rgba(30,60,120,0.35)",
          borderRadius: 12, padding: "10px 14px",
          backdropFilter: "blur(20px)", zIndex: 10,
        }}
      >
        <p style={{ color: "#C8A55B", fontSize: 7.5, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 8, textAlign: "center" }}>
          ENERGY INTENSITY
        </p>
        <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto" }}>
          <svg width="90" height="90" viewBox="0 0 90 90">
            <defs>
              <linearGradient id="eiGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4488FF" />
                <stop offset="40%" stopColor="#B06AFF" />
                <stop offset="100%" stopColor="#FF71D1" />
              </linearGradient>
            </defs>
            <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(26,68,187,0.25)" strokeWidth="5" />
            <circle
              cx="45" cy="45" r="36" fill="none"
              stroke="url(#eiGrad)" strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="226" strokeDashoffset="56"
              transform="rotate(-90 45 45)"
            />
            <text x="45" y="49" textAnchor="middle" fontSize="16" fill="white">✦</text>
          </svg>
          <span style={{ position: "absolute", top: 6, right: 0, fontSize: 7, fontFamily: "'Fragment Mono', monospace", color: "#FF71D1", letterSpacing: "0.06em" }}>HIGH</span>
          <span style={{ position: "absolute", bottom: 6, right: 0, fontSize: 7, fontFamily: "'Fragment Mono', monospace", color: "#4466AA", letterSpacing: "0.06em" }}>LOW</span>
        </div>
      </motion.div>

      {/* ── Bottom-right: View options ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        style={{
          position: "absolute", bottom: 84, right: 16, width: 180,
          background: "rgba(5,8,22,0.82)",
          border: "1px solid rgba(30,60,120,0.35)",
          borderRadius: 12, padding: "10px 14px",
          backdropFilter: "blur(20px)", zIndex: 10,
        }}
      >
        <p style={{ color: "#C8A55B", fontSize: 7.5, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 8 }}>
          VIEW OPTIONS
        </p>
        <div className="flex flex-col gap-1.5">
          {([
            { key: "houses",    label: "HOUSES"    },
            { key: "aspects",   label: "ASPECTS"   },
            { key: "midpoints", label: "MIDPOINTS" },
            { key: "parans",    label: "PARANS"    },
          ] as { key: keyof typeof viewOptions; label: string }[]).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span style={{ color: "#778899", fontSize: 9, letterSpacing: "0.1em", fontFamily: "'Fragment Mono', monospace" }}>
                {label}
              </span>
              <button onClick={() => toggleOption(key)} style={{
                padding: "2px 8px",
                background: viewOptions[key] ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.1)",
                border: `1px solid ${viewOptions[key] ? "rgba(34,197,94,0.3)" : "rgba(100,116,139,0.2)"}`,
                borderRadius: 20,
                color: viewOptions[key] ? "#22c55e" : "#475569",
                fontSize: 8, letterSpacing: "0.1em",
                fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
              }}>
                {viewOptions[key] ? "SHOW" : "HIDE"}
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Bottom bar: view toggle + time scrubber ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          position: "absolute", bottom: 0, left: 64, right: 0, height: 74,
          background: "rgba(5,8,22,0.92)",
          borderTop: "1px solid rgba(30,60,120,0.3)",
          backdropFilter: "blur(24px)",
          zIndex: 20, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {/* Globe / Flat Map / Heatmap toggle */}
        <div className="flex items-center gap-1" style={{
          background: "rgba(10,15,30,0.7)",
          border: "1px solid rgba(30,60,120,0.35)",
          borderRadius: 40, padding: "3px 4px",
        }}>
          {([
            { id: "globe",   label: "GLOBE"    },
            { id: "flat",    label: "FLAT EARTH" },
            { id: "heatmap", label: "HEATMAP"  },
          ] as { id: ViewMode; label: string }[]).map(v => (
            <button key={v.id} onClick={() => setViewMode(v.id)} style={{
              padding: "5px 18px",
              background: viewMode === v.id ? "rgba(50,213,255,0.14)" : "transparent",
              border: viewMode === v.id ? "1px solid rgba(50,213,255,0.3)" : "1px solid transparent",
              borderRadius: 36,
              color: viewMode === v.id ? "#C8A55B" : "#445577",
              fontSize: 9, letterSpacing: "0.14em",
              fontFamily: "'Fragment Mono', monospace",
              cursor: "pointer", transition: "all 0.15s",
            }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* Time scrubber */}
        <div className="flex items-center gap-3" style={{ width: 480, maxWidth: "80%" }}>
          <button style={{
            width: 22, height: 22,
            background: "rgba(50,213,255,0.08)",
            border: "1px solid rgba(50,213,255,0.2)",
            borderRadius: "50%", color: "#C8A55B", fontSize: 9, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>▶</button>
          <div style={{ flex: 1, position: "relative", height: 4 }}>
            <div style={{ height: "100%", background: "rgba(30,60,120,0.4)", borderRadius: 2 }} />
            <div style={{ position: "absolute", top: 0, left: 0, width: "50%", height: "100%", background: "rgba(50,213,255,0.5)", borderRadius: 2 }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 10, height: 10, background: "#C8A55B", borderRadius: "50%", boxShadow: "0 0 8px #C8A55B" }} />
          </div>
          <span style={{ color: "#8899BB", fontSize: 9, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
            {birthDisplay.date} · {birthDisplay.time}
          </span>
          <button style={{
            width: 22, height: 22,
            background: "rgba(50,213,255,0.06)",
            border: "1px solid rgba(50,213,255,0.15)",
            borderRadius: "50%", color: "#C8A55B", fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>+</button>
        </div>
      </motion.div>

      {/* ── Oracle toggle button ── */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowOracle(v => !v)}
        style={{
          position: "absolute", bottom: 84, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 18px",
          background: showOracle ? "rgba(123,97,255,0.18)" : "rgba(5,8,22,0.85)",
          border: `1px solid ${showOracle ? "rgba(123,97,255,0.45)" : "rgba(80,100,255,0.2)"}`,
          borderRadius: 40,
          color: showOracle ? "#A89AFF" : "#4455AA",
          fontSize: 8.5, letterSpacing: "0.14em",
          fontFamily: "'Fragment Mono', monospace",
          backdropFilter: "blur(16px)",
          cursor: "pointer", zIndex: 15,
        }}
      >
        <span style={{ fontSize: 11 }}>✦</span>
        MAP ORACLE
      </motion.button>

      {/* ── Oracle floating panel ── */}
      <AnimatePresence>
        {showOracle && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            style={{
              position: "absolute", bottom: 134, left: "50%", transform: "translateX(-50%)",
              width: 320, height: 380,
              background: "rgba(5,8,22,0.94)",
              border: "1px solid rgba(80,100,255,0.25)",
              borderRadius: 16, backdropFilter: "blur(28px)",
              boxShadow: "0 0 40px rgba(80,80,255,0.15)",
              zIndex: 30, overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}
          >
            <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,60,100,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#7B61FF", fontSize: 13 }}>✦</span>
                <span style={{ color: "#C8A55B", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace" }}>MAP ORACLE</span>
              </div>
              <button onClick={() => setShowOracle(false)} style={{ color: "#4455AA", fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <MapOracle
                activePlanets={activePlanets}
                clickedLocation={clickedLocation}
                locationScores={locationScores}
                topSpots={topSpots}
                profileName={profileName}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Location + vortex popups ── */}
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
